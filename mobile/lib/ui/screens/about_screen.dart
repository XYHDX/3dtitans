import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../state/catalog_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import 'support_screen.dart';

/// "About 3D Titans" — copy comes from `GET /api/settings`, which the site
/// owner edits in the website admin.
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const AboutScreen()),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final s = context.watch<CatalogController>().settings;
    final facebook = Fmt.websiteUri(s.facebookUrl);
    final instagram = Fmt.websiteUri(s.instagramUrl);

    return Scaffold(
      appBar: AppBar(title: Text(t.about.toUpperCase())),
      body: PixelGridBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            PixelFrame(
              color: TitanColors.titanBlack,
              borderColor: TitanColors.titanBlack,
              shadow: 6,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Image.asset(
                    'assets/images/logo_dark.png',
                    height: 30,
                    filterQuality: FilterQuality.none,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    s.aboutHeroTitle.toUpperCase(),
                    style: TitanTheme.pixelStyle(context, 14, color: TitanColors.crispWhite, height: 1.5),
                  ),
                  if (s.aboutHeroSubtitle.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      s.aboutHeroSubtitle,
                      style: TitanTheme.monoStyle(context, 13, color: TitanColors.mutedForegroundDark),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
            PixelFrame(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (s.aboutMissionTitle.isEmpty ? t.mission : s.aboutMissionTitle).toUpperCase(),
                    style: theme.textTheme.labelLarge,
                  ),
                  const SizedBox(height: 10),
                  Text(s.aboutMission, style: theme.textTheme.bodyMedium),
                ],
              ),
            ),
            const SizedBox(height: 16),
            PixelFrame(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (s.aboutContactTitle.isEmpty ? t.contactUs : s.aboutContactTitle).toUpperCase(),
                    style: theme.textTheme.labelLarge,
                  ),
                  const SizedBox(height: 10),
                  if (s.aboutContact.isNotEmpty) ...[
                    Text(s.aboutContact, style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 14),
                  ],
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      PixelButton(
                        label: t.contactUs,
                        icon: Icons.mail_outline,
                        small: true,
                        onPressed: () => SupportScreen.open(context),
                      ),
                      PixelButton(
                        label: t.support,
                        icon: Icons.support_agent_outlined,
                        small: true,
                        variant: PixelButtonVariant.secondary,
                        onPressed: () => SupportScreen.open(context),
                      ),
                      if (instagram != null)
                        PixelButton(
                          label: 'Instagram',
                          icon: Icons.camera_alt_outlined,
                          small: true,
                          variant: PixelButtonVariant.secondary,
                          onPressed: () => openExternal(context, instagram),
                        ),
                      if (facebook != null)
                        PixelButton(
                          label: 'Facebook',
                          icon: Icons.facebook,
                          small: true,
                          variant: PixelButtonVariant.secondary,
                          onPressed: () => openExternal(context, facebook),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.public),
              title: const Text('3dtitans.org'),
              subtitle: Text(t.openOnWebsite),
              trailing: const Icon(Icons.open_in_new, size: 18),
              onTap: () => openExternal(context, Uri.parse(AppConfig.baseUrl)),
            ),
          ],
        ),
      ),
    );
  }
}
