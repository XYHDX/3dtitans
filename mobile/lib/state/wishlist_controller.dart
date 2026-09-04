import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/models.dart';
import '../data/titans_api.dart';
import 'auth_controller.dart';

/// Saved products — on the device for guests, on the account when logged in.
class WishlistController extends ChangeNotifier {
  WishlistController(this._api, this._prefs) {
    _items = _readLocal();
  }

  static const _kGuestWishlist = 'wishlist.guest';

  final TitansApi _api;
  final SharedPreferences _prefs;

  List<Product> _items = const [];
  String? _userId;
  bool _syncing = false;
  ApiException? _error;

  List<Product> get items => _items;
  bool get isEmpty => _items.isEmpty;
  bool get syncing => _syncing;
  bool get isServerBacked => _userId != null;
  ApiException? get error => _error;

  bool contains(String productId) => _items.any((p) => p.id == productId);

  void attachAuth(AuthController auth) {
    final id = auth.user?.id;
    if (id == _userId) return;
    _userId = id;
    if (id != null) {
      _uploadGuestAndLoad();
    } else {
      _items = _readLocal();
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    if (!isServerBacked) return;
    await _guard(() async {
      _items = await _api.wishlist();
    });
  }

  /// Toggles [product]; returns `true` when it is now saved.
  Future<bool> toggle(Product product) async {
    final nowSaved = !contains(product.id);
    _items = nowSaved
        ? [product, ..._items.where((p) => p.id != product.id)]
        : _items.where((p) => p.id != product.id).toList();
    notifyListeners();
    if (isServerBacked) {
      await _guard(() async {
        final serverState = await _api.wishlistToggle(product.id);
        if (serverState != nowSaved) {
          // Server disagreed (double tap / stale state) — trust the server.
          _items = await _api.wishlist();
        }
      });
    } else {
      _persistLocal();
    }
    return nowSaved;
  }

  Future<void> remove(String productId) async {
    _items = _items.where((p) => p.id != productId).toList();
    notifyListeners();
    if (isServerBacked) {
      await _guard(() => _api.wishlistRemove(productId));
    } else {
      _persistLocal();
    }
  }

  // ---------------------------------------------------------------- internals

  Future<void> _uploadGuestAndLoad() async {
    final guest = _readLocal();
    await _guard(() async {
      final server = await _api.wishlist();
      final serverIds = server.map((p) => p.id).toSet();
      for (final p in guest) {
        if (!serverIds.contains(p.id)) {
          await _api.wishlistToggle(p.id);
        }
      }
      if (guest.isNotEmpty) await _prefs.remove(_kGuestWishlist);
      _items = guest.isEmpty ? server : await _api.wishlist();
    });
  }

  Future<void> _guard(Future<void> Function() action) async {
    _syncing = true;
    _error = null;
    notifyListeners();
    try {
      await action();
    } on ApiException catch (e) {
      _error = e;
      if (e.isUnauthorized) {
        _userId = null;
        _items = _readLocal();
      }
    } catch (e) {
      _error = ApiException(e.toString());
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  List<Product> _readLocal() {
    final raw = _prefs.getString(_kGuestWishlist);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((m) => Product.fromJson(m.cast<String, dynamic>()))
            .toList();
      }
    } catch (_) {}
    return const [];
  }

  void _persistLocal() {
    _prefs.setString(_kGuestWishlist, jsonEncode(_items.map((p) => p.toJson()).toList()));
  }
}
