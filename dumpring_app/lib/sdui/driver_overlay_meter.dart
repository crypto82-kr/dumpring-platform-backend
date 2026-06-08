import 'dart:async';
import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:system_alert_window/system_alert_window.dart';

/// 덤프 기사가 외부 내비(티맵/카카오내비)로 경로 안내를 받고 있을 때,
/// 화면 위에 플로팅 위젯 형식으로 미터기 실시간 데이터(요금, 거리, 시간)를 띄워주는 클래스 및 위젯.
class DriverOverlayMeter {
  static bool _isActive = false;

  /// 플로팅 위젯을 띄우기 위한 안드로이드 다른 앱 위에 그리기 권한 검증 및 요청
  static Future<bool> requestOverlayPermission() async {
    try {
      final isGranted = await SystemAlertWindow.checkPermissions(prefMode: SystemWindowPrefMode.OVERLAY);
      if (isGranted == null || !isGranted) {
        final result = await SystemAlertWindow.requestPermissions(prefMode: SystemWindowPrefMode.OVERLAY);
        return result ?? false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /// 플로팅 오버레이 미터기 팝업 창 생성 및 구동
  static Future<void> showActiveMeter({
    required int currentFare,
    required double distanceKm,
    required int elapsedSeconds,
  }) async {
    final bool hasPermission = await requestOverlayPermission();
    if (!hasPermission) return;

    try {
      // 덤프링 앱에서 오버레이 윈도우 띄우기
      await SystemAlertWindow.showSystemWindow(
        height: 160,
        width: 320,
        gravity: SystemWindowGravity.TOP,
        prefMode: SystemWindowPrefMode.OVERLAY,
        layoutParamFlags: [
          SystemWindowFlags.FLAG_NOT_FOCUSABLE,
          SystemWindowFlags.FLAG_NOT_TOUCH_MODAL,
        ],
      );
      _isActive = true;

      // 초기 데이터 즉시 전송
      await updateMeterData(
        currentFare: currentFare,
        distanceKm: distanceKm,
        elapsedSeconds: elapsedSeconds,
      );
    } catch (e) {
      log("오버레이 생성 에러: $e");
    }
  }

  /// 실시간 주행 중인 거리/요금 수치를 오버레이 위젯에 실시간 전송
  static Future<void> updateMeterData({
    required int currentFare,
    required double distanceKm,
    required int elapsedSeconds,
  }) async {
    if (!_isActive) return;
    try {
      final data = {
        'fare': currentFare,
        'distance': distanceKm,
        'seconds': elapsedSeconds,
      };
      await SystemAlertWindow.sendMessageToOverlay(data);
    } catch (e) {
      log("오버레이 업데이트 통신 에러: $e");
    }
  }

  /// 플로팅 미터기 오버레이 윈도우 소멸 및 비활성화
  static Future<void> closeMeter() async {
    try {
      await SystemAlertWindow.closeSystemWindow(prefMode: SystemWindowPrefMode.OVERLAY);
      _isActive = false;
    } catch (e) {
      log("소멸 처리 에러: $e");
    }
  }
}

/// 오버레이 전용 엔트리포인트에서 실행될 Flutter 위젯
class DriverOverlayMeterWidget extends StatefulWidget {
  DriverOverlayMeterWidget({super.key});

  @override
  State<DriverOverlayMeterWidget> createState() => _DriverOverlayMeterWidgetState();
}

class _DriverOverlayMeterWidgetState extends State<DriverOverlayMeterWidget> {
  int _fare = 0;
  double _distance = 0.0;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    // 메인 앱으로부터 주행 데이터 수신 리스너 등록
    SystemAlertWindow.overlayListener.listen((event) {
      if (event is Map) {
        setState(() {
          _fare = event['fare'] as int? ?? 0;
          _distance = (event['distance'] as num? ?? 0.0).toDouble();
          _seconds = event['seconds'] as int? ?? 0;
        });
      }
    });
  }

  String _formatTime(int seconds) {
    final int min = seconds ~/ 60;
    final int sec = seconds % 60;
    return "$min분 $sec초";
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor, // 프리미엄 다크 네이비
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.primary.withOpacity(0.3), // 은은한 골드 테두리
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 10,
            spreadRadius: 2,
            offset: Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 상단 바 (헤더)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.local_shipping,
                    color: Theme.of(context).colorScheme.primary,
                    size: 16,
                  ),
                  SizedBox(width: 6),
                  Text(
                    "덤프링 실시간 미터기",
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.none,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () {
                  DriverOverlayMeter.closeMeter();
                },
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : Color(0xFF1F2937)) : Color(0xFF1F2937)).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.close,
                    color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : Color(0xFF1F2937)) : Color(0xFF1F2937)),
                    size: 14,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          // 중앙 요금 표시
          Center(
            child: Text(
              "${_formatter(_fare)} 원",
              style: TextStyle(
                color: Color(0xFFFF7A00), // 시그니처 주황색
                fontSize: 26,
                fontWeight: FontWeight.w900,
                decoration: TextDecoration.none,
              ),
            ),
          ),
          SizedBox(height: 8),
          // 하단 거리 및 시간 정보
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "거리: ${_distance.toStringAsFixed(2)} km",
                style: TextStyle(
                  color: (Theme.of(context).brightness == Brightness.dark ? Color(0xFF8F9BB3) : Color(0xFF4B5563)),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  decoration: TextDecoration.none,
                ),
              ),
              SizedBox(width: 12),
              Container(
                width: 1,
                height: 10,
                color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Color(0xFF8F9BB3) : Color(0xFF4B5563)) : Color(0xFF4B5563)).withOpacity(0.3),
              ),
              SizedBox(width: 12),
              Text(
                "시간: ${_formatTime(_seconds)}",
                style: TextStyle(
                  color: (Theme.of(context).brightness == Brightness.dark ? Color(0xFF8F9BB3) : Color(0xFF4B5563)),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  decoration: TextDecoration.none,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
