/// Data models mirroring the JSON returned by https://3dtitans.org/api.
///
/// Parsing is deliberately defensive: numbers may arrive as `7`, `2.5` or
/// `"7"`, tags may be a list or a comma string, and optional fields may be
/// `null` or missing entirely.
library;

double _toDouble(Object? v, [double fallback = 0]) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

int _toInt(Object? v, [int fallback = 0]) {
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

String _toString(Object? v, [String fallback = '']) => v == null ? fallback : v.toString();

String? _toStringOrNull(Object? v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

bool _toBool(Object? v) => v == true || v == 'true' || v == 1;

List<String> _toStringList(Object? v) {
  if (v is List) return v.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
  if (v is String) {
    return v.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
  }
  return const [];
}

DateTime? _toDate(Object? v) {
  if (v is String) return DateTime.tryParse(v);
  if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
  return null;
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.description,
    required this.tags,
    required this.imageUrl,
    required this.imageGallery,
    required this.uploaderId,
    required this.uploaderName,
    this.storeId,
    this.storeName,
    this.storeSlug,
    this.storeAvatarUrl,
    this.rating = 0,
    this.reviewCount = 0,
    this.has3dPreview = false,
    this.createdAt,
    this.isPrioritizedStore = false,
  });

  final String id;
  final String name;
  final String category;
  final double price;
  final String description;
  final List<String> tags;
  final String imageUrl;
  final List<String> imageGallery;
  final String uploaderId;
  final String uploaderName;
  final String? storeId;
  final String? storeName;
  final String? storeSlug;
  final String? storeAvatarUrl;
  final double rating;
  final int reviewCount;
  final bool has3dPreview;
  final DateTime? createdAt;
  final bool isPrioritizedStore;

  /// All images, main image first, without duplicates or blanks.
  List<String> get allImages {
    final seen = <String>{};
    final out = <String>[];
    for (final url in [imageUrl, ...imageGallery]) {
      final u = url.trim();
      if (u.isNotEmpty && seen.add(u)) out.add(u);
    }
    return out;
  }

  bool get hasReviews => reviewCount > 0;

  /// Best available seller name.
  String get sellerName {
    final s = storeName?.trim();
    if (s != null && s.isNotEmpty) return s;
    return uploaderName.trim().isEmpty ? 'Store' : uploaderName.trim();
  }

  factory Product.fromJson(Map<String, dynamic> j) {
    return Product(
      id: _toString(j['id']),
      name: _toString(j['name']).trim(),
      category: _toString(j['category']).trim(),
      price: _toDouble(j['price']),
      description: _toString(j['description']).trim(),
      tags: _toStringList(j['tags']),
      imageUrl: _toString(j['imageUrl']).trim(),
      imageGallery: _toStringList(j['imageGallery']),
      uploaderId: _toString(j['uploaderId']),
      uploaderName: _toString(j['uploaderName']),
      storeId: _toStringOrNull(j['storeId']),
      storeName: _toStringOrNull(j['storeName']),
      storeSlug: _toStringOrNull(j['storeSlug']),
      storeAvatarUrl: _toStringOrNull(j['storeAvatarUrl']),
      rating: _toDouble(j['rating']),
      reviewCount: _toInt(j['reviewCount']),
      has3dPreview: _toBool(j['has3dPreview']),
      createdAt: _toDate(j['createdAt']),
      isPrioritizedStore: _toBool(j['isPrioritizedStore']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'price': price,
        'description': description,
        'tags': tags,
        'imageUrl': imageUrl,
        'imageGallery': imageGallery,
        'uploaderId': uploaderId,
        'uploaderName': uploaderName,
        'storeId': storeId,
        'storeName': storeName,
        'storeSlug': storeSlug,
        'storeAvatarUrl': storeAvatarUrl,
        'rating': rating,
        'reviewCount': reviewCount,
        'has3dPreview': has3dPreview,
        'createdAt': createdAt?.toIso8601String(),
        'isPrioritizedStore': isPrioritizedStore,
      };

  @override
  bool operator ==(Object other) => other is Product && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

class Store {
  const Store({
    required this.id,
    required this.name,
    required this.slug,
    required this.bio,
    required this.ownerId,
    required this.isPublished,
    required this.productsCount,
    this.avatarUrl,
    this.coverUrl,
    this.websiteUrl,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String slug;
  final String bio;
  final String ownerId;
  final bool isPublished;
  final int productsCount;
  final String? avatarUrl;
  final String? coverUrl;
  final String? websiteUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get hasBio => bio.trim().isNotEmpty;

  factory Store.fromJson(Map<String, dynamic> j) => Store(
        id: _toString(j['id']),
        name: _toString(j['name']).trim(),
        slug: _toString(j['slug']).trim(),
        bio: _toString(j['bio']).trim(),
        ownerId: _toString(j['ownerId']),
        isPublished: _toBool(j['isPublished']),
        productsCount: _toInt(j['productsCount']),
        avatarUrl: _toStringOrNull(j['avatarUrl']),
        coverUrl: _toStringOrNull(j['coverUrl']),
        websiteUrl: _toStringOrNull(j['websiteUrl']),
        createdAt: _toDate(j['createdAt']),
        updatedAt: _toDate(j['updatedAt']),
      );

  @override
  bool operator ==(Object other) => other is Store && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

class Review {
  const Review({
    required this.id,
    required this.rating,
    required this.title,
    required this.body,
    required this.verifiedPurchase,
    required this.userId,
    required this.userName,
    this.userImage,
    this.createdAt,
  });

  final String id;
  final int rating;
  final String title;
  final String body;
  final bool verifiedPurchase;
  final String userId;
  final String userName;
  final String? userImage;
  final DateTime? createdAt;

  factory Review.fromJson(Map<String, dynamic> j) => Review(
        id: _toString(j['id']),
        rating: _toInt(j['rating']).clamp(0, 5),
        title: _toString(j['title']).trim(),
        body: _toString(j['body']).trim(),
        verifiedPurchase: _toBool(j['verifiedPurchase']),
        userId: _toString(j['userId']),
        userName: _toString(j['userName'], 'Anonymous'),
        userImage: _toStringOrNull(j['userImage']),
        createdAt: _toDate(j['createdAt']),
      );
}

/// `GET /api/settings` — editable copy shown on the About page & footer.
class SiteSettings {
  const SiteSettings({
    this.aboutHeroTitle = 'About 3D Titans',
    this.aboutHeroSubtitle = '',
    this.aboutMissionTitle = 'Mission',
    this.aboutMission = '',
    this.aboutContactTitle = 'Contact us',
    this.aboutContact = '',
    this.aboutContactCardTitle = '',
    this.footerBlurb = '',
    this.facebookUrl,
    this.instagramUrl,
  });

  final String aboutHeroTitle;
  final String aboutHeroSubtitle;
  final String aboutMissionTitle;
  final String aboutMission;
  final String aboutContactTitle;
  final String aboutContact;
  final String aboutContactCardTitle;
  final String footerBlurb;
  final String? facebookUrl;
  final String? instagramUrl;

  factory SiteSettings.fromJson(Map<String, dynamic> j) => SiteSettings(
        aboutHeroTitle: _toString(j['aboutHeroTitle'], 'About 3D Titans'),
        aboutHeroSubtitle: _toString(j['aboutHeroSubtitle']),
        aboutMissionTitle: _toString(j['aboutMissionTitle'], 'Mission'),
        aboutMission: _toString(j['aboutMission']),
        aboutContactTitle: _toString(j['aboutContactTitle'], 'Contact us'),
        aboutContact: _toString(j['aboutContact']),
        aboutContactCardTitle: _toString(j['aboutContactCardTitle']),
        footerBlurb: _toString(j['footerBlurb']),
        facebookUrl: _toStringOrNull(j['facebookUrl']),
        instagramUrl: _toStringOrNull(j['instagramUrl']),
      );
}

/// The signed-in user as reported by `GET /api/auth/session`.
class SessionUser {
  const SessionUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.image,
    this.isPrioritizedStore = false,
  });

  final String id;
  final String email;
  final String name;
  final String role; // 'admin' | 'store-owner' | 'user'
  final String? image;
  final bool isPrioritizedStore;

  bool get isAdmin => role == 'admin';
  bool get isStoreOwner => role == 'store-owner';

  String get displayName => name.trim().isNotEmpty ? name.trim() : email;

  /// NextAuth returns `{}` when there is no session — that yields `null`.
  static SessionUser? fromSessionJson(Map<String, dynamic> j) {
    final user = j['user'];
    if (user is! Map) return null;
    final u = user.cast<String, dynamic>();
    final email = _toString(u['email']).trim();
    final id = _toString(u['id']).trim();
    if (email.isEmpty && id.isEmpty) return null;
    return SessionUser(
      id: id,
      email: email,
      name: _toString(u['name']).trim(),
      role: _toString(u['role'], 'user'),
      image: _toStringOrNull(u['image']),
      isPrioritizedStore: _toBool(u['isPrioritizedStore']),
    );
  }
}

/// One line in the shopping cart.
class CartLine {
  const CartLine({required this.product, required this.quantity, this.addedAt});

  final Product product;
  final int quantity;
  final DateTime? addedAt;

  double get lineTotal => product.price * quantity;

  CartLine copyWith({int? quantity}) =>
      CartLine(product: product, quantity: quantity ?? this.quantity, addedAt: addedAt);

  factory CartLine.fromJson(Map<String, dynamic> j) => CartLine(
        product: Product.fromJson((j['product'] as Map).cast<String, dynamic>()),
        quantity: _toInt(j['quantity'], 1).clamp(1, 99),
        addedAt: _toDate(j['addedAt']),
      );

  Map<String, dynamic> toJson() => {
        'product': product.toJson(),
        'quantity': quantity,
        'addedAt': addedAt?.toIso8601String(),
      };
}

/// `GET /api/search?q=` result.
class SearchResult {
  const SearchResult({required this.products, required this.stores, required this.query});

  final List<Product> products;
  final List<Store> stores;
  final String query;
}

// ---------------------------------------------------------------------------
// Checkout, orders, uploads (added in v1.1)
// ---------------------------------------------------------------------------

/// A saved shipping address (`GET /api/addresses`).
class Address {
  const Address({
    required this.id,
    required this.label,
    required this.name,
    required this.line1,
    required this.line2,
    required this.city,
    required this.postalCode,
    required this.country,
    required this.phone,
    required this.isDefault,
  });

  final String id;
  final String label;
  final String name;
  final String line1;
  final String line2;
  final String city;
  final String postalCode;
  final String country;
  final String phone;
  final bool isDefault;

  String get summary =>
      [line1, if (line2.isNotEmpty) line2, city, postalCode, country].where((s) => s.trim().isNotEmpty).join(', ');

  factory Address.fromJson(Map<String, dynamic> j) => Address(
        id: _toString(j['id']),
        label: _toString(j['label']).trim(),
        name: _toString(j['name']).trim(),
        line1: _toString(j['line1']).trim(),
        line2: _toString(j['line2']).trim(),
        city: _toString(j['city']).trim(),
        postalCode: _toString(j['postalCode']).trim(),
        country: _toString(j['country']).trim(),
        phone: _toString(j['phone']).trim(),
        isDefault: _toBool(j['isDefault']),
      );
}

/// Payment methods accepted by `POST /api/orders`.
enum PaymentMethod {
  cod('cod'),
  bankTransfer('bank_transfer'),
  shamCash('sham_cash'),
  syriatelCash('syriatel_cash'),
  stripe('stripe');

  const PaymentMethod(this.apiValue);

  final String apiValue;

  /// Bank / wallet methods where the customer sends money first and then
  /// attaches a screenshot or reference number as proof.
  bool get needsProof => this == bankTransfer || this == shamCash || this == syriatelCash;

  static PaymentMethod? fromApi(String? v) {
    for (final m in PaymentMethod.values) {
      if (m.apiValue == v) return m;
    }
    return null;
  }
}

/// `GET /api/payments/settings` — which methods the admin enabled and the
/// customer-facing account / wallet numbers.
class PaymentSettings {
  const PaymentSettings({
    this.codEnabled = false,
    this.bankEnabled = false,
    this.shamCashEnabled = false,
    this.syriatelCashEnabled = false,
    this.stripeEnabled = false,
    this.bankName = '',
    this.bankAccountNumber = '',
    this.bankIban = '',
    this.bankAccountHolder = '',
    this.shamCashNumber = '',
    this.syriatelCashNumber = '',
    this.currencyLabel = 'USD',
  });

  final bool codEnabled;
  final bool bankEnabled;
  final bool shamCashEnabled;
  final bool syriatelCashEnabled;
  final bool stripeEnabled;
  final String bankName;
  final String bankAccountNumber;
  final String bankIban;
  final String bankAccountHolder;
  final String shamCashNumber;
  final String syriatelCashNumber;
  final String currencyLabel;

  bool isEnabled(PaymentMethod m) => switch (m) {
        PaymentMethod.cod => codEnabled,
        PaymentMethod.bankTransfer => bankEnabled,
        PaymentMethod.shamCash => shamCashEnabled,
        PaymentMethod.syriatelCash => syriatelCashEnabled,
        PaymentMethod.stripe => stripeEnabled,
      };

  List<PaymentMethod> get enabledMethods =>
      PaymentMethod.values.where(isEnabled).toList();

  /// The raw settings map uses `payment.*` keys with string values.
  factory PaymentSettings.fromRaw(Map<String, dynamic> raw) {
    String s(String key) => _toString(raw['payment.$key']).trim();
    bool b(String key) => s(key) == 'true';
    return PaymentSettings(
      codEnabled: b('codEnabled'),
      bankEnabled: b('bankEnabled'),
      shamCashEnabled: b('shamCashEnabled'),
      syriatelCashEnabled: b('syriatelCashEnabled'),
      stripeEnabled: b('stripeEnabled'),
      bankName: s('bankName'),
      bankAccountNumber: s('bankAccountNumber'),
      bankIban: s('bankIban'),
      bankAccountHolder: s('bankAccountHolder'),
      shamCashNumber: s('shamCashNumber'),
      syriatelCashNumber: s('syriatelCashNumber'),
      currencyLabel: s('currencyLabel').isEmpty ? 'USD' : s('currencyLabel'),
    );
  }
}

class ShippingAddress {
  const ShippingAddress({
    required this.fullName,
    required this.addressLine1,
    required this.city,
    required this.postalCode,
    required this.country,
  });

  final String fullName;
  final String addressLine1;
  final String city;
  final String postalCode;
  final String country;

  String get summary => [addressLine1, city, postalCode, country].where((s) => s.trim().isNotEmpty).join(', ');

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'addressLine1': addressLine1,
        'city': city,
        'postalCode': postalCode,
        'country': country,
      };

  factory ShippingAddress.fromJson(Map<String, dynamic> j) => ShippingAddress(
        fullName: _toString(j['fullName']),
        addressLine1: _toString(j['addressLine1']),
        city: _toString(j['city']),
        postalCode: _toString(j['postalCode']),
        country: _toString(j['country']),
      );
}

class OrderItem {
  const OrderItem({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.price,
    required this.imageUrl,
  });

  final String productId;
  final String name;
  final int quantity;
  final double price;
  final String imageUrl;

  double get lineTotal => price * quantity;

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        productId: _toString(j['productId']),
        name: _toString(j['name']),
        quantity: _toInt(j['quantity'], 1),
        price: _toDouble(j['price']),
        imageUrl: _toString(j['imageUrl']),
      );
}

/// Order statuses used by the website.
enum OrderStatus {
  awaitingAcceptance('AwaitingAcceptance'),
  pending('Pending'),
  printing('Printing'),
  finished('Finished'),
  pooled('Pooled'),
  cancellationRequested('CancellationRequested'),
  cancelled('Cancelled'),
  unknown('');

  const OrderStatus(this.apiValue);

  final String apiValue;

  bool get isFinal => this == finished || this == cancelled;

  static OrderStatus fromApi(String? v) {
    for (final s in OrderStatus.values) {
      if (s.apiValue == v) return s;
    }
    return OrderStatus.unknown;
  }
}

/// `GET /api/orders` entry.
class Order {
  const Order({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.items,
    required this.shipping,
    required this.phoneNumber,
    required this.customerEmail,
    required this.notes,
    required this.isPrioritized,
    this.orderDate,
    this.updatedAt,
    this.predictedFinishDate,
  });

  final String id;
  final OrderStatus status;
  final double totalAmount;
  final List<OrderItem> items;
  final ShippingAddress shipping;
  final String phoneNumber;
  final String customerEmail;
  final String notes;
  final bool isPrioritized;
  final DateTime? orderDate;
  final DateTime? updatedAt;
  final DateTime? predictedFinishDate;

  int get itemCount => items.fold(0, (s, i) => s + i.quantity);

  bool get canRequestCancellation =>
      !status.isFinal && status != OrderStatus.cancellationRequested;

  /// Short id shown to customers (`#A1B2C3`).
  String get shortId => id.length > 6 ? id.substring(id.length - 6).toUpperCase() : id.toUpperCase();

  factory Order.fromJson(Map<String, dynamic> j) {
    final shippingRaw = j['shippingAddress'];
    return Order(
      id: _toString(j['id']),
      status: OrderStatus.fromApi(_toString(j['status'])),
      totalAmount: _toDouble(j['totalAmount']),
      items: (j['items'] is List)
          ? (j['items'] as List)
              .whereType<Map>()
              .map((m) => OrderItem.fromJson(m.cast<String, dynamic>()))
              .toList()
          : const [],
      shipping: shippingRaw is Map
          ? ShippingAddress.fromJson(shippingRaw.cast<String, dynamic>())
          : const ShippingAddress(fullName: '', addressLine1: '', city: '', postalCode: '', country: ''),
      phoneNumber: _toString(j['phoneNumber']),
      customerEmail: _toString(j['customerEmail']),
      notes: _toString(j['notes']),
      isPrioritized: _toBool(j['isPrioritized']),
      orderDate: _toDate(j['orderDate'] ?? j['createdAt']),
      updatedAt: _toDate(j['updatedAt']),
      predictedFinishDate: _toDate(j['predictedFinishDate']),
    );
  }
}

/// A file stored through `POST /api/storage/upload`.
class StoredFile {
  const StoredFile({required this.url, required this.path, required this.bucket, required this.size});

  final String url;
  final String path;
  final String bucket;
  final int size;

  factory StoredFile.fromJson(Map<String, dynamic> j) => StoredFile(
        url: _toString(j['url']),
        path: _toString(j['path']),
        bucket: _toString(j['bucket']),
        size: _toInt(j['size']),
      );
}

/// A print request (`GET /api/uploads`).
class PrintUpload {
  const PrintUpload({
    required this.id,
    required this.modelName,
    required this.fileName,
    required this.downloadUrl,
    required this.notes,
    required this.phoneNumber,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String modelName;
  final String fileName;
  final String downloadUrl;
  final String notes;
  final String phoneNumber;
  final String status; // new | assigned | printing | done | ...
  final DateTime? createdAt;

  factory PrintUpload.fromJson(Map<String, dynamic> j) => PrintUpload(
        id: _toString(j['id']),
        modelName: _toString(j['modelName']).trim(),
        fileName: _toString(j['fileName']).trim(),
        downloadUrl: _toString(j['downloadURL']).trim(),
        notes: _toString(j['notes']).trim(),
        phoneNumber: _toString(j['phoneNumber']).trim(),
        status: _toString(j['status'], 'new').trim(),
        createdAt: _toDate(j['createdAt']),
      );
}
