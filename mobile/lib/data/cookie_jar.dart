import 'dart:convert';

/// A tiny single-host cookie jar for the NextAuth session cookies.
///
/// We only ever talk to `3dtitans.org` over HTTPS, so cookie attributes
/// (Domain/Path/Secure) can be ignored: the jar keeps `name -> value`, drops
/// cookies that are being expired, and serialises to JSON for persistence.
class CookieJar {
  CookieJar([Map<String, String>? initial]) : _cookies = {...?initial};

  final Map<String, String> _cookies;

  bool get isEmpty => _cookies.isEmpty;

  Map<String, String> get asMap => Map.unmodifiable(_cookies);

  /// Value for the `Cookie:` request header, or `null` when the jar is empty.
  String? get header =>
      _cookies.isEmpty ? null : _cookies.entries.map((e) => '${e.key}=${e.value}').join('; ');

  /// Ingests a raw `Set-Cookie` header.
  ///
  /// `package:http` folds multiple `Set-Cookie` headers into one string joined
  /// by `, `. Cookie *values* never contain commas, but `Expires=` dates do
  /// (`Wed, 02 Sep 2026`), so we only split on a comma that is followed by a
  /// `name=` token.
  void ingest(String? setCookieHeader) {
    if (setCookieHeader == null || setCookieHeader.trim().isEmpty) return;
    for (final raw in splitSetCookie(setCookieHeader)) {
      final parts = raw.split(';').map((p) => p.trim()).where((p) => p.isNotEmpty).toList();
      if (parts.isEmpty) continue;
      final eq = parts.first.indexOf('=');
      if (eq <= 0) continue;
      final name = parts.first.substring(0, eq).trim();
      final value = parts.first.substring(eq + 1).trim();

      var expired = value.isEmpty;
      for (final attr in parts.skip(1)) {
        final lower = attr.toLowerCase();
        if (lower.startsWith('max-age=')) {
          final secs = int.tryParse(lower.substring(8).trim());
          if (secs != null && secs <= 0) expired = true;
        } else if (lower.startsWith('expires=')) {
          final when = _parseHttpDate(attr.substring(8).trim());
          if (when != null && when.isBefore(DateTime.now().toUtc())) expired = true;
        }
      }
      if (expired) {
        _cookies.remove(name);
      } else {
        _cookies[name] = value;
      }
    }
  }

  void clear() => _cookies.clear();

  String toJson() => jsonEncode(_cookies);

  static CookieJar fromJson(String? json) {
    if (json == null || json.isEmpty) return CookieJar();
    try {
      final decoded = jsonDecode(json);
      if (decoded is Map) {
        return CookieJar(decoded.map((k, v) => MapEntry(k.toString(), v.toString())));
      }
    } catch (_) {}
    return CookieJar();
  }

  static final RegExp _cookieBoundary = RegExp(r",(?=\s*[A-Za-z0-9_\-!#$%&'*+.^`|~]+=)");

  /// Splits a folded `Set-Cookie` header into individual cookie strings.
  static List<String> splitSetCookie(String header) =>
      header.split(_cookieBoundary).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

  /// Parses `Wed, 02 Sep 2026 12:00:00 GMT` (and the `-` separated variant).
  static DateTime? _parseHttpDate(String s) {
    final m = RegExp(r'(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{2,4}) (\d{2}):(\d{2}):(\d{2})').firstMatch(s);
    if (m == null) return null;
    const months = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    };
    final month = months[m.group(2)!.toLowerCase()];
    if (month == null) return null;
    var year = int.parse(m.group(3)!);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    return DateTime.utc(year, month, int.parse(m.group(1)!), int.parse(m.group(4)!),
        int.parse(m.group(5)!), int.parse(m.group(6)!));
  }
}
