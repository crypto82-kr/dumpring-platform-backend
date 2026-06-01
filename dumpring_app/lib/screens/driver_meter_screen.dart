import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

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
  String get _baseUrl => "https://dumpring-api.onrender.com";

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
      }
    } catch (e) {
      debugPrint("주행 개시 실패: $e");
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
            const SnackBar(content: Text("🟢 지주가 반입을 최종 승인하였습니다. 전표가 발행됩니다.")),
          );
        } else if (status == "REJECTED") {
          _statusPollTimer?.cancel();
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              title: const Text("⚠️ 반입 반려 회차 통보"),
              content: const Text("하차지 지주가 토질 검사 부적격 판정(뻘흙 등)을 내려 반입이 반려되었습니다. 차량을 회차 후 분쟁 조정 센터로 연동됩니다."),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.pop(context); // 홈화면으로 즉시 복원 복귀
                  },
                  child: const Text("확인 및 홈 복귀"),
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
      const SnackBar(content: Text("📸 지주 부재에 따른 증빙 사진이 첨부되었습니다.")),
    );
  }

  void _completeEntireDrive() {
    widget.onDriveCompleted(_currentFare);
    Navigator.of(context).pop(); 
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF004D5A),
        foregroundColor: Colors.white,
        elevation: 0.5,
        title: Text(_getAppBarTitle(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
      color: Colors.white,
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
              ? const Color(0xFFFF7A00)
              : (isPassed ? const Color(0xFF004D5A) : const Color(0xFFE2E8F0)),
          child: Text(
            step.toString(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isActive || isPassed ? Colors.white : const Color(0xFF718096),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive || isPassed ? FontWeight.bold : FontWeight.normal,
            color: isActive ? const Color(0xFFFF7A00) : (isPassed ? const Color(0xFF004D5A) : const Color(0xFF718096)),
          ),
        ),
      ],
    );
  }

  Widget _buildFlowLine() {
    return Expanded(
      child: Container(
        height: 1,
        color: const Color(0xFFCBD5E0),
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
        return const SizedBox();
    }
  }

  Widget _buildStep1Moving() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.navigation_outlined, size: 70, color: Color(0xFF004D5A)),
        const SizedBox(height: 20),
        const Text(
          "상차지로 이동해 주세요",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
        ),
        const SizedBox(height: 8),
        const Text(
          "안전 운행을 위해 덤프링 실시간 경로 연동을 개시합니다.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: Color(0xFF718096)),
        ),
        const SizedBox(height: 28),
        Card(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.place, color: Colors.blue),
                  title: Text("티켓 ID: #${widget.ticketId} 지정 매칭 현장", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: const Text("매칭된 지도상 상차 현장 입구로 이동", style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        ElevatedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("🗺️ 외부 카카오 내비게이션 앱으로 경로 안내를 실행합니다.")),
            );
          },
          icon: const Icon(Icons.map),
          label: const Text("카카오 내비게이션 경로 안내"),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFF7A00),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _arrivedAtLoadingSite,
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Color(0xFF004D5A)),
            foregroundColor: const Color(0xFF004D5A),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text("상차지 현장 도착 완료 (수동)", style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildStep2Waiting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.pending_actions_rounded, size: 70, color: Color(0xFFFF7A00)),
        const SizedBox(height: 20),
        const Text(
          "상차지 도착 완료 및 상차 작업 중",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
        ),
        const SizedBox(height: 8),
        const Text(
          "상차가 완전히 끝나고 차량이 출발할 때\n하단의 [운행 시작] 버튼을 눌러 미터기를 가동해 주세요.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: Color(0xFF718096), height: 1.4),
        ),
        const SizedBox(height: 28),
        Container(
          height: 140,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: const Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.flag_outlined, color: Color(0xFF004D5A), size: 30),
                SizedBox(width: 12),
                Text(
                  "토사 상차 작업 진행 중...",
                  style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF004D5A), fontSize: 14),
                )
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        ElevatedButton(
          onPressed: _startDriving,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF004D5A),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: const Text("운행 시작 (미터기 가동)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ],
    );
  }

  Widget _buildStep3MeterDriving() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          color: const Color(0xFF1A202C), 
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
                        color: _isDistanceMode ? Colors.blue[900]!.withOpacity(0.4) : Colors.orange[900]!.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _isDistanceMode ? Colors.blue : Colors.orange),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _isDistanceMode ? Icons.speed : Icons.timer,
                            color: _isDistanceMode ? Colors.blue : Colors.orange,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _isDistanceMode ? "거리 가산 모드 (>10km/h)" : "시간 가산 모드 (정체/대기)",
                            style: TextStyle(
                              color: _isDistanceMode ? Colors.blue[200] : Colors.orange[200],
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.gps_fixed, color: Colors.green, size: 14),
                        const SizedBox(width: 4),
                        Text("GPS 수신 정상", style: TextStyle(color: Colors.green[200], fontSize: 10)),
                      ],
                    )
                  ],
                ),
                const SizedBox(height: 24),
                const Text("실시간 운행 예상 금액", style: TextStyle(color: Colors.white60, fontSize: 13)),
                const SizedBox(height: 6),
                Text(
                  "${_formatter(_currentFare)} 원",
                  style: const TextStyle(
                    color: Color(0xFFFF7A00), 
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(height: 20),
                const Divider(color: Colors.white24),
                const SizedBox(height: 12),
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
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                "⚙️ [모의 요금 주행 시뮬레이터]",
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF004D5A), fontSize: 12),
              ),
              const SizedBox(height: 4),
              const Text(
                "아래 버튼으로 속도를 바꾸어 가산 전환을 테스트하세요.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 10),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _changeSpeed(5),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.orange[800],
                        side: BorderSide(color: Colors.orange[300]!),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("서행/대기 (5km/h)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _changeSpeed(60),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.blue[800],
                        side: BorderSide(color: Colors.blue[300]!),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("일반 고속 (60km/h)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        ElevatedButton(
          onPressed: _arrivedAtUnloadingSite,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF004D5A),
            foregroundColor: Colors.white,
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
        const Icon(Icons.radar_rounded, size: 70, color: Color(0xFF004D5A)),
        const SizedBox(height: 20),
        const Text(
          "하차지 지오펜스 도착 감지 완료",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
        ),
        const SizedBox(height: 8),
        const Text(
          "지주(하차지 지주)가 반입 승인을 내릴 때까지 잠시 대기해 주세요.\n실시간 승인 판정 감지 타이머가 작동 중입니다.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: Color(0xFF718096), height: 1.5),
        ),
        const SizedBox(height: 28),
        Card(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                if (!_isLandownerAbsent) ...[
                  const CircularProgressIndicator(color: Color(0xFFFF7A00)),
                  const SizedBox(height: 18),
                  const Text(
                    "지주 실시간 심사 승인 대기 중...",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFFF7A00)),
                  ),
                ] else ...[
                  const Icon(Icons.flag, color: Color(0xFF004D5A), size: 40),
                  const SizedBox(height: 12),
                  const Text(
                    "지주 부재 대체 전표 모드",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "증빙: $_attachedPhoto",
                    style: const TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        if (!_isLandownerAbsent) ...[
          ElevatedButton(
            onPressed: _landownerApproved,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF004D5A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text("지주 강제 수동 통과 모사", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _takeLandownerAbsentPhoto,
            icon: const Icon(Icons.camera_alt_outlined),
            label: const Text("지주 부재 시 사진 업로드 증빙"),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFFF7A00),
              side: const BorderSide(color: Color(0xFFFF7A00)),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ] else ...[
          ElevatedButton(
            onPressed: _landownerApproved,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF7A00),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text("현장 사진 증빙서 제출 및 완료", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ],
    );
  }

  Widget _buildStep5Receipt() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.check_circle_rounded, size: 70, color: Color(0xFF004D5A)),
        const SizedBox(height: 20),
        const Text(
          "운행 최종 완료 (정산 확정)",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
        ),
        const SizedBox(height: 24),
        Card(
          color: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(
                  child: Text(
                    "덤프링 디지털 정산 영수증",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    "티켓 ID: #${widget.ticketId} | 완료시각: ${DateTime.now().toString().substring(0, 19)}",
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 12),
                _buildReceiptRow("주행 거리", "${_distanceKm.toStringAsFixed(2)} km"),
                _buildReceiptRow("운행 시간", _formatTime(_elapsedSeconds)),
                _buildReceiptRow("정산 유형", _isLandownerAbsent ? "지주 부재 (사진 전송 완료)" : "하차지 즉시 매핑 정산"),
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "정산 금액",
                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2D3748), fontSize: 13),
                    ),
                    Text(
                      "${_formatter(_currentFare)} 원",
                      style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFFFF7A00), fontSize: 20),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        ElevatedButton(
          onPressed: _completeEntireDrive,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF004D5A),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: const Text("정산 내역 확인 및 홈 복귀", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(value, style: const TextStyle(color: Color(0xFF2D3748), fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildMeterIndicator(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white60, size: 16),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
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
