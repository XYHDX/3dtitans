/// Central place for environment-style constants.
///
/// The app talks to the live 3dtitans.org Next.js API. If you ever run the
/// website locally (`npm run dev`), point [AppConfig.baseUrl] at
/// `http://localhost:3000` (and on a physical iPhone, at your Mac's LAN IP).
class AppConfig {
  AppConfig._();

  /// Website origin — also used for the checkout / upload hand-off links.
  static const String baseUrl = 'https://3dtitans.org';

  /// REST API root (Next.js route handlers under `src/app/api`).
  static const String apiUrl = '$baseUrl/api';

  static const String appName = '3D Titans';

  static const Duration requestTimeout = Duration(seconds: 20);

  /// Website pages the app hands off to (they need the web session, so the
  /// user may be asked to log in again in the browser).
  static const String checkoutUrl = '$baseUrl/checkout';
  static const String uploadUrl = '$baseUrl/upload';
  static const String ordersUrl = '$baseUrl/orders';
  static const String loginUrl = '$baseUrl/login';
  static const String forgotPasswordUrl = '$baseUrl/forgot-password';
  static const String privacyUrl = '$baseUrl/privacy';
  static const String termsUrl = '$baseUrl/terms';
  static const String supportUrl = '$baseUrl/support';
}
