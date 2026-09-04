import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../core/config.dart';
import 'cookie_jar.dart';
import 'models.dart';

/// Error raised for failed API calls. [isNetwork] is true when the device
/// could not reach the server at all (offline, DNS, timeout).
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.isNetwork = false});

  final String message;
  final int? statusCode;
  final bool isNetwork;

  bool get isUnauthorized => statusCode == 401;
  bool get isNotFound => statusCode == 404;

  @override
  String toString() => 'ApiException(${statusCode ?? '-'}): $message';
}

/// Thin client for the 3dtitans.org Next.js API.
///
/// * Public catalog: products, stores, reviews, settings, search.
/// * Auth: NextAuth credentials flow (csrf → callback → session) — the
///   session cookie lives in [cookies] and is sent with every request.
/// * Account features that need a session: cart, wishlist, posting reviews.
class TitansApi {
  TitansApi({
    http.Client? client,
    CookieJar? cookies,
    this.onCookiesChanged,
    String apiUrl = AppConfig.apiUrl,
    String siteUrl = AppConfig.baseUrl,
    Duration? timeout,
  })  : _client = client ?? http.Client(),
        cookies = cookies ?? CookieJar(),
        _api = apiUrl,
        _site = siteUrl,
        _timeout = timeout ?? AppConfig.requestTimeout;

  final http.Client _client;
  final CookieJar cookies;
  final String _api;
  final String _site;
  final Duration _timeout;

  /// Called whenever the server sets or clears cookies (persist them here).
  void Function(CookieJar jar)? onCookiesChanged;

  // ---------------------------------------------------------------- catalog

  Future<List<Product>> products({String? storeSlug, String? storeId}) async {
    final json = await _getJson('/products', query: {
      'storeSlug': ?storeSlug,
      'storeId': ?storeId,
    });
    return _list(json['products']).map(Product.fromJson).toList();
  }

  Future<Product> product(String id) async {
    final json = await _getJson('/products/${Uri.encodeComponent(id)}');
    final p = json['product'];
    if (p is! Map) throw const ApiException('Product not found', statusCode: 404);
    return Product.fromJson(p.cast<String, dynamic>());
  }

  Future<List<Review>> reviews(String productId) async {
    final json = await _getJson('/products/${Uri.encodeComponent(productId)}/reviews');
    return _list(json['reviews']).map(Review.fromJson).toList();
  }

  Future<Review> postReview(String productId,
      {required int rating, String title = '', String body = ''}) async {
    final json = await _requestJson(
      'POST',
      '/products/${Uri.encodeComponent(productId)}/reviews',
      jsonBody: {'rating': rating, 'title': title, 'body': body},
    );
    final r = json['review'];
    if (r is! Map) throw const ApiException('Unexpected response');
    return Review.fromJson(r.cast<String, dynamic>());
  }

  Future<List<Store>> stores() async {
    final json = await _getJson('/stores');
    return _list(json['stores']).map(Store.fromJson).toList();
  }

  Future<Store> store(String slug) async {
    final json = await _getJson('/stores/${Uri.encodeComponent(slug)}');
    final s = json['store'];
    if (s is! Map) throw const ApiException('Store not found', statusCode: 404);
    return Store.fromJson(s.cast<String, dynamic>());
  }

  Future<SiteSettings> settings() async {
    final json = await _getJson('/settings');
    final s = json['settings'];
    return s is Map ? SiteSettings.fromJson(s.cast<String, dynamic>()) : const SiteSettings();
  }

  Future<SearchResult> search(String query, {int limit = 8}) async {
    final json = await _getJson('/search', query: {'q': query, 'limit': '$limit'});
    return SearchResult(
      products: _list(json['products']).map(Product.fromJson).toList(),
      stores: _list(json['stores']).map(Store.fromJson).toList(),
      query: (json['query'] ?? query).toString(),
    );
  }

  // ------------------------------------------------------------------- auth

  /// Current session, or `null` when logged out.
  Future<SessionUser?> session() async {
    final json = await _getJson('/auth/session');
    return SessionUser.fromSessionJson(json);
  }

  Future<String> _csrfToken() async {
    final json = await _getJson('/auth/csrf');
    final token = json['csrfToken']?.toString() ?? '';
    if (token.isEmpty) throw const ApiException('Could not obtain a CSRF token');
    return token;
  }

