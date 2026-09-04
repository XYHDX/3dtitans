import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:titans_app/app.dart';

/// Canned API answers shaped like the live 3dtitans.org responses.
http.Client fakeApi() {
  final products = {
    'products': [
      {
        'id': 'cmm1s3gos0003c7hxphg7spiz',
        'name': 'military pen holder ',
        'category': 'holders',
        'price': 7,
        'description': 'military jacket pen holder',
        'tags': ['holder-pen'],
        'imageUrl': '',
        'imageGallery': [],
        'uploaderId': 'u1',
        'uploaderName': 'Yamen',
        'storeId': 's1',
        'storeName': 'Yamen',
        'storeSlug': 'yamen',
        'rating': 0,
        'reviewCount': 0,
        'has3dPreview': false,
        'createdAt': '2026-02-25T08:34:38.524Z',
        'isPrioritizedStore': true,
      },
      {
        'id': 'cmj1g5gez00013o6alxhz1cj3',
        'name': 'Cat Decor',
        'category': 'Décor',
        'price': 7,
        'description': '',
        'tags': [],
        'imageUrl': '',
        'imageGallery': [],
        'uploaderId': 'u2',
        'uploaderName': 'Catalys',
        'storeId': 's2',
        'storeName': 'Catalys',
        'storeSlug': 'catalys',
        'rating': 4.5,
        'reviewCount': 2,
        'has3dPreview': false,
        'createdAt': '2025-12-11T08:34:38.524Z',
        'isPrioritizedStore': false,
      },
    ],
  };
  final stores = {
    'stores': [
      {
        'id': 's1',
        'name': 'Yamen',
        'slug': 'yamen',
        'bio': '',
        'ownerId': 'u1',
        'isPublished': true,
        'productsCount': 1,
      },
      {
        'id': 's2',
        'name': 'Catalys',
        'slug': 'catalys',
        'bio': 'Cat things',
        'ownerId': 'u2',
        'isPublished': true,
        'productsCount': 1,
      },
    ],
  };
  final settings = {
    'settings': {'aboutHeroTitle': 'About 3D Titans', 'footerBlurb': ''},
  };

  return MockClient((request) async {
    final path = request.url.path;
    Object body;
    if (path.endsWith('/api/products')) {
      body = products;
    } else if (path.endsWith('/api/stores')) {
      body = stores;
    } else if (path.endsWith('/api/settings')) {
      body = settings;
    } else if (path.endsWith('/api/auth/session')) {
      body = <String, Object>{};
    } else if (path.contains('/reviews')) {
      body = {'reviews': <Object>[]};
    } else if (path.contains('/api/products/')) {
      body = {'product': (products['products'] as List).first};
    } else {
      return http.Response('{"error":"not found"}', 404,
          headers: {'content-type': 'application/json'});
    }
    return http.Response(jsonEncode(body), 200,
        headers: {'content-type': 'application/json; charset=utf-8'});
  });
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('home renders catalog data and tabs navigate', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); // iPhone-ish portrait
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(TitansRoot(prefs: prefs, client: fakeApi()));
    await tester.pumpAndSettle();

    // Home shows the hero and the newest product (title-cased).
    expect(find.text('Build Worlds, Create Legends.'), findsOneWidget);
    expect(find.text('Military Pen Holder'), findsWidgets);

    // Shop tab lists both products with a normalised category chip.
    await tester.tap(find.byIcon(Icons.grid_view_outlined));
    await tester.pumpAndSettle();
    expect(find.text('ALL MODELS'), findsOneWidget);
    expect(find.text('Cat Decor'), findsOneWidget);
    expect(find.widgetWithText(FilterChip, 'Décor'), findsOneWidget);

    // Stores tab.
    await tester.tap(find.byIcon(Icons.storefront_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Catalys'), findsWidgets);

    // Cart starts empty.
    await tester.tap(find.byIcon(Icons.shopping_cart_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Your cart is empty.'), findsOneWidget);

    // Account shows the login form when logged out.
    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();
    expect(find.text('WELCOME BACK'), findsOneWidget);
  });

  testWidgets('adding to cart as a guest updates the badge and cart screen', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(TitansRoot(prefs: prefs, client: fakeApi()));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.grid_view_outlined));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.add_shopping_cart).first);
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 5)); // let the SnackBar dismiss

    await tester.tap(find.byIcon(Icons.shopping_cart_outlined));
    await tester.pumpAndSettle();
    expect(find.text('YOUR CART'), findsOneWidget);
    expect(find.text(r'$7.00'), findsWidgets);
    expect(find.text('Checkout'.toUpperCase()), findsOneWidget);

    // Guest cart is persisted on the device.
    expect(prefs.getString('cart.guest'), isNotNull);
    await tester.pump(const Duration(seconds: 5));
  });

  testWidgets('Arabic locale renders right-to-left', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    SharedPreferences.setMockInitialValues({'settings.locale': 'ar'});
    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(TitansRoot(prefs: prefs, client: fakeApi()));
    await tester.pumpAndSettle();

    expect(find.text('الرئيسية'), findsOneWidget);
    final dir = Directionality.of(tester.element(find.text('الرئيسية')));
    expect(dir, TextDirection.rtl);
  });
}
