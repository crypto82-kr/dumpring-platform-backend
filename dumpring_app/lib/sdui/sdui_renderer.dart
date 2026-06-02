import 'package:flutter/material.dart';
import 'sdui_model.dart';

class SduiRenderer extends StatelessWidget {
  final SduiComponent component;
  final Map<String, TextEditingController>? controllers;
  final void Function(BuildContext context, Map<String, dynamic> action)? onAction;

  const SduiRenderer({
    Key? key,
    required this.component,
    this.controllers,
    this.onAction,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return _buildWidget(context, component);
  }

  Widget _buildWidget(BuildContext context, SduiComponent comp) {
    switch (comp.type.toLowerCase()) {
      case 'container':
        return _buildContainer(context, comp);
      case 'column':
        return _buildColumn(context, comp);
      case 'row':
        return _buildRow(context, comp);
      case 'text':
        return _buildText(context, comp);
      case 'button':
        return _buildButton(context, comp);
      case 'textfield':
        return _buildTextField(context, comp);
      case 'card':
        return _buildCard(context, comp);
      case 'spacer':
        return _buildSpacer(context, comp);
      case 'icon':
        return _buildIcon(context, comp);
      case 'listview':
        return _buildListView(context, comp);
      default:
        return SizedBox.shrink();
    }
  }

  // 1. Container Builder
  Widget _buildContainer(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final padding = _parseEdgeInsets(props['padding']);
    final margin = _parseEdgeInsets(props['margin']);
    final width = _toDouble(props['width']);
    final height = _toDouble(props['height']);
    final bgColor = _parseColor(props['backgroundColor']);
    final borderRadius = _toDouble(props['borderRadius']);
    final alignment = _parseAlignment(props['alignment']);

    Widget? child;
    if (comp.children != null && comp.children!.isNotEmpty) {
      child = _buildWidget(context, comp.children!.first);
    }

    Widget container = Container(
      width: width,
      height: height,
      padding: padding,
      margin: margin,
      alignment: alignment,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: borderRadius != null ? BorderRadius.circular(borderRadius) : null,
        border: props['borderColor'] != null
            ? Border.all(
                color: _parseColor(props['borderColor']) ?? Colors.transparent,
                width: _toDouble(props['borderWidth']) ?? 1.0,
              )
            : null,
      ),
      child: child,
    );

    if (comp.action != null) {
      return GestureDetector(
        onTap: () {
          if (onAction != null) {
            onAction!(context, comp.action!);
          }
        },
        behavior: HitTestBehavior.opaque,
        child: container,
      );
    }

    return container;
  }

  // 2. Column Builder
  Widget _buildColumn(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final mainAlign = _parseMainAxisAlignment(props['mainAxisAlignment']);
    final crossAlign = _parseCrossAxisAlignment(props['crossAxisAlignment']);
    final childrenWidgets = comp.children?.map((c) => _buildWidget(context, c)).toList() ?? [];

    return Column(
      mainAxisAlignment: mainAlign,
      crossAxisAlignment: crossAlign,
      children: childrenWidgets,
    );
  }

  // 3. Row Builder
  Widget _buildRow(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final mainAlign = _parseMainAxisAlignment(props['mainAxisAlignment']);
    final crossAlign = _parseCrossAxisAlignment(props['crossAxisAlignment']);
    final childrenWidgets = comp.children?.map((c) => _buildWidget(context, c)).toList() ?? [];

    return Row(
      mainAxisAlignment: mainAlign,
      crossAxisAlignment: crossAlign,
      children: childrenWidgets,
    );
  }

  // 4. Text Builder
  Widget _buildText(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final textVal = props['text'] ?? '';
    final fontSize = _toDouble(props['fontSize']) ?? 14.0;
    final color = _parseColor(props['color']) ?? Colors.white;
    final isBold = props['fontWeight'] == 'bold';
    final isW800 = props['fontWeight'] == 'w800';
    final align = _parseTextAlign(props['textAlign']);

    return Text(
      textVal,
      textAlign: align,
      style: TextStyle(
        fontSize: fontSize,
        color: color,
        fontWeight: isW800 ? FontWeight.w800 : (isBold ? FontWeight.bold : FontWeight.normal),
      ),
    );
  }

