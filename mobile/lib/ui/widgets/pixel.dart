import 'package:flutter/material.dart';

import '../../core/theme.dart';

/// Square panel with a 2px border and a hard offset shadow — the website's
/// `.pixel-frame` look.
class PixelFrame extends StatelessWidget {
  const PixelFrame({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.color,
    this.borderColor,
    this.shadow = 4,
    this.borderWidth = 2,
    this.clip = false,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;
  final double shadow;
  final double borderWidth;
  final bool clip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: margin,
      clipBehavior: clip ? Clip.hardEdge : Clip.none,
      decoration: BoxDecoration(
        color: color ?? theme.cardColor,
        border: Border.all(
          color: borderColor ?? theme.colorScheme.onSurface,
          width: borderWidth,
        ),
        boxShadow: shadow > 0 ? TitanTheme.pixelShadow(context, offset: shadow) : null,
      ),
      // A transparent Material *inside* the coloured frame so ListTiles and
      // InkWells placed in a frame paint their ripples on top of the frame
      // colour (otherwise Flutter's debug check warns that the ink would be
      // hidden underneath the Container).
      child: Material(
        type: MaterialType.transparency,
        child: Padding(padding: padding ?? EdgeInsets.zero, child: child),
      ),
    );
  }
}

enum PixelButtonVariant { primary, secondary, danger }

/// Chunky pixel button. Pressing it "sinks" into its own shadow.
class PixelButton extends StatefulWidget {
  const PixelButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.variant = PixelButtonVariant.primary,
    this.expand = false,
    this.small = false,
    this.busy = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final PixelButtonVariant variant;
  final bool expand;
  final bool small;
  final bool busy;

  @override
  State<PixelButton> createState() => _PixelButtonState();
}

class _PixelButtonState extends State<PixelButton> {
  bool _pressed = false;

  bool get _enabled => widget.onPressed != null && !widget.busy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    final Color background;
    final Color foreground;
    switch (widget.variant) {
      case PixelButtonVariant.primary:
        background = TitanColors.arcadeYellow;
        foreground = TitanColors.titanBlack;
      case PixelButtonVariant.secondary:
        background = Theme.of(context).cardColor;
        foreground = scheme.onSurface;
      case PixelButtonVariant.danger:
        background = TitanColors.destructive;
        foreground = Colors.white;
    }
    final disabledBg = isDark ? TitanColors.mutedDark : TitanColors.mutedLight;
    final disabledFg = isDark ? TitanColors.mutedForegroundDark : TitanColors.mutedForegroundLight;

    final shadowOffset = widget.small ? 3.0 : 4.0;
    final sunk = _pressed || !_enabled;
    final textStyle = TitanTheme.pixelStyle(
      context,
      widget.small ? 8 : 10,
      height: 1.2,
      color: _enabled ? foreground : disabledFg,
    );

    final content = Row(
      mainAxisSize: widget.expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.busy)
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2, color: textStyle.color),
          )
        else if (widget.icon != null)
          Icon(widget.icon, size: widget.small ? 14 : 18, color: textStyle.color),
        if (widget.busy || widget.icon != null) const SizedBox(width: 10),
        Flexible(
          child: Text(
            widget.label.toUpperCase(),
            style: textStyle,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );

    return Semantics(
      button: true,
      enabled: _enabled,
      label: widget.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: _enabled ? (_) => setState(() => _pressed = true) : null,
        onTapUp: _enabled ? (_) => setState(() => _pressed = false) : null,
        onTapCancel: _enabled ? () => setState(() => _pressed = false) : null,
        onTap: _enabled ? widget.onPressed : null,
        child: Padding(
          // Reserve room for the shadow so layout does not jump when pressed.
          padding: EdgeInsets.only(right: shadowOffset, bottom: shadowOffset),
          child: Transform.translate(
            offset: sunk ? Offset(shadowOffset, shadowOffset) : Offset.zero,
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: widget.small ? 12 : 18,
                vertical: widget.small ? 10 : 14,
              ),
              decoration: BoxDecoration(
                color: _enabled ? background : disabledBg,
                border: Border.all(color: scheme.onSurface, width: 2),
                boxShadow: sunk ? null : TitanTheme.pixelShadow(context, offset: shadowOffset),
              ),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}

/// Square 40×40 bordered icon button (wishlist heart, quantity +/-).
class PixelIconButton extends StatelessWidget {
  const PixelIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.color,
    this.iconColor,
    this.size = 40,
    this.filled = false,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final Color? color;
  final Color? iconColor;
  final double size;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final button = Material(
      color: color ?? (filled ? TitanColors.arcadeYellow : Theme.of(context).cardColor),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
        side: BorderSide(color: scheme.onSurface, width: 2),
      ),
      child: InkWell(
        onTap: onPressed,
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(
            icon,
            size: size * 0.5,
            color: iconColor ?? (filled ? TitanColors.titanBlack : scheme.onSurface),
          ),
        ),
      ),
    );
    if (tooltip == null) return button;
    return Tooltip(message: tooltip!, child: button);
  }
}

/// Small yellow label with a black border — store tags on product images,
/// section numbers, "NEW DROP" style kickers.
class PixelBadge extends StatelessWidget {
  const PixelBadge(
    this.text, {
    super.key,
    this.color = TitanColors.arcadeYellow,
    this.textColor = TitanColors.titanBlack,
    this.uppercase = true,
  });

  final String text;
  final Color color;
  final Color textColor;
  final bool uppercase;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: scheme.onSurface, width: 2),
      ),
      child: Text(
        uppercase ? text.toUpperCase() : text,
        style: TitanTheme.pixelStyle(context, 7, height: 1.3, color: textColor),
      ),
    );
  }
}

/// Faint grid lines like the website background.
class PixelGridBackground extends StatelessWidget {
  const PixelGridBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.05);
    return CustomPaint(
      painter: _GridPainter(color),
      child: child,
    );
  }
}

class _GridPainter extends CustomPainter {
  _GridPainter(this.color);

  final Color color;
  static const double step = 24;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) => oldDelegate.color != color;
}

/// Numbered section title ("01  NEW ARRIVALS") with optional subtitle/action.
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.number,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? number;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (number != null) ...[
                      PixelBadge(
                        number!,
                        color: theme.colorScheme.onSurface,
                        textColor: theme.colorScheme.surface,
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: Text(
                        title.toUpperCase(),
                        style: theme.textTheme.headlineSmall,
                      ),
                    ),
                  ],
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(subtitle!, style: theme.textTheme.bodySmall),
                ],
              ],
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(width: 8),
            TextButton.icon(
              onPressed: onAction,
              iconAlignment: IconAlignment.end,
              icon: const Icon(Icons.arrow_forward, size: 16),
              label: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
