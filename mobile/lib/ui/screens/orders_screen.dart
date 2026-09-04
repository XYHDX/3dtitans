import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/titans_api.dart';
import '../../state/auth_controller.dart';
import '../widgets/common.dart';
import '../widgets/files.dart';
import '../widgets/pixel.dart';
import 'account_screen.dart';
import 'shell_screen.dart';

String orderStatusLabel(AppStrings t, OrderStatus s) => switch (s) {
      OrderStatus.awaitingAcceptance => t.statusAwaitingAcceptance,
      OrderStatus.pending => t.statusPending,
      OrderStatus.printing => t.statusPrinting,
      OrderStatus.finished => t.statusFinished,
      OrderStatus.pooled => t.statusPooled,
      OrderStatus.cancellationRequested => t.statusCancellationRequested,
      OrderStatus.cancelled => t.statusCancelled,
      OrderStatus.unknown => s.apiValue,
    };

/// Coloured status pill.
class OrderStatusBadge extends StatelessWidget {
  const OrderStatusBadge(this.status, {super.key});

  final OrderStatus status;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (Color bg, Color fg) = switch (status) {
      OrderStatus.awaitingAcceptance || OrderStatus.pooled => (TitanColors.arcadeYellow, TitanColors.titanBlack),
      OrderStatus.finished => (TitanColors.success, Colors.white),
      OrderStatus.cancelled || OrderStatus.cancellationRequested => (TitanColors.destructive, Colors.white),
      _ => (scheme.onSurface, scheme.surface),
    };
    return PixelBadge(orderStatusLabel(context.t, status), color: bg, textColor: fg);
  }
}

