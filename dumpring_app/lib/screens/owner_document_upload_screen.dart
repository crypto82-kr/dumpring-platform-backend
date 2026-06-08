import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'owner_pending_screen.dart';

class OwnerDocumentUploadScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const OwnerDocumentUploadScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<OwnerDocumentUploadScreen> createState() => _OwnerDocumentUploadScreenState();
}

class _OwnerDocumentUploadScreenState extends State<OwnerDocumentUploadScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  List<Map<String, dynamic>> _requiredDocs = [];
  Map<String, String?> _uploadedFiles = {}; // { document_code: file_name }
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchRequiredDocuments();
  }

  Future<void> _fetchRequiredDocuments() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/auth/required-documents?role=owner"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes)) as List;
        setState(() {
          _requiredDocs = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
          for (var doc in _requiredDocs) {
            _uploadedFiles[doc['code']] = null;
          }
        });
        
        // 제출 현황도 파악하여 이미 업로드 완료된 건이 있는지 매핑
        await _fetchExistingStatus();
      }
    } catch (e) {
      debugPrint("필수서류 목록 로드 중 오류: $e");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchExistingStatus() async {
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
        final uploaded = decoded['uploaded_documents'] as List;
        setState(() {
          for (var code in uploaded) {
            _uploadedFiles[code] = "제출완료_${code.toLowerCase()}.pdf";
          }
        });
      }
    } catch (e) {
      debugPrint("기존 서류 업로드 내역 조회 실패: $e");
    }
  }

  Future<void> _uploadDocumentToServer(String docCode, String fileName) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/auth/upload-document"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "document_code": docCode,
          "file_name": fileName,
        }),
      );

      if (response.statusCode == 200) {
        setState(() {
          _uploadedFiles[docCode] = fileName;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("📸 [등록 완료] 필수서류($docCode)가 정상적으로 업로드 처리되었습니다."),
            backgroundColor: const Color(0xFF004D5A),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("🔴 서류 업로드 도중 네트워크 오류가 발생했습니다."), backgroundColor: Colors.red),
      );
    }
  }

  void _simulateUpload(String docCode) {
    setState(() {
      _isSubmitting = true;
    });

    // 1초 뒤 업로드 완료 모사
    Future.delayed(const Duration(milliseconds: 800), () async {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        final timeStr = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
        final simulatedFileName = "사업자서류_${docCode}_$timeStr.jpg";
        await _uploadDocumentToServer(docCode, simulatedFileName);
      }
    });
  }

  void _submitAllDocuments() {
    // 모든 서류가 다 제출되었는지 검증
    final missing = _requiredDocs.where((doc) => _uploadedFiles[doc['code']] == null).toList();

    if (missing.isNotEmpty) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: Text("필수 서류 누락", style: TextStyle(fontWeight: FontWeight.bold)),
          content: Text("아직 제출하지 않은 필수 서류가 있습니다:\n\n" + 
              missing.map((e) => "• ${e['code_name']}").join("\n")),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text("확인", style: TextStyle(color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
            )
          ],
        ),
      );
      return;
    }

    // 제출 완료 후 심사대기 페이지로 이동
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => OwnerPendingScreen(
          user: widget.user,
          token: widget.token,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: Text(
          "차주 필수 서류 제출",
          style: TextStyle(color: Color(0xFF1A202C), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            _isLoading
                ? Center(child: CircularProgressIndicator(color: Color(0xFFFF7A00)))
                : SingleChildScrollView(
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
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.info_outline_rounded, color: Color(0xFF004D5A), size: 24),
                              SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "차주 사장님 가입 승인 안내",
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF004D5A)),
                                    ),
                                    SizedBox(height: 6),
                                    Text(
                                      "덤프링은 안전한 중계 거래 계약 체결을 위해 국세청 연동 전 차주님의 정상 영업 허가 여부와 운임 계좌를 본사 총괄 관리자가 직접 확인 및 승인합니다.",
                                      style: TextStyle(fontSize: 12, color: Color(0xFF002D35), height: 1.4),
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                        SizedBox(height: 28),

                        Text(
                          "📋 제출 필수 증빙 서류 목록",
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
                        ),
                        SizedBox(height: 12),

                        // 동적 서류 카드 리스트 출력
                        ..._requiredDocs.map((doc) {
                          final docCode = doc['code'];
                          final docName = doc['code_name'];
                          final fileName = _uploadedFiles[docCode];
                          final bool isUploaded = fileName != null;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Card(
                              color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: BorderSide(
                                  color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFFE2E8F0),
                                  width: isUploaded ? 1.5 : 1.0,
                                ),
                              ),
                              child: InkWell(
                                onTap: () => _simulateUpload(docCode),
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.all(20.0),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 26,
                                        backgroundColor: isUploaded ? const Color(0xFFFFF4E5) : const Color(0xFFF7FAFC),
                                        child: Icon(
                                          docCode == 'BIZ_LICENSE' ? Icons.business_outlined : Icons.account_balance_wallet_outlined,
                                          color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFF718096),
                                          size: 26,
                                        ),
                                      ),
                                      SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              docName,
                                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1A202C)),
                                            ),
                                            SizedBox(height: 4),
                                            Text(
                                              isUploaded ? fileName! : "심사 제출을 위해 촬영해 주세요",
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFF718096),
                                                fontWeight: isUploaded ? FontWeight.bold : FontWeight.normal,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      SizedBox(width: 8),
                                      Icon(
                                        isUploaded ? Icons.check_circle : Icons.camera_alt_outlined,
                                        color: isUploaded ? const Color(0xFFFF7A00) : const Color(0xFFCBD5E0),
                                        size: 24,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                        SizedBox(height: 32),

                        // 심사 요청 버튼
                        ElevatedButton(
                          onPressed: _isSubmitting ? null : _submitAllDocuments,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF004D5A),
                            foregroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
                            disabledBackgroundColor: const Color(0xFF80B3BC),
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                          child: Text(
                            "차주 서류 심사 요청",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                        SizedBox(height: 50),
                      ],
                    ),
                  ),
            if (_isSubmitting)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFFFF7A00)),
                ),
              )
          ],
        ),
      ),
    );
  }
}
