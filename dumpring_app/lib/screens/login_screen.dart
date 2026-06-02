import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'role_selection_screen.dart'; // 회원가입 선택 화면 임포트
import 'dashboard_screen.dart';
import 'driver_pending_screen.dart';
import 'drop_off_home_screen.dart';
import 'owner_home_screen.dart';
import 'admin_home_screen.dart';
import 'driver_home_screen.dart';
import 'driver_document_upload_screen.dart';
import 'owner_document_upload_screen.dart';
import 'owner_pending_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String get _baseUrl => "https://dumpring-api.onrender.com";

  final _formKey = GlobalKey<FormState>();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final String endpoint = "$_baseUrl/api/auth/login";
    final Map<String, dynamic> requestData = {
      "phone_number": _phoneController.text.trim(),
      "password": _passwordController.text,
    };

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(requestData),
      );

      final decodedResponse = jsonDecode(utf8.decode(response.bodyBytes));

      if (response.statusCode == 200) {
        // 로그인 대성공
        final token = decodedResponse["access_token"];
        final user = decodedResponse["user"];
        _showSuccessDialog(user, token);
      } else {
        // 인증 실패 또는 기타 서버 에러
        final detailMsg = decodedResponse["detail"] ?? "로그인에 실패했습니다. 아이디와 비밀번호를 확인해 주세요.";
        setState(() {
          _errorMessage = detailMsg;
        });
        _showErrorDialog(detailMsg);
      }
    } catch (e) {
      setState(() {
        _errorMessage = "서버 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.";
      });
      _showErrorDialog("서버와 통신할 수 없습니다.\n실행 주소: $endpoint");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showSuccessDialog(Map<String, dynamic> user, String token) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: Color(0xFFFF7A00)),
            SizedBox(width: 8),
            Text("로그인 성공", style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text("${user['name']}님, 환영합니다!\n덤프링 플랫폼 서비스를 시작합니다."),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 다이얼로그 닫기
              _redirectAfterLogin(context, user, token);
            },
            child: const Text("확인", style: TextStyle(color: Color(0xFF004D5A), fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _redirectAfterLogin(BuildContext context, Map<String, dynamic> user, String token) async {
    if (user['is_admin'] == true) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => AdminHomeScreen(user: user, token: token)),
      );
      return;
    }
    
    if (user['is_drop_off'] == true || user['is_site_manager'] == true) {
      if (user['is_drop_off'] == true) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => DropOffHomeScreen(user: user, token: token)),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => DashboardScreen(user: user, token: token)),
        );
      }
      return;
    }

    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/auth/member-status"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final bool isApproved = decoded['is_approved'] ?? false;
        final List missing = decoded['missing_documents'] ?? [];

        if (user['is_driver'] == true) {
          if (isApproved) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => DriverHomeScreen(user: user, token: token)),
            );
          } else {
            if (missing.isNotEmpty) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => DriverDocumentUploadScreen(user: user, token: token)),
              );
            } else {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => DriverPendingScreen(user: user, token: token)),
              );
            }
          }
        } else if (user['is_owner'] == true) {
          if (isApproved) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => OwnerHomeScreen(user: user, token: token)),
            );
          } else {
            if (missing.isNotEmpty) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => OwnerDocumentUploadScreen(user: user, token: token)),
              );
            } else {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => OwnerPendingScreen(user: user, token: token)),
              );
            }
          }
        }
      } else {
        if (user['is_driver'] == true) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => DriverPendingScreen(user: user, token: token)),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => OwnerPendingScreen(user: user, token: token)),
          );
        }
      }
    } catch (e) {
      if (user['is_driver'] == true) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => DriverPendingScreen(user: user, token: token)),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => OwnerPendingScreen(user: user, token: token)),
        );
      }
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red),
            SizedBox(width: 8),
            Text("로그인 실패", style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("확인", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA), // 배경 그레이
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 서비스 로고/타이틀 섹션
                const Icon(
                  Icons.local_shipping_rounded,
                  size: 80,
                  color: Color(0xFFFF7A00), // 시그니처 오렌지
                ),
                const SizedBox(height: 16),
                const Text(
                  "DUMPRING",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: Color(0xFF004D5A), // 다크 청록
                  ),
                ),
                const Text(
                  "덤프 중계 및 실시간 미터기 플랫폼",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF718096),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 40),

                // 입력 폼 카드
                Card(
                  color: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text("휴대폰 번호 (로그인 ID)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                            decoration: InputDecoration(
                              hintText: "- 없이 숫자만 입력해 주세요",
                              hintStyle: const TextStyle(color: Color(0xFFA0AEC0)),
                              filled: true,
                              fillColor: const Color(0xFFF7FAFC),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                              prefixIcon: const Icon(Icons.phone_android_outlined, color: Color(0xFF718096)),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFFF7A00), width: 1.5),
                              ),
                            ),
                            validator: (value) => (value == null || value.trim().isEmpty) ? "휴대폰 번호를 입력해 주세요" : null,
                          ),
                          const SizedBox(height: 20),

                          const Text("비밀번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                            decoration: InputDecoration(
                              hintText: "비밀번호를 입력해 주세요",
                              hintStyle: const TextStyle(color: Color(0xFFA0AEC0)),
                              filled: true,
                              fillColor: const Color(0xFFF7FAFC),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                              prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF718096)),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFFF7A00), width: 1.5),
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  color: const Color(0xFF718096),
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                            validator: (value) => (value == null || value.isEmpty) ? "비밀번호를 입력해 주세요" : null,
                          ),

                          if (_errorMessage != null) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF5F5),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.red[200]!, width: 1),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: Colors.red, size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: TextStyle(
                                        color: Colors.red[800],
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // 로그인 버튼
                ElevatedButton(
                  onPressed: _isLoading ? null : _submitLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF004D5A), // 다크 청록
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFF80B3BC),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          "로그인",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
                const SizedBox(height: 20),

                // 회원가입 제안 버튼
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "계정이 없으신가요?",
                      style: TextStyle(color: Color(0xFF718096), fontSize: 14),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const RoleSelectionScreen(),
                          ),
                        );
                      },
                      child: const Text(
                        "회원가입",
                        style: TextStyle(
                          color: Color(0xFFFF7A00), // 주황색 강조
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 🔧 디버그: 본사 어드민 빠른 진입 버튼
                TextButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const AdminHomeScreen(
                          user: {
                            "id": 999,
                            "name": "플랫폼 총괄 마스터",
                            "phone_number": "010-0000-0000",
                            "is_admin": true,
                          },
                          token: "MOCK_DEVELOPER_ADMIN_TOKEN",
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.developer_mode, color: Color(0xFF718096), size: 16),
                  label: const Text(
                    "🔧 디버그: 본사 어드민 화면 바로 진입",
                    style: TextStyle(
                      color: Color(0xFF718096),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
