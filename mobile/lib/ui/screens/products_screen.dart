import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../data/models.dart';
import '../../state/catalog_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import '../widgets/product_card.dart';

/// "All models": search, category chips, sorting and the product grid.
class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  String? _categoryKey;
  ProductSort _sort = ProductSort.featured;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final catalog = context.watch<CatalogController>();

    return Scaffold(
      appBar: AppBar(
        title: Text(t.allModels.toUpperCase()),
        actions: [
          PopupMenuButton<ProductSort>(
            tooltip: t.sortBy,
            icon: const Icon(Icons.sort),
            initialValue: _sort,
            onSelected: (s) => setState(() => _sort = s),
            itemBuilder: (context) => [
              PopupMenuItem(value: ProductSort.featured, child: Text(t.featured)),
              PopupMenuItem(value: ProductSort.newest, child: Text(t.sortNewest)),
              PopupMenuItem(value: ProductSort.priceLowHigh, child: Text(t.sortPriceLow)),
              PopupMenuItem(value: ProductSort.priceHighLow, child: Text(t.sortPriceHigh)),
              PopupMenuItem(value: ProductSort.name, child: Text(t.sortName)),
            ],
          ),
        ],
      ),
      body: PixelGridBackground(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  hintText: t.searchHint,
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _query.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _query = '');
                          },
                        ),
                ),
              ),
            ),
            _CategoryChips(
              categories: catalog.categories,
              selected: _categoryKey,
              onSelected: (key) => setState(() => _categoryKey = key),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: catalog.refresh,
                child: Builder(
                  builder: (context) {
                    if (!catalog.hasData && catalog.loading) return const LoadingView();
                    if (!catalog.hasData && catalog.error != null) {
                      return ErrorView(error: catalog.error!, onRetry: catalog.refresh);
                    }
                    final items = catalog.filter(
                      query: _query,
                      categoryKey: _categoryKey,
                      sort: _sort,
                    );
                    if (items.isEmpty) {
                      return ListView(
                        children: [
                          SizedBox(
                            height: 360,
                            child: EmptyView(
                              icon: Icons.search_off,
                              title: t.noProducts,
                              actionLabel: t.allCategories,
                              onAction: () {
                                _searchController.clear();
                                setState(() {
                                  _query = '';
                                  _categoryKey = null;
                                });
                              },
                            ),
                          ),
                        ],
                      );
                    }
                    return ProductGrid(
                      products: items,
                      header: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                        child: Text(
                          t.productsCount(items.length),
                          style: theme.textTheme.labelSmall,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.selected,
    required this.onSelected,
  });

  final Map<String, String> categories;
  final String? selected;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return SizedBox(
      height: 46,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 8),
            child: FilterChip(
              label: Text(t.allCategories),
              selected: selected == null,
              onSelected: (_) => onSelected(null),
            ),
          ),
          for (final entry in categories.entries)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: FilterChip(
                label: Text(entry.value),
                selected: selected == entry.key,
                onSelected: (_) => onSelected(selected == entry.key ? null : entry.key),
              ),
            ),
        ],
      ),
    );
  }
}

/// Two-column product grid used by the shop, stores and wishlist screens.
class ProductGrid extends StatelessWidget {
  const ProductGrid({super.key, required this.products, this.header, this.showStore = true});

  final List<Product> products;
  final Widget? header;
  final bool showStore;

  /// Grid delegate whose cells are exactly as tall as a [ProductCard] needs
  /// for the resulting column width (square image + fixed body).
  static SliverGridDelegate delegateFor(BuildContext context, double availableWidth,
      {double horizontalPadding = 32, double spacing = 16}) {
    final columns = availableWidth >= 900 ? 4 : (availableWidth >= 600 ? 3 : 2);
    final cellWidth = (availableWidth - horizontalPadding - spacing * (columns - 1)) / columns;
    return SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: columns,
      mainAxisSpacing: spacing,
      crossAxisSpacing: spacing,
      mainAxisExtent: ProductCard.heightFor(context, cellWidth) + 4, // + pixel shadow
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => CustomScrollView(
        slivers: [
          if (header != null) SliverToBoxAdapter(child: header),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            sliver: SliverGrid(
              gridDelegate: ProductGrid.delegateFor(context, constraints.maxWidth),
              delegate: SliverChildBuilderDelegate(
                (context, i) => ProductCard(product: products[i], showStore: showStore),
                childCount: products.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
