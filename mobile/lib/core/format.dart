/// Small formatting helpers shared across the UI.
class Fmt {
  Fmt._();

  /// Prices on 3dtitans.org are USD with two decimals (`$7.00`).
  static String price(num value) => '\$${value.toStringAsFixed(2)}';

  /// Product categories on the site are free text typed by each seller, so
  /// the same category shows up as `Vase`/`vase`, `Book Mark`/`book marks`,
  /// `Bookends`/`book ends`, `Décor`/`decorations`… This folds those variants
  /// into one key so filters and chips behave.
  static String categoryKey(String raw) {
    var s = raw.trim().toLowerCase();
    const accents = {'é': 'e', 'è': 'e', 'ê': 'e', 'á': 'a', 'à': 'a', 'ó': 'o', 'í': 'i', 'ú': 'u'};
    accents.forEach((k, v) => s = s.replaceAll(k, v));
    s = s.replaceAll(RegExp(r'[^a-z0-9؀-ۿ]+'), '');
    if (s.endsWith('ies') && s.length > 4) {
      s = '${s.substring(0, s.length - 3)}y';
    } else if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }

  /// Display label for a category: Title Case, trimmed, single spaces.
  static String categoryLabel(String raw) {
    final words = raw.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
    return words.map((w) {
      if (_isAcronym(w)) return w.toUpperCase(); // keep "3D", "QR", "STL", "DIY"
      final lower = w.toLowerCase();
      return '${lower[0].toUpperCase()}${lower.substring(1)}';
    }).join(' ');
  }

  static const _acronyms = {'QR', 'AI', 'UV', 'TV', 'PC', 'VR', 'AR', 'RC', 'USB', 'LED', 'STL', 'DIY', 'PLA', 'ABS'};

  static bool _isAcronym(String w) {
    final upper = w.toUpperCase();
    if (upper != w) return false;
    if (w.length <= 3 && RegExp(r'\d').hasMatch(w)) return true;
    return _acronyms.contains(upper);
  }

  /// Sellers sometimes type names in lowercase (`military pen holder `).
  static String productName(String raw) => categoryLabel(raw);

  /// Normalises `websiteUrl` values like `yahyademeriah.com` into a URL.
  static Uri? websiteUri(String? raw) {
    if (raw == null) return null;
    final s = raw.trim();
    if (s.isEmpty) return null;
    final withScheme = s.startsWith('http://') || s.startsWith('https://') ? s : 'https://$s';
    final uri = Uri.tryParse(withScheme);
    if (uri == null || uri.host.isEmpty) return null;
    return uri;
  }

  /// Short host for display: `https://www.instagram.com/x?y` -> `instagram.com/x`.
  static String prettyUrl(Uri uri) {
    final host = uri.host.startsWith('www.') ? uri.host.substring(4) : uri.host;
    final path = uri.path == '/' ? '' : uri.path;
    return '$host$path';
  }

  /// `2026-02-25T08:34:38.524Z` -> `25 Feb 2026` (locale-agnostic, tiny).
  static String shortDate(DateTime? d) {
    if (d == null) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final l = d.toLocal();
    return '${l.day} ${months[l.month - 1]} ${l.year}';
  }

  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }
}

extension on String {
  /// Minimal grapheme-safe first character without depending on `characters`.
  Iterable<String> get characters => runes.map(String.fromCharCode);
}
