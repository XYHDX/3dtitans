import 'package:flutter/material.dart';

/// Brand palette — mirrors `src/app/globals.css` on 3dtitans.org.
class TitanColors {
  TitanColors._();

  static const Color arcadeYellow = Color(0xFFFFC107); // --primary / --accent
  static const Color titanBlack = Color(0xFF0F0F11); // --foreground (light)
  static const Color crispWhite = Color(0xFFF8F9FA); // --background (light)
  static const Color darkCard = Color(0xFF1A1A1E); // --card (dark)
  static const Color mutedLight = Color(0xFFEAECEE); // --muted (light)
  static const Color mutedForegroundLight = Color(0xFF5D6066);
  static const Color mutedDark = Color(0xFF232329); // --muted (dark)
  static const Color mutedForegroundDark = Color(0xFFADB3B8);
  static const Color destructive = Color(0xFFC8442F); // --destructive
  static const Color success = Color(0xFF2E8B57);
}

/// Font families bundled in `assets/fonts` (see pubspec.yaml).
class TitanFonts {
  TitanFonts._();

  /// Pixel display font — headlines, prices, buttons (same as the website).
  static const String pixel = 'PressStart2P';

  /// Monospace body font.
  static const String mono = 'SpaceMono';

  /// Arabic UI font (geometric Kufi, variable weight) — used for every style
  /// when the app runs in Arabic, since the pixel/mono fonts have no Arabic.
  static const String kufi = 'NotoKufiArabic';
}

/// Font scale applied in Arabic: Kufi glyphs are visually smaller than the
/// Latin pixel font at the same point size, and Arabic needs more room.
const double _kArabicDisplayScale = 1.4;
const double _kArabicBodyScale = 1.12;

TextStyle _pixel(double size, {required bool arabic, Color? color, double? height}) {
  if (arabic) {
    return TextStyle(
      fontFamily: TitanFonts.kufi,
      fontFamilyFallback: const [TitanFonts.pixel],
      fontVariations: const [FontVariation('wght', 700)],
      fontWeight: FontWeight.w700,
      fontSize: size * _kArabicDisplayScale,
      height: height ?? 1.5,
      color: color,
    );
  }
  return TextStyle(
    fontFamily: TitanFonts.pixel,
    fontFamilyFallback: const [TitanFonts.kufi],
    fontSize: size,
    height: height ?? 1.6,
    color: color,
  );
}

TextStyle _mono(double size,
    {required bool arabic, FontWeight weight = FontWeight.w400, Color? color, double? height}) {
  if (arabic) {
    final bold = weight.value >= FontWeight.w600.value;
    return TextStyle(
      fontFamily: TitanFonts.kufi,
      fontFamilyFallback: const [TitanFonts.mono],
      fontVariations: [FontVariation('wght', bold ? 700 : 400)],
      fontWeight: weight,
      fontSize: size * _kArabicBodyScale,
      height: height ?? 1.6,
      color: color,
    );
  }
  return TextStyle(
    fontFamily: TitanFonts.mono,
    fontFamilyFallback: const [TitanFonts.kufi],
    fontSize: size,
    fontWeight: weight,
    height: height ?? 1.5,
    color: color,
  );
}

/// Builds the light / dark [ThemeData] with the website's pixel-art look:
/// square corners, 2px borders and hard offset shadows instead of blur.
class TitanTheme {
  TitanTheme._();

  static ThemeData light({bool arabic = false}) => _build(Brightness.light, arabic: arabic);

  static ThemeData dark({bool arabic = false}) => _build(Brightness.dark, arabic: arabic);

  static ThemeData forBrightness(Brightness brightness, {required bool arabic}) =>
      _build(brightness, arabic: arabic);

  /// True when the app is currently showing Arabic.
  static bool isArabic(BuildContext context) =>
      Localizations.maybeLocaleOf(context)?.languageCode == 'ar';

  /// Multiplier for fixed layout heights that contain text (cards, badges).
  static double uiScale(BuildContext context) => isArabic(context) ? 1.15 : 1.0;

