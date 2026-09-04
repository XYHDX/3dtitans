import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Language + theme preferences, persisted on the device.
class AppSettings extends ChangeNotifier {
  AppSettings(this._prefs) {
    final code = _prefs.getString(_kLocale);
    if (code == 'en' || code == 'ar') _locale = Locale(code!);
    _themeMode = switch (_prefs.getString(_kTheme)) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  static const _kLocale = 'settings.locale';
  static const _kTheme = 'settings.theme';

  final SharedPreferences _prefs;

  Locale? _locale;
  ThemeMode _themeMode = ThemeMode.system;

  /// `null` means "follow the device language".
  Locale? get locale => _locale;

  ThemeMode get themeMode => _themeMode;

  Future<void> setLocale(Locale? locale) async {
    if (locale?.languageCode == _locale?.languageCode) return;
    _locale = locale;
    notifyListeners();
    if (locale == null) {
      await _prefs.remove(_kLocale);
    } else {
      await _prefs.setString(_kLocale, locale.languageCode);
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (mode == _themeMode) return;
    _themeMode = mode;
    notifyListeners();
    await _prefs.setString(_kTheme, mode.name);
  }
}
