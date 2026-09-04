import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/l10n.dart';
import '../../state/app_settings.dart';
import '../widgets/pixel.dart';
import 'legal_screen.dart';
import 'support_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SettingsScreen()),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final settings = context.watch<AppSettings>();
    final localeCode = settings.locale?.languageCode ?? 'system';

    return Scaffold(
      appBar: AppBar(title: Text(t.settings.toUpperCase())),
      body: PixelGridBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            PixelFrame(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.language, size: 20),
                      const SizedBox(width: 8),
                      Text(t.language.toUpperCase(), style: theme.textTheme.labelLarge),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<String>(
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment(value: 'system', label: Text(t.themeSystem)),
                      ButtonSegment(value: 'en', label: Text(t.english)),
                      ButtonSegment(value: 'ar', label: Text(t.arabic)),
                    ],
                    selected: {localeCode},
                    onSelectionChanged: (s) {
                      final v = s.first;
                      settings.setLocale(v == 'system' ? null : Locale(v));
                    },
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      const Icon(Icons.dark_mode_outlined, size: 20),
                      const SizedBox(width: 8),
                      Text(t.appearance.toUpperCase(), style: theme.textTheme.labelLarge),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<ThemeMode>(
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment(
                        value: ThemeMode.system,
                        label: Text(t.themeSystem),
                        icon: const Icon(Icons.brightness_auto_outlined),
                      ),
                      ButtonSegment(
                        value: ThemeMode.light,
                        label: Text(t.themeLight),
                        icon: const Icon(Icons.light_mode_outlined),
                      ),
                      ButtonSegment(
                        value: ThemeMode.dark,
                        label: Text(t.themeDark),
                        icon: const Icon(Icons.dark_mode_outlined),
                      ),
                    ],
                    selected: {settings.themeMode},
                    onSelectionChanged: (s) => settings.setThemeMode(s.first),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            PixelFrame(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  _LinkTile(
                    icon: Icons.privacy_tip_outlined,
                    title: t.privacyPolicy,
                    onTap: () => LegalScreen.open(context, LegalDocKind.privacy),
                  ),
                  Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
                  _LinkTile(
                    icon: Icons.gavel_outlined,
                    title: t.termsOfService,
                    onTap: () => LegalScreen.open(context, LegalDocKind.terms),
                  ),
                  Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
                  _LinkTile(
                    icon: Icons.support_agent_outlined,
                    title: t.support,
                    onTap: () => SupportScreen.open(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                '${AppConfig.appName} · ${t.version} 1.1.0',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LinkTile extends StatelessWidget {
  const _LinkTile({required this.icon, required this.title, required this.onTap});

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
