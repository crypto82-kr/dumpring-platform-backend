import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'owner_home_screen.dart';
import 'owner_document_upload_screen.dart';

class OwnerPendingScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const OwnerPendingScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<OwnerPendingScreen> createState() => _OwnerPendingScreenState();
}

class _OwnerPendingScreenState extends State<OwnerPendingScreen> {
  String get _baseUrl => "https://dumpring-api.onrender.com";

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
              const SnackBar(
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
      return OwnerHomeScreen(user: widget.user, token: widget.token);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: const Text(
          "차주 가입 심사 현황",
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
                    const SizedBox(height: 28),

                    Text(
                      _isRejected ? "가입 심사 반려 안내" : "가입 서류 심사 진행 중",
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A202C),
                      ),
                    ),
                    const SizedBox(height: 12),

                    Text(
                      _isRejected
                          ? "서류 검토 과정에서 결격 사유가 발견되었습니다. 아래 내용을 조치한 후 다시 요청해 주세요."
                          : "제출해 주신 영업 서류와 통장 사본을 대조 검증하고 있습니다.\n승인 즉시 배차 및 기사 배정 홈 화면으로 자동 전환됩니다.",
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF718096),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 36),

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
                                  "반려 사유 상세",
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _rejectReason ?? "제출하신 서류의 상호명과 가입자명이 다릅니다. 서류를 다시 확인해 주세요.",
                              style: const TextStyle(fontSize: 13, color: Color(0xFF2D3748), height: 1.4),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (context) => OwnerDocumentUploadScreen(
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
                        child: const Text("서류 보완 재제출", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ] else ...[
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
                                "본사 관리자가 실시간으로 검토 중입니다.\n페이지를 닫지 말고 잠시만 대기해 주세요.",
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