  /// Email + password sign-in through NextAuth's credentials provider.
  Future<SessionUser> login(String email, String password) async {
    final csrf = await _csrfToken();
    final res = await _send(
      'POST',
      '/auth/callback/credentials',
      query: const {'json': 'true'},
      formBody: {
        'csrfToken': csrf,
        'email': email.trim(),
        'password': password,
        'callbackUrl': '$_site/',
        'json': 'true',
        'redirect': 'false',
      },
    );

    // NextAuth answers either with JSON `{url}` (json=true) or a 302.
    String target = '';
    if (res.statusCode >= 300 && res.statusCode < 400) {
      target = res.headers['location'] ?? '';
    } else if (res.statusCode == 200) {
      try {
        final decoded = jsonDecode(utf8.decode(res.bodyBytes));
        if (decoded is Map && decoded['url'] != null) target = decoded['url'].toString();
      } catch (_) {}
    } else {
      throw ApiException('Login failed (${res.statusCode})', statusCode: res.statusCode);
    }
    if (target.contains('error=')) {
      throw const ApiException('Invalid email or password', statusCode: 401);
    }

    final user = await session();
    if (user == null) throw const ApiException('Login failed', statusCode: 401);
    return user;
  }

  /// Creates an account via `/api/auth/signup`, then signs in.
  Future<SessionUser> signup({
    required String name,
    required String email,
    required String password,
  }) async {
    await _requestJson('POST', '/auth/signup', jsonBody: {
      'name': name.trim(),
      'email': email.trim(),
      'password': password,
    });
    return login(email, password);
  }

  Future<void> logout() async {
    try {
      final csrf = await _csrfToken();
      await _send('POST', '/auth/signout', query: const {'json': 'true'}, formBody: {
        'csrfToken': csrf,
        'callbackUrl': '$_site/',
        'json': 'true',
      });
    } catch (_) {
      // Even if the server call fails we drop the local session below.
    } finally {
      cookies.clear();
      onCookiesChanged?.call(cookies);
    }
  }

  // ------------------------------------------------------------------- cart

  Future<List<CartLine>> cart() async {
    final json = await _getJson('/cart');
    return _list(json['items'])
        .where((m) => m['product'] is Map)
        .map(CartLine.fromJson)
        .toList();
  }

  /// `mode: 'add'` increments, `mode: 'set'` replaces the quantity.
  Future<void> cartUpdate(String productId, int quantity, {bool set = false}) =>
      _requestJson('POST', '/cart', jsonBody: {
        'productId': productId,
        'quantity': quantity,
        'mode': set ? 'set' : 'add',
      });

  Future<void> cartRemove(String productId) =>
      _requestJson('DELETE', '/cart', query: {'productId': productId});

  Future<void> cartClear() => _requestJson('DELETE', '/cart', query: const {'all': '1'});

  /// Folds a guest cart into the account cart (server keeps MAX of both).
  Future<int> cartMerge(List<CartLine> lines) async {
    if (lines.isEmpty) return 0;
    final json = await _requestJson('POST', '/cart/merge', jsonBody: {
      'items': [
        for (final l in lines) {'productId': l.product.id, 'quantity': l.quantity},
      ],
    });
    return (json['merged'] is num) ? (json['merged'] as num).toInt() : lines.length;
  }

  // --------------------------------------------------------------- wishlist

  Future<List<Product>> wishlist() async {
    final json = await _getJson('/wishlist');
    return _list(json['items']).map(Product.fromJson).toList();
  }

  /// Toggles the product; returns the new state (`true` = now wishlisted).
  Future<bool> wishlistToggle(String productId) async {
    final json = await _requestJson('POST', '/wishlist', jsonBody: {'productId': productId});
    return json['wishlisted'] == true;
  }

  Future<void> wishlistRemove(String productId) =>
      _requestJson('DELETE', '/wishlist', query: {'productId': productId});

  // ------------------------------------------------------------ addresses

  Future<List<Address>> addresses() async {
    final json = await _getJson('/addresses');
    return _list(json['addresses']).map(Address.fromJson).toList();
  }

  Future<Address> addAddress({
    required String name,
    required String line1,
    required String city,
    required String postalCode,
    required String country,
    String? label,
    String? line2,
    String? phone,
    bool isDefault = false,
  }) async {
    final json = await _requestJson('POST', '/addresses', jsonBody: {
      'label': ?label,
      'name': name,
      'line1': line1,
      'line2': ?line2,
      'city': city,
      'postalCode': postalCode,
      'country': country,
      'phone': ?phone,
      'isDefault': isDefault,
    });
    final a = json['address'];
    if (a is! Map) throw const ApiException('Unexpected response');
    return Address.fromJson(a.cast<String, dynamic>());
  }

  // --------------------------------------------------------------- payments

  Future<PaymentSettings> paymentSettings() async {
    final json = await _getJson('/payments/settings',
        query: {'_': DateTime.now().millisecondsSinceEpoch.toString()});
    final raw = json['settings'];
    return raw is Map ? PaymentSettings.fromRaw(raw.cast<String, dynamic>()) : const PaymentSettings();
  }

