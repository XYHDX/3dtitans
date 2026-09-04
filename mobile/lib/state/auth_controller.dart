import 'package:flutter/foundation.dart';

import '../data/models.dart';
import '../data/titans_api.dart';

/// Holds the signed-in user and drives login / signup / logout.
class AuthController extends ChangeNotifier {
  AuthController(this._api);

  final TitansApi _api;

  SessionUser? _user;
  bool _busy = false;
  bool _restored = false;
  ApiException? _error;

  SessionUser? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get busy => _busy;

  /// True once the persisted session has been checked at startup.
  bool get restored => _restored;
  ApiException? get error => _error;

  /// Re-validates the persisted session cookie with the server.
  Future<void> restore() async {
    if (_api.cookies.isEmpty) {
      _restored = true;
      notifyListeners();
      return;
    }
    try {
      _user = await _api.session();
    } on ApiException catch (e) {
      // Offline: keep whatever we had; a real 401 means the cookie is dead.
      if (e.isUnauthorized) _user = null;
    } finally {
      _restored = true;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) => _run(() => _api.login(email, password));

  Future<bool> signup({required String name, required String email, required String password}) =>
      _run(() => _api.signup(name: name, email: email, password: password));

  Future<void> logout() async {
    _busy = true;
    notifyListeners();
    try {
      await _api.logout();
    } finally {
      _user = null;
      _busy = false;
      _error = null;
      notifyListeners();
    }
  }

  void clearError() {
    if (_error == null) return;
    _error = null;
    notifyListeners();
  }

  Future<bool> _run(Future<SessionUser> Function() action) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _user = await action();
      return true;
    } on ApiException catch (e) {
      _error = e;
      return false;
    } catch (e) {
      _error = ApiException(e.toString());
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }
}
