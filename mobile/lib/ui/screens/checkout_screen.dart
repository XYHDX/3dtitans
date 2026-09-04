import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/titans_api.dart';
import '../../state/auth_controller.dart';
import '../../state/cart_controller.dart';
import '../widgets/common.dart';
import '../widgets/pixel.dart';
import 'account_screen.dart';
import 'orders_screen.dart';
import 'shell_screen.dart';

/// Native checkout: shipping form (with saved addresses), payment method,
/// order summary → `POST /api/orders`.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const CheckoutScreen()),
      );

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _postalCode = TextEditingController();
  final _country = TextEditingController(text: 'Syria');
  final _notes = TextEditingController();

  List<Address>? _addresses;
  String? _selectedAddressId;
  PaymentSettings? _payments;
  PaymentMethod? _method;
  String? _idempotencyKey;
  bool _saveAddress = false;
  bool _busy = false;
  bool _preparing = false;
  Object? _prepareError;
  String? _preparedForUser;

  @override
  void dispose() {
    for (final c in [_fullName, _phone, _email, _address, _city, _postalCode, _country, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Loads saved addresses, payment settings and a fresh idempotency key.
  Future<void> _prepare(SessionUser user) async {
    final api = context.read<TitansApi>();
    setState(() {
      _preparing = true;
      _prepareError = null;
    });
    if (_fullName.text.isEmpty) _fullName.text = user.name;
    if (_email.text.isEmpty) _email.text = user.email;
    try {
      final results = await Future.wait<Object>([
        api.addresses().catchError((Object _) => <Address>[]),
        api.paymentSettings(),
        api.idempotencyKey(),
      ]);
      if (!mounted) return;
      final addresses = results[0] as List<Address>;
      final payments = results[1] as PaymentSettings;
      setState(() {
        _addresses = addresses;
        _payments = payments;
        _idempotencyKey = results[2] as String;
        final enabled = payments.enabledMethods;
        if (_method == null || !enabled.contains(_method)) {
          _method = enabled.isEmpty ? null : enabled.first;
        }
      });
      final def = addresses.where((a) => a.isDefault).firstOrNull ?? addresses.firstOrNull;
      if (def != null && _address.text.isEmpty) _applyAddress(def);
    } catch (e) {
      if (mounted) setState(() => _prepareError = e);
    } finally {
      if (mounted) setState(() => _preparing = false);
    }
  }

  void _applyAddress(Address a) {
    setState(() {
      _selectedAddressId = a.id;
      if (a.name.isNotEmpty) _fullName.text = a.name;
      _address.text = [a.line1, if (a.line2.isNotEmpty) a.line2].join(', ');
      _city.text = a.city;
      _postalCode.text = a.postalCode;
      _country.text = a.country;
      if (a.phone.isNotEmpty) _phone.text = a.phone;
      _saveAddress = false;
    });
  }

  Future<void> _placeOrder() async {
    final t = context.t;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final method = _method;
    if (method == null) {
      showSnack(context, t.noPaymentMethods);
      return;
    }
    final api = context.read<TitansApi>();
    final cart = context.read<CartController>();
    final lines = cart.lines;
    if (lines.isEmpty) return;

    setState(() => _busy = true);
    try {
      final key = _idempotencyKey ?? await api.idempotencyKey();
      _idempotencyKey = key;
      final shipping = ShippingAddress(
        fullName: _fullName.text.trim(),
        addressLine1: _address.text.trim(),
        city: _city.text.trim(),
        postalCode: _postalCode.text.trim(),
        country: _country.text.trim(),
      );
      final order = await api.placeOrder(
        lines: lines,
        shipping: shipping,
        phoneNumber: _phone.text.trim(),
        customerEmail: _email.text.trim(),
        paymentMethod: method,
        idempotencyKey: key,
        notes: _notes.text.trim(),
      );

      if (_saveAddress) {
        try {
          await api.addAddress(
            name: shipping.fullName,
            line1: shipping.addressLine1,
            city: shipping.city,
            postalCode: shipping.postalCode,
            country: shipping.country,
            phone: _phone.text.trim(),
          );
        } catch (_) {
          // Saving the address is a convenience; never fail the order for it.
        }
      }

      await cart.clear();
      if (!mounted) return;

      if (method == PaymentMethod.stripe) {
        try {
          final url = await api.stripeCheckoutUrl(order.id);
          if (mounted) await openInApp(context, url);
        } on ApiException catch (e) {
          if (mounted) showSnack(context, e.isNetwork ? t.networkError : e.message);
        }
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => OrderDetailScreen(order: order, paymentMethod: method, justPlaced: true),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      // A used key can't be reused — fetch a new one for the next attempt.
      _idempotencyKey = null;
      showSnack(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final auth = context.watch<AuthController>();
    final cart = context.watch<CartController>();
    final user = auth.user;

    if (user != null && _preparedForUser != user.id) {
      _preparedForUser = user.id;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _prepare(user);
      });
    }

    Widget body;
    if (user == null) {
      body = ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PixelFrame(
            color: TitanColors.arcadeYellow,
            padding: const EdgeInsets.all(14),
            child: Text(t.loginToCheckout, style: TitanTheme.monoStyle(context, 13, color: TitanColors.titanBlack)),
          ),
          const SizedBox(height: 16),
          const LoginForm(),
        ],
      );
    } else if (user.isStoreOwner) {
      body = EmptyView(icon: Icons.storefront_outlined, title: t.storeOwnersCannotOrder);
    } else if (cart.isEmpty) {
      body = EmptyView(
        icon: Icons.shopping_cart_outlined,
        title: t.cartEmpty,
        body: t.cartEmptyBody,
        actionLabel: t.continueShopping,
        onAction: () {
          Navigator.of(context).pop();
          ShellScreen.go(context, ShellTab.shop);
        },
      );
    } else if (_prepareError != null && _payments == null) {
      body = ErrorView(error: _prepareError!, onRetry: () => _prepare(user));
    } else if (_payments == null) {
      body = const LoadingView();
    } else {
      body = Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            SectionHeader(number: '01', title: t.shippingDetails),
            if (_addresses != null && _addresses!.isNotEmpty) ...[
              Text(t.savedAddresses, style: theme.textTheme.labelMedium),
              const SizedBox(height: 8),
              SizedBox(
                height: 92 * TitanTheme.uiScale(context),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _addresses!.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, i) {
                    final a = _addresses![i];
                    final selected = a.id == _selectedAddressId;
                    return GestureDetector(
                      onTap: () => _applyAddress(a),
                      child: PixelFrame(
                        shadow: selected ? 0 : 3,
                        color: selected ? TitanColors.arcadeYellow : null,
                        padding: const EdgeInsets.all(10),
                        child: SizedBox(
                          width: 200,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                a.label.isNotEmpty ? a.label : a.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  color: selected ? TitanColors.titanBlack : null,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Expanded(
                                child: Text(
                                  a.summary,
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 3,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: selected ? TitanColors.titanBlack : null,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],
            _Field(label: t.fullName, controller: _fullName, capitalization: TextCapitalization.words),
            _Field(
              label: t.phoneNumber,
              controller: _phone,
              keyboardType: TextInputType.phone,
              ltr: true,
              validator: (v) => (v == null || v.trim().length < 6) ? t.required : null,
            ),
            _Field(
              label: t.email,
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              ltr: true,
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.isEmpty) return t.required;
                if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s)) return t.invalidEmail;
                return null;
              },
            ),
            _Field(label: t.addressLine, controller: _address, capitalization: TextCapitalization.sentences),
            Row(
              children: [
                Expanded(child: _Field(label: t.city, controller: _city, capitalization: TextCapitalization.words)),
                const SizedBox(width: 12),
                Expanded(child: _Field(label: t.postalCode, controller: _postalCode, ltr: true)),
              ],
            ),
            _Field(label: t.country, controller: _country, capitalization: TextCapitalization.words),
            _Field(
              label: t.orderNotes,
              controller: _notes,
              hint: t.orderNotesHint,
              minLines: 2,
              maxLines: 5,
              validator: (_) => null,
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(t.saveAddressForNextTime, style: theme.textTheme.bodyMedium),
              value: _saveAddress,
              onChanged: (v) => setState(() {
                _saveAddress = v;
                if (v) _selectedAddressId = null;
              }),
            ),
            SectionHeader(number: '02', title: t.paymentMethod),
            if (_payments!.enabledMethods.isEmpty)
              PixelFrame(
                padding: const EdgeInsets.all(14),
                child: Text(t.noPaymentMethods, style: theme.textTheme.bodyMedium),
              )
            else
              for (final m in _payments!.enabledMethods) ...[
                _PaymentTile(
                  method: m,
                  settings: _payments!,
                  selected: _method == m,
                  onTap: () => setState(() => _method = m),
                ),
                const SizedBox(height: 10),
              ],
            SectionHeader(number: '03', title: t.orderSummary),
            PixelFrame(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  for (final line in cart.lines) ...[
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          clipBehavior: Clip.hardEdge,
                          decoration: BoxDecoration(border: Border.all(color: theme.colorScheme.onSurface, width: 2)),
                          child: TitanImage(line.product.imageUrl, memCacheWidth: 200),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '${line.quantity} × ${Fmt.productName(line.product.name)}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodyMedium,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(Fmt.price(line.lineTotal), style: theme.textTheme.labelMedium),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                  const Divider(),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(t.total, style: theme.textTheme.titleSmall),
                      const Spacer(),
                      Text(Fmt.price(cart.subtotal), style: theme.textTheme.displaySmall),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            PixelButton(
              label: _busy ? t.placingOrder : t.placeOrder,
              icon: Icons.check,
              expand: true,
              busy: _busy || _preparing,
              onPressed: (_busy || _preparing || _method == null) ? null : _placeOrder,
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(t.checkoutTitle.toUpperCase())),
      body: PixelGridBackground(child: body),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.capitalization = TextCapitalization.none,
    this.ltr = false,
    this.minLines,
    this.maxLines = 1,
    this.validator,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final TextCapitalization capitalization;
  final bool ltr;
  final int? minLines;
  final int maxLines;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.labelMedium),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            textCapitalization: capitalization,
            textDirection: ltr ? TextDirection.ltr : null,
            minLines: minLines,
            maxLines: maxLines,
            decoration: InputDecoration(hintText: hint),
            validator: validator ?? (v) => (v == null || v.trim().isEmpty) ? t.required : null,
          ),
        ],
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({
    required this.method,
    required this.settings,
    required this.selected,
    required this.onTap,
  });

  final PaymentMethod method;
  final PaymentSettings settings;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final (IconData icon, String title, String body) = switch (method) {
      PaymentMethod.cod => (Icons.payments_outlined, t.payCod, t.payCodBody),
      PaymentMethod.bankTransfer => (Icons.account_balance_outlined, t.payBank, t.payBankBody),
      PaymentMethod.shamCash => (Icons.phone_iphone, t.payShamCash, t.payShamCashBody),
      PaymentMethod.syriatelCash => (Icons.phone_android, t.paySyriatelCash, t.paySyriatelCashBody),
      PaymentMethod.stripe => (Icons.credit_card, t.payStripe, t.payStripeBody),
    };

    final details = <(String, String)>[
      if (method == PaymentMethod.bankTransfer) ...[
        if (settings.bankName.isNotEmpty) (t.bankName, settings.bankName),
        if (settings.bankAccountHolder.isNotEmpty) (t.accountHolder, settings.bankAccountHolder),
        if (settings.bankAccountNumber.isNotEmpty) (t.accountNumber, settings.bankAccountNumber),
        if (settings.bankIban.isNotEmpty) (t.iban, settings.bankIban),
      ],
      if (method == PaymentMethod.shamCash && settings.shamCashNumber.isNotEmpty)
        (t.walletNumber, settings.shamCashNumber),
      if (method == PaymentMethod.syriatelCash && settings.syriatelCashNumber.isNotEmpty)
        (t.walletNumber, settings.syriatelCashNumber),
    ];

    return GestureDetector(
      onTap: onTap,
      child: PixelFrame(
        shadow: selected ? 0 : 3,
        color: selected ? TitanColors.arcadeYellow : null,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off,
                    color: selected ? TitanColors.titanBlack : null),
                const SizedBox(width: 10),
                Icon(icon, size: 20, color: selected ? TitanColors.titanBlack : null),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: theme.textTheme.titleSmall?.copyWith(color: selected ? TitanColors.titanBlack : null)),
                      Text(body,
                          style: theme.textTheme.bodySmall?.copyWith(color: selected ? TitanColors.titanBlack : null)),
                    ],
                  ),
                ),
              ],
            ),
            if (selected && details.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  border: Border.all(color: theme.colorScheme.onSurface, width: 2),
                ),
                child: Column(
                  children: [
                    for (final (label, value) in details)
                      Row(
                        children: [
                          Text(label, style: theme.textTheme.bodySmall),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(value,
                                textAlign: TextAlign.end,
                                textDirection: TextDirection.ltr,
                                style: theme.textTheme.labelMedium),
                          ),
                          IconButton(
                            tooltip: 'Copy',
                            iconSize: 18,
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.copy),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: value));
                              showSnack(context, '$label: $value');
                            },
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
            if (selected && method.needsProof) ...[
              const SizedBox(height: 8),
              Text(t.paymentProofBody,
                  style: theme.textTheme.bodySmall?.copyWith(color: TitanColors.titanBlack)),
            ],
          ],
        ),
      ),
    );
  }
}