  /// Attaches a payment proof (screenshot URL and/or transfer reference).
  Future<void> attachPaymentProof(String orderId, {String? proofUrl, String? reference}) =>
      _requestJson('POST', '/payments/proof', jsonBody: {
        'orderId': orderId,
        'proofUrl': ?proofUrl,
        'reference': ?reference,
      });

  /// Creates a Stripe hosted-checkout session for an existing order.
  Future<Uri> stripeCheckoutUrl(String orderId) async {
    final json = await _requestJson('POST', '/payments/stripe/checkout', jsonBody: {'orderId': orderId});
    final url = json['url']?.toString() ?? '';
    final uri = Uri.tryParse(url);
    if (uri == null || url.isEmpty) throw const ApiException('Card payment is not available right now');
    return uri;
  }

  // ----------------------------------------------------------------- orders

  Future<List<Order>> orders() async {
    final json = await _getJson('/orders');
    return _list(json['orders']).map(Order.fromJson).toList();
  }

  Future<Order> order(String id) async {
    final json = await _getJson('/orders/${Uri.encodeComponent(id)}');
    final o = json['order'];
    if (o is! Map) throw const ApiException('Order not found', statusCode: 404);
    return Order.fromJson(o.cast<String, dynamic>());
  }

  /// Fresh idempotency key — required by `POST /api/orders`.
  Future<String> idempotencyKey() async {
    final json = await _getJson('/orders/idempotency-key',
        query: {'_': DateTime.now().millisecondsSinceEpoch.toString()});
    final key = json['idempotencyKey']?.toString() ?? '';
    if (key.isEmpty) throw const ApiException('Could not start the checkout');
    return key;
  }

  /// Places an order. Prices/totals are computed server-side from the
  /// product ids — the client only sends ids and quantities.
  Future<Order> placeOrder({
    required List<CartLine> lines,
    required ShippingAddress shipping,
    required String phoneNumber,
    required String customerEmail,
    required PaymentMethod paymentMethod,
    required String idempotencyKey,
    String notes = '',
  }) async {
    final json = await _requestJson('POST', '/orders', jsonBody: {
      'items': [
        for (final l in lines) {'productId': l.product.id, 'quantity': l.quantity},
      ],
      'shippingAddress': shipping.toJson(),
      'phoneNumber': phoneNumber,
      'customerEmail': customerEmail,
      'isPrioritized': false,
      'notes': notes,
      'paymentMethod': paymentMethod.apiValue,
      'idempotencyKey': idempotencyKey,
    });
    final o = json['order'];
    if (o is! Map) throw const ApiException('Unexpected response');
    return Order.fromJson(o.cast<String, dynamic>());
  }

  Future<Order> requestCancellation(String orderId) async {
    final json = await _requestJson('PATCH', '/orders/${Uri.encodeComponent(orderId)}',
        jsonBody: {'requestCancellation': true});
    final o = json['order'];
    if (o is! Map) throw const ApiException('Unexpected response');
    return Order.fromJson(o.cast<String, dynamic>());
  }

  // ---------------------------------------------------- uploads (print jobs)

  Future<List<PrintUpload>> uploads() async {
    final json = await _getJson('/uploads');
    return _list(json['uploads']).map(PrintUpload.fromJson).toList();
  }

  /// Registers an already-stored STL file as a print request.
  Future<PrintUpload> createUpload({
    required String modelName,
    required StoredFile file,
    required String fileName,
    String notes = '',
    String phoneNumber = '',
  }) async {
    final json = await _requestJson('POST', '/uploads', jsonBody: {
      'modelName': modelName,
      'fileName': fileName,
      'filePath': file.path,
      'fileUrl': file.url,
      'downloadURL': file.url,
      'notes': notes,
      'phoneNumber': phoneNumber,
    });
    final u = json['upload'];
    if (u is! Map) throw const ApiException('Unexpected response');
    return PrintUpload.fromJson(u.cast<String, dynamic>());
  }

  /// Uploads raw bytes through the website (`POST /api/storage/upload`).
  /// [kind] is `model` (STL) or `proof` (payment screenshot).
  Future<StoredFile> uploadFile({
    required String kind,
    required Uint8List bytes,
    required String fileName,
    String? contentType,
  }) async {
    // Fail fast (before sending megabytes) when the website has not deployed
    // the upload route yet: a GET on an existing route answers 405, a missing
    // route answers with the 404 page.
    final probe = await _send('GET', '/storage/upload');
    if (probe.statusCode == 404) {
      throw const ApiException(
        'The website does not have the upload endpoint yet (deploy /api/storage/upload).',
        statusCode: 404,
      );
    }

    final uri = Uri.parse('$_api/storage/upload');
    final req = http.MultipartRequest('POST', uri)
      ..followRedirects = false
      ..headers['Accept'] = 'application/json'
      ..fields['kind'] = kind
      ..files.add(http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: fileName,
        contentType: contentType == null ? null : MediaType.parse(contentType),
      ));
    final cookieHeader = cookies.header;
    if (cookieHeader != null) req.headers['Cookie'] = cookieHeader;

