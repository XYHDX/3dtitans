import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../state/auth_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import 'about_screen.dart';
import 'orders_screen.dart';
import 'settings_screen.dart';
import 'support_screen.dart';
import 'upload_screen.dart';
import 'wishlist_screen.dart';

/// Account tab: login / sign-up when logged out, profile + links when in.
class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final auth = context.watch<AuthController>();

    return Scaffold(
      appBar: AppBar(
        title: Text(t.account.toUpperCase()),
        actions: [
          IconButton(
            tooltip: t.settings,
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => SettingsScreen.open(context),
          ),
        ],
      ),
      body: PixelGridBackground(
        child: !auth.restored
            ? const LoadingView()
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (auth.isLoggedIn) _Profile(user: auth.user!) else const LoginForm(),
                  const SizedBox(height: 20),
                  _LinksCard(loggedIn: auth.isLoggedIn),
                ],
              ),
      ),
    );
  }
}

class _Profile extends StatelessWidget {
  const _Profile({required this.user});

  final SessionUser user;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final auth = context.watch<AuthController>();
    final role = user.isAdmin
        ? t.roleAdmin
        : user.isStoreOwner
            ? t.roleStoreOwner
            : t.roleUser;

    return PixelFrame(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                clipBehavior: Clip.hardEdge,
                decoration: BoxDecoration(
                  color: TitanColors.arcadeYellow,
                  border: Border.all(color: theme.colorScheme.onSurface, width: 2),
                ),
                child: user.image != null
                    ? TitanImage(user.image, memCacheWidth: 200)
                    : Center(
                        child: Text(
                          Fmt.initials(user.displayName),
                          style: TitanTheme.pixelStyle(context, 16, color: TitanColors.titanBlack),
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.displayName, style: theme.textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(user.email, style: theme.textTheme.bodySmall),
                    const SizedBox(height: 8),
                    PixelBadge(role),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          PixelButton(
            label: t.logout,
            icon: Icons.logout,
            variant: PixelButtonVariant.secondary,
            small: true,
            busy: auth.busy,
            onPressed: auth.busy ? null : auth.logout,
          ),
        ],
      ),
    );
  }
}

class _LinksCard extends StatelessWidget {
  const _LinksCard({required this.loggedIn});

  final bool loggedIn;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    Widget tile(IconData icon, String title, VoidCallback onTap, {String? subtitle}) => ListTile(
          leading: Icon(icon),
          title: Text(title),
          subtitle: subtitle == null ? null : Text(subtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        );

    return PixelFrame(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          tile(Icons.favorite_border, t.wishlist, () => WishlistScreen.open(context)),
          Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
          tile(Icons.receipt_long_outlined, t.myOrders, () => OrdersScreen.open(context)),
          Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
          tile(Icons.upload_file_outlined, t.uploadForPrint, () => UploadScreen.open(context)),
          Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
          tile(Icons.support_agent_outlined, t.support, () => SupportScreen.open(context)),
          Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
          tile(Icons.settings_outlined, t.settings, () => SettingsScreen.open(context)),
          Divider(height: 2, color: theme.colorScheme.onSurfaceVariant),
          tile(Icons.info_outline, t.about, () => AboutScreen.open(context)),
        ],
      ),
    );
  }
}

/// Stand-alone route wrapping [LoginForm] (used from product reviews etc.).
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Scaffold(
      appBar: AppBar(title: Text(t.login.toUpperCase())),
      body: PixelGridBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            LoginForm(onSuccess: () => Navigator.of(context).maybePop()),
          ],
        ),
      ),
    );
  }
}

/// Email / password sign-in with a sign-up mode, backed by NextAuth.
class LoginForm extends StatefulWidget {
  const LoginForm({super.key, this.onSuccess});

  final VoidCallback? onSuccess;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signup = false;
  bool _obscure = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthController>();
    final ok = _signup
        ? await auth.signup(name: _name.text, email: _email.text, password: _password.text)
        : await auth.login(_email.text, _password.text);
    if (ok && mounted) widget.onSuccess?.call();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final auth = context.watch<AuthController>();
    final error = auth.error;

    String? errorText;
    if (error != null) {
      errorText = error.isNetwork
          ? t.networkError
          : error.isUnauthorized
              ? t.loginFailed
              : (_signup ? '${t.signupFailed} ${error.message}' : error.message);
    }

    return PixelFrame(
      padding: const EdgeInsets.all(18),
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              (_signup ? t.createAccount : t.welcomeBack).toUpperCase(),
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 6),
            Text(t.signInSubtitle, textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
            const SizedBox(height: 20),
            if (_signup) ...[
              Text(t.name, style: theme.textTheme.labelMedium),
              const SizedBox(height: 6),
              TextFormField(
                controller: _name,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                validator: (v) => (v == null || v.trim().isEmpty) ? t.required : null,
              ),
              const SizedBox(height: 14),
            ],
            Text(t.email, style: theme.textTheme.labelMedium),
            const SizedBox(height: 6),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(hintText: 'you@example.com'),
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.isEmpty) return t.required;
                if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s)) return t.invalidEmail;
                return null;
              },
            ),
            const SizedBox(height: 14),
            Text(t.password, style: theme.textTheme.labelMedium),
            const SizedBox(height: 6),
            TextFormField(
              controller: _password,
              obscureText: _obscure,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.password],
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return t.required;
                if (_signup && v.length < 6) return t.passwordTooShort;
                return null;
              },
            ),
            if (!_signup)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(
                  onPressed: () => openExternal(context, Uri.parse(AppConfig.forgotPasswordUrl)),
                  child: Text(t.forgotPassword),
                ),
              ),
            if (errorText != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: TitanColors.destructive,
                  border: Border.all(color: theme.colorScheme.onSurface, width: 2),
                ),
                child: Text(
                  errorText,
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.white),
                ),
              ),
            ],
            const SizedBox(height: 16),
            PixelButton(
              label: _signup ? t.signUp : t.login,
              expand: true,
              busy: auth.busy,
              onPressed: auth.busy ? null : _submit,
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    _signup ? t.haveAccount : t.noAccount,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    auth.clearError();
                    setState(() => _signup = !_signup);
                  },
                  child: Text(_signup ? t.login : t.signUp),
                ),
              ],
            ),
            Row(
              children: [
                const Expanded(child: Divider()),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Text(t.orContinueWith.toUpperCase(), style: theme.textTheme.labelSmall),
                ),
                const Expanded(child: Divider()),
              ],
            ),
            const SizedBox(height: 12),
            PixelButton(
              label: t.googleSignInHint,
              icon: Icons.open_in_new,
              variant: PixelButtonVariant.secondary,
              expand: true,
              small: true,
              onPressed: () => openExternal(context, Uri.parse(AppConfig.loginUrl)),
            ),
          ],
        ),
      ),
    );
  }
}
