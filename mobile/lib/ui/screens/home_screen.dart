import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../state/catalog_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import '../widgets/product_card.dart';
import '../widgets/store_card.dart';
import 'about_screen.dart';
import 'search_screen.dart';
import 'shell_screen.dart';
import 'upload_screen.dart';
import 'wishlist_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final catalog = context.watch<CatalogController>();

    return Scaffold(
      appBar: AppBar(
        title: const TitanLogo(),
        actions: [
          IconButton(
            tooltip: t.searchHint,
            icon: const Icon(Icons.search),
            onPressed: () => SearchScreen.open(context),
          ),
          IconButton(
            tooltip: t.wishlist,
            icon: const Icon(Icons.favorite_border),
            onPressed: () => WishlistScreen.open(context),
          ),
        ],
      ),
      body: PixelGridBackground(
        child: RefreshIndicator(
          onRefresh: catalog.refresh,
          child: Builder(
            builder: (context) {
              if (!catalog.hasData && catalog.loading) return const LoadingView();
              if (!catalog.hasData && catalog.error != null) {
                return ErrorView(error: catalog.error!, onRetry: catalog.refresh);
              }
              final newest = catalog.newest(8);
              final stores = catalog.activeStores;
              return ListView(
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  const _Hero(),
                  SectionHeader(
                    number: '01',
                    title: t.newArrivals,
                    subtitle: t.allModelsSubtitle,
                    actionLabel: t.viewAll,
                    onAction: () => ShellScreen.go(context, ShellTab.shop),
                  ),
                  SizedBox(
                    height: ProductCard.heightFor(context, 170) + 12,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                      itemCount: newest.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (context, i) => ProductTile(product: newest[i]),
                    ),
                  ),
                  SectionHeader(
                    number: '02',
                    title: t.storeDirectory,
                    subtitle: t.storeDirectorySubtitle,
                    actionLabel: t.viewAll,
                    onAction: () => ShellScreen.go(context, ShellTab.stores),
                  ),
                  SizedBox(
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
                  SectionHeader(number: '03', title: t.printOnDemand),
                  const _PrintOnDemandCard(),
                  SectionHeader(
                    number: '04',
                    title: t.creatorsChoice,
                    subtitle: t.creatorsChoiceSubtitle,
                  ),
                  const _FeatureGrid(),
                  const SizedBox(height: 24),
                  const _Footer(),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: PixelFrame(
        color: TitanColors.titanBlack,
        borderColor: TitanColors.titanBlack,
        shadow: 6,
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PixelBadge(t.newDropLiveNow),
            const SizedBox(height: 18),
            Text(
              t.tagline,
              style: TitanTheme.pixelStyle(context, 18, color: TitanColors.crispWhite, height: 1.5),
            ),
            const SizedBox(height: 12),
            Text(
              t.heroSubtitle,
              style: TitanTheme.monoStyle(context, 13, color: TitanColors.mutedForegroundDark),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                PixelButton(
                  label: t.browseModels,
                  onPressed: () => ShellScreen.go(context, ShellTab.shop),
                ),
                PixelButton(
                  label: t.learnMore,
                  variant: PixelButtonVariant.secondary,
                  onPressed: () => AboutScreen.open(context),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PrintOnDemandCard extends StatelessWidget {
  const _PrintOnDemandCard();

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: PixelFrame(
        color: const Color(0xFFC9A57B),
        borderColor: TitanColors.titanBlack,
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const PixelBadge('PRINT READY'),
                const Spacer(),
                Image.asset(
                  'assets/images/cube.png',
                  width: 40,
                  height: 40,
                  filterQuality: FilterQuality.none,
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              t.printOnDemandKicker,
              style: TitanTheme.monoStyle(context, 14,
                  weight: FontWeight.w700, color: TitanColors.titanBlack),
            ),
            const SizedBox(height: 6),
            Text(
              t.printOnDemandBody,
              style: TitanTheme.monoStyle(context, 13, color: TitanColors.titanBlack),
            ),
            const SizedBox(height: 16),
            PixelButton(
              label: t.uploadYourModel,
              icon: Icons.upload_file,
              onPressed: () => UploadScreen.open(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid();

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final features = [
      (Icons.verified_outlined, t.curatedQuality, t.curatedQualityBody),
      (Icons.workspace_premium_outlined, t.commercialLicense, t.commercialLicenseBody),
      (Icons.groups_outlined, t.community, t.communityBody),
      (Icons.bolt_outlined, t.instantAccess, t.instantAccessBody),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.only(right: 6, bottom: 6),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          childAspectRatio: 0.98,
        ),
        itemCount: features.length,
        itemBuilder: (context, i) {
          final (icon, title, body) = features[i];
          return PixelFrame(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: TitanColors.arcadeYellow,
                    border: Border.all(color: theme.colorScheme.onSurface, width: 2),
                  ),
                  child: Icon(icon, size: 20, color: TitanColors.titanBlack),
                ),
                const SizedBox(height: 12),
                Text(title, style: theme.textTheme.labelLarge?.copyWith(fontSize: 9)),
                const SizedBox(height: 6),
                Expanded(
                  child: Text(
                    body,
                    style: theme.textTheme.bodySmall,
                    overflow: TextOverflow.fade,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final year = DateTime.now().year;
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: TitanColors.arcadeYellow,
            border: Border.symmetric(
              horizontal: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 2),
            ),
          ),
          child: Text(
            t.tagline.toUpperCase(),
            textAlign: TextAlign.center,
            style: TitanTheme.monoStyle(context, 11,
                    weight: FontWeight.w700, color: TitanColors.titanBlack)
                .copyWith(letterSpacing: 1),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Text(
            '© $year 3D Titans',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ],
    );
  }
}
