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
      cardColor: surface,
      colorScheme: baseScheme.copyWith(
        primary: primary,
        secondary: secondary,
        surface: surface,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.04),
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE4E7EC),
            width: 1.0,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF1E2638) : const Color(0xFFFFFFFF),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFD0D5DD),
            width: 1.0,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFD0D5DD),
            width: 1.0,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFF04438), width: 1.0),
        ),
        labelStyle: TextStyle(
          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF344054),
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        hintStyle: TextStyle(
          color: isDark ? const Color(0xFF475569) : const Color(0xFF98A2B3),
          fontSize: 13,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: BorderSide(
            color: isDark ? const Color(0xFF465FFF) : const Color(0xFFD0D5DD),
            width: 1.0,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: surface,
        iconTheme: IconThemeData(color: text),
        titleTextStyle: TextStyle(
          color: text,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: isDark ? const Color(0xFF334155) : const Color(0xFFE4E7EC),
        thickness: 1.0,
        space: 1,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: primary.withValues(alpha: 0.5), width: 1.0),
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
      themeKey: 'admin_dashboard',
      name: '웹 관리자 대시보드 테마 (공식)',
      primaryColor: '0xFF465FFF',     // Tailwind brand-500 (Royal Blue)
      secondaryColor: '0xFF3641F5',   // Tailwind brand-600
      backgroundColor: '0xFFF9FAFB',  // Tailwind gray-50 (소프트 그레이 캔버스)
      surfaceColor: '0xFFFFFFFF',     // Pure White (카드 및 인풋 표면)
      textColor: '0xFF101828',        // Tailwind gray-900 (또렷한 텍스트)
      accentColor: '0xFF465FFF',      // 포인트 강조
    );
  }
}
