import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'driver_meter_screen.dart';

class DriverDispatchConfirmScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final Map<String, dynamic> job;

  const DriverDispatchConfirmScreen({
    Key? key,
    required this.user,
    required this.token,
    required this.job,
  }) : super(key: key);

  @override
  State<DriverDispatchConfirmScreen> createState() => _DriverDispatchConfirmScreenState();
}

class _DriverDispatchConfirmScreenState extends State<DriverDispatchConfirmScreen> {
  String get _baseUrl => "https://dumpring-api.onrender.com";
  bool _isSubmitting = false;

  // 1회당 단가 포맷용
  String _formatCurrency(int amount) {
    return amount.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }

  Future<void> _acceptDispatch() async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/jobs/${widget.job['id']}/accept"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 201) {
        final ticket = jsonDecode(utf8.decode(response.bodyBytes));
        
        if (!mounted) return;
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("🚀 배차 매칭이 최종 확정되었습니다! 운행을 시작합니다."),
            backgroundColor: Color(0xFF004D5A),
          ),
        );

        // 운행 미터기 화면으로 바로 전환
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => DriverMeterScreen(
              user: widget.user,
              token: widget.token,
              ticketId: ticket['id'],
              onDriveCompleted: (earnings) {
                // 완료 후 홈으로 무사히 팝 처리
              },
            ),
          ),
        );
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(err['detail'] ?? "이미 다른 기사님이 수락했거나 만료된 오더입니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 네트워크 연결에 실패했습니다.");
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _showErrorDialog(String msg) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("배차 수락 불가", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("확인", style: TextStyle(color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 임의의 거리 및 단가 가설 데이터 (화면에 표시할 실감 나는 요소들)
    final double distance = 24.8; 
    final int estimatedTimeMinutes = 45;
    final int unitPrice = 75000; // 기본 단가 설정
    final int platformFee = (unitPrice * 0.03).round(); // 수수료 3%
    final int netEarning = unitPrice - platformFee;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // 프리미엄 다크 테마 배경
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "신규 배차 오더 확인",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. 프리미엄 지도 시각화 카드 (배차 경로 미리보기)
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1E293B), Color(0xFF334155)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        // 물결 치는 듯한 지도 배경 라인 그래픽 모사
                        Positioned.fill(
                          child: Opacity(
                            opacity: 0.15,
                            child: CustomPaint(
                              painter: PathMapPainter(),
                            ),
                          ),
                        ),
                        // 거리 및 시간 팝업 배지
                        Positioned(
                          bottom: 16,
                          left: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF7A00),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.navigation_rounded, color: Colors.white, size: 14),
                                const SizedBox(width: 6),
                                Text(
                                  "$distance km · $estimatedTimeMinutes분 소요 예상",
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 2. 경로 타임라인 정보 카드 (상차지 -> 하차지)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 상차지 (출발지)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Column(
                              children: [
                                const CircleAvatar(
                                  radius: 10,
                                  backgroundColor: Color(0xFF38BDF8), // 택시 스타일 블루
                                  child: Icon(Icons.circle, color: Colors.white, size: 8),
                                ),
                                Container(
                                  width: 2,
                                  height: 40,
                                  color: const Color(0xFF334155),
                                ),
                              ],
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    "상차지 (출발)",
                                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "현장 ID ${widget.job['site_id']} (인천 송도 건설 현장)",
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    "인천 연수구 송도동 100-2",
                                    style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        // 하차지 (도착지)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const CircleAvatar(
                              radius: 10,
                              backgroundColor: Color(0xFFFF7A00), // 덤프링 시그니처 오렌지
                              child: Icon(Icons.local_shipping_rounded, color: Colors.white, size: 10),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    "하차지 (도착)",
                                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "하차지 ID ${widget.job['matched_drop_off_id'] ?? '지주 승인 하차장'}",
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    "경기 김포시 대곶면 사토매립장",
                                    style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 3. 작업 스펙 및 추가 디테일 카드
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      children: [
                        _buildDetailRow("토사 종류", "일반 사토 (토사)", Icons.category_rounded),
                        const Divider(color: Color(0xFF334155), height: 24),
                        _buildDetailRow("작업 예정일", widget.job['work_date'].toString().substring(0, 10), Icons.calendar_today_rounded),
                        const Divider(color: Color(0xFF334155), height: 24),
                        _buildDetailRow("필요 차종", "25.5톤 덤프 트럭", Icons.local_shipping_rounded),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 4. 프리미엄 요금 / 운송료 정산 카드 (택시 미터기 요금판 컨셉)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F766E), Color(0xFF0F172A)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFF0F766E).withOpacity(0.4), width: 1.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          "예상 실 정산 수입 (1회당)",
                          style: TextStyle(color: Color(0xFF2DD4BF), fontWeight: FontWeight.bold, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          "₩${_formatCurrency(netEarning)}",
                          style: const TextStyle(color: Color(0xFFFF7A00), fontWeight: FontWeight.extrabold, fontSize: 28, letterSpacing: -0.5),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("기본 운반료", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                            Text("₩${_formatCurrency(unitPrice)}", style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("플랫폼 수수료 (3%)", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                            Text("-₩${_formatCurrency(platformFee)}", style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 36),

                  // 5. 작업 거절 & 수락 버튼 (바텀 액션 바 스타일)
                  Row(
                    children: [
                      // 거절 단추
                      Expanded(
                        flex: 3,
                        child: InkWell(
                          onTap: _isSubmitting ? null : () => Navigator.pop(context),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            height: 60,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white.withOpacity(0.1)),
                            ),
                            alignment: Alignment.center,
                            child: const Text(
                              "거절",
                              style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // 수락 및 즉시 운행 단추
                      Expanded(
                        flex: 7,
                        child: InkWell(
                          onTap: _isSubmitting ? null : _acceptDispatch,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            height: 60,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFFF7A00), Color(0xFFFF9D43)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFFF7A00).withOpacity(0.3),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            alignment: Alignment.center,
                            child: _isSubmitting
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text(
                                    "배차 수락 및 운행 시작",
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.extrabold, fontSize: 15),
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String title, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF64748B), size: 18),
        const SizedBox(width: 12),
        Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
        const Spacer(),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    );
  }
}

// 지도 노선 경로 효과를 내기 위한 커스텀 페인터
class PathMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF38BDF8).withOpacity(0.3)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final dashPaint = Paint()
      ..color = const Color(0xFFFF7A00).withOpacity(0.4)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(size.width * 0.15, size.height * 0.7);
    path.quadraticBezierTo(
      size.width * 0.35,
      size.height * 0.2,
      size.width * 0.55,
      size.height * 0.6,
    );
    path.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.9,
      size.width * 0.85,
      size.height * 0.3,
    );

    canvas.drawPath(path, paint);

    // 출발지 점
    final startPaint = Paint()..color = const Color(0xFF38BDF8);
    canvas.drawCircle(Offset(size.width * 0.15, size.height * 0.7), 6, startPaint);

    // 도착지 점
    final endPaint = Paint()..color = const Color(0xFFFF7A00);
    canvas.drawCircle(Offset(size.width * 0.85, size.height * 0.3), 8, endPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
