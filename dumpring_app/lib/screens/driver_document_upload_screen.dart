import 'package:flutter/material.dart';
import 'driver_pending_screen.dart';

class DriverDocumentUploadScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const DriverDocumentUploadScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<DriverDocumentUploadScreen> createState() => _DriverDocumentUploadScreenState();
}

class _DriverDocumentUploadScreenState extends State<DriverDocumentUploadScreen> {
  // 각 서류별 업로드 상태 (null 이면 업로드 전, 아니면 파일명)
  String? _licenseFile;
  String? _qualificationFile;
  String? _bankbookFile;

  bool _isLoading = false;

  void _simulateUpload(int docType) {
    setState(() {
      _isLoading = true;
    });

    // 1초 뒤 업로드 완료 모사
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
          final timeStr = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
          if (docType == 1) {
            _licenseFile = "운전면허증_$timeStr.jpg";
          } else if (docType == 2) {
            _qualificationFile = "자격증_$timeStr.jpg";
          } else {
            _bankbookFile = "통장사본_$timeStr.jpg";
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("📸 서류가 정상적으로 촬영 및 임시 업로드되었습니다."),
            backgroundColor: Color(0xFF004D5A),
          ),
        );
      }
    });
  }

  void _submitDocuments() {
    if (_licenseFile == null || _qualificationFile == null || _bankbookFile == null) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: const Text("서류 누락", style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text("필수 심사 서류 3종을 모두 첨부해 주세요.\n(면허증, 종사자 자격증, 통장 사본)"),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text("확인", style: TextStyle(color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
            )
          ],
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    // 심사 대기 페이지로 라우팅 모사
    Future.delayed(const Duration(milliseconds: 1000), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => DriverPendingScreen(
              user: widget.user,
              token: widget.token,
              isApprovedInitially: false,
            ),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: const Text(
          "덤프 기사 필수 서류 제출",
          style: TextStyle(color: Color(0xFF1A202C), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 상단 안내 배너
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F0F2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF80B3BC).withOpacity(0.5)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline_rounded, color: Color(0xFF004D5A), size: 24),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "신속한 가입 승인을 위한 안내",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF004D5A)),
                              ),
                              SizedBox(height: 6),
                              Text(
                                "덤프링은 안전한 중계 플랫폼 운영을 위해 기사님의 운전 자격 및 본인 통장 계좌를 검증합니다.\n글자가 또렷하게 보이도록 밝은 곳에서 촬영해 주세요.",
                                style: TextStyle(fontSize: 12, color: Color(0xFF002D35), height: 1.4),
                              ),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // 1. 운전면허증 카드
                  _buildDocCard(
                    title: "운전면허증 (대형/1종)",
                    description: "덤프 트럭 운전 자격 식별용",
                    fileName: _licenseFile,
                    icon: Icons.badge_outlined,
                    onTap: () => _simulateUpload(1),
                  ),
                  const SizedBox(height: 20),

                  // 2. 화물운송 자격증 카드
                  _buildDocCard(
                    title: "화물운송종사 자격증",
                    description: "교통안전공단 발행 정식 자격 증빙용",
                    fileName: _qualificationFile,
                    icon: Icons.local_shipping_outlined,
                    onTap: () => _simulateUpload(2),
                  ),
                  const SizedBox(height: 20),

                  // 3. 통장 사본 카드
                  _buildDocCard(
                    title: "은행 통장 사본 (기사 본인 명의)",
                    description: "주행 완료 운임 실시간 입금용",
                    fileName: _bankbookFile,
                    icon: Icons.account_balance_wallet_outlined,
                    onTap: () => _simulateUpload(3),
                  ),
                  const SizedBox(height: 40),

                  // 제출 버튼
                  ElevatedButton(
                    onPressed: _isLoading ? null : _submitDocuments,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF004D5A),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: const Color(0xFF80B3BC),
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: const Text(
                      "기사 서류 심사 요청",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 50),
                ],
              ),
            ),
            if (_isLoading)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: const Center(
                  child: CircularProgressIndicator(color: Color(0xFFFF7A00)),
                ),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildDocCard({
    required String title,
    required String description,
    required String? fileName,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    final bool isUploaded = fileName != null;

    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFFE2E8F0),
          width: isUploaded ? 1.5 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: isUploaded ? const Color(0xFFFFF4E5) : const Color(0xFFF7FAFC),
                child: Icon(
                  icon,
                  color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFF718096),
                  size: 26,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1A202C)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isUploaded ? fileName : description,
                      style: TextStyle(
                        fontSize: 12,
                        color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFF718096),
                        fontWeight: isUploaded ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                isUploaded ? Icons.check_circle : Icons.camera_alt_outlined,
                color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFFCBD5E0),
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
