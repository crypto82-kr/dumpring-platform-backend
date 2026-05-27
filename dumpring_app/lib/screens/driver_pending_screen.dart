import 'package:flutter/material.dart';
import 'driver_home_screen.dart';
import 'driver_document_upload_screen.dart';

class DriverPendingScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final bool isApprovedInitially;

  const DriverPendingScreen({
    Key? key,
    required this.user,
    required this.token,
    this.isApprovedInitially = false,
  }) : super(key: key);

  @override
  State<DriverPendingScreen> createState() => _DriverPendingScreenState();
}

class _DriverPendingScreenState extends State<DriverPendingScreen> {
  late bool _isApproved;
  bool _isRejected = false;
  String? _rejectReason;

  @override
  void initState() {
    super.initState();
    _isApproved = widget.isApprovedInitially;
  }

  void _triggerSimulateApproval() {
    setState(() {
      _isApproved = true;
      _isRejected = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("📢 [모의 제어] 관리자 가입 심사가 즉시 '승인'되었습니다."),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _triggerSimulateRejection() {
    setState(() {
      _isApproved = false;
      _isRejected = true;
      _rejectReason = "제출해 주신 화물운송종사 자격증의 일련번호 판독이 불가합니다. 번호가 선명하게 보이도록 다시 찍어주세요.";
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("📢 [모의 제어] 관리자 가입 심사가 '반려'되었습니다."),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isApproved) {
      // 승인 완료 시 즉시 기사 메인 홈 화면으로 연결
      return DriverHomeScreen(user: widget.user, token: widget.token);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: const Text(
          "가입 심사 현황",
          style: TextStyle(color: Color(0xFF1A202C), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 40.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 중앙 아이콘 표출
                    Center(
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          color: _isRejected ? const Color(0xFFFFF5F5) : const Color(0xFFFFF4E5),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _isRejected ? Icons.error_outline_rounded : Icons.pending_actions_rounded,
                          color: _isRejected ? Colors.red : const Color(0xFFFF7A00),
                          size: 50,
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // 안내 제목
                    Text(
                      _isRejected ? "가입 심사 반려 안내" : "가입 서류 심사 대기 중",
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A202C),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 상세 설명
                    Text(
                      _isRejected
                          ? "심사 도중 반려 사유가 발생하였습니다. 아래 내용을 확인 후 서류를 재제출해 주세요."
                          : "가입 승인을 위해 정식 라이센스 및 계좌 검증이 진행 중입니다.\n승인 완료 시 자동으로 기사 홈 화면으로 이동합니다.",
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF718096),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 36),

                    // 반려 상세 사유창 (반려 상태일 때만 출력)
                    if (_isRejected) ...[
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.red[200]!, width: 1),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.cancel, color: Colors.red, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  "반려 사유",
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _rejectReason ?? "제출 서류 검증 실패",
                              style: const TextStyle(fontSize: 13, color: Color(0xFF2D3748), height: 1.4),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

                      // 서류 재작성 버튼
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (context) => DriverDocumentUploadScreen(
                                user: widget.user,
                                token: widget.token,
                              ),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF004D5A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text("서류 재보완 및 등록", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ] else ...[
                      // 대기 중일 때 보여주는 로딩 카드
                      Card(
                        color: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: const Padding(
                          padding: EdgeInsets.all(24.0),
                          child: Column(
                            children: [
                              SizedBox(
                                width: 28,
                                height: 28,
                                child: CircularProgressIndicator(color: Color(0xFFFF7A00), strokeWidth: 3),
                              ),
                              SizedBox(height: 16),
                              Text(
                                "평균 1영업일 이내에 검증이 완료됩니다.\n실시간 승인 결과를 수신하고 있으니 잠시 기다려 주세요.",
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: Color(0xFF718096), height: 1.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // 개발 및 테스트 편의를 위한 '모의 승인/반려 시뮬레이션 제어 바' (생산성/사용자 경험 WOW 요인 🚨)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF2D3748), // 다크 슬레이트 테마 바
                borderRadius: BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    "⚙️ [덤프링 개발 전용 테스트 패널]",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ).buildElevatedButton(
                          onPressed: _triggerSimulateApproval,
                          child: const Text("가상 심사 승인", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ).buildElevatedButton(
                          onPressed: _triggerSimulateRejection,
                          child: const Text("가상 심사 반려", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

// ElevatedButton 편의 확장 도우미
extension ElevatedButtonHelper on ButtonStyle {
  Widget buildElevatedButton({required VoidCallback onPressed, required Widget child}) {
    return ElevatedButton(
      style: this,
      onPressed: onPressed,
      child: child,
    );
  }
}
