import 'package:url_launcher/url_launcher.dart';
import 'dart:async';
import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:system_alert_window/system_alert_window.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 덤프트럭 기사가 외부 내비게이션(티맵/카카오내비)으로 길안내를 받고 있을 때,
/// 화면 위에 플로팅되어 실시간 미터기 정보(금액, 거리, 시간)를 보여주는 오버레이 위젯 관리 클래스.
class DriverOverlayMeter {
  static bool _isActive = false;

  /// 플로팅 오버레이를 띄우기 위한 안드로이드 다른 앱 위에 그리기 권한 확인 및 요청
  static Future<bool> requestOverlayPermission() async {
    try {
      final isGranted = await SystemAlertWindow.checkPermissions(
        prefMode: SystemWindowPrefMode.OVERLAY,
      );
      if (isGranted == null || !isGranted) {
        final result = await SystemAlertWindow.requestPermissions(
          prefMode: SystemWindowPrefMode.OVERLAY,
        );
        return result ?? false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /// 플로팅 팝업 미터기 창 띄우기 (옵션 1 : 가로 175px 콤팩트 화이트 카드)
  static Future<void> showActiveMeter({
    required int currentFare,
    required double distanceKm,
    required int elapsedSeconds,
  }) async {
    if (_isActive) {
      await updateMeterData(
        currentFare: currentFare,
        distanceKm: distanceKm,
        elapsedSeconds: elapsedSeconds,
      );
      return;
    }
    _isActive = true;

    final bool hasPermission = await requestOverlayPermission();
    if (!hasPermission) {
      _isActive = false;
      return;
    }

    try {
      // SharedPreferences에 최신 초기 값 저장
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt("overlay_initial_fare", currentFare);
        await prefs.setDouble("overlay_initial_distance", distanceKm);
        await prefs.setInt("overlay_initial_time", elapsedSeconds);
      } catch (e) {
        log("오버레이 초기 데이터 저장 실패: $e");
      }

      // 옵션 1 : 가로 폭을 215에서 175px로 콤팩트하게 축소 조정하여 지도 시야 확보
      await SystemAlertWindow.showSystemWindow(
        height: 70,
        width: 175,
        gravity: SystemWindowGravity.TOP,
        prefMode: SystemWindowPrefMode.OVERLAY,
        layoutParamFlags: [
          SystemWindowFlags.FLAG_NOT_FOCUSABLE,
          SystemWindowFlags.FLAG_NOT_TOUCH_MODAL,
        ],
      );

      // 초기 데이터 전송
      await updateMeterData(
        currentFare: currentFare,
        distanceKm: distanceKm,
        elapsedSeconds: elapsedSeconds,
      );
    } catch (e) {
      _isActive = false;
      log("오버레이 표시 실패: $e");
    }
  }

  /// 실시간 운행 요금 및 거리/시간 수치를 팝업으로 실시간 갱신
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
      log("오버레이 업데이트 메시지 전송 실패: $e");
    }
  }

  /// 플로팅 미터기 닫기 및 소멸
  static Future<void> closeMeter() async {
    try {
      await SystemAlertWindow.closeSystemWindow(
        prefMode: SystemWindowPrefMode.OVERLAY,
      );
      _isActive = false;
    } catch (e) {
      log("소멸 처리 실패: $e");
    }
  }
}

/// 오버레이 위젯 내부 Flutter UI
class DriverOverlayMeterWidget extends StatefulWidget {
  const DriverOverlayMeterWidget({super.key});

  @override
  State<DriverOverlayMeterWidget> createState() =>
      _DriverOverlayMeterWidgetState();
}

class _DriverOverlayMeterWidgetState extends State<DriverOverlayMeterWidget> {
  int _fare = 0;
  double _distance = 0.0;
  int _seconds = 0;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    SystemAlertWindow.overlayListener.listen((event) {
      if (event is Map) {
        if (mounted) {
          setState(() {
            _fare = event['fare'] as int? ?? 0;
            _distance = (event['distance'] as num? ?? 0.0).toDouble();
            _seconds = event['seconds'] as int? ?? 0;
            _initialized = true;
          });
        }
      }
    });
  }

  Future<void> _loadInitialData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted && !_initialized) {
        setState(() {
          _fare = prefs.getInt("overlay_initial_fare") ?? 0;
          _distance = prefs.getDouble("overlay_initial_distance") ?? 0.0;
          _seconds = prefs.getInt("overlay_initial_time") ?? 0;
          _initialized = true;
        });
      }
    } catch (_) {}
  }

  String _formatTime(int seconds) {
    final int min = seconds ~/ 60;
    final int sec = seconds % 60;
    return "${min}분 ${sec}초";
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const SizedBox.shrink();
    }
    return GestureDetector(
      onTap: () async {
        log("★ [Overlay] onTap triggered - invoking openApp");
        try {
          const channel = MethodChannel('com.example.dumpring/overlay_helper');
          await channel.invokeMethod('openApp');
        } catch (e) {
          log("⚠️ [Overlay] MethodChannel openApp failed: $e");
        }
        try {
          final uri = Uri.parse('dumpring://open');
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        } catch (e) {
          log("⚠️ [Overlay] launchUrl failed: $e");
        }
        await DriverOverlayMeter.closeMeter();
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white, // 대낮에도 눈에 번쩍 띄는 화이트 카드 베이스
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFF465FFF), // 덤프링 시그니처 로열 블루 테두리
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF465FFF).withValues(alpha: 0.22),
              blurRadius: 10,
              spreadRadius: 1,
              offset: const Offset(0, 3),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. 상단 미니 브랜드 태그 및 상태
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "덤프링 미터",
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF465FFF),
                    decoration: TextDecoration.none,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    "GPS ON",
                    style: TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF16A34A),
                      decoration: TextDecoration.none,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),

            // 2. 실시간 정산 금액 (선명한 차콜 블랙)
            Text(
              "${_formatter(_fare)} 원",
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF0F172A), // 차콜 블랙
                fontSize: 18,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
                decoration: TextDecoration.none,
              ),
            ),
            const SizedBox(height: 2),

            // 3. 거리 및 시간 요약
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  "${_distance.toStringAsFixed(1)}km",
                  style: const TextStyle(
                    color: Color(0xFF465FFF), // 포인트 블루
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    decoration: TextDecoration.none,
                  ),
                ),
                const SizedBox(width: 4),
                const Text(
                  "•",
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 9, decoration: TextDecoration.none),
                ),
                const SizedBox(width: 4),
                Text(
                  _formatTime(_seconds),
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
