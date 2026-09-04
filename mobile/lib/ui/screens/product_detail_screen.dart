import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/titans_api.dart';
import '../../state/auth_controller.dart';
import '../../state/cart_controller.dart';
import '../../state/wishlist_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import 'account_screen.dart';
import 'store_detail_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.product});

  final Product product;

  static Future<void> open(BuildContext context, Product product) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ProductDetailScreen(product: product)),
      );

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late Product _product = widget.product;
  List<Review>? _reviews;
  Object? _reviewsError;
  int _quantity = 1;
  int _page = 0;
  final _pageController = PageController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = context.read<TitansApi>();
    // Fresh copy of the product (rating/reviews may have changed) + reviews.
    try {
      final fresh = await api.product(_product.id);
      if (mounted) setState(() => _product = fresh);
    } catch (_) {
      // Keep the list copy; not fatal.
    }
    try {
      final reviews = await api.reviews(_product.id);
      if (mounted) {
        setState(() {
          _reviews = reviews;
          _reviewsError = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _reviewsError = e);
    }
  }

  Future<void> _addToCart() async {
    final cart = context.read<CartController>();
    final t = context.t;
    await cart.add(_product, quantity: _quantity);
    if (!mounted) return;
    setState(() => _quantity = 1);
    showSnack(context, t.addedToCart(Fmt.productName(_product.name)));
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final product = _product;
    final images = product.allImages;
    final wishlist = context.watch<WishlistController>();
    final saved = wishlist.contains(product.id);
    final inCart = context.select<CartController, int>((c) => c.quantityOf(product.id));

    return Scaffold(
      appBar: AppBar(
        title: Text(product.sellerName.toUpperCase()),
        actions: [
          IconButton(
            tooltip: t.wishlist,
            icon: Icon(
              saved ? Icons.favorite : Icons.favorite_border,
              color: saved ? TitanColors.destructive : null,
            ),
            onPressed: () async {
              final nowSaved = await wishlist.toggle(product);
              if (!context.mounted) return;
              showSnack(context, nowSaved ? t.addedToWishlist : t.removedFromWishlist);
            },
          ),
        ],
      ),
      body: PixelGridBackground(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            // ------------------------------------------------------ gallery
            PixelFrame(
              padding: EdgeInsets.zero,
              clip: true,
              child: AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (images.isEmpty)
                      const TitanImage(null)
                    else
                      PageView.builder(
                        controller: _pageController,
                        itemCount: images.length,
                        onPageChanged: (i) => setState(() => _page = i),
                        itemBuilder: (context, i) => TitanImage(images[i], memCacheWidth: 1200),
                      ),
                    PositionedDirectional(
                      top: 10,
                      end: 10,
                      child: PixelBadge(product.sellerName),
                    ),
                    if (images.length > 1)
                      Positioned(
                        bottom: 10,
                        left: 0,
                        right: 0,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            for (var i = 0; i < images.length; i++)
                              Container(
                                width: 10,
                                height: 10,
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                decoration: BoxDecoration(
                                  color: i == _page ? TitanColors.arcadeYellow : theme.cardColor,
                                  border: Border.all(color: TitanColors.titanBlack, width: 2),
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (images.length > 1) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: images.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, i) => GestureDetector(
                    onTap: () => _pageController.animateToPage(
                      i,
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeOut,
                    ),
                    child: Container(
                      width: 64,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: i == _page ? TitanColors.arcadeYellow : theme.colorScheme.onSurface,
                          width: i == _page ? 3 : 2,
                        ),
                      ),
                      child: TitanImage(images[i], memCacheWidth: 200),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),

            // ------------------------------------------------------ heading
            Text(
              Fmt.categoryLabel(product.category).toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            Text(
              Fmt.productName(product.name).toUpperCase(),
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: product.storeSlug == null
                  ? null
                  : () => StoreDetailScreen.openBySlug(context, product.storeSlug!),
              child: Row(
                children: [
                  Text('${t.store}: ', style: theme.textTheme.bodyMedium),
                  Text(
                    product.sellerName,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      decoration: product.storeSlug == null ? null : TextDecoration.underline,
                    ),
                  ),
                  if (product.storeSlug != null) const Icon(Icons.chevron_right, size: 18),
                ],
              ),
            ),
            const SizedBox(height: 10),
            RatingRow(rating: product.rating, reviewCount: product.reviewCount),
            const Divider(height: 32),

            // -------------------------------------------------- description
            Text(
              product.description.isEmpty ? t.noDescription : product.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontStyle: product.description.isEmpty ? FontStyle.italic : FontStyle.normal,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              t.stlContact(product.sellerName),
              style: theme.textTheme.bodySmall?.copyWith(
                color: TitanColors.destructive,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (product.tags.isNotEmpty) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text('${t.tags}:', style: theme.textTheme.labelMedium),
                  for (final tag in product.tags)
                    PixelBadge(tag, color: theme.cardColor, textColor: theme.colorScheme.onSurface),
                ],
              ),
            ],
            const Divider(height: 32),

            // ------------------------------------------------------ purchase
            Text(Fmt.price(product.price), style: theme.textTheme.displayMedium),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(t.quantity, style: theme.textTheme.labelMedium),
                const SizedBox(width: 12),
                PixelIconButton(
                  icon: Icons.remove,
                  onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                ),
                SizedBox(
                  width: 44,
                  child: Text(
                    '$_quantity',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall,
                  ),
                ),
                PixelIconButton(
                  icon: Icons.add,
                  onPressed: _quantity < 99 ? () => setState(() => _quantity++) : null,
                ),
              ],
            ),
            const SizedBox(height: 16),
            PixelButton(
              label: t.addToCart,
              icon: Icons.shopping_cart_outlined,
              expand: true,
              onPressed: _addToCart,
            ),
            if (inCart > 0) ...[
              const SizedBox(height: 10),
              Text(t.inCart(inCart), style: theme.textTheme.bodySmall),
            ],
            const SizedBox(height: 28),

            // ------------------------------------------------------- reviews
            Row(
              children: [
                PixelBadge('RV', color: theme.colorScheme.onSurface, textColor: theme.colorScheme.surface),
                const SizedBox(width: 10),
                Text(t.reviews.toUpperCase(), style: theme.textTheme.headlineSmall),
              ],
            ),
            const SizedBox(height: 14),
            _ReviewComposer(product: product, onSaved: _load),
            const SizedBox(height: 14),
            if (_reviewsError != null)
              Text(t.somethingWentWrong, style: theme.textTheme.bodySmall)
            else if (_reviews == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_reviews!.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  border: Border.all(color: theme.colorScheme.onSurfaceVariant, width: 2),
                ),
                child: Text(
                  t.noReviewsBody,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall,
                ),
              )
            else
              for (final review in _reviews!) ...[
                _ReviewCard(review: review),
                const SizedBox(height: 12),
              ],
          ],
        ),
      ),
    );
  }
}

