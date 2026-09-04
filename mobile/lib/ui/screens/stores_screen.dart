import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../state/catalog_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import '../widgets/store_card.dart';

class StoresScreen extends StatelessWidget {
  const StoresScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final catalog = context.watch<CatalogController>();

    return Scaffold(
      appBar: AppBar(title: Text(t.storeDirectory.toUpperCase())),
      body: PixelGridBackground(
        child: RefreshIndicator(
          onRefresh: catalog.refresh,
          child: Builder(
            builder: (context) {
              if (!catalog.hasData && catalog.loading) return const LoadingView();
              if (!catalog.hasData && catalog.error != null) {
                return ErrorView(error: catalog.error!, onRetry: catalog.refresh);
              }
              final stores = catalog.publishedStores;
              if (stores.isEmpty) {
                return ListView(
                  children: [
                    SizedBox(
                      height: 360,
                      child: EmptyView(icon: Icons.storefront_outlined, title: t.noStores),
                    ),
                  ],
                );
              }
              final width = MediaQuery.sizeOf(context).width;
              final columns = width >= 900 ? 3 : (width >= 600 ? 2 : 1);
              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Text(t.storeDirectorySubtitle, style: theme.textTheme.bodySmall),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    sliver: columns == 1
                        ? SliverList.separated(
                            itemCount: stores.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 16),
                            itemBuilder: (context, i) => StoreCard(store: stores[i]),
                          )
                        : SliverGrid(
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: columns,
                              mainAxisSpacing: 16,
                              crossAxisSpacing: 16,
                              mainAxisExtent: 256 * TitanTheme.uiScale(context),
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, i) => StoreCard(store: stores[i]),
                              childCount: stores.length,
                            ),
                          ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
