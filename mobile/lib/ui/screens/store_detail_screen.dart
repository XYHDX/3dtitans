import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/titans_api.dart';
import '../../state/catalog_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import '../widgets/product_card.dart';
import '../widgets/store_card.dart';
import 'products_screen.dart';

class StoreDetailScreen extends StatefulWidget {
  const StoreDetailScreen({super.key, this.store, this.slug})
      : assert(store != null || slug != null, 'Provide a store or a slug');

  final Store? store;
  final String? slug;

  static Future<void> open(BuildContext context, Store store) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => StoreDetailScreen(store: store)),
      );

  static Future<void> openBySlug(BuildContext context, String slug) {
    final known = context.read<CatalogController>().storeBySlug(slug);
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => StoreDetailScreen(store: known, slug: slug)),
    );
  }

  @override
  State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen> {
  Store? _store;
  List<Product>? _products;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _store = widget.store;
    _load();
  }

  Future<void> _load() async {
    final api = context.read<TitansApi>();
    final slug = _store?.slug ?? widget.slug!;
    try {
      final results = await Future.wait<Object>([
        api.store(slug),
        api.products(storeSlug: slug),
      ]);
      if (!mounted) return;
      setState(() {
        _store = results[0] as Store;
        _products = results[1] as List<Product>;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      // Fall back to what the catalog already knows about this store.
      final catalog = context.read<CatalogController>();
      final known = _store ?? catalog.storeBySlug(slug);
      setState(() {
        _store = known;
        _products = known == null ? null : catalog.productsOfStore(known);
        _error = known == null ? e : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final store = _store;

    if (store == null) {
      return Scaffold(
        appBar: AppBar(title: Text(t.store.toUpperCase())),
        body: _error == null ? const LoadingView() : ErrorView(error: _error!, onRetry: _load),
      );
    }

    final website = Fmt.websiteUri(store.websiteUrl);
    final products = _products;

    return Scaffold(
      appBar: AppBar(title: Text(store.name.toUpperCase())),
      body: PixelGridBackground(
        child: RefreshIndicator(
          onRefresh: _load,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: PixelFrame(
                    padding: EdgeInsets.zero,
                    clip: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          height: 150,
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: theme.colorScheme.onSurface, width: 2),
                              ),
                            ),
                            child: store.coverUrl != null
                                ? TitanImage(store.coverUrl, memCacheWidth: 1200)
                                : const DecoratedBox(
                                    decoration: BoxDecoration(color: TitanColors.arcadeYellow),
                                    child: PixelGridBackground(child: SizedBox.expand()),
                                  ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              StoreAvatar(store: store, size: 64),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(store.name.toUpperCase(),
                                        style: theme.textTheme.headlineMedium),
                                    const SizedBox(height: 4),
                                    Text('/${store.slug}', style: theme.textTheme.bodySmall),
                                    const SizedBox(height: 6),
                                    Text(
                                      t.productsCount(products?.length ?? store.productsCount),
                                      style: theme.textTheme.labelMedium,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final wide = constraints.maxWidth >= 600;
                      final about = PixelFrame(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t.aboutThisStore.toUpperCase(), style: theme.textTheme.labelLarge),
                            const SizedBox(height: 10),
                            Text(
                              store.hasBio ? store.bio : t.storeNoBio,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontStyle: store.hasBio ? FontStyle.normal : FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                      );
                      final glance = PixelFrame(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t.atAGlance.toUpperCase(), style: theme.textTheme.labelLarge),
                            const SizedBox(height: 10),
                            _GlanceRow(label: t.storeStatus, value: t.published),
                            _GlanceRow(
                              label: t.products,
                              value: '${products?.length ?? store.productsCount}',
                            ),
                            if (website != null)
                              InkWell(
                                onTap: () => openExternal(context, website),
                                child: _GlanceRow(
                                  label: t.website,
                                  value: Fmt.prettyUrl(website),
                                  link: true,
                                ),
                              ),
                          ],
                        ),
                      );
                      if (wide) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(flex: 3, child: about),
                            const SizedBox(width: 16),
                            Expanded(flex: 2, child: glance),
                          ],
                        );
                      }
                      return Column(children: [about, const SizedBox(height: 16), glance]);
                    },
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SectionHeader(title: t.productsFromStore),
              ),
              if (products == null)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                )
              else if (products.isEmpty)
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 220,
                    child: EmptyView(icon: Icons.inventory_2_outlined, title: t.noProducts),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverGrid(
                    gridDelegate: ProductGrid.delegateFor(context, MediaQuery.sizeOf(context).width),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => ProductCard(product: products[i], showStore: false),
                      childCount: products.length,
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

class _GlanceRow extends StatelessWidget {
  const _GlanceRow({required this.label, required this.value, this.link = false});

  final String label;
  final String value;
  final bool link;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: theme.textTheme.bodySmall),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
                decoration: link ? TextDecoration.underline : null,
              ),
            ),
          ),
          if (link) const Icon(Icons.open_in_new, size: 14),
        ],
      ),
    );
  }
}
