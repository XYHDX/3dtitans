import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/models.dart';
import '../data/titans_api.dart';
import 'auth_controller.dart';

/// Shopping cart.
///
/// * Guest: lines live on the device (SharedPreferences).
/// * Logged in: the account cart on 3dtitans.org is authoritative. On login
///   the guest lines are merged into it (`POST /api/cart/merge`) so the
///   website checkout sees exactly what the app shows.
class CartController extends ChangeNotifier {
  CartController(this._api, this._prefs) {
    _lines = _readLocal();
  }

  static const _kGuestCart = 'cart.guest';

  final TitansApi _api;
  final SharedPreferences _prefs;

  List<CartLine> _lines = const [];
  String? _userId;
  bool _syncing = false;
  ApiException? _error;

  List<CartLine> get lines => _lines;
  bool get isEmpty => _lines.isEmpty;
  bool get syncing => _syncing;
  bool get isServerBacked => _userId != null;
  ApiException? get error => _error;

  int get itemCount => _lines.fold(0, (sum, l) => sum + l.quantity);
  double get subtotal => _lines.fold(0.0, (sum, l) => sum + l.lineTotal);

  int quantityOf(String productId) {
    for (final l in _lines) {
      if (l.product.id == productId) return l.quantity;
    }
    return 0;
  }

  /// Wired from a `ChangeNotifierProxyProvider`: reacts to login / logout.
  void attachAuth(AuthController auth) {
    final id = auth.user?.id;
    if (id == _userId) return;
    _userId = id;
    if (id != null) {
      _mergeAndLoad();
    } else {
      _lines = _readLocal();
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    if (!isServerBacked) return;
    await _guard(() async {
      _lines = await _api.cart();
    });
  }

  Future<void> add(Product product, {int quantity = 1}) async {
    final existing = quantityOf(product.id);
    final next = (existing + quantity).clamp(1, 99);
    _setLocalQuantity(product, next);
    if (isServerBacked) {
      await _guard(() => _api.cartUpdate(product.id, next, set: true), reloadAfter: true);
    } else {
      _persistLocal();
    }
  }

  Future<void> setQuantity(Product product, int quantity) async {
    if (quantity <= 0) return remove(product.id);
    _setLocalQuantity(product, quantity.clamp(1, 99));
    if (isServerBacked) {
      await _guard(() => _api.cartUpdate(product.id, quantity.clamp(1, 99), set: true));
    } else {
      _persistLocal();
    }
  }

  Future<void> remove(String productId) async {
    _lines = _lines.where((l) => l.product.id != productId).toList();
    notifyListeners();
    if (isServerBacked) {
      await _guard(() => _api.cartRemove(productId));
    } else {
      _persistLocal();
    }
  }

  Future<void> clear() async {
    _lines = const [];
    notifyListeners();
    if (isServerBacked) {
      await _guard(() => _api.cartClear());
    } else {
      _persistLocal();
    }
  }

  void clearError() {
    if (_error == null) return;
    _error = null;
    notifyListeners();
  }

  // ---------------------------------------------------------------- internals

  void _setLocalQuantity(Product product, int quantity) {
    final idx = _lines.indexWhere((l) => l.product.id == product.id);
    final updated = [..._lines];
    if (idx == -1) {
      updated.insert(0, CartLine(product: product, quantity: quantity, addedAt: DateTime.now()));
    } else {
      updated[idx] = updated[idx].copyWith(quantity: quantity);
    }
    _lines = updated;
    notifyListeners();
  }

  Future<void> _mergeAndLoad() async {
    final guest = _readLocal();
    await _guard(() async {
      if (guest.isNotEmpty) {
        await _api.cartMerge(guest);
        await _prefs.remove(_kGuestCart);
      }
      _lines = await _api.cart();
    });
  }

  Future<void> _guard(Future<void> Function() action, {bool reloadAfter = false}) async {
    _syncing = true;
    _error = null;
    notifyListeners();
    try {
      await action();
      if (reloadAfter && isServerBacked) _lines = await _api.cart();
    } on ApiException catch (e) {
      _error = e;
      if (e.isUnauthorized) {
        // Session expired server-side: fall back to a guest cart.
        _userId = null;
        _lines = _readLocal();
      }
    } catch (e) {
      _error = ApiException(e.toString());
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  List<CartLine> _readLocal() {
    final raw = _prefs.getString(_kGuestCart);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((m) => CartLine.fromJson(m.cast<String, dynamic>()))
            .toList();
      }
    } catch (_) {}
    return const [];
  }

  void _persistLocal() {
    _prefs.setString(_kGuestCart, jsonEncode(_lines.map((l) => l.toJson()).toList()));
  }
}
