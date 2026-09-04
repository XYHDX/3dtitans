import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../screens/store_detail_screen.dart';
import 'common.dart';
import 'pixel.dart';

/// Store directory tile: cover, avatar, name, bio, product count, website.
class StoreCard extends StatelessWidget {
  const StoreCard({super.key, required this.store, this.compact = false});

  final Store store;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = context.t;
    final website = Fmt.websiteUri(store.websiteUrl);

    return GestureDetector(
      onTap: () => StoreDetailScreen.open(context, store),
      child: PixelFrame(
        padding: EdgeInsets.zero,
        clip: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: compact ? 72 : 96,
              child: Container(
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: theme.colorScheme.onSurface, width: 2)),
                ),
                child: store.coverUrl != null
                    ? TitanImage(store.coverUrl, memCacheWidth: 900)
                    : const _CoverFallback(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      StoreAvatar(store: store, size: compact ? 36 : 44),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              store.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.headlineSmall?.copyWith(fontSize: 10),
                            ),
                            const SizedBox(height: 2),
                            Text('/${store.slug}', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    store.hasBio ? store.bio : t.storeNoBio,
                    maxLines: compact ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontStyle: store.hasBio ? FontStyle.normal : FontStyle.italic,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        t.productsCount(store.productsCount),
                        style: theme.textTheme.labelMedium,
                      ),
                      const Spacer(),
                      if (website != null && !compact)
                        Flexible(
                          child: Text(
                            Fmt.prettyUrl(website),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textDirection: TextDirection.ltr,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CoverFallback extends StatelessWidget {
  const _CoverFallback();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [TitanColors.arcadeYellow, Color(0xFFFFE08A)],
        ),
      ),
      child: PixelGridBackground(child: SizedBox.expand()),
    );
  }
}

/// Square avatar with a border; falls back to the store's initials.
class StoreAvatar extends StatelessWidget {
  const StoreAvatar({super.key, required this.store, this.size = 44});

  final Store store;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        color: TitanColors.arcadeYellow,
        border: Border.all(color: scheme.onSurface, width: 2),
      ),
      child: store.avatarUrl != null
          ? TitanImage(store.avatarUrl, memCacheWidth: 200)
          : Center(
              child: Text(
                Fmt.initials(store.name),
                style: TitanTheme.pixelStyle(context, size * 0.3, color: TitanColors.titanBlack),
              ),
            ),
    );
  }
}
