import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../state/cart_controller.dart';
import '../../state/wishlist_controller.dart';
import '../screens/product_detail_screen.dart';
import '../screens/store_detail_screen.dart';
import 'common.dart';
import 'pixel.dart';

/// Grid tile for a product — mirrors the website's product card.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, this.showStore = true});

  final Product product;
  final bool showStore;

  /// Height of the text/price block under the square image (fixed so grids
  /// can size their cells exactly: image = width, plus this). Arabic uses a
  /// larger font, so the block grows with [TitanTheme.uiScale].
  static double bodyHeight(BuildContext context) => 152 * TitanTheme.uiScale(context);

  /// Total card height for a given card width (square image + body).
  static double heightFor(BuildContext context, double width) => width + bodyHeight(context);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = context.t;
    final wishlist = context.watch<WishlistController>();
    final saved = wishlist.contains(product.id);

    return GestureDetector(
      onTap: () => ProductDetailScreen.open(context, product),
      child: PixelFrame(
        shadow: 4,
        padding: EdgeInsets.zero,
        clip: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: theme.colorScheme.onSurface, width: 2),
                      ),
                    ),
                    child: TitanImage(product.imageUrl, memCacheWidth: 600),
                  ),
                ),
                if (showStore)
                  PositionedDirectional(
                    top: 8,
                    end: 8,
                    child: GestureDetector(
                      onTap: product.storeSlug == null
                          ? null
                          : () => StoreDetailScreen.openBySlug(context, product.storeSlug!),
                      child: PixelBadge(product.sellerName),
                    ),
                  ),
                if (product.has3dPreview)
                  PositionedDirectional(
                    top: 8,
                    start: 8,
                    child: PixelBadge(
                      t.preview3d,
                      color: theme.colorScheme.onSurface,
                      textColor: theme.colorScheme.surface,
                    ),
                  ),
                PositionedDirectional(
                  bottom: 8,
                  start: 8,
                  child: PixelIconButton(
                    icon: saved ? Icons.favorite : Icons.favorite_border,
                    iconColor: saved ? TitanColors.destructive : null,
                    size: 34,
                    tooltip: t.wishlist,
                    onPressed: () async {
                      final nowSaved = await wishlist.toggle(product);
                      if (!context.mounted) return;
                      showSnack(context, nowSaved ? t.addedToWishlist : t.removedFromWishlist);
                    },
                  ),
                ),
              ],
            ),
            SizedBox(
              height: bodyHeight(context) - 4, // minus the frame's top+bottom border
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      height: 16 * TitanTheme.uiScale(context),
                      child: Text(
                        Fmt.categoryLabel(product.category).toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1, height: 1.3),
                      ),
                    ),
                    const SizedBox(height: 4),
                    SizedBox(
                      height: 40 * TitanTheme.uiScale(context),
                      child: Text(
                        Fmt.productName(product.name),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(height: 1.4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    SizedBox(
                      height: 18 * TitanTheme.uiScale(context),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: AlignmentDirectional.centerStart,
                        child: RatingRow(
                          rating: product.rating,
                          reviewCount: product.reviewCount,
                          compact: true,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            Fmt.price(product.price),
                            style: theme.textTheme.headlineSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        _AddToCartButton(product: product),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddToCartButton extends StatelessWidget {
  const _AddToCartButton({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final cart = context.read<CartController>();
    return PixelIconButton(
      icon: Icons.add_shopping_cart,
      filled: true,
      size: 36,
      tooltip: t.addToCart,
      onPressed: () async {
        await cart.add(product);
        if (!context.mounted) return;
        showSnack(context, t.addedToCart(Fmt.productName(product.name)));
      },
    );
  }
}

/// Compact horizontal-scroll variant used on the home page.
class ProductTile extends StatelessWidget {
  const ProductTile({super.key, required this.product, this.width = 170});

  final Product product;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: ProductCard.heightFor(context, width),
      child: ProductCard(product: product),
    );
  }
}
