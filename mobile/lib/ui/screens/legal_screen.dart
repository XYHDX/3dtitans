import 'package:flutter/material.dart';

import '../../core/l10n.dart';
import '../../core/legal_content.dart';
import '../../core/theme.dart';
import '../widgets/pixel.dart';

enum LegalDocKind { privacy, terms }

/// Native Privacy Policy / Terms of Service pages (EN + AR).
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.kind});

  final LegalDocKind kind;

  static Future<void> open(BuildContext context, LegalDocKind kind) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => LegalScreen(kind: kind)),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final arabic = TitanTheme.isArabic(context);
    final doc = kind == LegalDocKind.privacy ? LegalContent.privacy(arabic) : LegalContent.terms(arabic);

    return Scaffold(
      appBar: AppBar(title: Text(doc.title.toUpperCase())),
      body: PixelGridBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            PixelFrame(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doc.intro, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 10),
                  Text('${t.lastUpdated}: ${doc.updated}', style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            const SizedBox(height: 16),
            for (final section in doc.sections) ...[
              PixelFrame(
                shadow: 3,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(section.title, style: theme.textTheme.titleSmall),
                    const SizedBox(height: 8),
                    Text(section.body, style: theme.textTheme.bodyMedium),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
