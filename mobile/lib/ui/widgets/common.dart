import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/titans_api.dart';
import 'pixel.dart';

/// Network image with a pixel placeholder and a graceful error state.
class TitanImage extends StatelessWidget {
  const TitanImage(
    this.url, {
    super.key,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.memCacheWidth,
  });

  final String? url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final int? memCacheWidth;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final placeholderColor = scheme.surfaceContainer;
    final u = url?.trim() ?? '';
    if (u.isEmpty) return _Fallback(color: placeholderColor);

    return Image.network(
      u,
      fit: fit,
      width: width,
      height: height,
      cacheWidth: memCacheWidth,
      gaplessPlayback: true,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: placeholderColor,
          alignment: Alignment.center,
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              value: progress.expectedTotalBytes != null
                  ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                  : null,
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) => _Fallback(color: placeholderColor),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: color,
      alignment: Alignment.center,
      child: Image.asset(
        Theme.of(context).brightness == Brightness.dark
            ? 'assets/images/cube_dark.png'
            : 'assets/images/cube.png',
        width: 48,
        height: 48,
        filterQuality: FilterQuality.none,
        opacity: const AlwaysStoppedAnimation(0.35),
      ),
    );
  }
}

/// Wordmark logo that follows the theme (dark glyphs on light, light on dark).
class TitanLogo extends StatelessWidget {
  const TitanLogo({super.key, this.height = 28});

  final double height;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Image.asset(
      dark ? 'assets/images/logo_dark.png' : 'assets/images/logo_light.png',
      height: height,
      filterQuality: FilterQuality.none,
      semanticLabel: '3D Titans',
    );
  }
}

/// Stars + "4.5 (117 reviews)" — or an honest "No reviews yet".
class RatingRow extends StatelessWidget {
  const RatingRow({super.key, required this.rating, required this.reviewCount, this.compact = false});

  final double rating;
  final int reviewCount;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (reviewCount <= 0) {
      return Text(
        context.t.noReviewsYet,
        style: theme.textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
      );
    }
    final filled = rating.round().clamp(0, 5);
    final size = compact ? 14.0 : 18.0;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < 5; i++)
          Icon(
            i < filled ? Icons.star : Icons.star_border,
            size: size,
            color: TitanColors.arcadeYellow,
          ),
        const SizedBox(width: 6),
        Text(
          '${rating.toStringAsFixed(1)} (${context.t.reviewsCount(reviewCount)})',
          style: compact ? theme.textTheme.bodySmall : theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 3)),
          const SizedBox(height: 16),
          Text(context.t.loading, style: Theme.of(context).textTheme.labelLarge),
        ],
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final message = switch (error) {
      ApiException(isNetwork: true) => t.networkError,
      ApiException(:final message) => message,
      _ => t.somethingWentWrong,
    };
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: PixelFrame(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 36, color: TitanColors.destructive),
              const SizedBox(height: 12),
              Text(t.somethingWentWrong, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                PixelButton(label: t.retry, icon: Icons.refresh, onPressed: onRetry),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            PixelFrame(
              padding: const EdgeInsets.all(18),
              shadow: 0,
              child: Icon(icon, size: 36),
            ),
            const SizedBox(height: 18),
            Text(title, textAlign: TextAlign.center, style: theme.textTheme.headlineSmall),
            if (body != null) ...[
              const SizedBox(height: 8),
              Text(body!, textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              PixelButton(label: actionLabel!, onPressed: onAction),
            ],
          ],
        ),
      ),
    );
  }
}

/// Opens a URL in the external browser and reports failures with a SnackBar.
Future<void> openExternal(BuildContext context, Uri uri) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final failedMessage = context.t.couldNotOpenLink;
  var ok = false;
  try {
    ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    ok = false;
  }
  if (!ok) {
    messenger?.showSnackBar(SnackBar(content: Text(failedMessage)));
  }
}

void showSnack(BuildContext context, String message, {SnackBarAction? action}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message), action: action));
}

/// Opens a URL in an in-app browser sheet (SFSafariViewController / Custom
/// Tabs) so the user never leaves the app; falls back to the system browser.
Future<void> openInApp(BuildContext context, Uri uri) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final failedMessage = context.t.couldNotOpenLink;
  var ok = false;
  try {
    ok = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
  } catch (_) {
    ok = false;
  }
  if (!ok) {
    try {
      ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      ok = false;
    }
  }
  if (!ok) {
    messenger?.showSnackBar(SnackBar(content: Text(failedMessage)));
  }
}
