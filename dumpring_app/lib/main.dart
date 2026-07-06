import 'package:flutter/material.dart';
import 'dart:ui';
import 'screens/login_screen.dart'; // 로그인 화면 임포트
import 'sdui/sdui_service.dart'; // SDUI 서비스 임포트
import 'sdui/driver_overlay_meter.dart';

// 다른 앱 위에 그리기(System Alert Window) 전용 백그라운드 엔진 진입점
@pragma("vm:entry-point")
void overlayMain() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      home: DriverOverlayMeterWidget(),
    ),
  );
}

void main() {
  runApp(const MyApp());
}

// 웹에서 마우스/트랙패드 드래그로 모바일처럼 스크롤할 수 있도록 허용하는 클래스
class WebScrollBehavior extends MaterialScrollBehavior {
  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
      };
}

// 데스크톱 브라우저 환경에서 앱을 모바일 프레임 내부로 보기 좋게 격리하는 래퍼 클래스
class WebFrameWrapper extends StatelessWidget {
  final Widget child;
  const WebFrameWrapper({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;
    final bool isDesktopWeb = screenWidth > 600;

    if (!isDesktopWeb) {
      return child;
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // 세련된 다크 블루 외곽 배경
      body: Center(
        child: Container(
          width: 430,
          margin: const EdgeInsets.symmetric(vertical: 24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(32),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.6),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
            border: Border.all(
              color: const Color(0xFF334155),
              width: 8,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: child,
          ),
        ),
      ),
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '덤프링 모바일',
      debugShowCheckedModeBanner: false, // 디버그 띠 제거
      theme: SduiService.currentTheme.toThemeData(),
      scrollBehavior: WebScrollBehavior(), // 웹 드래그 스크롤 행동 양식 바인딩
      builder: (context, child) {
        return WebFrameWrapper(child: child ?? const SizedBox());
      },
      home: const LoginScreen(), // 첫 스크린으로 로그인 화면 출력
    );
  }
}
