import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../state/wishlist_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import 'products_screen.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const WishlistScreen()),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final wishlist = context.watch<WishlistController>();

    return Scaffold(
      appBar: AppBar(title: Text(t.wishlist.toUpperCase())),
      body: PixelGridBackground(
        child: wishlist.isEmpty
            ? EmptyView(
                icon: Icons.favorite_border,
                title: t.wishlistEmpty,
                body: t.wishlistEmptyBody,
                actionLabel: t.continueShopping,
                onAction: () => Navigator.of(context).maybePop(),
              )
            : RefreshIndicator(
                onRefresh: wishlist.refresh,
                child: Column(
                  children: [
                    if (wishlist.syncing) const LinearProgressIndicator(minHeight: 3),
                    Expanded(
                      child: ProductGrid(
                        products: wishlist.items,
                        header: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                          child: Text(
                            t.productsCount(wishlist.items.length),
                            style: Theme.of(context).textTheme.labelSmall,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
