import 'package:flutter/material.dart';

/// 서버에서 전달받은 테마 데이터를 Flutter ThemeData로 변환하는 모델
class SduiTheme {
  final String themeKey;
  final String name;
  final String primaryColor;
  final String secondaryColor;
  final String backgroundColor;
  final String surfaceColor;
  final String textColor;
  final String? accentColor;
  final String? fontFamily;

  SduiTheme({
    required this.themeKey,
    required this.name,
    required this.primaryColor,
    required this.secondaryColor,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.textColor,
    this.accentColor,
    this.fontFamily,
  });

  factory SduiTheme.fromJson(Map<String, dynamic> json) {
    return SduiTheme(
      themeKey: json['theme_key'] ?? 'default',
      name: json['name'] ?? '기본 테마',
      primaryColor: json['primary_color'] ?? '0xFFFFD700',
      secondaryColor: json['secondary_color'] ?? '0xFFFFD700',
      backgroundColor: json['background_color'] ?? '0xFF0A0F1D',
      surfaceColor: json['surface_color'] ?? '0xFF1E2638',
      textColor: json['text_color'] ?? '0xFFFFFFFF',
      accentColor: json['accent_color'],
      fontFamily: json['font_family'],
    );
  }

  Map<String, dynamic> toJson() => {
    'theme_key': themeKey,
    'name': name,
    'primary_color': primaryColor,
    'secondary_color': secondaryColor,
    'background_color': backgroundColor,
    'surface_color': surfaceColor,
    'text_color': textColor,
    'accent_color': accentColor,
    'font_family': fontFamily,
  };

  /// 0xFFxxxxxx 형태의 hex 문자열을 Color로 변환
  static Color _parseHex(String hex) {
    String cleanHex = hex.replaceAll('#', '');
    if (cleanHex.startsWith('0x') || cleanHex.startsWith('0X')) {
      cleanHex = cleanHex.substring(2);
    }
    if (cleanHex.length == 6) {
      cleanHex = 'FF$cleanHex';
    }
    final val = int.tryParse(cleanHex, radix: 16);
    return val != null ? Color(val) : const Color(0xFFF59E0B);
  }

  Color get primary => _parseHex(primaryColor);
  Color get secondary => _parseHex(secondaryColor);
  Color get background => _parseHex(backgroundColor);
  Color get surface => _parseHex(surfaceColor);
  Color get text => _parseHex(textColor);
  Color get accent => _parseHex(accentColor ?? primaryColor);

  /// 서버 테마를 Flutter ThemeData로 변환
  ThemeData toThemeData() {
    final isDark = ThemeData.estimateBrightnessForColor(background) == Brightness.dark;
    final baseTheme = isDark ? ThemeData.dark() : ThemeData.light();
    final baseScheme = isDark ? const ColorScheme.dark() : const ColorScheme.light();

    return baseTheme.copyWith(
      scaffoldBackgroundColor: background,
      dialogBackgroundColor: surface,
      cardColor: surface,
      colorScheme: baseScheme.copyWith(
        primary: primary,
        secondary: secondary,
        surface: surface,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: primary, width: 1.0),
        ),
        titleTextStyle: TextStyle(
          color: primary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        contentTextStyle: TextStyle(
          color: text,
          fontSize: 14,
        ),
      ),
    );
  }

  /// 기본 머스터드 옐로우 테마 (공식)
  static SduiTheme defaultTheme() {
    return SduiTheme(
      themeKey: 'light_mustard',
      name: '머스터드 옐로우 (공식)',
      primaryColor: '0xFFF59E0B',
      secondaryColor: '0xFFD97706',
      backgroundColor: '0xFFF9F8F6',
      surfaceColor: '0xFFFFFFFF',
      textColor: '0xFF1F2937',
      accentColor: '0xFFD97706',
    );
  }
}
