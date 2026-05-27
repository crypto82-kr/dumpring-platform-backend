import 'package:flutter/material.dart';
import 'dart:async';
import 'driver_meter_screen.dart';
import 'driver_history_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const DriverHomeScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> with SingleTickerProviderStateMixin {
  bool _isWaitingForDispatch = false; // 배차 대기 모드 활성화 여부
  Timer? _mockDispatchTimer;

  // 대시보드 모의 데이터
  int _todayWorkCount = 2;
  int _todayEarnings = 190000;
  int _monthlyEarnings = 3450000;

  // 배차 대기 활성 시 펄스 효과 애니메이션용
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
  }

  @override
  void dispose() {
    _mockDispatchTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _toggleWaitingState(bool val) {
    setState(() {
      _isWaitingForDispatch = val;
    });

    if (_isWaitingForDispatch) {
      _pulseController.repeat(reverse: true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("🟢 배차 대기 상태가 시작되었습니다. 곧 매칭 요청이 발송됩니다."),
          duration: Duration(seconds: 2),
        ),
      );

      // 사용자 경험 극대화: 4초 뒤 가상 배차 호출 트리거! (WOW 요소 🚨)
      _mockDispatchTimer = Timer(const Duration(seconds: 4), () {
        if (mounted && _isWaitingForDispatch) {
          _showDispatchDialog();
        }
      });
    } else {
      _pulseController.stop();
      _mockDispatchTimer?.cancel();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("🔴 배차 대기 상태가 종료되었습니다.")),
      );
    }
  }

  // 실시간 배차 요청 모달 수신
  void _showDispatchDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: EdgeInsets.zero,
        content: Container(
          width: 320,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 헤더 그라디언트
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF7A00), Color(0xFFFF9E43)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                ),
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                child: const Row(
                  children: [
                    Icon(Icons.flash_on, color: Colors.white, size: 24),
                    SizedBox(width: 8),
                    Text(
                      "긴급 배차 요청 수신",
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),

              // 본문 정보
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildDispatchInfoRow("상차지", "강남 아파트 신축공사 현장 (서울시 강남구)", Icons.circle, Colors.blue),
                    const SizedBox(height: 12),
                    _buildDispatchInfoRow("하차지", "신촌지구 사토장 (경기도 김포시)", Icons.circle, Colors.orange),
                    const SizedBox(height: 12),
                    _buildDispatchInfoRow("토사 종류", "양질토 (GOOD_SOIL)", Icons.grass, Colors.green),
                    const SizedBox(height: 12),
                    _buildDispatchInfoRow("지급 방식", "월대 정산 / 현장 지불 (SITE_PAYS)", Icons.payment, Colors.purple),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 12),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("예상 단가", style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text(
                          "95,000 원 (대당)",
                          style: TextStyle(color: Color(0xFF004D5A), fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 수락 / 거절 액션 버튼
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pop(); // 모달 닫기
                        _showRejectBottomSheet(); // 거절 사유 바텀시트
                      },
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF7FAFC),
                          borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20)),
                          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                        ),
                        child: const Text(
                          "거절",
                          style: TextStyle(color: Color(0xFF718096), fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pop(); // 모달 닫기
                        _acceptDispatch(); // 배차 수락 및 주행 미터기 이동
                      },
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Color(0xFF004D5A),
                          borderRadius: BorderRadius.only(bottomRight: Radius.circular(20)),
                        ),
                        child: const Text(
                          "수락 및 이동",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDispatchInfoRow(String label, String value, IconData icon, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(color: Color(0xFF2D3748), fontSize: 13, fontWeight: FontWeight.w500)),
            ],
          ),
        )
      ],
    );
  }

  // 거절 사유 바텀시트 연동
  void _showRejectBottomSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              "배차 요청 거절 사유 선택",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
            ),
            const SizedBox(height: 18),
            _buildRejectReasonItem("일정이 다른 작업과 겹칩니다."),
            _buildRejectReasonItem("차량 정비 및 주유가 필요합니다."),
            _buildRejectReasonItem("제시 단가가 너무 낮습니다."),
            _buildRejectReasonItem("하차지 거리가 너무 멉니다."),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildRejectReasonItem(String reason) {
    return ListTile(
      title: Text(reason, style: const TextStyle(fontSize: 14)),
      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
      onTap: () {
        Navigator.of(context).pop(); // 바텀시트 닫기
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("ℹ️ 거절 사유가 등록되어 해당 배차가 제외되었습니다.")),
        );
      },
    );
  }

  // 배차 수락 처리
  void _acceptDispatch() {
    // 펄스 효과 끄기
    setState(() {
      _isWaitingForDispatch = false;
    });
    _pulseController.stop();

    // 미터기 주행 화면으로 이동
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => DriverMeterScreen(
          user: widget.user,
          token: widget.token,
          onDriveCompleted: (earnings) {
            // 주행 성공 복귀 시 당일 수입 누적 반영
            setState(() {
              _todayWorkCount += 1;
              _todayEarnings += earnings;
              _monthlyEarnings += earnings;
            });
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF004D5A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("덤프링 기사용 홈", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => DriverHistoryScreen(user: widget.user, token: widget.token),
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. 배차 대기 상태 제어 대형 판넬
              _buildDispatchStatusPanel(),
              const SizedBox(height: 24),

              // 2. 오늘의 누적 실적 현황판 (수입/완료수)
              _buildEarningsDashboard(),
              const SizedBox(height: 24),

              // 3. 주요 안내 & 공지
              _buildTipCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDispatchStatusPanel() {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 30.0),
        child: Column(
          children: [
            // 배차 대기중 펄스 상태등
            Stack(
              alignment: Alignment.center,
              children: [
                if (_isWaitingForDispatch)
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Container(
                        width: 90 + (_pulseController.value * 24),
                        height: 90 + (_pulseController.value * 24),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4EA).withOpacity(1.0 - _pulseController.value),
                          shape: BoxShape.circle,
                        ),
                      );
                    },
                  ),
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: _isWaitingForDispatch ? const Color(0xFFE6F4EA) : const Color(0xFFF7FAFC),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _isWaitingForDispatch ? Icons.wifi_tethering_rounded : Icons.portable_wifi_off_rounded,
                    color: _isWaitingForDispatch ? Colors.green[800] : const Color(0xFF718096),
                    size: 40,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 현재 상태 텍스트
            Text(
              _isWaitingForDispatch ? "실시간 배차 대기 중..." : "배차 정지 상태",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: _isWaitingForDispatch ? Colors.green[800] : const Color(0xFF2D3748),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              "대기를 켜면 10km 이내의 긴급 오더를 받습니다.",
              style: TextStyle(color: Color(0xFF718096), fontSize: 12),
            ),
            const SizedBox(height: 24),

            // 토글 스위치 형태의 대형 클릭 영역
            InkWell(
              onTap: () => _toggleWaitingState(!_isWaitingForDispatch),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _isWaitingForDispatch ? const Color(0xFFFFFFF0) : const Color(0xFF004D5A),
                  border: Border.all(
                    color: _isWaitingForDispatch ? const Color(0xFFFF7A00) : Colors.transparent,
                    width: _isWaitingForDispatch ? 1.5 : 0,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Text(
                  _isWaitingForDispatch ? "배차 수신 대기 종료" : "배차 수신 대기 시작",
                  style: TextStyle(
                    color: _isWaitingForDispatch ? const Color(0xFFFF7A00) : Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningsDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          "📊 운행 실적 대시보드",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildStatCard("오늘 완료", "$_todayWorkCount 건", Icons.check_circle_outline_rounded, Colors.green),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard("오늘 예상 수입", "${_formatter(_todayEarnings)} 원", Icons.monetization_on_outlined, const Color(0xFFFF7A00)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildMonthlyEarningsCard(),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 6),
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 10),
            Text(value, style: const TextStyle(color: Color(0xFF1A202C), fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthlyEarningsCard() {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Row(
          children: [
            const CircleAvatar(
              radius: 22,
              backgroundColor: Color(0xFFE2F0F2),
              child: Icon(Icons.calendar_month, color: Color(0xFF004D5A)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("이번 달 총 정산 예정액", style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text("${_formatter(_monthlyEarnings)} 원", style: const TextStyle(color: Color(0xFF004D5A), fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildTipCard() {
    return Card(
      color: const Color(0xFFF7FAFC),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: const Padding(
        padding: EdgeInsets.all(20.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.lightbulb_outline, color: Color(0xFFFF7A00), size: 22),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Tip: GPS 실시간 미터기 사용 안내", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF2D3748))),
                  SizedBox(height: 6),
                  Text(
                    "운행 시작 버튼을 누르면 차량 GPS를 이용해 요금이 가산됩니다. 대기 상태나 시속 10km/h 이하 구간에서는 시간 요금으로 자동 전환됩니다.",
                    style: TextStyle(fontSize: 11, color: Color(0xFF718096), height: 1.4),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
