import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/config.dart';
import 'core/l10n.dart';
import 'core/theme.dart';
import 'data/cookie_jar.dart';
import 'data/titans_api.dart';
import 'state/app_settings.dart';
import 'state/auth_controller.dart';
import 'state/cart_controller.dart';
import 'state/catalog_controller.dart';
import 'state/wishlist_controller.dart';
import 'ui/screens/shell_screen.dart';

const _kCookies = 'auth.cookies';

/// Wires up services + state and hosts [TitansApp].
///
/// [client] lets tests inject a fake HTTP client.
class TitansRoot extends StatefulWidget {
  const TitansRoot({super.key, required this.prefs, this.client});

  final SharedPreferences prefs;
  final http.Client? client;

  @override
  State<TitansRoot> createState() => _TitansRootState();
}

class _TitansRootState extends State<TitansRoot> {
  late final TitansApi _api;
  late final AppSettings _settings;

  @override
  void initState() {
    super.initState();
    _api = TitansApi(
      client: widget.client,
      cookies: CookieJar.fromJson(widget.prefs.getString(_kCookies)),
      onCookiesChanged: (jar) {
        if (jar.isEmpty) {
          widget.prefs.remove(_kCookies);
        } else {
          widget.prefs.setString(_kCookies, jar.toJson());
        }
      },
    );
    _settings = AppSettings(widget.prefs);
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<TitansApi>.value(value: _api),
        ChangeNotifierProvider<AppSettings>.value(value: _settings),
        ChangeNotifierProvider<AuthController>(
          create: (_) => AuthController(_api)..restore(),
        ),
        ChangeNotifierProvider<CatalogController>(
          create: (_) => CatalogController(_api)..load(),
        ),
        ChangeNotifierProxyProvider<AuthController, CartController>(
          create: (_) => CartController(_api, widget.prefs),
          update: (_, auth, cart) => cart!..attachAuth(auth),
        ),
        ChangeNotifierProxyProvider<AuthController, WishlistController>(
          create: (_) => WishlistController(_api, widget.prefs),
          update: (_, auth, wishlist) => wishlist!..attachAuth(auth),
        ),
      ],
      child: const TitansApp(),
    );
  }
}

class TitansApp extends StatelessWidget {
  const TitansApp({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppSettings>();
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: TitanTheme.light(),
      darkTheme: TitanTheme.dark(),
      themeMode: settings.themeMode,
      locale: settings.locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      localeResolutionCallback: (device, supported) {
        if (device != null) {
          for (final l in supported) {
            if (l.languageCode == device.languageCode) return l;
          }
        }
        return const Locale('en');
      },
      // The resolved locale is only known below MaterialApp, so the
      // language-aware theme (Arabic uses a Kufi font at larger sizes) is
      // applied here, above the Navigator so dialogs and sheets get it too.
      builder: (context, child) {
        final arabic = Localizations.localeOf(context).languageCode == 'ar';
        final brightness = Theme.of(context).brightness;
        return Theme(
          data: TitanTheme.forBrightness(brightness, arabic: arabic),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: const ShellScreen(),
    );
  }
}