class _ReviewComposer extends StatefulWidget {
  const _ReviewComposer({required this.product, required this.onSaved});

  final Product product;
  final Future<void> Function() onSaved;

  @override
  State<_ReviewComposer> createState() => _ReviewComposerState();
}

class _ReviewComposerState extends State<_ReviewComposer> {
  int _rating = 5;
  final _title = TextEditingController();
  final _body = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final api = context.read<TitansApi>();
    final t = context.t;
    setState(() => _saving = true);
    try {
      await api.postReview(
        widget.product.id,
        rating: _rating,
        title: _title.text.trim(),
        body: _body.text.trim(),
      );
      _title.clear();
      _body.clear();
      if (mounted) showSnack(context, t.reviewSaved);
      await widget.onSaved();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final auth = context.watch<AuthController>();

    if (!auth.isLoggedIn) {
      return PixelFrame(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.signInToReview, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
            PixelButton(
              label: t.login,
              icon: Icons.login,
              small: true,
              onPressed: () => LoginScreen.open(context),
            ),
          ],
        ),
      );
    }

    return PixelFrame(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.writeReview.toUpperCase(), style: theme.textTheme.labelLarge),
          const SizedBox(height: 12),
          Text(t.yourRating, style: theme.textTheme.labelMedium),
          const SizedBox(height: 4),
          Row(
            children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  icon: Icon(
                    i <= _rating ? Icons.star : Icons.star_border,
                    color: TitanColors.arcadeYellow,
                    size: 28,
                  ),
                  onPressed: () => setState(() => _rating = i),
                ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _title,
            maxLength: 120,
            decoration: InputDecoration(hintText: t.reviewTitle, counterText: ''),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _body,
            minLines: 3,
            maxLines: 6,
            maxLength: 4000,
            decoration: InputDecoration(hintText: t.reviewBody, counterText: ''),
          ),
          const SizedBox(height: 12),
          PixelButton(
            label: t.submit,
            icon: Icons.send,
            small: true,
            busy: _saving,
            onPressed: _saving ? null : _submit,
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = context.t;
    return PixelFrame(
      shadow: 3,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              for (var i = 0; i < 5; i++)
                Icon(
                  i < review.rating ? Icons.star : Icons.star_border,
                  size: 16,
                  color: TitanColors.arcadeYellow,
                ),
              const Spacer(),
              if (review.verifiedPurchase)
                PixelBadge(t.verifiedPurchase, color: TitanColors.success, textColor: Colors.white),
            ],
          ),
          if (review.title.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(review.title, style: theme.textTheme.titleSmall),
          ],
          if (review.body.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(review.body, style: theme.textTheme.bodyMedium),
          ],
          const SizedBox(height: 10),
          Text(
            '${review.userName} · ${Fmt.shortDate(review.createdAt)}',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
