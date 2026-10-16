import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// iOS 16.1+ 다이내믹 아일랜드(Dynamic Island) 및 실시간 라이브 액티비티(Live Activity) 제어 서비스
class LiveActivityService {
  static const MethodChannel _channel = MethodChannel('com.example.dumpring/live_activity');
  static bool _isActive = false;

  /// 현재 활성화 여부
  static bool get isActive => _isActive;

  /// 해당 기기 및 OS가 Live Activities를 지원하는지 확인
  static Future<bool> isSupported() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return false;
    }
    try {
      final bool? supported = await _channel.invokeMethod<bool>('isLiveActivitySupported');
      return supported ?? false;
    } catch (e) {
      debugPrint("LiveActivity isSupported check error: $e");
      return false;
    }
  }

  /// 다이내믹 아일랜드 및 잠금화면 라이브 액티비티 시작
  static Future<bool> startLiveActivity({
    required int currentFare,
    required double distanceKm,
    required int elapsedSeconds,
    required String originName,
    required String destinationName,
    String vehicleNumber = "덤프트럭",
    String statusText = "운행 중",
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return false;
    }

    try {
      final Map<String, dynamic> args = {
        'originName': originName.isNotEmpty ? originName : '상차지',
        'destinationName': destinationName.isNotEmpty ? destinationName : '하차지',
        'vehicleNumber': vehicleNumber.isNotEmpty ? vehicleNumber : '덤프트럭',
        'currentFare': currentFare,
        'distanceKm': distanceKm,
        'elapsedSeconds': elapsedSeconds,
        'statusText': statusText,
      };

      final result = await _channel.invokeMethod('startLiveActivity', args);
      _isActive = true;
      debugPrint("★ [LiveActivity] Started successfully: $result");
      return true;
    } catch (e) {
      debugPrint("★ [LiveActivity] Start failed: $e");
      _isActive = false;
      return false;
    }
  }

  /// 다이내믹 아일랜드 실시간 주행 정보 갱신 (요금, 거리, 시간 등)
  static Future<bool> updateLiveActivity({
    required int currentFare,
    required double distanceKm,
    required int elapsedSeconds,
    String statusText = "운행 중",
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS || !_isActive) {
      return false;
    }

    try {
      final Map<String, dynamic> args = {
        'currentFare': currentFare,
        'distanceKm': distanceKm,
        'elapsedSeconds': elapsedSeconds,
        'statusText': statusText,
      };

      final bool? success = await _channel.invokeMethod<bool>('updateLiveActivity', args);
      return success ?? false;
    } catch (e) {
      debugPrint("★ [LiveActivity] Update failed: $e");
      return false;
    }
  }

  /// 운행 종료 시 다이내믹 아일랜드 및 라이브 액티비티 즉시 종료
  static Future<bool> endLiveActivity({
    required int currentFare,
    required double distanceKm,
    required int elapsedSeconds,
    String statusText = "운행 완료",
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS || !_isActive) {
      return false;
    }

    try {
      final Map<String, dynamic> args = {
        'currentFare': currentFare,
        'distanceKm': distanceKm,
        'elapsedSeconds': elapsedSeconds,
        'statusText': statusText,
      };

      final bool? success = await _channel.invokeMethod<bool>('endLiveActivity', args);
      _isActive = false;
      debugPrint("★ [LiveActivity] Ended successfully: $success");
      return success ?? false;
    } catch (e) {
      debugPrint("★ [LiveActivity] End failed: $e");
      _isActive = false;
      return false;
    }
  }
}
