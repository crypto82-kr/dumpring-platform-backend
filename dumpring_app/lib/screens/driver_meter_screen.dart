import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'package:image_picker/image_picker.dart';
import '../sdui/driver_overlay_meter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

class DriverMeterScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final int ticketId;
  final Function(int earnings) onDriveCompleted;
  final Map<String, dynamic>? initialTicket;

  const DriverMeterScreen({
    Key? key,
    required this.user,
    required this.token,
    required this.ticketId,
    required this.onDriveCompleted,
    this.initialTicket,
  }) : super(key: key);

  @override
  State<DriverMeterScreen> createState() => _DriverMeterScreenState();
}

class _DriverMeterScreenState extends State<DriverMeterScreen> with WidgetsBindingObserver {
  String get _baseUrl => AppConfig.baseUrl;

  // 1: 상차지 이동, 2: 대기중, 3: 미터기 가동중, 4: 하차지 도착(승인 대기), 5: 운행 완료
  int _driveStep = 1;

  int _currentFare = 95000; 
  double _distanceKm = 0.0;
  int _elapsedSeconds = 0;
  int _speedKmh = 0;
  bool _isDistanceMode = true; 

  // Dynamic pricing policy & planned metrics
  String _calculationMethod = "CONTINUOUS";
  int _continuousDistanceFare = 1200;
  int _continuousTimeFare = 150;
  int _overPlanDistanceFare = 1500;
  int _overPlanTimeFare = 200;

  double _plannedDistanceKm = 10.0;
  int _plannedTimeMinutes = 20;
  int _baseTariff = 95000;

  Timer? _meterTimer;
  Timer? _statusPollTimer;

  bool _isLandownerAbsent = false;
  String? _attachedPhoto;
  bool _isLoadingState = true;

  // 비정상 꺼짐 / 네트워크 장애 감지용 변수
  int _offlineCount = 0;
  int _maxSingleOfflineSeconds = 0;
  int _totalOfflineSeconds = 0;

  // 상하차지 좌표 및 현장명 저장을 위한 변수
  double? _siteLat;
  double? _siteLng;
  String? _siteName;
  double? _dropOffLat;
  double? _dropOffLng;
  String? _dropOffName;

