import 'package:flutter/material.dart';
import 'screens/login_screen.dart'; // 로그인 화면 임포트

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: '덤프링 모바일',
      debugShowCheckedModeBanner: false, // 디버그 띠 제거
      home: LoginScreen(), // 첫 스크린으로 로그인 화면 출력
    );
  }
}
