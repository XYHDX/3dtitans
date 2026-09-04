import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../state/catalog_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import '../widgets/product_card.dart';
import '../widgets/store_card.dart';
import 'products_screen.dart';

/// Full-screen search over products and stores (instant, from the loaded
/// catalog — works offline once the catalog has been fetched).
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SearchScreen()),
      );

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final catalog = context.watch<CatalogController>();
    final q = _query.trim().toLowerCase();
    final List<Product> products = q.isEmpty ? const [] : catalog.filter(query: q);
    final List<Store> stores = q.isEmpty
        ? const []
        : catalog.publishedStores
            .where((s) => s.name.toLowerCase().contains(q) || s.slug.toLowerCase().contains(q))
            .toList();

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          textInputAction: TextInputAction.search,
          onChanged: (v) => setState(() => _query = v),
          decoration: InputDecoration(
            hintText: t.searchHint,
            isDense: true,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            contentPadding: EdgeInsets.zero,
          ),
          style: theme.textTheme.bodyLarge,
        ),
        actions: [
          if (_query.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                _controller.clear();
                setState(() => _query = '');
              },
            ),
        ],
      ),
      body: PixelGridBackground(
        child: q.isEmpty
            ? Center(
                child: Text(t.searchHint, style: theme.textTheme.bodySmall),
              )
            : (products.isEmpty && stores.isEmpty)
                ? EmptyView(icon: Icons.search_off, title: t.noProducts)
                : CustomScrollView(
                    slivers: [
                      if (stores.isNotEmpty) ...[
                        SliverToBoxAdapter(child: SectionHeader(title: t.stores)),
                        SliverToBoxAdapter(
                          child: SizedBox(
                            height: 236 * TitanTheme.uiScale(context),
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                              itemCount: stores.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 12),
                              itemBuilder: (context, i) => SizedBox(
                                width: 260,
                                child: StoreCard(store: stores[i], compact: true),
                              ),
                            ),
                          ),
                        ),
                      ],
                      if (products.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: SectionHeader(
                            title: t.products,
                            subtitle: t.productsCount(products.length),
                          ),
                        ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          sliver: SliverGrid(
                            gridDelegate: ProductGrid.delegateFor(context, MediaQuery.sizeOf(context).width),
                            delegate: SliverChildBuilderDelegate(
                              (context, i) => ProductCard(product: products[i]),
                              childCount: products.length,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
      ),
    );
  }
}
