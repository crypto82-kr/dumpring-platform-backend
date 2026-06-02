class SduiComponent {
  final String type;
  final Map<String, dynamic> props;
  final List<SduiComponent>? children;
  final Map<String, dynamic>? action;

  SduiComponent({
    required this.type,
    required this.props,
    this.children,
    this.action,
  });

  factory SduiComponent.fromJson(Map<String, dynamic> json) {
    var rawChildren = json['children'] as List?;
    List<SduiComponent>? parsedChildren;
    if (rawChildren != null) {
      parsedChildren = rawChildren
          .map((c) => SduiComponent.fromJson(Map<String, dynamic>.from(c)))
          .toList();
    }

    return SduiComponent(
      type: json['type'] as String? ?? 'container',
      props: Map<String, dynamic>.from(json['props'] ?? {}),
      children: parsedChildren,
      action: json['action'] != null ? Map<String, dynamic>.from(json['action']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'props': props,
      'children': children?.map((c) => c.toJson()).toList(),
      'action': action,
    };
  }
}
