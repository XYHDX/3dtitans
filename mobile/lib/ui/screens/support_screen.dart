import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../core/legal_content.dart';
import '../../core/theme.dart';
import '../../data/titans_api.dart';
import '../../state/auth_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';

/// Support: FAQ + contact form (`POST /api/contact`) + email link.
class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SupportScreen()),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final faq = LegalContent.faq(TitanTheme.isArabic(context));

    return Scaffold(
      appBar: AppBar(title: Text(t.supportTitle.toUpperCase())),
      body: PixelGridBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(t.supportSubtitle, style: theme.textTheme.bodyMedium),
            SectionHeader(title: t.faq),
            PixelFrame(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (var i = 0; i < faq.length; i++) ...[
                    if (i > 0) Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
                    ExpansionTile(
                      shape: const Border(),
                      collapsedShape: const Border(),
                      title: Text(faq[i].question, style: theme.textTheme.titleSmall),
                      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      expandedCrossAxisAlignment: CrossAxisAlignment.start,
                      children: [Text(faq[i].answer, style: theme.textTheme.bodyMedium)],
                    ),
                  ],
                ],
              ),
            ),
            SectionHeader(title: t.contactForm),
            const _ContactForm(),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.mail_outline),
              title: Text(t.emailUs),
              subtitle: const Text(LegalContent.supportEmail),
              trailing: const Icon(Icons.open_in_new, size: 18),
              onTap: () => openExternal(context, Uri.parse('mailto:${LegalContent.supportEmail}')),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _ContactForm extends StatefulWidget {
  const _ContactForm();

  @override
  State<_ContactForm> createState() => _ContactFormState();
}

class _ContactFormState extends State<_ContactForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _sending = false;
  bool _prefilled = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final api = context.read<TitansApi>();
    final t = context.t;
    setState(() => _sending = true);
    try {
      await api.contact(
        name: _name.text.trim(),
        email: _email.text.trim(),
        subject: _subject.text.trim(),
        message: _message.text.trim(),
      );
      _subject.clear();
      _message.clear();
      if (mounted) showSnack(context, t.messageSent);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final user = context.watch<AuthController>().user;
    if (!_prefilled && user != null) {
      _prefilled = true;
      if (_name.text.isEmpty) _name.text = user.displayName;
      if (_email.text.isEmpty) _email.text = user.email;
    }

    return PixelFrame(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t.name, style: theme.textTheme.labelMedium),
            const SizedBox(height: 6),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              validator: (v) => (v == null || v.trim().isEmpty) ? t.required : null,
            ),
            const SizedBox(height: 12),
            Text(t.email, style: theme.textTheme.labelMedium),
            const SizedBox(height: 6),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.isEmpty) return t.required;
                if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s)) return t.invalidEmail;
                return null;
              },
            ),
            const SizedBox(height: 12),
            Text(t.subject, style: theme.textTheme.labelMedium),
            const SizedBox(height: 6),
            TextFormField(
              controller: _subject,
              validator: (v) => (v == null || v.trim().isEmpty) ? t.required : null,
            ),
            const SizedBox(height: 12),
            Text(t.message, style: theme.textTheme.labelMedium),
            const SizedBox(height: 6),
            TextFormField(
              controller: _message,
              minLines: 4,
              maxLines: 8,
              validator: (v) => (v == null || v.trim().isEmpty) ? t.required : null,
            ),
            const SizedBox(height: 16),
            PixelButton(
              label: t.sendMessage,
              icon: Icons.send,
              expand: true,
              busy: _sending,
              onPressed: _sending ? null : _send,
            ),
          ],
        ),
      ),
    );
  }
}
