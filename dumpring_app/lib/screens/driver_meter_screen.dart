import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../shared/widgets/layouts/dr_scaffold.dart';

class DriverMeterScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final int ticketId;
  final Function(int earnings) onDriveCompleted;

  const DriverMeterScreen({
    Key? key,
    required this.user,
    required this.token,
    required this.ticketId,
    required this.onDriveCompleted,
  }) : super(key: key);

  @override
  State<DriverMeterScreen> createState() => _DriverMeterScreenState();
}

class _DriverMeterScreenState extends State<DriverMeterScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  // 1: 상차지 이동, 2: 대기중, 3: 미터기 가동중, 4: 하차지 도착(승인 대기), 5: 운행 완료
  int _driveStep = 1;

  int _currentFare = 95000; 
  double _distanceKm = 0.0;
  int _elapsedSeconds = 0;
  int _speedKmh = 0;
  bool _isDistanceMode = true; 

  Timer? _meterTimer;
  Timer? _statusPollTimer;

  bool _isLandownerAbsent = false;
  String? _attachedPhoto;

  @override
  void initState() {
    super.initState();
    _loadInitialTicketState();
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
        final String status = ticket['status'];
        
        setState(() {
          if (status == "ACCEPTED") {
            _driveStep = 1;
          } else if (status == "DRIVING") {
            _driveStep = 3;
            _elapsedSeconds = ticket['drive_time_seconds'] ?? 0;
            _distanceKm = (ticket['drive_distance_km'] as num?)?.toDouble() ?? 0.0;
            _currentFare = ticket['accumulated_fare'] ?? 95000;
            _resumeMeterTimer();
          } else if (status == "ARRIVED") {
            _driveStep = 4;
            _elapsedSeconds = ticket['drive_time_seconds'] ?? 0;
            _distanceKm = (ticket['drive_distance_km'] as num?)?.toDouble() ?? 0.0;
            _currentFare = ticket['accumulated_fare'] ?? 95000;
            _statusPollTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
              _pollTicketStatus();
            });
          } else if (status == "APPROVED" || status == "COMPLETED") {
            _driveStep = 5;
            _elapsedSeconds = ticket['drive_time_seconds'] ?? 0;
            _distanceKm = (ticket['drive_distance_km'] as num?)?.toDouble() ?? 0.0;
            _currentFare = ticket['accumulated_fare'] ?? 95000;
          }
        });
      } else {
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("⚠️ 티켓 정보를 불러오는 중 오류가 발생했습니다: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
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
            _currentFare += ((_speedKmh / 3600) * 12000).round();
          } else {
            _isDistanceMode = false;
            _currentFare += 120;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _meterTimer?.cancel();
    _statusPollTimer?.cancel();
    super.dispose();
  }

  void _arrivedAtLoadingSite() {
    setState(() {
      _driveStep = 2;
    });
  }

  // 1. 미터기 주행 시작 API 연동
  Future<void> _startDriving() async {
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
                _currentFare += ((_speedKmh / 3600) * 12000).round();
              } else {
                _isDistanceMode = false;
                _currentFare += 120;
              }
            });
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

  // 2. 하차지 도착 감지 API 연동
  Future<void> _arrivedAtUnloadingSite() async {
    _meterTimer?.cancel();
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${widget.ticketId}/arrive"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
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
  void _landownerApproved() {
    _statusPollTimer?.cancel();
    setState(() {
      _driveStep = 5;
    });
  }

  void _takeLandownerAbsentPhoto() {
    setState(() {
      _isLandownerAbsent = true;
      _attachedPhoto = "사토장_실시간촬영_${widget.ticketId}.jpg";
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("📸 지주 부재에 따른 증빙 사진이 첨부되었습니다.")),
    );
  }

  void _completeEntireDrive() {
    widget.onDriveCompleted(_currentFare);
    Navigator.of(context).pop(); 
  }

  @override
  Widget build(BuildContext context) {
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
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text("🗺️ 외부 카카오 내비게이션 앱으로 경로 안내를 실행합니다.")),
            );
          },
          icon: Icon(Icons.map),
          label: Text("카카오 내비게이션 경로 안내"),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.warning,
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
        ElevatedButton(
          onPressed: _arrivedAtUnloadingSite,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          child: Text("하차지 도착 완료 (지오펜스 작동)", style: TextStyle(fontWeight: FontWeight.bold)),
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
                  Icon(Icons.flag, color: AppColors.primary, size: 40),
                  SizedBox(height: 12),
                  Text(
                    "지주 부재 대체 전표 모드",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  SizedBox(height: 4),
                  Text(
                    "증빙: $_attachedPhoto",
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary, fontStyle: FontStyle.italic),
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