    http.Response res;
    try {
      final streamed = await _client.send(req).timeout(const Duration(minutes: 3));
      res = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw const ApiException('The upload timed out', isNetwork: true);
    } on SocketException catch (e) {
      throw ApiException('Network error: ${e.message}', isNetwork: true);
    } on http.ClientException catch (e) {
      throw ApiException(e.message, isNetwork: true);
    }
    final setCookie = res.headers['set-cookie'];
    if (setCookie != null && setCookie.isNotEmpty) {
      cookies.ingest(setCookie);
      onCookiesChanged?.call(cookies);
    }
    final text = utf8.decode(res.bodyBytes, allowMalformed: true);
    Object? decoded;
    try {
      decoded = jsonDecode(text);
    } catch (_) {}
    if (res.statusCode == 404) {
      throw const ApiException(
        'The website does not have the upload endpoint yet (deploy /api/storage/upload).',
        statusCode: 404,
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = decoded is Map && decoded['error'] != null ? decoded['error'].toString() : null;
      throw ApiException(msg ?? 'Upload failed (${res.statusCode})', statusCode: res.statusCode);
    }
    if (decoded is! Map) throw const ApiException('Unexpected response');
    return StoredFile.fromJson(decoded.cast<String, dynamic>());
  }

  // ---------------------------------------------------------------- contact

  Future<void> contact({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) =>
      _requestJson('POST', '/contact', jsonBody: {
        'name': name,
        'email': email,
        'subject': subject,
        'message': message,
      });

  // -------------------------------------------------------------- plumbing

  Future<Map<String, dynamic>> _getJson(String path, {Map<String, String>? query}) =>
      _requestJson('GET', path, query: query);

  Future<Map<String, dynamic>> _requestJson(
    String method,
    String path, {
    Map<String, String>? query,
    Object? jsonBody,
  }) async {
    final res = await _send(method, path, query: query, jsonBody: jsonBody);
    final text = utf8.decode(res.bodyBytes, allowMalformed: true);
    Object? decoded;
    if (text.trim().isNotEmpty) {
      try {
        decoded = jsonDecode(text);
      } catch (_) {
        decoded = null;
      }
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final serverMessage =
          decoded is Map && decoded['error'] != null ? decoded['error'].toString() : null;
      throw ApiException(
        serverMessage ?? 'Request failed (${res.statusCode})',
        statusCode: res.statusCode,
      );
    }
    if (decoded is Map) return decoded.cast<String, dynamic>();
    if (decoded is List) return {'items': decoded};
    return const {};
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Object? jsonBody,
    Map<String, String>? formBody,
  }) async {
    final uri = Uri.parse('$_api$path').replace(
      queryParameters: (query == null || query.isEmpty) ? null : query,
    );
    final req = http.Request(method, uri)
      ..followRedirects = false
      ..headers['Accept'] = 'application/json'
      ..headers['User-Agent'] = 'TitansApp/1.0 (Flutter; +https://3dtitans.org)';
    final cookieHeader = cookies.header;
    if (cookieHeader != null) req.headers['Cookie'] = cookieHeader;
    if (jsonBody != null) {
      req.headers['Content-Type'] = 'application/json; charset=utf-8';
      req.body = jsonEncode(jsonBody);
    } else if (formBody != null) {
      req.bodyFields = formBody;
    }

    http.Response res;
    try {
      final streamed = await _client.send(req).timeout(_timeout);
      res = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw const ApiException('The request timed out', isNetwork: true);
    } on SocketException catch (e) {
      throw ApiException('Network error: ${e.message}', isNetwork: true);
    } on HandshakeException catch (e) {
      throw ApiException('TLS error: ${e.message}', isNetwork: true);
    } on http.ClientException catch (e) {
      throw ApiException(e.message, isNetwork: true);
    }

    final setCookie = res.headers['set-cookie'];
    if (setCookie != null && setCookie.isNotEmpty) {
      cookies.ingest(setCookie);
      onCookiesChanged?.call(cookies);
    }
    return res;
  }

  static Iterable<Map<String, dynamic>> _list(Object? v) {
    if (v is! List) return const Iterable.empty();
    return v.whereType<Map>().map((m) => m.cast<String, dynamic>());
  }

  void dispose() => _client.close();
}
