import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'role_selection_screen.dart'; // 회원가입 선택 화면 임포트
import 'drop_off_home_screen.dart';
import 'owner_home_screen.dart';
import 'admin_home_screen.dart';
import 'driver_home_screen.dart';
import 'owner_pending_screen.dart';
import 'driver_pending_screen.dart';
import 'sdui_screen.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'main_home_frame.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  @override
  void initState() {
    super.initState();
    _checkSavedSession();
  }

  Future<void> _checkSavedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token') ?? prefs.getString('token');
      final userDataStr = prefs.getString('user_data');
      if (token != null && userDataStr != null && token.isNotEmpty) {
        final user = jsonDecode(userDataStr) as Map<String, dynamic>;
        if (mounted) {
          _redirectAfterLogin(user, token);
        }
      }
    } catch (e) {
      debugPrint("Auto-login error: $e");
    }
  }

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
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('token', token);
          await prefs.setString('access_token', token);
          await prefs.setString('user_data', jsonEncode(user));
        } catch (e) {
          debugPrint("Failed to save auth session: $e");
        }
        _redirectAfterLogin(user, token);
      } else {
        // 인증 실패 또는 기타 서버 에러
        final detailMsg =
            decodedResponse["detail"] ?? "로그인에 실패했습니다. 아이디와 비밀번호를 확인해 주세요.";
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
            Text(
              "로그인 성공",
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        content: Text(
          "${user['name']}님, 환영합니다!\n덤프링 플랫폼 서비스를 시작합니다.",
          style: TextStyle(color: AppColors.textPrimary),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 다이얼로그 닫기
              _redirectAfterLogin(user, token);
            },
            child: Text(
              "확인",
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _redirectAfterLogin(Map<String, dynamic> user, String token) async {
    if (user['is_admin'] == true) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => AdminHomeScreen(user: user, token: token),
        ),
      );
      return;
    }

    // 기사인 경우 승인확인 로딩 팝업 오버레이만 노출하지 않고, 실제 승인 상태 조회(API)는 그대로 진행합니다.
    final bool showOverlay = user['is_driver'] != true;

    setState(() {
      _isStatusChecking = showOverlay;
    });

    debugPrint(
      "★ [_redirectAfterLogin] 시작 - 유저: ${user['name']}, 전화번호: ${user['phone_number']}",
    );
    try {
      final response = await http
          .get(
            Uri.parse("$_baseUrl/api/auth/member-status"),
            headers: {
              "Authorization": "Bearer $token",
              "Content-Type": "application/json",
            },
          )
          .timeout(const Duration(seconds: 15));

      debugPrint("★ [_redirectAfterLogin] 응답 수신 - 코드: ${response.statusCode}");

      if (!mounted) return;
      setState(() {
        _isStatusChecking = false;
      });

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        debugPrint("★ [_redirectAfterLogin] 응답 바디: $decoded");
        final bool isApproved = decoded['is_approved'] ?? false;

        if (user['is_drop_off'] == true ||
            user['is_site_manager'] == true ||
            user['is_site_worker'] == true) {
          if (isApproved) {
            if (user['is_drop_off'] == true) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => DropOffHomeScreen(user: user, token: token),
                ),
              );
            } else {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => MainHomeFrame(user: user, token: token, isApproved: true),
                ),
              );
            }
          } else {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => SiteDropoffPendingScreen(
                  user: user,
                  token: token,
                  initialStatusData: decoded,
                ),
              ),
            );
          }
          return;
        }

        if (isApproved) {
          if (user['is_owner'] == true) {
            debugPrint("★ [_redirectAfterLogin] 승인 완료된 차주 -> 차주 홈 화면 이동");
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) =>
                    OwnerHomeScreen(user: user, token: token, isApproved: true),
              ),
            );
          } else if (user['is_driver'] == true) {
            debugPrint("★ [_redirectAfterLogin] 승인 완료된 기사 -> 기사 홈 화면 이동");
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => DriverHomeScreen(
                  user: user,
                  token: token,
                  isApproved: true,
                ),
              ),
            );
          }
        } else {
          debugPrint("★ [_redirectAfterLogin] 가입 심사 대기 중 -> 대기 화면으로 이동");
          if (user['is_owner'] == true) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) =>
                    OwnerPendingScreen(user: user, token: token),
              ),
            );
          } else {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) =>
                    DriverPendingScreen(user: user, token: token),
              ),
            );
          }
        }
      } else {
        debugPrint(
          "★ [_redirectAfterLogin] 통신 실패 (200 아님) -> 미승인 상태로 이동",
        );
        if (user['is_drop_off'] == true ||
            user['is_site_manager'] == true ||
            user['is_site_worker'] == true) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => SiteDropoffPendingScreen(user: user, token: token),
            ),
          );
        } else if (user['is_owner'] == true) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) =>
                  OwnerHomeScreen(user: user, token: token, isApproved: false),
            ),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) =>
                  DriverHomeScreen(user: user, token: token, isApproved: false),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint("★ [_redirectAfterLogin] 예외 발생: $e");
      if (!mounted) return;
      setState(() {
        _isStatusChecking = false;
      });

      if (user['is_drop_off'] == true ||
          user['is_site_manager'] == true ||
          user['is_site_worker'] == true) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => SiteDropoffPendingScreen(user: user, token: token),
          ),
        );
      } else if (user['is_owner'] == true) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) =>
                OwnerHomeScreen(user: user, token: token, isApproved: false),
          ),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) =>
                DriverHomeScreen(user: user, token: token, isApproved: false),
          ),
        );
      }
    }
  }

  Widget _buildQuickChip({
    required String label,
    required String phone,
    required String password,
  }) {
    return InkWell(
      onTap: _isLoading
          ? null
          : () {
              setState(() {
                _phoneController.text = phone;
                _passwordController.text = password;
              });
              _submitLogin();
            },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF2F4F7),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE4E7EC), width: 1.0),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Color(0xFF344054),
          ),
        ),
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFFE4E7EC)),
        ),
        title: Row(
          children: const [
            Icon(Icons.error_outline, color: Color(0xFFF04438), size: 20),
            SizedBox(width: 8),
            Text(
              "로그인 실패",
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Color(0xFF101828),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(fontSize: 13, color: Color(0xFF475467)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              "확인",
              style: TextStyle(
                color: Color(0xFF465FFF),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFFF9FAFB),
          body: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 미니멀 심볼
                    Center(
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF465FFF),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          "D",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      "DUMPRING",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: Color(0xFF101828),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "덤프 중계 및 스마트 배차 관제 포털",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF667085),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 깔끔한 1px 보더 화이트 카드 (그림자 완전 제거)
                    Container(
                      padding: const EdgeInsets.all(20.0),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE4E7EC), width: 1.0),
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              "휴대폰 번호",
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color: Color(0xFF344054),
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF101828),
                              ),
                              decoration: buildAdminInputDecoration(
                                hintText: "010-0000-0000",
                                prefixIcon: const Icon(
                                  Icons.phone_outlined,
                                  size: 18,
                                  color: Color(0xFF667085),
                                ),
                              ),
                              validator: (value) =>
                                  (value == null || value.trim().isEmpty)
                                  ? "휴대폰 번호를 입력해 주세요"
                                  : null,
                            ),
                            const SizedBox(height: 14),

                            const Text(
                              "비밀번호",
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color: Color(0xFF344054),
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF101828),
                              ),
                              decoration: buildAdminInputDecoration(
                                hintText: "비밀번호 입력",
                                prefixIcon: const Icon(
                                  Icons.lock_outline,
                                  size: 18,
                                  color: Color(0xFF667085),
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    color: const Color(0xFF667085),
                                    size: 18,
                                  ),
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                ),
                              ),
                              validator: (value) =>
                                  (value == null || value.isEmpty)
                                  ? "비밀번호를 입력해 주세요"
                                  : null,
                            ),

                            if (_errorMessage != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3F2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFF04438),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.error_outline,
                                      color: Color(0xFFF04438),
                                      size: 16,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: const TextStyle(
                                          color: Color(0xFFF04438),
                                          fontWeight: FontWeight.w600,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            const SizedBox(height: 18),

                            // 로그인 버튼 (44px 슬림 플랫)
                            SizedBox(
                              height: 44,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _submitLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF465FFF),
                                  foregroundColor: Colors.white,
                                  disabledBackgroundColor: const Color(0xFFD0D5DD),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: _isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          color: Colors.white,
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text(
                                        "로그인",
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 회원가입 안내
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          "아직 계정이 없으신가요?",
                          style: TextStyle(
                            color: Color(0xFF667085),
                            fontSize: 12,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const RoleSelectionScreen(),
                              ),
                            );
                          },
                          child: const Text(
                            "회원가입 신청",
                            style: TextStyle(
                              color: Color(0xFF465FFF),
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // 정돈된 빠른 테스트 계정 칩 (관리자 페이지와 동일 계정)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          "빠른 테스트 로그인",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF98A2B3),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _buildQuickChip(
                              label: "차주",
                              phone: "010-9433-9433",
                              password: "1234",
                            ),
                            _buildQuickChip(
                              label: "기사",
                              phone: "010-2222-1111",
                              password: "password123",
                            ),
                            _buildQuickChip(
                              label: "현장관리자",
                              phone: "010-8888-5555",
                              password: "1234",
                            ),
                            _buildQuickChip(
                              label: "하차지",
                              phone: "010-7777-8888",
                              password: "1234",
                            ),
                            _buildQuickChip(
                              label: "플랫폼관리자",
                              phone: "010-0000-0000",
                              password: "password123",
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_isStatusChecking)
          Container(
            color: Colors.black.withValues(alpha: 0.3),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE4E7EC)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    CircularProgressIndicator(
                      color: Color(0xFF465FFF),
                      strokeWidth: 2.5,
                    ),
                    SizedBox(height: 14),
                    Text(
                      "계정 확인 중...",
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: Color(0xFF101828),
                        decoration: TextDecoration.none,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class SiteDropoffPendingScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final Map<String, dynamic>? initialStatusData;

  const SiteDropoffPendingScreen({
    super.key,
    required this.user,
    required this.token,
    this.initialStatusData,
  });

  @override
  State<SiteDropoffPendingScreen> createState() => _SiteDropoffPendingScreenState();
}

class _SiteDropoffPendingScreenState extends State<SiteDropoffPendingScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  bool _isApproved = false;
  bool _isWorkerMatched = false;
  String _siteName = "소속 현장 미지정";
  String? _rejectReason;
  Timer? _pollingTimer;

  bool get _isSiteWorker =>
      widget.user['is_site_worker'] == true && widget.user['is_site_manager'] != true;

  @override
  void initState() {
    super.initState();
    if (widget.initialStatusData != null) {
      _applyStatusData(widget.initialStatusData!);
    }
    _checkStatus();
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _checkStatus();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _applyStatusData(Map<String, dynamic> decoded) {
    final bool isApproved = decoded['is_approved'] ?? false;
    final String? rejectReason = decoded['reject_reason'];
    final Map<String, dynamic>? info =
        decoded['submitted_info'] is Map<String, dynamic> ? decoded['submitted_info'] : null;

    setState(() {
      _isApproved = isApproved;
      _rejectReason = rejectReason;
      if (info != null) {
        _isWorkerMatched = info['is_pre_registered'] == true;
        if (info['site_name'] != null && info['site_name'].toString().isNotEmpty) {
          _siteName = info['site_name'].toString();
        }
      }
    });
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
      if (response.statusCode == 200 && mounted) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
        _applyStatusData(decoded);
        if (_isApproved) {
          _pollingTimer?.cancel();
          if (widget.user['is_drop_off'] == true) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => DropOffHomeScreen(user: widget.user, token: widget.token),
              ),
            );
          } else {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => MainHomeFrame(
                  user: widget.user,
                  token: widget.token,
                  isApproved: true,
                ),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint("승인 상태 확인 실패: $e");
    }
  }

  Future<void> _logout() async {
    _pollingTimer?.cancel();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('access_token');
      await prefs.remove('user_data');
    } catch (_) {}
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String roleLabel = _isSiteWorker
        ? "현장 담당자"
        : (widget.user['is_site_manager'] == true ? "현장 관리자" : "하차지 관리자");
    final String titleText = _isSiteWorker
        ? (_isWorkerMatched
            ? "현장관리자 매칭 완료 · 승인 대기 중"
            : "현장관리자의 인원 등록을 기다리는 중입니다")
        : "승인 심사 대기 중";
    final String descText = _isSiteWorker
        ? (_isWorkerMatched
            ? "플랫폼 관리자의 승인이 완료되면 바로 현장담당자 업무를 이용하실 수 있습니다."
            : "현장관리자가 인원 등록을 완료하면 관리자 승인 후 현장담당자 업무를 이용하실 수 있습니다.")
        : "플랫폼 관리자가 제출된 가입 정보를 확인 중입니다. 승인이 완료되면 바로 업무 화면으로 전환됩니다.";

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          "$roleLabel 승인 대기",
          style: const TextStyle(
            color: Color(0xFF1A202C),
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _logout,
            child: const Text(
              "로그아웃",
              style: TextStyle(
                color: Color(0xFFE53E3E),
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      color: Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.hourglass_top_rounded,
                      color: Color(0xFF2563EB),
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    titleText,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    descText,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF64748B),
                      height: 1.5,
                    ),
                  ),
                  if (_rejectReason != null && _rejectReason!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Text(
                        "반려 사유: $_rejectReason",
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              "성명 / 연락처",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                            Text(
                              "${widget.user['name'] ?? ''} (${widget.user['phone_number'] ?? ''})",
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              "진행 상태",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                            Text(
                              _isSiteWorker
                                  ? (_isWorkerMatched ? "매칭 완료 (승인 대기)" : "현장관리자 등록 대기")
                                  : "관리자 승인 대기",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: _isWorkerMatched
                                    ? const Color(0xFF059669)
                                    : const Color(0xFFD97706),
                              ),
                            ),
                          ],
                        ),
                        if (_isSiteWorker && _isWorkerMatched) ...[
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "소속 현장",
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                              Text(
                                _siteName,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF334155),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _checkStatus,
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text(
                        "새로고침 (매칭 및 승인 상태 확인)",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