  /// Pixel/display style that follows the current language.
  static TextStyle pixelStyle(BuildContext context, double size, {Color? color, double? height}) =>
      _pixel(size, arabic: isArabic(context), color: color ?? Theme.of(context).colorScheme.onSurface, height: height);

  /// Body/mono style that follows the current language.
  static TextStyle monoStyle(BuildContext context, double size,
          {FontWeight weight = FontWeight.w400, Color? color, double? height}) =>
      _mono(size,
          arabic: isArabic(context),
          weight: weight,
          color: color ?? Theme.of(context).colorScheme.onSurface,
          height: height);

  /// Hard "pixel" shadow used by frames and buttons.
  static List<BoxShadow> pixelShadow(BuildContext context, {double offset = 4}) {
    final scheme = Theme.of(context).colorScheme;
    final color = scheme.brightness == Brightness.dark
        ? TitanColors.arcadeYellow
        : scheme.onSurface;
    return [BoxShadow(color: color, offset: Offset(offset, offset))];
  }

  static ThemeData _build(Brightness brightness, {required bool arabic}) {
    final isDark = brightness == Brightness.dark;
    final surface = isDark ? TitanColors.titanBlack : TitanColors.crispWhite;
    final onSurface = isDark ? TitanColors.crispWhite : TitanColors.titanBlack;
    final card = isDark ? TitanColors.darkCard : Colors.white;
    final muted = isDark ? TitanColors.mutedDark : TitanColors.mutedLight;
    final mutedForeground =
        isDark ? TitanColors.mutedForegroundDark : TitanColors.mutedForegroundLight;

    final scheme = ColorScheme(
      brightness: brightness,
      primary: TitanColors.arcadeYellow,
      onPrimary: TitanColors.titanBlack,
      primaryContainer: TitanColors.arcadeYellow,
      onPrimaryContainer: TitanColors.titanBlack,
      secondary: onSurface,
      onSecondary: surface,
      tertiary: TitanColors.success,
      onTertiary: Colors.white,
      error: TitanColors.destructive,
      onError: Colors.white,
      surface: surface,
      onSurface: onSurface,
      surfaceContainerLowest: surface,
      surfaceContainerLow: card,
      surfaceContainer: muted,
      surfaceContainerHigh: muted,
      surfaceContainerHighest: card,
      onSurfaceVariant: mutedForeground,
      outline: onSurface,
      outlineVariant: mutedForeground,
      inverseSurface: onSurface,
      onInverseSurface: surface,
      inversePrimary: TitanColors.arcadeYellow,
      surfaceTint: Colors.transparent,
    );

    const squareSide = BorderSide(width: 2);
    final border = squareSide.copyWith(color: onSurface);
    final square = RoundedRectangleBorder(borderRadius: BorderRadius.zero, side: border);

    TextStyle pixel(double size, {Color? color, double? height}) =>
        _pixel(size, arabic: arabic, color: color ?? onSurface, height: height);
    TextStyle mono(double size, {FontWeight weight = FontWeight.w400, Color? color, double? height}) =>
        _mono(size, arabic: arabic, weight: weight, color: color ?? onSurface, height: height);

    final textTheme = TextTheme(
      displayLarge: pixel(28, height: 1.4),
      displayMedium: pixel(22, height: 1.4),
      displaySmall: pixel(18),
      headlineLarge: pixel(16),
      headlineMedium: pixel(14),
      headlineSmall: pixel(12),
      titleLarge: pixel(12),
      titleMedium: mono(16, weight: FontWeight.w700),
      titleSmall: mono(14, weight: FontWeight.w700),
      bodyLarge: mono(16),
      bodyMedium: mono(14),
      bodySmall: mono(12, color: mutedForeground),
      labelLarge: pixel(10, height: 1.4),
      labelMedium: mono(12, weight: FontWeight.w700),
      labelSmall: mono(11, weight: FontWeight.w700, color: mutedForeground),
    );

    final buttonBase = ButtonStyle(
      elevation: const WidgetStatePropertyAll(0),
      shape: WidgetStatePropertyAll(square),
      padding: const WidgetStatePropertyAll(
        EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      ),
      textStyle: WidgetStatePropertyAll(pixel(10, height: 1.2)),
      minimumSize: const WidgetStatePropertyAll(Size(48, 44)),
      splashFactory: NoSplash.splashFactory,
    );

    return ThemeData(
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: surface,
      canvasColor: surface,
      cardColor: card,
      dividerColor: onSurface,
      fontFamily: arabic ? TitanFonts.kufi : TitanFonts.mono,
      textTheme: textTheme,
      splashFactory: NoSplash.splashFactory,
      visualDensity: VisualDensity.standard,
      iconTheme: IconThemeData(color: onSurface, size: 22),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: pixel(12, height: 1.2),
        shape: Border(bottom: border),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        height: 68,
        indicatorColor: TitanColors.arcadeYellow,
        indicatorShape: square,
        labelTextStyle: WidgetStatePropertyAll(mono(11, weight: FontWeight.w700)),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: onSurface,
            size: states.contains(WidgetState.selected) ? 22 : 22,
          ),
        ),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: square,
        clipBehavior: Clip.antiAlias,
      ),
      dividerTheme: DividerThemeData(color: onSurface, thickness: 2, space: 2),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: border),
        enabledBorder:
            OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: border),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.zero,
          borderSide: BorderSide(color: TitanColors.arcadeYellow, width: 3),
        ),
        errorBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.zero,
          borderSide: BorderSide(color: TitanColors.destructive, width: 2),
        ),
        focusedErrorBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.zero,
          borderSide: BorderSide(color: TitanColors.destructive, width: 3),
        ),
        labelStyle: mono(14, color: mutedForeground),
        hintStyle: mono(14, color: mutedForeground),
        errorStyle: mono(12, color: TitanColors.destructive),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: buttonBase.copyWith(
          backgroundColor: const WidgetStatePropertyAll(TitanColors.arcadeYellow),
          foregroundColor: const WidgetStatePropertyAll(TitanColors.titanBlack),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: buttonBase.copyWith(
          backgroundColor: WidgetStatePropertyAll(card),
          foregroundColor: WidgetStatePropertyAll(onSurface),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: buttonBase.copyWith(
          foregroundColor: WidgetStatePropertyAll(onSurface),
          side: WidgetStatePropertyAll(border),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStatePropertyAll(onSurface),
          textStyle: WidgetStatePropertyAll(mono(14, weight: FontWeight.w700)),
          splashFactory: NoSplash.splashFactory,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStatePropertyAll(onSurface),
          splashFactory: NoSplash.splashFactory,
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: card,
        selectedColor: TitanColors.arcadeYellow,
        disabledColor: muted,
        side: border,
        shape: square,
        showCheckmark: false,
        labelStyle: mono(12, weight: FontWeight.w700, color: onSurface),
        secondaryLabelStyle:
            mono(12, weight: FontWeight.w700, color: TitanColors.titanBlack),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        labelPadding: EdgeInsets.zero,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: onSurface,
        contentTextStyle: mono(14, color: surface),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        actionTextColor: TitanColors.arcadeYellow,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: square,
        titleTextStyle: pixel(12),
        contentTextStyle: mono(14),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: Border(top: border),
        showDragHandle: true,
        dragHandleColor: onSurface,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: TitanColors.arcadeYellow,
      ),
      listTileTheme: ListTileThemeData(
        iconColor: onSurface,
        titleTextStyle: mono(14, weight: FontWeight.w700),
        subtitleTextStyle: mono(12, color: mutedForeground),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(square),
          side: WidgetStatePropertyAll(border),
          textStyle: WidgetStatePropertyAll(mono(12, weight: FontWeight.w700)),
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) =>
                states.contains(WidgetState.selected) ? TitanColors.arcadeYellow : card,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (states) =>
                states.contains(WidgetState.selected) ? TitanColors.titanBlack : onSurface,
          ),
          splashFactory: NoSplash.splashFactory,
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? TitanColors.titanBlack : onSurface,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? TitanColors.arcadeYellow : muted,
        ),
      ),
    );
  }
}
