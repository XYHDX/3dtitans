import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../state/cart_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import 'checkout_screen.dart';
import 'product_detail_screen.dart';
import 'shell_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  Future<void> _confirmClear(BuildContext context) async {
    final t = context.t;
    final cart = context.read<CartController>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.clearCart.toUpperCase()),
        content: Text(t.clearCartConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.cancel)),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.clearCart, style: const TextStyle(color: TitanColors.destructive)),
          ),
        ],
      ),
    );
    if (ok == true) await cart.clear();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final cart = context.watch<CartController>();

    return Scaffold(
      appBar: AppBar(
        title: Text(t.cartTitle.toUpperCase()),
        actions: [
          if (!cart.isEmpty)
            IconButton(
              tooltip: t.clearCart,
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _confirmClear(context),
            ),
        ],
      ),
      body: PixelGridBackground(
        child: cart.isEmpty
            ? EmptyView(
                icon: Icons.shopping_cart_outlined,
                title: t.cartEmpty,
                body: t.cartEmptyBody,
                actionLabel: t.continueShopping,
                onAction: () => ShellScreen.go(context, ShellTab.shop),
              )
            : Column(
                children: [
                  if (cart.syncing) const LinearProgressIndicator(minHeight: 3),
                  if (cart.error != null)
                    MaterialBanner(
                      content: Text(cart.error!.isNetwork ? t.networkError : cart.error!.message),
                      leading: const Icon(Icons.error_outline, color: TitanColors.destructive),
                      actions: [
                        TextButton(onPressed: cart.clearError, child: Text(t.ok)),
                      ],
                    ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: cart.refresh,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                        itemCount: cart.lines.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, i) => _CartLineTile(line: cart.lines[i]),
                      ),
                    ),
                  ),
                  _CartSummary(cart: cart),
                ],
              ),
      ),
      // Keep the summary above the bottom navigation bar of the shell.
      bottomNavigationBar: null,
      backgroundColor: theme.scaffoldBackgroundColor,
    );
  }
}

class _CartLineTile extends StatelessWidget {
  const _CartLineTile({required this.line});

  final CartLine line;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final cart = context.read<CartController>();
    final product = line.product;

    return PixelFrame(
      shadow: 3,
      padding: const EdgeInsets.all(10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => ProductDetailScreen.open(context, product),
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                border: Border.all(color: theme.colorScheme.onSurface, width: 2),
              ),
              clipBehavior: Clip.hardEdge,
              child: TitanImage(product.imageUrl, memCacheWidth: 300),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  Fmt.productName(product.name),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 2),
                Text(t.byStore(product.sellerName), style: theme.textTheme.bodySmall),
                const SizedBox(height: 8),
                Row(
                  children: [
                    PixelIconButton(
                      icon: Icons.remove,
                      size: 32,
                      onPressed: () => cart.setQuantity(product, line.quantity - 1),
                    ),
                    SizedBox(
                      width: 36,
                      child: Text(
                        '${line.quantity}',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleSmall,
                      ),
                    ),
                    PixelIconButton(
                      icon: Icons.add,
                      size: 32,
                      onPressed: line.quantity >= 99
                          ? null
                          : () => cart.setQuantity(product, line.quantity + 1),
                    ),
                    const Spacer(),
                    Text(Fmt.price(line.lineTotal), style: theme.textTheme.headlineSmall),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          IconButton(
            tooltip: t.remove,
            icon: const Icon(Icons.close, size: 20),
            onPressed: () => cart.remove(product.id),
          ),
        ],
      ),
    );
  }
}

class _CartSummary extends StatelessWidget {
  const _CartSummary({required this.cart});

  final CartController cart;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        border: Border(top: BorderSide(color: theme.colorScheme.onSurface, width: 2)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Text(
                  '${t.subtotal} · ${t.itemsCount(cart.itemCount)}',
                  style: theme.textTheme.bodyMedium,
                ),
                const Spacer(),
                Text(Fmt.price(cart.subtotal), style: theme.textTheme.displaySmall),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  cart.isServerBacked ? Icons.cloud_done_outlined : Icons.phone_iphone,
                  size: 16,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    cart.isServerBacked ? t.checkoutNote : t.guestCartNote,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            PixelButton(
              label: t.checkout,
              icon: Icons.arrow_forward,
              expand: true,
              onPressed: () => CheckoutScreen.open(context),
            ),
          ],
        ),
      ),
    );
  }
}
