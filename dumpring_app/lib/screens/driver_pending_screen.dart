import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'driver_home_screen.dart';
import 'driver_document_upload_screen.dart';

class DriverPendingScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const DriverPendingScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<DriverPendingScreen> createState() => _DriverPendingScreenState();
}

class _DriverPendingScreenState extends State<DriverPendingScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  bool _isApproved = false;
  bool _isRejected = false;
  String? _rejectReason;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _checkStatus();
    // 3초 주기로 심사 승인 여부를 실시간 폴링 (UX Wow 요소 🛰️)
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      _checkStatus();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/auth/member-status"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final bool isApproved = decoded['is_approved'] ?? false;
        final String? rejectReason = decoded['reject_reason'];
        
        if (mounted) {
          setState(() {
            _isApproved = isApproved;
            if (rejectReason != null) {
              _isRejected = true;
              _rejectReason = rejectReason;
              _pollingTimer?.cancel(); // 반려 시에는 더 이상 폴링하지 않음
            } else {
              _isRejected = false;
              _rejectReason = null;
            }
          });

          if (_isApproved) {
            _pollingTimer?.cancel();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("🎉 [승인 완료] 본사의 가입 서류 심사가 최종 통과되었습니다!"),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint("심사 상태 조회 통신 실패: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isApproved) {
      return DriverHomeScreen(user: widget.user, token: widget.token);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: Text(
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
                    SizedBox(height: 28),

                    Text(
                      _isRejected ? "가입 심사 반려 안내" : "가입 서류 심사 대기 중",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A202C),
                      ),
                    ),
                    SizedBox(height: 12),

                    Text(
                      _isRejected
                          ? "심사 도중 반려 사유가 발생하였습니다. 아래 내용을 확인 후 서류를 재제출해 주세요."
                          : "가입 승인을 위해 정식 라이센스 및 계좌 검증이 진행 중입니다.\n승인 완료 시 자동으로 기사 홈 화면으로 이동합니다.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF718096),
                        height: 1.5,
                      ),
                    ),
                    SizedBox(height: 36),

                    if (_isRejected) ...[
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.red[200]!, width: 1),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.cancel, color: Colors.red, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  "반려 사유",
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13),
                                ),
                              ],
                            ),
                            SizedBox(height: 10),
                            Text(
                              _rejectReason ?? "제출 서류 검증 실패",
                              style: TextStyle(fontSize: 13, color: Color(0xFF2D3748), height: 1.4),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 28),

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
                          foregroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: Text("서류 재보완 및 등록", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ] else ...[
                      Card(
                        color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: Padding(
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
          ],
        ),
      ),
    );
  }
}
