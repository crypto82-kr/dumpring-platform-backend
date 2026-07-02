import 'package:flutter/material.dart';
import '../shared/app_config.dart';
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
import 'sdui_screen.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'main_home_frame.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  final _formKey = GlobalKey<FormState>();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _isStatusChecking = false;
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
        // 로그인 대성공 - 불필요한 다이얼로그 팝업을 제거하고 즉시 화면 전환 (사용성 극대화 🚀)
        final token = decodedResponse["access_token"];
        final user = decodedResponse["user"];
        _redirectAfterLogin(user, token);
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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            Icon(Icons.check_circle_outline, color: AppColors.warning),
            SizedBox(width: 8),
            Text("로그인 성공", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ],
        ),
        content: Text("${user['name']}님, 환영합니다!\n덤프링 플랫폼 서비스를 시작합니다.", style: TextStyle(color: AppColors.textPrimary)),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 다이얼로그 닫기
              _redirectAfterLogin(user, token);
            },
            child: Text("확인", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }
 
  void _redirectAfterLogin(Map<String, dynamic> user, String token) async {
    if (user['is_admin'] == true) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => AdminHomeScreen(user: user, token: token)),
      );
      return;
    }
    
    if (user['is_drop_off'] == true || user['is_site_manager'] == true || user['is_site_worker'] == true) {
      if (!mounted) return;
      if (user['is_drop_off'] == true) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => DropOffHomeScreen(user: user, token: token)),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => MainHomeFrame(user: user, token: token)),
        );
      }
      return;
    }

    // 기사인 경우 승인확인 로딩 팝업 오버레이만 노출하지 않고, 실제 승인 상태 조회(API)는 그대로 진행합니다.
    final bool showOverlay = user['is_driver'] != true;

    setState(() {
      _isStatusChecking = showOverlay;
    });
 
    debugPrint("★ [_redirectAfterLogin] 시작 - 유저: ${user['name']}, 전화번호: ${user['phone_number']}");
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/auth/member-status"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      ).timeout(const Duration(seconds: 15));
 
      debugPrint("★ [_redirectAfterLogin] 응답 수신 - 코드: ${response.statusCode}");
 
      if (!mounted) return;
      setState(() {
        _isStatusChecking = false;
      });
 
      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        debugPrint("★ [_redirectAfterLogin] 응답 바디: $decoded");
        final bool isApproved = decoded['is_approved'] ?? false;
 
        if (user['is_owner'] == true) {
          debugPrint("★ [_redirectAfterLogin] 차주 홈 화면으로 바로 이동 (승인상태: $isApproved)");
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => OwnerHomeScreen(user: user, token: token, isApproved: isApproved)),
          );
        } else if (user['is_driver'] == true) {
          debugPrint("★ [_redirectAfterLogin] 기사 홈 화면으로 바로 이동 (승인상태: $isApproved)");
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => DriverHomeScreen(user: user, token: token, isApproved: isApproved)),
          );
        }
      } else {
        debugPrint("★ [_redirectAfterLogin] 통신 실패 (200 아님) -> 미승인 상태로 홈 화면 강제 이동");
        if (user['is_owner'] == true) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => OwnerHomeScreen(user: user, token: token, isApproved: false)),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => DriverHomeScreen(user: user, token: token, isApproved: false)),
          );
        }
      }
    } catch (e) {
      debugPrint("★ [_redirectAfterLogin] 예외 발생: $e");
      if (!mounted) return;
      setState(() {
        _isStatusChecking = false;
      });
      
      if (user['is_owner'] == true) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => OwnerHomeScreen(user: user, token: token, isApproved: false)),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => DriverHomeScreen(user: user, token: token, isApproved: false)),
        );
      }
    }
  }

  Widget _buildQuickLoginButton({
    required String label,
    required String phone,
    required String password,
  }) {
    return ElevatedButton(
      onPressed: _isLoading
          ? null
          : () {
              setState(() {
                _phoneController.text = phone;
                _passwordController.text = password;
              });
              _submitLogin();
            },
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppColors.primary, width: 1),
        ),
        padding: EdgeInsets.zero,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            Icon(Icons.error_outline, color: AppColors.danger),
            SizedBox(width: 8),
            Text("로그인 실패", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ],
        ),
        content: Text(message, style: TextStyle(color: AppColors.textPrimary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text("확인", style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            child: Center(
              child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(height: 20),
                // 서비스 로고/타이틀 섹션
                Icon(
                  Icons.local_shipping_rounded,
                  size: 85,
                  color: Theme.of(context).colorScheme.primary,
                ),
                SizedBox(height: 16),
                Text(
                  "DUMPRING",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 3,
                    color: AppColors.textPrimary, 
                  ),
                ),
                Text(
                  "덤프 중계 및 실시간 미터기 플랫폼",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 36),

                // 입력 폼 카드
                Card(
                  color: AppColors.surface,
                  elevation: 8,
                  shadowColor: Colors.black.withOpacity(0.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                    side: BorderSide(color: AppColors.divider, width: 1.5),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text("휴대폰 번호 (로그인 ID)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
                          SizedBox(height: 8),
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            decoration: InputDecoration(
                              hintText: "- 없이 숫자만 입력해 주세요",
                              hintStyle: TextStyle(color: AppColors.textTertiary),
                              filled: true,
                              fillColor: AppColors.background,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                              prefixIcon: Icon(Icons.phone_android_outlined, color: AppColors.textSecondary),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: AppColors.divider),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: AppColors.divider),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2),
                              ),
                            ),
                            validator: (value) => (value == null || value.trim().isEmpty) ? "휴대폰 번호를 입력해 주세요" : null,
                          ),
                          SizedBox(height: 20),

                          Text("비밀번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
                          SizedBox(height: 8),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            decoration: InputDecoration(
                              hintText: "비밀번호를 입력해 주세요",
                              hintStyle: TextStyle(color: AppColors.textTertiary),
                              filled: true,
                              fillColor: AppColors.background,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                              prefixIcon: Icon(Icons.lock_outline, color: AppColors.textSecondary),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: AppColors.divider),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: AppColors.divider),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2),
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  color: AppColors.textSecondary,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                            validator: (value) => (value == null || value.isEmpty) ? "비밀번호를 입력해 주세요" : null,
                          ),

                          if (_errorMessage != null) ...[
                            SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppColors.danger.withAlpha(20),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.danger, width: 1),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: TextStyle(
                                        color: AppColors.danger,
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
                SizedBox(height: 24),

                // 로그인 버튼
                ElevatedButton(
                  onPressed: _isLoading ? null : _submitLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: AppColors.background,
                    disabledBackgroundColor: AppColors.textTertiary,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 4,
                    shadowColor: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  ),
                  child: _isLoading
                      ? SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: AppColors.background, strokeWidth: 2.5),
                        )
                      : Text(
                          "로그인",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
                SizedBox(height: 20),

                // 회원가입 제안 버튼
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "계정이 없으신가요?",
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
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
                      child: Text(
                        "회원가입",
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
                 Divider(height: 40, thickness: 1.5, color: AppColors.divider),
                 Text(
                   "테스트용 빠른 로그인",
                   textAlign: TextAlign.center,
                   style: TextStyle(
                     fontSize: 13,
                     fontWeight: FontWeight.bold,
                     color: AppColors.textSecondary,
                   ),
                 ),
                SizedBox(height: 12),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  childAspectRatio: 2.8,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  children: [
                    _buildQuickLoginButton(
                      label: "김차주 (승인차주)",
                      phone: "010-1111-1111",
                      password: "password123",
                    ),
                    _buildQuickLoginButton(
                      label: "이기사 (승인기사)",
                      phone: "010-2222-1111",
                      password: "password123",
                    ),
                    _buildQuickLoginButton(
                      label: "정관리자 (현장관리자)",
                      phone: "010-3333-1111",
                      password: "password123",
                    ),
                    _buildQuickLoginButton(
                      label: "이담당자 (현장담당자)",
                      phone: "010-3333-2222",
                      password: "password123",
                    ),
                    _buildQuickLoginButton(
                      label: "오지주 (하차지지주)",
                      phone: "010-4444-1111",
                      password: "password123",
                    ),
                  ],
                ),
                SizedBox(height: 16),

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
                  icon: Icon(Icons.developer_mode, color: AppColors.textSecondary, size: 16),
                  label: Text(
                    "🔧 디버그: 본사 어드민 화면 바로 진입",
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                SizedBox(height: 8),
                // 🎨 SDUI 피그마 동적 템플릿 테스트 진입 버튼
                TextButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const SduiScreen(
                          templateId: 'role_selection',
                          title: '🎨 피그마 SDUI 템플릿 테스트',
                        ),
                      ),
                    );
                  },
                  icon: Icon(Icons.palette_outlined, color: Theme.of(context).colorScheme.primary, size: 16),
                  label: Text(
                    "🎨 피그마 SDUI 실시간 템플릿 화면 테스트",
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
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
    ),
        if (_isStatusChecking)
          Container(
            color: Colors.black.withOpacity(0.4),
            child: Center(
              child: Card(
                color: AppColors.surface,
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppColors.warning),
                      SizedBox(height: 16),
                      Text(
                        "승인 및 서류 제출 현황 조회 중...",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary, decoration: TextDecoration.none),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