/// "My orders" — list of the customer's orders.
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const OrdersScreen()),
      );

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order>? _orders;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<TitansApi>();
    try {
      final orders = await api.orders();
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final auth = context.watch<AuthController>();

    Widget body;
    if (!auth.isLoggedIn) {
      body = ListView(
        padding: const EdgeInsets.all(16),
        children: [LoginForm(onSuccess: _load)],
      );
    } else if (_error != null && _orders == null) {
      body = ErrorView(error: _error!, onRetry: _load);
    } else if (_orders == null) {
      body = const LoadingView();
    } else if (_orders!.isEmpty) {
      body = EmptyView(
        icon: Icons.receipt_long_outlined,
        title: t.ordersEmpty,
        body: t.ordersEmptyBody,
        actionLabel: t.backToShop,
        onAction: () {
          Navigator.of(context).popUntil((r) => r.isFirst);
          ShellScreen.go(context, ShellTab.shop);
        },
      );
    } else {
      body = RefreshIndicator(
        onRefresh: _load,
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: _orders!.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final o = _orders![i];
            return GestureDetector(
              onTap: () async {
                await OrderDetailScreen.open(context, o);
                _load();
              },
              child: PixelFrame(
                shadow: 3,
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(t.orderNumber(o.shortId), style: theme.textTheme.headlineSmall),
                        ),
                        OrderStatusBadge(o.status),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${Fmt.shortDate(o.orderDate)} · ${t.itemsCount(o.itemCount)}',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 56,
                      child: Row(
                        children: [
                          for (final item in o.items.take(4))
                            Container(
                              width: 56,
                              height: 56,
                              margin: const EdgeInsetsDirectional.only(end: 8),
                              clipBehavior: Clip.hardEdge,
                              decoration: BoxDecoration(
                                border: Border.all(color: theme.colorScheme.onSurface, width: 2),
                              ),
                              child: TitanImage(item.imageUrl, memCacheWidth: 200),
                            ),
                          if (o.items.length > 4)
                            Text('+${o.items.length - 4}', style: theme.textTheme.labelMedium),
                          const Spacer(),
                          Text(Fmt.price(o.totalAmount), style: theme.textTheme.headlineSmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(t.myOrders.toUpperCase())),
      body: PixelGridBackground(child: body),
    );
  }
}

/// One order: items, shipping, status, payment proof and cancellation.
class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.order, this.paymentMethod, this.justPlaced = false});

  final Order order;

  /// Known right after checkout (the API does not return it later).
  final PaymentMethod? paymentMethod;

  /// Shows the "order placed" banner and a back-to-shop button.
  final bool justPlaced;

  static Future<void> open(BuildContext context, Order order,
          {PaymentMethod? paymentMethod, bool justPlaced = false}) =>
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => OrderDetailScreen(order: order, paymentMethod: paymentMethod, justPlaced: justPlaced),
        ),
      );

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  late Order _order = widget.order;
  bool _busy = false;

  Future<void> _refresh() async {
    try {
      final fresh = await context.read<TitansApi>().order(_order.id);
      if (mounted) setState(() => _order = fresh);
    } catch (_) {}
  }

  Future<void> _requestCancellation() async {
    final t = context.t;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.requestCancellation.toUpperCase()),
        content: Text(t.requestCancellationConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.cancel)),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.requestCancellation, style: const TextStyle(color: TitanColors.destructive)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      final updated = await context.read<TitansApi>().requestCancellation(_order.id);
      if (mounted) {
        setState(() => _order = updated);
        showSnack(context, t.cancellationRequested);
      }
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _payWithCard() async {
    final t = context.t;
    setState(() => _busy = true);
    try {
      final url = await context.read<TitansApi>().stripeCheckoutUrl(_order.id);
      if (!mounted) return;
      await openInApp(context, url);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final o = _order;
    final method = widget.paymentMethod;
    final showProof = method == null ? !o.status.isFinal : method.needsProof;

    return Scaffold(
      appBar: AppBar(title: Text(t.orderNumber(o.shortId).toUpperCase())),
      body: PixelGridBackground(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (widget.justPlaced) ...[
                PixelFrame(
                  color: TitanColors.arcadeYellow,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.celebration_outlined, color: TitanColors.titanBlack),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t.orderPlaced.toUpperCase(),
                                style: TitanTheme.pixelStyle(context, 12, color: TitanColors.titanBlack)),
                            const SizedBox(height: 6),
                            Text(t.orderPlacedBody(o.shortId),
                                style: TitanTheme.monoStyle(context, 13, color: TitanColors.titanBlack)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (method == PaymentMethod.stripe) ...[
                PixelButton(
                  label: t.payNowWithCard,
                  icon: Icons.credit_card,
                  expand: true,
                  busy: _busy,
                  onPressed: _busy ? null : _payWithCard,
                ),
                const SizedBox(height: 16),
              ],
              PixelFrame(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(t.orderStatus.toUpperCase(), style: theme.textTheme.labelLarge)),
                        OrderStatusBadge(o.status),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _Row(label: t.orderedOn, value: Fmt.shortDate(o.orderDate)),
                    if (o.predictedFinishDate != null)
                      _Row(label: t.expectedFinish, value: Fmt.shortDate(o.predictedFinishDate)),
                    _Row(label: t.total, value: Fmt.price(o.totalAmount)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              PixelFrame(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.orderSummary.toUpperCase(), style: theme.textTheme.labelLarge),
                    const SizedBox(height: 12),
                    for (final item in o.items) ...[
                      Row(
                        children: [
                          Container(
                            width: 52,
                            height: 52,
                            clipBehavior: Clip.hardEdge,
                            decoration: BoxDecoration(
                              border: Border.all(color: theme.colorScheme.onSurface, width: 2),
                            ),
                            child: TitanImage(item.imageUrl, memCacheWidth: 200),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(Fmt.productName(item.name),
                                    maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall),
                                Text('${item.quantity} × ${Fmt.price(item.price)}', style: theme.textTheme.bodySmall),
                              ],
                            ),
                          ),
                          Text(Fmt.price(item.lineTotal), style: theme.textTheme.labelMedium),
                        ],
                      ),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              PixelFrame(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.shippingTo.toUpperCase(), style: theme.textTheme.labelLarge),
                    const SizedBox(height: 10),
                    Text(o.shipping.fullName, style: theme.textTheme.titleSmall),
                    Text(o.shipping.summary, style: theme.textTheme.bodyMedium),
                    if (o.phoneNumber.isNotEmpty)
                      Text(o.phoneNumber, style: theme.textTheme.bodyMedium, textDirection: TextDirection.ltr),
                    if (o.notes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(o.notes, style: theme.textTheme.bodySmall),
                    ],
                  ],
                ),
              ),
              if (showProof) ...[
                const SizedBox(height: 16),
                PaymentProofCard(orderId: o.id, compact: method == null),
              ],
              const SizedBox(height: 20),
              if (o.canRequestCancellation)
                PixelButton(
                  label: t.requestCancellation,
                  icon: Icons.cancel_outlined,
                  variant: PixelButtonVariant.secondary,
                  expand: true,
                  busy: _busy,
                  onPressed: _busy ? null : _requestCancellation,
                ),
              if (widget.justPlaced) ...[
                const SizedBox(height: 12),
                PixelButton(
                  label: t.viewMyOrders,
                  icon: Icons.receipt_long_outlined,
                  variant: PixelButtonVariant.secondary,
                  expand: true,
                  onPressed: () {
                    Navigator.of(context).popUntil((r) => r.isFirst);
                    OrdersScreen.open(context);
                  },
                ),
                const SizedBox(height: 12),
                PixelButton(
                  label: t.backToShop,
                  icon: Icons.storefront_outlined,
                  expand: true,
                  onPressed: () {
                    Navigator.of(context).popUntil((r) => r.isFirst);
                    ShellScreen.go(context, ShellTab.shop);
                  },
                ),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(label, style: theme.textTheme.bodySmall),
          const Spacer(),
          Text(value, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
