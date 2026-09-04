import 'package:flutter_test/flutter_test.dart';
import 'package:titans_app/core/format.dart';
import 'package:titans_app/data/cookie_jar.dart';
import 'package:titans_app/data/models.dart';

void main() {
  group('Checkout models', _checkoutModels);

  group('Product.fromJson', () {
    test('parses the live /api/products shape', () {
      final p = Product.fromJson({
        'id': 'cmm1rxijl0001c7hxbl0lflfx',
        'name': 'Cat Page Holder',
        'category': 'holders',
        'price': 2.5,
        'description': 'cool page holder to use while reading',
        'tags': ['cat-holder'],
        'imageUrl': 'https://example.com/a.png',
        'imageGallery': ['https://example.com/a.png', 'https://example.com/b.png'],
        'uploaderId': 'u1',
        'uploaderName': 'Yamen',
        'storeId': 'b580288c',
        'storeName': 'Yamen',
        'storeSlug': 'yamen',
        'storeAvatarUrl': null,
        'rating': 0,
        'reviewCount': 0,
        'has3dPreview': false,
        'createdAt': '2026-02-25T08:30:00.993Z',
        'isPrioritizedStore': true,
      });
      expect(p.id, 'cmm1rxijl0001c7hxbl0lflfx');
      expect(p.price, 2.5);
      expect(p.tags, ['cat-holder']);
      expect(p.allImages, ['https://example.com/a.png', 'https://example.com/b.png']);
      expect(p.hasReviews, isFalse);
      expect(p.sellerName, 'Yamen');
      expect(p.createdAt?.year, 2026);
      expect(p.isPrioritizedStore, isTrue);
    });

    test('is tolerant of strings, missing fields and comma tags', () {
      final p = Product.fromJson({
        'id': 'x',
        'name': 'military pen holder ',
        'category': 'Vase',
        'price': '7',
        'tags': 'a, b,,c',
        'imageUrl': '',
        'uploaderId': 'u',
        'uploaderName': '',
      });
      expect(p.name, 'military pen holder');
      expect(p.price, 7.0);
      expect(p.tags, ['a', 'b', 'c']);
      expect(p.allImages, isEmpty);
      expect(p.sellerName, 'Store');
      expect(p.toJson()['price'], 7.0);
    });
  });

  test('Store.fromJson parses the live /api/stores shape', () {
    final s = Store.fromJson({
      'id': '182d329f',
      'name': 'hadi zahabi',
      'slug': 'hadi-zahabi',
      'bio': '',
      'avatarUrl': null,
      'coverUrl': null,
      'websiteUrl': null,
      'ownerId': 'o',
      'isPublished': true,
      'sortOrder': 0,
      'productsCount': 0,
      'createdAt': '2025-12-04T16:43:48.397Z',
      'updatedAt': '2025-12-04T16:43:48.397Z',
    });
    expect(s.hasBio, isFalse);
    expect(s.isPublished, isTrue);
    expect(s.productsCount, 0);
    expect(s.avatarUrl, isNull);
  });

  test('SessionUser.fromSessionJson handles logged-out `{}`', () {
    expect(SessionUser.fromSessionJson({}), isNull);
    final u = SessionUser.fromSessionJson({
      'user': {'id': '1', 'email': 'a@b.co', 'name': 'A', 'role': 'admin'},
      'expires': '2027-01-01T00:00:00.000Z',
    });
    expect(u?.isAdmin, isTrue);
    expect(u?.displayName, 'A');
  });

  test('CartLine round-trips through JSON', () {
    final line = CartLine(
      product: Product.fromJson({'id': 'p', 'name': 'N', 'category': 'c', 'price': 3, 'imageUrl': '', 'uploaderId': 'u', 'uploaderName': 'x'}),
      quantity: 2,
      addedAt: DateTime.utc(2026, 1, 1),
    );
    final back = CartLine.fromJson(line.toJson());
    expect(back.quantity, 2);
    expect(back.product.id, 'p');
    expect(back.lineTotal, 6.0);
  });

  group('Fmt', () {
    test('price', () {
      expect(Fmt.price(7), r'$7.00');
      expect(Fmt.price(2.5), r'$2.50');
      expect(Fmt.price(19.98), r'$19.98');
    });

    test('categoryKey folds the site\'s inconsistent categories', () {
      expect(Fmt.categoryKey('Vase'), Fmt.categoryKey('vase'));
      expect(Fmt.categoryKey('Book Mark'), Fmt.categoryKey('book marks'));
      expect(Fmt.categoryKey('Bookends'), Fmt.categoryKey('book ends'));
      expect(Fmt.categoryKey('Home Or Office Decor'), Fmt.categoryKey('Home OR Office Decor'));
      expect(Fmt.categoryKey('Décor'), 'decor');
      expect(Fmt.categoryKey('keychain'), isNot(Fmt.categoryKey('holders')));
    });

    test('categoryLabel / productName title-case', () {
      expect(Fmt.categoryLabel('desk organizer'), 'Desk Organizer');
      expect(Fmt.productName('military pen holder '), 'Military Pen Holder');
      // Short all-caps tokens ("3D", "QR") are kept as acronyms.
      expect(Fmt.productName('3D Printed QR Code Keychain'), '3D Printed QR Code Keychain');
      expect(Fmt.categoryLabel('Home OR Office Decor'), 'Home Or Office Decor');
    });

    test('websiteUri adds https and rejects junk', () {
      expect(Fmt.websiteUri('yahyademeriah.com').toString(), 'https://yahyademeriah.com');
      expect(Fmt.websiteUri('https://www.instagram.com/x')?.host, 'www.instagram.com');
      expect(Fmt.websiteUri(''), isNull);
      expect(Fmt.websiteUri(null), isNull);
    });
  });

  group('CookieJar', () {
    test('splits folded Set-Cookie headers with Expires commas', () {
      const header =
          '__Host-next-auth.csrf-token=abc%7Cdef; Path=/; HttpOnly; Secure; SameSite=Lax, '
          '__Secure-next-auth.session-token=tok.en; Path=/; Expires=Wed, 02 Sep 2076 12:00:00 GMT; HttpOnly; Secure; SameSite=Lax';
      final jar = CookieJar()..ingest(header);
      expect(jar.asMap.keys, containsAll(['__Host-next-auth.csrf-token', '__Secure-next-auth.session-token']));
      expect(jar.asMap['__Secure-next-auth.session-token'], 'tok.en');
      expect(jar.header, contains('__Secure-next-auth.session-token=tok.en'));
    });

    test('drops cookies that are expired or emptied', () {
      final jar = CookieJar({'a': '1', 'b': '2'})
        ..ingest('a=; Path=/; Max-Age=0')
        ..ingest('b=gone; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(jar.isEmpty, isTrue);
    });

    test('persists to JSON and back', () {
      final jar = CookieJar({'s': 'v'});
      expect(CookieJar.fromJson(jar.toJson()).asMap, {'s': 'v'});
      expect(CookieJar.fromJson('not json').isEmpty, isTrue);
    });
  });
}

void _checkoutModels() {
  test('PaymentSettings.fromRaw reads payment.* keys', () {
    final s = PaymentSettings.fromRaw({
      'payment.codEnabled': 'true',
      'payment.bankEnabled': 'true',
      'payment.bankName': 'Bank of Syria',
      'payment.bankIban': 'SY00 1234',
      'payment.stripeEnabled': 'false',
    });
    expect(s.enabledMethods, [PaymentMethod.cod, PaymentMethod.bankTransfer]);
    expect(s.bankName, 'Bank of Syria');
    expect(s.currencyLabel, 'USD');
    expect(PaymentMethod.bankTransfer.needsProof, isTrue);
    expect(PaymentMethod.cod.needsProof, isFalse);
  });

  test('Order.fromJson parses the /api/orders shape', () {
    final o = Order.fromJson({
      'id': 'cmzz12345678abcdef',
      'status': 'AwaitingAcceptance',
      'totalAmount': 14.5,
      'orderDate': '2026-09-01T10:00:00.000Z',
      'items': [
        {'productId': 'p1', 'name': 'Vase', 'quantity': 2, 'price': 7.25, 'imageUrl': ''},
      ],
      'shippingAddress': {
        'fullName': 'Yahya', 'addressLine1': 'Street 1', 'city': 'Damascus', 'postalCode': '0000', 'country': 'Syria',
      },
      'phoneNumber': '+963...',
      'customerEmail': 'a@b.co',
      'notes': '',
      'isPrioritized': false,
    });
    expect(o.status, OrderStatus.awaitingAcceptance);
    expect(o.itemCount, 2);
    expect(o.items.first.lineTotal, 14.5);
    expect(o.shortId, 'ABCDEF');
    expect(o.canRequestCancellation, isTrue);
    expect(o.shipping.summary, 'Street 1, Damascus, 0000, Syria');
  });
}
