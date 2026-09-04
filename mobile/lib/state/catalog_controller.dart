import 'package:flutter/foundation.dart';

import '../core/format.dart';
import '../data/models.dart';
import '../data/titans_api.dart';

enum ProductSort { featured, newest, priceLowHigh, priceHighLow, name }

/// Products, stores and site settings — loaded once, refreshed on demand.
class CatalogController extends ChangeNotifier {
  CatalogController(this._api);

  final TitansApi _api;

  List<Product> _products = const [];
  List<Store> _stores = const [];
  SiteSettings _settings = const SiteSettings();
  bool _loading = false;
  ApiException? _error;
  DateTime? _loadedAt;

  List<Product> get products => _products;
  List<Store> get stores => _stores;
  SiteSettings get settings => _settings;
  bool get loading => _loading;
  bool get hasData => _loadedAt != null;
  ApiException? get error => _error;

  /// Loads everything in parallel. Settings are optional (a failure there
  /// never blocks the catalog).
  Future<void> load({bool force = false}) async {
    if (_loading) return;
    if (!force && hasData) return;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait<Object>([
        _api.products(),
        _api.stores(),
        _api.settings().catchError((Object _) => const SiteSettings()),
      ]);
      _products = (results[0] as List<Product>);
      _stores = (results[1] as List<Store>);
      _settings = results[2] as SiteSettings;
      _loadedAt = DateTime.now();
    } on ApiException catch (e) {
      _error = e;
    } catch (e) {
      _error = ApiException(e.toString());
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() => load(force: true);

  // ------------------------------------------------------------ derived data

  Product? productById(String id) {
    for (final p in _products) {
      if (p.id == id) return p;
    }
    return null;
  }

  Store? storeBySlug(String slug) {
    for (final s in _stores) {
      if (s.slug == slug) return s;
    }
    return null;
  }

  /// Published stores, ones with products first, then alphabetically.
  List<Store> get publishedStores {
    final list = _stores.where((s) => s.isPublished).toList()
      ..sort((a, b) {
        final byCount = b.productsCount.compareTo(a.productsCount);
        return byCount != 0 ? byCount : a.name.toLowerCase().compareTo(b.name.toLowerCase());
      });
    return list;
  }

  /// Stores that actually have something to browse (used on the home page).
  List<Store> get activeStores => publishedStores.where((s) => s.productsCount > 0).toList();

  List<Product> newest([int limit = 8]) {
    final list = [..._products]..sort((a, b) {
        final ad = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bd = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bd.compareTo(ad);
      });
    return list.take(limit).toList();
  }

  /// Normalised category key -> display label (first spelling seen wins).
  Map<String, String> get categories {
    final map = <String, String>{};
    for (final p in _products) {
      if (p.category.trim().isEmpty) continue;
      final key = Fmt.categoryKey(p.category);
      if (key.isEmpty) continue;
      map.putIfAbsent(key, () => Fmt.categoryLabel(p.category));
    }
    final sorted = map.entries.toList()
      ..sort((a, b) => a.value.toLowerCase().compareTo(b.value.toLowerCase()));
    return {for (final e in sorted) e.key: e.value};
  }

  List<Product> filter({
    String query = '',
    String? categoryKey,
    ProductSort sort = ProductSort.featured,
    Iterable<Product>? source,
  }) {
    final q = query.trim().toLowerCase();
    var list = (source ?? _products).where((p) {
      if (categoryKey != null && Fmt.categoryKey(p.category) != categoryKey) return false;
      if (q.isEmpty) return true;
      return p.name.toLowerCase().contains(q) ||
          p.category.toLowerCase().contains(q) ||
          p.sellerName.toLowerCase().contains(q) ||
          p.tags.any((t) => t.toLowerCase().contains(q));
    }).toList();

    switch (sort) {
      case ProductSort.featured:
        break; // keep the server's order (prioritised stores first)
      case ProductSort.newest:
        list.sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));
      case ProductSort.priceLowHigh:
        list.sort((a, b) => a.price.compareTo(b.price));
      case ProductSort.priceHighLow:
        list.sort((a, b) => b.price.compareTo(a.price));
      case ProductSort.name:
        list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    }
    return list;
  }

  List<Product> productsOfStore(Store store) =>
      _products.where((p) => p.storeSlug == store.slug || p.storeId == store.id).toList();
}