  Future<void> _launchTMap({required String destinationName, required double? lat, required double? lng}) async {
    debugPrint("티맵 호출 목적지: $destinationName, 위도(Y): $lat, 경도(X): $lng");
    if (lat == null || lng == null || lat == 0.0 || lng == 0.0) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text("⚠️ 안내"),
          content: Text("목적지 좌표 정보가 부족합니다.\n(전달된 좌표: $lat, $lng)"),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("확인"),
            )
          ],
        ),
      );
      return;
    }

    final String encodedName = Uri.encodeComponent(destinationName);
    
    // 안드로이드 실기기 규격: goalx = 경도(Lng), goaly = 위도(Lat), goalname = 목적지명, referrer = 패키지명
    // iOS 및 기타 규격: rGoName = 목적지명, rGoX = 경도, rGoY = 위도
    String urlString;
    if (Theme.of(context).platform == TargetPlatform.android) {
      urlString = "tmap://route?referrer=com.example.dumpring_app&goalx=$lng&goaly=$lat&goalname=$encodedName";
    } else {
      urlString = "tmap://route?rGoName=$encodedName&rGoX=$lng&rGoY=$lat";
    }
    
    final Uri uri = Uri.parse(urlString);

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        final Uri playStoreUri = Uri.parse("market://details?id=com.skt.tmap.ku");
        if (await canLaunchUrl(playStoreUri)) {
          await launchUrl(playStoreUri, mode: LaunchMode.externalApplication);
        } else {
          await launchUrl(Uri.parse("https://play.google.com/store/apps/details?id=com.skt.tmap.ku"), mode: LaunchMode.externalApplication);
        }
      }
    } catch (e) {
      debugPrint("티맵 호출 에러: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("⚠️ 티맵 내비게이션을 호출하는 중 오류가 발생했습니다: $e"),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _launchKakaoNavi({required String destinationName, required double? lat, required double? lng}) async {
    debugPrint("카카오내비 호출 목적지: $destinationName, 위도(Y): $lat, 경도(X): $lng");
    if (lat == null || lng == null || lat == 0.0 || lng == 0.0) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text("⚠️ 안내"),
          content: Text("목적지 좌표 정보가 부족합니다.\n(전달된 좌표: $lat, $lng)"),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("확인"),
            )
          ],
        ),
      );
      return;
    }

    final String encodedName = Uri.encodeComponent(destinationName);
    final String urlString = "kakaonavi://navigate?daddr=$encodedName&dlat=$lat&dlng=$lng&coord_type=wgs84";
    final Uri uri = Uri.parse(urlString);

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        final Uri playStoreUri = Uri.parse("market://details?id=com.locnall.KimGiSa");
        if (await canLaunchUrl(playStoreUri)) {
          await launchUrl(playStoreUri, mode: LaunchMode.externalApplication);
        } else {
          await launchUrl(Uri.parse("https://play.google.com/store/apps/details?id=com.locnall.KimGiSa"), mode: LaunchMode.externalApplication);
        }
      }
    } catch (e) {
      debugPrint("카카오내비 호출 에러: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("⚠️ 카카오내비를 호출하는 중 오류가 발생했습니다: $e"),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _launchPreferredNavi({required String destinationName, required double? lat, required double? lng}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String preferred = prefs.getString("preferred_navi") ?? "tmap";
      if (preferred == "kakaonavi") {
        await _launchKakaoNavi(destinationName: destinationName, lat: lat, lng: lng);
      } else {
        await _launchTMap(destinationName: destinationName, lat: lat, lng: lng);
      }
    } catch (e) {
      await _launchTMap(destinationName: destinationName, lat: lat, lng: lng);
    }
  }


  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initMeterState();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_driveStep == 3) { // 운행 중(미터기 가동 중)일 때만 작동
      if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
        // 앱이 비활성화되거나 백그라운드로 이동할 때 오버레이 미터기 띄우기
        DriverOverlayMeter.showActiveMeter(
          currentFare: _currentFare,
          distanceKm: _distanceKm,
          elapsedSeconds: _elapsedSeconds,
        );
      } else if (state == AppLifecycleState.resumed) {
        // 앱이 다시 포어그라운드로 돌아오면 오버레이 미터기 닫기
        DriverOverlayMeter.closeMeter();
      }
    }
  }

  Future<void> _initMeterState() async {
    if (widget.initialTicket != null) {
      await _applyTicketState(widget.initialTicket!);
      if (mounted) {
        setState(() {
          _isLoadingState = false;
        });
      }
    } else {
      await _loadInitialTicketState();
    }
  }

  Future<void> _saveProgressToLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt("ticket_progress_${widget.ticketId}_time", _elapsedSeconds);
      await prefs.setDouble("ticket_progress_${widget.ticketId}_distance", _distanceKm);
      await prefs.setInt("ticket_progress_${widget.ticketId}_fare", _currentFare);
      await prefs.setInt("ticket_progress_${widget.ticketId}_offline_count", _offlineCount);
      await prefs.setInt("ticket_progress_${widget.ticketId}_max_offline_sec", _maxSingleOfflineSeconds);
      await prefs.setInt("ticket_progress_${widget.ticketId}_total_offline_sec", _totalOfflineSeconds);
      await prefs.setInt("ticket_progress_${widget.ticketId}_last_heartbeat", DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint("로컬 진행 데이터 저장 에러: $e");
    }
  }

  Future<void> _clearLocalProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove("ticket_progress_${widget.ticketId}_time");
      await prefs.remove("ticket_progress_${widget.ticketId}_distance");
      await prefs.remove("ticket_progress_${widget.ticketId}_fare");
      await prefs.remove("ticket_progress_${widget.ticketId}_offline_count");
      await prefs.remove("ticket_progress_${widget.ticketId}_max_offline_sec");
      await prefs.remove("ticket_progress_${widget.ticketId}_total_offline_sec");
      await prefs.remove("ticket_progress_${widget.ticketId}_last_heartbeat");
    } catch (e) {
      debugPrint("로컬 진행 데이터 삭제 에러: $e");
    }
  }

  Future<void> _applyTicketState(Map<String, dynamic> ticket) async {
    final String status = ticket['status'];

    if (ticket['pricing_policy'] != null) {
      final policy = ticket['pricing_policy'];
      _calculationMethod = policy['calculation_method'] ?? 'CONTINUOUS';
      _continuousDistanceFare = policy['continuous_distance_unit_fare'] ?? 1200;
      _continuousTimeFare = policy['continuous_time_unit_fare'] ?? 150;
      _overPlanDistanceFare = policy['over_plan_distance_unit_fare'] ?? 1500;
      _overPlanTimeFare = policy['over_plan_time_unit_fare'] ?? 200;
    }

    if (ticket['job_post'] != null) {
      final jp = ticket['job_post'];
      _baseTariff = jp['offered_unit_price'] ?? 95000;
      _plannedDistanceKm = (jp['distance'] as num?)?.toDouble() ?? 10.0;
      _plannedTimeMinutes = jp['estimated_time'] ?? 20;
      _siteLat = (jp['site_latitude'] as num?)?.toDouble();
      _siteLng = (jp['site_longitude'] as num?)?.toDouble();
      _siteName = jp['site_name'] as String?;
      _dropOffLat = (jp['drop_off_latitude'] as num?)?.toDouble();
      _dropOffLng = (jp['drop_off_longitude'] as num?)?.toDouble();
      _dropOffName = jp['drop_off_name'] as String?;
    }

    if (status == "ACCEPTED") {
      _driveStep = 1;
      _currentFare = _baseTariff;
    } else {
      if (status == "DRIVING") {
        _driveStep = 3;
      } else if (status == "ARRIVED") {
        _driveStep = 4;
      } else if (status == "WAITING_ABSENT_APPROVAL") {
        _driveStep = 4;
        _isLandownerAbsent = true;
        _attachedPhoto = ticket['proof_photo'];
      } else if (status == "APPROVED" || status == "COMPLETED") {
        _driveStep = 5;
      }

      final prefs = await SharedPreferences.getInstance();
      final savedTime = prefs.getInt("ticket_progress_${widget.ticketId}_time");
      final savedDistance = prefs.getDouble("ticket_progress_${widget.ticketId}_distance");
      final savedFare = prefs.getInt("ticket_progress_${widget.ticketId}_fare");

      // 오프라인 측정치 복원
      _offlineCount = prefs.getInt("ticket_progress_${widget.ticketId}_offline_count") ?? 0;
      _maxSingleOfflineSeconds = prefs.getInt("ticket_progress_${widget.ticketId}_max_offline_sec") ?? 0;
      _totalOfflineSeconds = prefs.getInt("ticket_progress_${widget.ticketId}_total_offline_sec") ?? 0;

      // 마지막 통신 심박(Heartbeat) 기준으로 비정상 꺼짐/네트워크 장애 감지
      final lastHeartbeatMs = prefs.getInt("ticket_progress_${widget.ticketId}_last_heartbeat");
      if (lastHeartbeatMs != null && status == "DRIVING") {
        final lastHeartbeat = DateTime.fromMillisecondsSinceEpoch(lastHeartbeatMs);
        final gapSeconds = DateTime.now().difference(lastHeartbeat).inSeconds;
        if (gapSeconds > 10) {
          _offlineCount += 1;
          _totalOfflineSeconds += gapSeconds;
          if (gapSeconds > _maxSingleOfflineSeconds) {
            _maxSingleOfflineSeconds = gapSeconds;
          }
          // 바로 로컬 저장 업데이트
          await prefs.setInt("ticket_progress_${widget.ticketId}_offline_count", _offlineCount);
          await prefs.setInt("ticket_progress_${widget.ticketId}_max_offline_sec", _maxSingleOfflineSeconds);
          await prefs.setInt("ticket_progress_${widget.ticketId}_total_offline_sec", _totalOfflineSeconds);
        }
      }

      _elapsedSeconds = savedTime ?? ticket['drive_time_seconds'] ?? 0;
      _distanceKm = savedDistance ?? (ticket['drive_distance_km'] as num?)?.toDouble() ?? 0.0;
      _currentFare = savedFare ?? ticket['accumulated_fare'] ?? _baseTariff;
      if (_currentFare == 0) {
        _currentFare = _baseTariff;
      }

      if (status == "DRIVING") {
        _resumeMeterTimer();
      } else if (status == "ARRIVED" || status == "WAITING_ABSENT_APPROVAL") {
        _statusPollTimer?.cancel();
        _statusPollTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
          _pollTicketStatus();
        });
      }
    }
  }

  Future<void> _loadInitialTicketState() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        final ticket = jsonDecode(utf8.decode(response.bodyBytes));
        await _applyTicketState(ticket);
        if (mounted) {
          setState(() {
            _isLoadingState = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoadingState = false;
          });
        }
        String errMsg = "티켓 상태를 불러오지 못했습니다.";
        try {
          final err = jsonDecode(utf8.decode(response.bodyBytes));
          errMsg = err['detail'] ?? errMsg;
        } catch (_) {}
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("⚠️ $errMsg (코드: ${response.statusCode})"),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint("초기 티켓 상태 로드 실패: $e");
      if (mounted) {
        setState(() {
          _isLoadingState = false;
        });
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("⚠️ 티켓 정보를 불러오는 중 오류가 발생했습니다: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  int _calculateFare(double distance, int seconds) {
    if (_calculationMethod == "CONTINUOUS") {
      final double distanceFare = distance * _continuousDistanceFare;
      final double timeFare = (seconds / 60.0) * _continuousTimeFare;
      return _baseTariff + distanceFare.round() + timeFare.round();
    } else {
      final double overDistance = (distance - _plannedDistanceKm).clamp(0.0, double.infinity);
      final double overTimeMinutes = ((seconds / 60.0) - _plannedTimeMinutes).clamp(0.0, double.infinity);
      final double distanceFare = overDistance * _overPlanDistanceFare;
      final double timeFare = overTimeMinutes * _overPlanTimeFare;
      return _baseTariff + distanceFare.round() + timeFare.round();
    }
  }

  void _resumeMeterTimer() {
    _meterTimer?.cancel();
    _speedKmh = 60;
    _meterTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _elapsedSeconds += 1;
          if (_speedKmh > 10) {
            _isDistanceMode = true;
            _distanceKm += (_speedKmh / 3600);
          } else {
            _isDistanceMode = false;
          }
          _currentFare = _calculateFare(_distanceKm, _elapsedSeconds);
        });
        _saveProgressToLocal();
        DriverOverlayMeter.updateMeterData(
          currentFare: _currentFare,
          distanceKm: _distanceKm,
          elapsedSeconds: _elapsedSeconds,
        );
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _meterTimer?.cancel();
    _statusPollTimer?.cancel();
    DriverOverlayMeter.closeMeter();
    super.dispose();
  }

  void _arrivedAtLoadingSite() {
    setState(() {
      _driveStep = 2;
    });
  }

  // 1. 미터기 주행 시작 API 연동
  Future<void> _startDriving() async {
    // 거리가 1km 이상 벌어진 경우 주행 차단 검증 수행
    if (_siteLat != null && _siteLng != null && _siteLat != 0.0 && _siteLng != 0.0) {
      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 5),
        );
        final double distanceInMeters = Geolocator.distanceBetween(
          position.latitude,
          position.longitude,
          _siteLat!,
          _siteLng!,
        );

        if (distanceInMeters > 1000.0) { // 1km 초과 시 차단
          final double distanceInKm = distanceInMeters / 1000.0;
          if (mounted) {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                title: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.orange),
                    SizedBox(width: 8),
                    Text("상차지 이탈 경고", style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                content: Text(
                  "상차 현장으로부터 너무 멀리 떨어져 있어 운행을 시작할 수 없습니다.\n"
                  "공고된 상차지 좌표 부근으로 이동하여 미터기를 켜주세요.\n\n"
                  "• 상차지와의 거리: ${distanceInKm.toStringAsFixed(2)} km\n"
                  "• 부정 요금 부과 규정에 따라 운행 시작이 제한됩니다."
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("확인", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          }
          return; // 주행 시작 차단
        }
      } catch (e) {
        debugPrint("위치 확인 실패로 인한 무시 및 진입 허용: $e");
      }
    }

    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}/start-driving"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _driveStep = 3;
          _speedKmh = 60;
        });

        _meterTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (mounted) {
            setState(() {
              _elapsedSeconds += 1;
              if (_speedKmh > 10) {
                _isDistanceMode = true;
                _distanceKm += (_speedKmh / 3600);
              } else {
                _isDistanceMode = false;
              }
              _currentFare = _calculateFare(_distanceKm, _elapsedSeconds);
            });
            _saveProgressToLocal();
            DriverOverlayMeter.updateMeterData(
              currentFare: _currentFare,
              distanceKm: _distanceKm,
              elapsedSeconds: _elapsedSeconds,
            );
          }
        });
      } else {
        String errMsg = "주행 개시에 실패했습니다.";
        try {
          final err = jsonDecode(utf8.decode(response.bodyBytes));
          errMsg = err['detail'] ?? errMsg;
        } catch (_) {}
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("⚠️ $errMsg"),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint("주행 개시 실패: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("⚠️ 네트워크 연결 오류가 발생했습니다."),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _changeSpeed(int newSpeed) {
    setState(() {
      _speedKmh = newSpeed;
    });
  }

  Future<void> _arrivedAtUnloadingSite() async {
    _meterTimer?.cancel();
    DriverOverlayMeter.closeMeter();
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}/arrive"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "drive_distance_km": _distanceKm,
          "drive_time_seconds": _elapsedSeconds,
          "accumulated_fare": _currentFare,
          "offline_count": _offlineCount,
          "max_single_offline_seconds": _maxSingleOfflineSeconds,
          "total_offline_seconds": _totalOfflineSeconds,
          "client_timestamp_ms": DateTime.now().millisecondsSinceEpoch,
        }),
      );

      if (response.statusCode == 200) {
        setState(() {
          _driveStep = 4;
          _speedKmh = 0;
        });

        // 3. 지주 실시간 반입 승인을 실시간으로 감지하기 위한 Polling 타이머 가동 (WOW 🚨)
        _statusPollTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
          _pollTicketStatus();
        });
      }
    } catch (e) {
      debugPrint("도착 전송 실패: $e");
    }
  }

  // 4. 티켓 승인 상태 실시간 폴링 API 연동
  Future<void> _pollTicketStatus() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        final ticket = jsonDecode(utf8.decode(response.bodyBytes));
        final String status = ticket['status'];

        if (status == "APPROVED" || status == "COMPLETED") {
          _statusPollTimer?.cancel();
          setState(() {
            _driveStep = 5;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("🟢 지주가 반입을 최종 승인하였습니다. 전표가 발행됩니다.")),
          );
        } else if (status == "REJECTED") {
          _statusPollTimer?.cancel();
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              title: Text("⚠️ 반입 반려 회차 통보"),
              content: Text("하차지 지주가 토질 검사 부적격 판정(뻘흙 등)을 내려 반입이 반려되었습니다. 차량을 회차 후 분쟁 조정 센터로 연동됩니다."),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.pop(context); // 홈화면으로 즉시 복원 복귀
                  },
                  child: Text("확인 및 홈 복귀"),
                )
              ],
            ),
          );
        }
      }
    } catch (e) {
      debugPrint("티켓 상태 조회 실패: $e");
    }
  }

  // 지주 부재 시 강제 모의 승인 및 완료
  Future<void> _landownerApproved() async {
    _statusPollTimer?.cancel();
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}/inspection"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "decision": "APPROVED",
          "soil_type": "GOOD_SOIL",
        }),
      );

      if (response.statusCode == 200) {
        setState(() {
          _driveStep = 5;
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("⚠️ 강제 승인 요청 실패 (코드: ${response.statusCode})")),
          );
        }
      }
    } catch (e) {
      debugPrint("강제 승인 요청 에러: $e");
    }
  }

  Future<void> _takeLandownerAbsentPhoto() async {
    final ImagePicker picker = ImagePicker();
    
    final ImageSource? source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Color(0xFF004D5A)),
              title: const Text('카메라로 촬영하기'),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Color(0xFF004D5A)),
              title: const Text('갤러리에서 선택하기'),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final XFile? image = await picker.pickImage(
      source: source,
      imageQuality: 80,
      maxWidth: 1920,
    );

    if (image == null) return;

    setState(() {
      _isLoadingState = true;
    });

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}/proof-photo"),
      );
      
      request.headers['Authorization'] = "Bearer ${widget.token}";
      
      final multipartFile = await http.MultipartFile.fromPath(
        'file',
        image.path,
      );
      request.files.add(multipartFile);

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          _isLandownerAbsent = true;
          _attachedPhoto = decoded['proof_photo'];
          _driveStep = 4;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("📸 지주 부재 증빙 사진이 성공적으로 업로드되었습니다."),
            backgroundColor: Colors.green,
          ),
        );

        // 3. 지주 실시간 반입 승인을 실시간으로 감지하기 위한 Polling 타이머 가동
        _statusPollTimer?.cancel();
        _statusPollTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
          _pollTicketStatus();
        });
      } else {
        throw Exception("증빙 업로드 실패 (HTTP ${response.statusCode})");
      }
    } catch (e) {
      debugPrint("증빙 사진 업로드 에러: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("🔴 증빙 사진 업로드 도중 에러가 발생했습니다."),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingState = false;
        });
      }
    }
  }

  void _completeEntireDrive() {
    _clearLocalProgress();
    DriverOverlayMeter.closeMeter();
    widget.onDriveCompleted(_currentFare);
    Navigator.of(context).pop({'action': 'complete', 'fare': _currentFare}); 
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingState) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppColors.primary),
              const SizedBox(height: 16),
              const Text(
                "운행 정보를 불러오는 중입니다...",
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0.5,
        title: Text(_getAppBarTitle(), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildFlowIndicator(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: _buildMainContent(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getAppBarTitle() {
    switch (_driveStep) {
      case 1:
        return "상차지 이동 단계";
      case 2:
        return "상차 작업대기 단계";
      case 3:
        return "실시간 GPS 미터기 가동";
      case 4:
        return "하차지 도착 및 확인";
      case 5:
        return "전자 전표 발행";
      default:
        return "운행 중";
    }
  }

  Widget _buildFlowIndicator() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildFlowStep(1, "이동", _driveStep == 1),
          _buildFlowLine(),
          _buildFlowStep(2, "상차", _driveStep == 2),
          _buildFlowLine(),
          _buildFlowStep(3, "미터기", _driveStep == 3),
          _buildFlowLine(),
          _buildFlowStep(4, "하차/승인", _driveStep == 4),
          _buildFlowLine(),
          _buildFlowStep(5, "완료", _driveStep == 5),
        ],
      ),
    );
  }

  Widget _buildFlowStep(int step, String label, bool isActive) {
    final bool isPassed = _driveStep > step;
    return Column(
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: isActive
              ? AppColors.warning
              : (isPassed ? AppColors.primary : AppColors.divider),
          child: Text(
            step.toString(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isActive || isPassed ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
        ),
        SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive || isPassed ? FontWeight.bold : FontWeight.normal,
            color: isActive ? AppColors.warning : (isPassed ? AppColors.primary : AppColors.textSecondary),
          ),
        ),
      ],
    );
  }

  Widget _buildFlowLine() {
    return Expanded(
      child: Container(
        height: 1,
        color: AppColors.divider,
        margin: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }

  Widget _buildMainContent() {
    switch (_driveStep) {
      case 1:
        return _buildStep1Moving();
      case 2:
        return _buildStep2Waiting();
      case 3:
        return _buildStep3MeterDriving();
      case 4:
        return _buildStep4UnloadingConfirm();
      case 5:
        return _buildStep5Receipt();
      default:
        return SizedBox();
    }
  }

  Widget _buildStep1Moving() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.navigation_outlined, size: 70, color: AppColors.primary),
        SizedBox(height: 20),
        Text(
          "상차지로 이동해 주세요",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        SizedBox(height: 8),
        Text(
          "안전 운행을 위해 덤프링 실시간 경로 연동을 개시합니다.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        SizedBox(height: 28),
        Card(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: AppColors.divider),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.place, color: AppColors.primary),
                  title: Text("티켓 ID: #${widget.ticketId} 지정 매칭 현장", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text("매칭된 지도상 상차 현장 입구로 이동", style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: 28),
        ElevatedButton.icon(
          onPressed: () {
            _launchPreferredNavi(
              destinationName: _siteName ?? "상차 현장",
              lat: _siteLat,
              lng: _siteLng,
            );
          },
          icon: const Icon(Icons.navigation_outlined),
          label: const Text("내비게이션 경로 안내"),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
        ),
        SizedBox(height: 12),
        OutlinedButton(
          onPressed: _arrivedAtLoadingSite,
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: AppColors.primary),
            foregroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: Text("상차지 현장 도착 완료 (수동)", style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildStep2Waiting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.pending_actions_rounded, size: 70, color: AppColors.warning),
        SizedBox(height: 20),
        Text(
          "상차지 도착 완료 및 상차 작업 중",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        SizedBox(height: 8),
        Text(
          "상차가 완전히 끝나고 차량이 출발할 때\n하단의 [운행 시작] 버튼을 눌러 미터기를 가동해 주세요.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
        ),
        SizedBox(height: 28),
        Container(
          height: 140,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider),
          ),
          child: Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.flag_outlined, color: AppColors.primary, size: 30),
                SizedBox(width: 12),
                Text(
                  "토사 상차 작업 진행 중...",
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
                )
              ],
            ),
          ),
        ),
        SizedBox(height: 28),
        ElevatedButton(
          onPressed: _startDriving,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: Text("운행 시작 (미터기 가동)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ],
    );
  }

  Widget _buildStep3MeterDriving() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          color: AppColors.surface, 
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _isDistanceMode ? Icons.speed : Icons.timer,
                            color: AppColors.primary,
                            size: 14,
                          ),
                          SizedBox(width: 4),
                          Text(
                            _isDistanceMode ? "거리 가산 모드 (>10km/h)" : "시간 가산 모드 (정체/대기)",
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        Icon(Icons.gps_fixed, color: Colors.green, size: 14),
                        SizedBox(width: 4),
                        Text("GPS 수신 정상", style: TextStyle(color: AppColors.textSecondary, fontSize: 10)),
                      ],
                    )
                  ],
                ),
                SizedBox(height: 24),
                Text("실시간 운행 예상 금액", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                SizedBox(height: 6),
                Text(
                  "${_formatter(_currentFare)} 원",
                  style: TextStyle(
                    color: AppColors.warning, 
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
                SizedBox(height: 20),
                Divider(color: AppColors.divider),
                SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildMeterIndicator("현재 속도", "$_speedKmh km/h", Icons.dashboard),
                    _buildMeterIndicator("주행 거리", "${_distanceKm.toStringAsFixed(2)} km", Icons.trending_up),
                    _buildMeterIndicator("경과 시간", _formatTime(_elapsedSeconds), Icons.hourglass_bottom),
                  ],
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.divider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                "⚙️ [모의 요금 주행 시뮬레이터]",
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 12),
              ),
              SizedBox(height: 4),
              Text(
                "아래 버튼으로 속도를 바꾸어 가산 전환을 테스트하세요.",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 10),
              ),
              SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _changeSpeed(5),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.warning,
                        side: BorderSide(color: AppColors.warning.withAlpha(128)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text("서행/대기 (5km/h)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _changeSpeed(60),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: BorderSide(color: AppColors.primary.withAlpha(128)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text("일반 고속 (60km/h)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        SizedBox(height: 28),
        ElevatedButton.icon(
          onPressed: () {
            _launchPreferredNavi(
              destinationName: _dropOffName ?? "하차지 현장",
              lat: _dropOffLat,
              lng: _dropOffLng,
            );
          },
          icon: const Icon(Icons.navigation_outlined),
          label: const Text("내비게이션 경로 안내 (하차지)"),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.warning,
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: _arrivedAtUnloadingSite,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          child: const Text("하차지 도착 완료 (지오펜스 작동)", style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildStep4UnloadingConfirm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.radar_rounded, size: 70, color: AppColors.primary),
        SizedBox(height: 20),
        Text(
          "하차지 지오펜스 도착 감지 완료",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        SizedBox(height: 8),
        Text(
          "지주(하차지 지주)가 반입 승인을 내릴 때까지 잠시 대기해 주세요.\n실시간 승인 판정 감지 타이머가 작동 중입니다.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.5),
        ),
        SizedBox(height: 28),
        Card(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: AppColors.divider),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                if (!_isLandownerAbsent) ...[
                  CircularProgressIndicator(color: AppColors.warning),
                  SizedBox(height: 18),
                  Text(
                    "지주 실시간 심사 승인 대기 중...",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.warning),
                  ),
                ] else ...[
                  Icon(Icons.photo_library_outlined, color: AppColors.primary, size: 40),
                  const SizedBox(height: 12),
                  Text(
                    "지주 부재 대체 전표 모드 (증빙 제출완료)",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  const SizedBox(height: 12),
                  if (_attachedPhoto != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        "$_baseUrl$_attachedPhoto",
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            height: 160,
                            color: Colors.grey.withAlpha(50),
                            child: const Center(
                              child: Icon(Icons.broken_image_outlined, size: 40, color: Colors.grey),
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 8),
                  Text(
                    "지주 부재 승인 대기 중...",
                    style: TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.bold),
                  ),
                ],
              ],
            ),
          ),
        ),
        SizedBox(height: 28),
        if (!_isLandownerAbsent) ...[
          ElevatedButton(
            onPressed: _landownerApproved,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.textPrimary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: Text("지주 강제 수동 통과 모사", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _takeLandownerAbsentPhoto,
            icon: Icon(Icons.camera_alt_outlined),
            label: Text("지주 부재 시 사진 업로드 증빙"),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.warning,
              side: BorderSide(color: AppColors.warning),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ] else ...[
          ElevatedButton(
            onPressed: _landownerApproved,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.warning,
              foregroundColor: AppColors.textPrimary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: Text("현장 사진 증빙서 제출 및 완료", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _takeLandownerAbsentPhoto,
            icon: const Icon(Icons.photo_camera),
            label: const Text("사진 수정 / 다시 등록하기"),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.warning,
              side: BorderSide(color: AppColors.warning),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStep5Receipt() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.check_circle_rounded, size: 70, color: AppColors.primary),
        SizedBox(height: 20),
        Text(
          "운행 최종 완료 (정산 확정)",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        SizedBox(height: 24),
        Card(
          color: AppColors.surface,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: AppColors.divider),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Text(
                    "덤프링 디지털 정산 영수증",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
                SizedBox(height: 6),
                Center(
                  child: Text(
                    "티켓 ID: #${widget.ticketId} | 완료시각: ${DateTime.now().toString().substring(0, 19)}",
                    style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  ),
                ),
                SizedBox(height: 16),
                Divider(),
                SizedBox(height: 12),
                _buildReceiptRow("주행 거리", "${_distanceKm.toStringAsFixed(2)} km"),
                _buildReceiptRow("운행 시간", _formatTime(_elapsedSeconds)),
                _buildReceiptRow("정산 유형", _isLandownerAbsent ? "지주 부재 (사진 전송 완료)" : "하차지 즉시 매핑 정산"),
                SizedBox(height: 12),
                Divider(),
                SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "정산 금액",
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 13),
                    ),
                    Text(
                      "${_formatter(_currentFare)} 원",
                      style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.warning, fontSize: 20),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: 28),
        ElevatedButton(
          onPressed: _completeEntireDrive,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: Text("정산 내역 확인 및 홈 복귀", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        ),
      ],
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          Text(value, style: TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildMeterIndicator(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppColors.textSecondary, size: 16),
        SizedBox(height: 6),
        Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 10)),
        SizedBox(height: 2),
        Text(value, style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
      ],
    );
  }

  String _formatTime(int seconds) {
    final int min = seconds ~/ 60;
    final int sec = seconds % 60;
    final String minStr = min.toString().padLeft(2, '0');
    final String secStr = sec.toString().padLeft(2, '0');
    return "$minStr분 $secStr초";
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