  // 5. Button Builder
  Widget _buildButton(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final textVal = props['text'] ?? 'Action';
    final isPrimary = props['variant'] != 'secondary';
    
    // Premium Design Base Tokens (Deep Dark & Neon Gold-Yellow point colors)
    final btnBg = isPrimary 
        ? (_parseColor(props['backgroundColor']) ?? const Color(0xFFFFD700)) // Neon Gold
        : const Color(0xFF1E2638); // Matte Navy
    final btnFg = isPrimary
        ? (_parseColor(props['textColor']) ?? const Color(0xFF0A0F1D)) // Black Text
        : Colors.white;

    final padding = _parseEdgeInsets(props['padding']) ?? const EdgeInsets.symmetric(vertical: 14, horizontal: 20);
    final borderRadius = _toDouble(props['borderRadius']) ?? 12.0;

    return SizedBox(
      width: _toDouble(props['width']) ?? double.infinity,
      height: _toDouble(props['height']),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: btnBg,
          foregroundColor: btnFg,
          elevation: 0,
          padding: padding,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
            side: !isPrimary
                ? const BorderSide(color: Color(0xFFFFD700), width: 1.0)
                : BorderSide.none,
          ),
        ),
        onPressed: () {
          if (comp.action != null && onAction != null) {
            onAction!(context, comp.action!);
          }
        },
        child: Text(
          textVal,
          style: TextStyle(
            fontSize: _toDouble(props['fontSize']) ?? 16.0,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  // 6. TextField Builder
  Widget _buildTextField(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final label = props['label'] ?? '';
    final hint = props['hint'] ?? '';
    final fieldKey = props['key'] ?? label;
    final obscure = props['obscureText'] == true;

    final controller = controllers != null ? controllers![fieldKey] : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label.isNotEmpty) ...[
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFFFFD700), // Neon Yellow label
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
          ],
          TextField(
            controller: controller,
            obscureText: obscure,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: const Color(0xFF1E2638), // Matte Navy background
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF2C354A)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFFFD700), width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 7. Card Builder
  Widget _buildCard(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final bgColor = _parseColor(props['backgroundColor']) ?? const Color(0xFF1E2638);
    final margin = _parseEdgeInsets(props['margin']) ?? const EdgeInsets.only(bottom: 16);
    final padding = _parseEdgeInsets(props['padding']) ?? const EdgeInsets.all(16);
    final borderRadius = _toDouble(props['borderRadius']) ?? 16.0;

    Widget? child;
    if (comp.children != null && comp.children!.isNotEmpty) {
      child = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: comp.children!.map((c) => _buildWidget(context, c)).toList(),
      );
    }

    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: props['borderColor'] != null 
              ? _parseColor(props['borderColor'])! 
              : const Color(0xFF2C354A),
          width: 1.0,
        ),
      ),
      child: child,
    );
  }

  // 8. Spacer Builder
  Widget _buildSpacer(BuildContext context, SduiComponent comp) {
    final height = _toDouble(comp.props['height']);
    final width = _toDouble(comp.props['width']);
    if (height != null || width != null) {
      return SizedBox(width: width, height: height);
    }
    return const Spacer();
  }

  // 9. Icon Builder
  Widget _buildIcon(BuildContext context, SduiComponent comp) {
    final props = comp.props;
    final iconName = props['icon'] ?? 'star';
    final size = _toDouble(props['size']) ?? 24.0;
    final color = _parseColor(props['color']) ?? const Color(0xFFFFD700);

    return Icon(
      _mapIcon(iconName),
      size: size,
      color: color,
    );
  }

  // 10. ListView Builder
  Widget _buildListView(BuildContext context, SduiComponent comp) {
    final childrenWidgets = comp.children?.map((c) => _buildWidget(context, c)).toList() ?? [];
    return ListView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: childrenWidgets,
    );
  }

  // --- Helper Parsers ---
  double? _toDouble(dynamic val) {
    if (val == null) return null;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val);
    return null;
  }

  Color? _parseColor(dynamic hex) {
    if (hex == null || hex is! String) return null;
    String cleanHex = hex.replaceAll('#', '');
    if (cleanHex.length == 6) {
      cleanHex = 'FF$cleanHex';
    }
    final val = int.tryParse(cleanHex, radix: 16);
    if (val != null) return Color(val);
    if (hex.startsWith('0xFF') || hex.startsWith('0xff')) {
      final parsed = int.tryParse(hex.substring(2), radix: 16);
      if (parsed != null) return Color(parsed);
    }
    return null;
  }

  EdgeInsets? _parseEdgeInsets(dynamic padding) {
    if (padding == null) return null;
    if (padding is num) {
      return EdgeInsets.all(padding.toDouble());
    }
    if (padding is Map) {
      return EdgeInsets.only(
        left: _toDouble(padding['left']) ?? 0.0,
        right: _toDouble(padding['right']) ?? 0.0,
        top: _toDouble(padding['top']) ?? 0.0,
        bottom: _toDouble(padding['bottom']) ?? 0.0,
      );
    }
    return null;
  }

  Alignment? _parseAlignment(dynamic align) {
    if (align == null || align is! String) return null;
    switch (align.toLowerCase()) {
      case 'center': return Alignment.center;
      case 'centerleft': return Alignment.centerLeft;
      case 'centerright': return Alignment.centerRight;
      case 'topcenter': return Alignment.topCenter;
      case 'bottomcenter': return Alignment.bottomCenter;
      default: return Alignment.center;
    }
  }

  MainAxisAlignment _parseMainAxisAlignment(dynamic align) {
    if (align == null || align is! String) return MainAxisAlignment.start;
    switch (align.toLowerCase()) {
      case 'center': return MainAxisAlignment.center;
      case 'spacebetween': return MainAxisAlignment.spaceBetween;
      case 'spacearound': return MainAxisAlignment.spaceAround;
      case 'end': return MainAxisAlignment.end;
      default: return MainAxisAlignment.start;
    }
  }

  CrossAxisAlignment _parseCrossAxisAlignment(dynamic align) {
    if (align == null || align is! String) return CrossAxisAlignment.center;
    switch (align.toLowerCase()) {
      case 'start': return CrossAxisAlignment.start;
      case 'end': return CrossAxisAlignment.end;
      case 'stretch': return CrossAxisAlignment.stretch;
      default: return CrossAxisAlignment.center;
    }
  }

  TextAlign _parseTextAlign(dynamic align) {
    if (align == null || align is! String) return TextAlign.left;
    switch (align.toLowerCase()) {
      case 'center': return TextAlign.center;
      case 'right': return TextAlign.right;
      default: return TextAlign.left;
    }
  }

  IconData _mapIcon(String name) {
    switch (name.toLowerCase()) {
      case 'local_shipping': return Icons.local_shipping;
      case 'star': return Icons.star;
      case 'person': return Icons.person;
      case 'engineering': return Icons.engineering;
      case 'landscape': return Icons.landscape;
      case 'badge': return Icons.badge;
      case 'info': return Icons.info;
      case 'settings': return Icons.settings;
      case 'check_circle': return Icons.check_circle;
      default: return Icons.star;
    }
  }
}
