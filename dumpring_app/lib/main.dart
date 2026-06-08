import 'package:flutter/material.dart';
import 'screens/login_screen.dart'; // 로그인 화면 임포트
import 'sdui/sdui_service.dart'; // SDUI 서비스 임포트

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '덤프링 모바일',
      debugShowCheckedModeBanner: false, // 디버그 띠 제거
      theme: SduiService.currentTheme.toThemeData(),
      home: const LoginScreen(), // 첫 스크린으로 로그인 화면 출력
    );
  }
}
