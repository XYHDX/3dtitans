import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../state/cart_controller.dart';
import 'account_screen.dart';
import 'cart_screen.dart';
import 'home_screen.dart';
import 'products_screen.dart';
import 'stores_screen.dart';

/// Tab indexes, so other screens can jump to a tab via [ShellScreen.go].
class ShellTab {
  ShellTab._();

  static const int home = 0;
  static const int shop = 1;
  static const int stores = 2;
  static const int cart = 3;
  static const int account = 4;
}

/// Root scaffold with the bottom navigation bar. Tabs keep their state.
class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  /// Switches the shell to [tab] from anywhere below it in the tree.
  static void go(BuildContext context, int tab) {
    final scope = context.getInheritedWidgetOfExactType<_ShellScope>();
    scope?.select(tab);
  }

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = ShellTab.home;

  void _select(int index) {
    if (index == _index) return;
    setState(() => _index = index);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final cartCount = context.select<CartController, int>((c) => c.itemCount);

    return _ShellScope(
      index: _index,
      select: _select,
      child: Scaffold(
        body: IndexedStack(
          index: _index,
          children: const [
            HomeScreen(),
            ProductsScreen(),
            StoresScreen(),
            CartScreen(),
            AccountScreen(),
          ],
        ),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 2)),
          ),
          child: NavigationBar(
            selectedIndex: _index,
            onDestinationSelected: _select,
            destinations: [
              NavigationDestination(
                icon: const Icon(Icons.home_outlined),
                selectedIcon: const Icon(Icons.home),
                label: t.home,
              ),
              NavigationDestination(
                icon: const Icon(Icons.grid_view_outlined),
                selectedIcon: const Icon(Icons.grid_view),
                label: t.shop,
              ),
              NavigationDestination(
                icon: const Icon(Icons.storefront_outlined),
                selectedIcon: const Icon(Icons.storefront),
                label: t.stores,
              ),
              NavigationDestination(
                icon: _CartIcon(count: cartCount, selected: false),
                selectedIcon: _CartIcon(count: cartCount, selected: true),
                label: t.cart,
              ),
              NavigationDestination(
                icon: const Icon(Icons.person_outline),
                selectedIcon: const Icon(Icons.person),
                label: t.account,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartIcon extends StatelessWidget {
  const _CartIcon({required this.count, required this.selected});

  final int count;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final icon = Icon(selected ? Icons.shopping_cart : Icons.shopping_cart_outlined);
    if (count <= 0) return icon;
    return Badge.count(
      count: count,
      backgroundColor: Theme.of(context).colorScheme.onSurface,
      textColor: Theme.of(context).colorScheme.surface,
      child: icon,
    );
  }
}

class _ShellScope extends InheritedWidget {
  const _ShellScope({required this.index, required this.select, required super.child});

  final int index;
  final void Function(int) select;

  @override
  bool updateShouldNotify(_ShellScope oldWidget) => oldWidget.index != index;
}
