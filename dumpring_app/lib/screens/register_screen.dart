import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart'; // kIsWeb 지원용
import 'dart:io' show Platform; // Platform 지원용

class RegisterScreen extends StatefulWidget {
  final bool initialIsDriver;
  const RegisterScreen({Key? key, this.initialIsDriver = true}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  String get _baseUrl {
    // 모든 환경(디버그/릴리즈)에서 임시로 Render 배포 주소를 바라보도록 고정합니다.
    // 만약 Render 주소가 다르게 발급되었다면 (예: dumpring-api-xxxx.onrender.com) 아래 주소를 수정해 주세요.
    return AppConfig.baseUrl;
  }

  final _formKey = GlobalKey<FormState>();
  
  // 폼 입력 컨트롤러
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // 가입 상태 변수
  late bool _isDriverRole; // true: 기사로 가입, false: 차주로 가입
  bool _isDirectDriver = false; // (차주일 때만 활성) 차주 사장님이 직접 운전 여부
  bool _obscurePassword = true; // 비밀번호 숨김 여부
  bool _isLoading = false; // API 로딩 상태
  String? _errorMessage; // 화면상에 상주 표출할 에러 경고 메시지

  @override
  void initState() {
    super.initState();
    _isDriverRole = widget.initialIsDriver;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // ==========================================
  // 비동기 회원가입 API 연동 로직
  // ==========================================
  Future<void> _submitRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null; // 이전 에러 초기화
    });

    // 가입 역할에 따라 타깃 API 주소 분기
    final String endpoint = _isDriverRole 
        ? "$_baseUrl/api/auth/register-driver" 
        : "$_baseUrl/api/auth/register-owner";

    // 전송할 JSON 데이터 모델 생성
    final Map<String, dynamic> requestData = {
      "phone_number": _phoneController.text.trim(),
      "password": _passwordController.text,
      "name": _nameController.text.trim(),
      "ci": "MOCK_MOBILE_CI_KEY_${_phoneController.text.trim()}" // 모바일 임시 본인인증 고유값 주입
    };

    // 차주일 때만 '직접 운행 여부' 필드 바인딩
    if (!_isDriverRole) {
      requestData["is_direct_driver"] = _isDirectDriver;
    }

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(requestData),
      );

      final decodedResponse = jsonDecode(utf8.decode(response.bodyBytes));

      if (response.statusCode == 201) {
        // 회원가입 대성공
        _showSuccessDialog();
      } else if (response.statusCode == 400 && 
                 decodedResponse["error_code"] == "ALREADY_REGISTERED") {
        // 이미 가입된 폰 번호 중복 예외 처리 (ALREADY_REGISTERED)
        setState(() {
          _errorMessage = "이미 가입된 휴대폰 번호입니다. 로그인해 주세요.";
        });
        _showErrorDialog("이미 가입된 휴대폰 번호입니다. 로그인해 주세요.");
      } else {
        // 기타 서버 에러 처리
        final detailMsg = decodedResponse["detail"] ?? "가입 처리 도중 서버 에러가 발생했습니다.";
        setState(() {
          _errorMessage = detailMsg;
        });
        _showErrorDialog(detailMsg);
      }
    } catch (e) {
      // 네트워크 연결 유실 에러
      setState(() {
        _errorMessage = "서버 연결에 실패했습니다. 네트워크 및 베이스 URL 주소를 확인해 주세요.";
      });
      _showErrorDialog("서버와 통신할 수 없습니다.\n[호스트 IP 확인 요망]\n실행 주소: $endpoint");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // 성공 팝업 다이얼로그
  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text("🎉 회원가입 완료", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(
          _isDriverRole 
              ? "덤프 기사님 회원가입이 완료되었습니다!\n(차주 선등록이 존재한 경우 자동으로 즉시 차량 매칭 연동이 완료되었습니다.)" 
              : "차주 사장님 회원가입이 완료되었습니다!\n이제 소속 차량과 기사를 선등록 관리해 보세요."
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 팝업 닫기
              Navigator.of(context).pop(); // 가입창 닫기 (역할 선택창도 가입창이 닫히면 이전 화면으로 돌아감 또는 직접 로그인창 복귀)
            },
            child: Text("확인", style: TextStyle(color: Color(0xFF004D5A), fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  // 실패 팝업 다이얼로그
  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red),
            SizedBox(width: 8),
            Text("오류 발생", style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text("닫기", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _resetForm() {
    _nameController.clear();
    _phoneController.clear();
    _passwordController.clear();
    setState(() {
      _errorMessage = null;
      _isDirectDriver = false;
    });
  }

  // ==========================================
  // UI 렌더링 (덤프 현장 실무 맞춤형 고대비 프리미엄 UI 테마)
  // ==========================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA), // 1. 깔끔한 연그레이 배경 적용
      appBar: AppBar(
        backgroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
        elevation: 0.5,
        title: Text(
          "덤프링 회원가입",
          style: TextStyle(color: Color(0xFF1A202C), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0), // 1. 좌우 24px 넉넉한 여백 적용
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 2. 사용자 유형 선택 버튼 (기사 / 차주 세그먼트 탭)
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0), // 비선택 그레이 배경
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    // [기사로 가입] 버튼
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isDriverRole = true),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isDriverRole ? const Color(0xFFFF7A00) : Colors.transparent, // 2. 선택 시 활기찬 오렌지색(#FF7A00) 배경
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "기사로 가입",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: _isDriverRole ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF4A5568), // 2. 선택 시 흰색 글씨, 비선택 시 어두운 그레이 반전
                            ),
                          ),
                        ),
                      ),
                    ),
                    // [차주로 가입] 버튼
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isDriverRole = false),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !_isDriverRole ? const Color(0xFFFF7A00) : Colors.transparent, // 2. 선택 시 활기찬 오렌지색(#FF7A00) 배경
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "차주로 가입",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: !_isDriverRole ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF4A5568), // 2. 선택 시 흰색 글씨, 비선택 시 어두운 그레이 반전
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 24),

              // 3. 입력 폼 카드
              Card(
                color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Color(0xFFE2E8F0), width: 1),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 성명 입력칸
                        Text("성명 (실명)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        // 3. 입력창 높이 55px 확보를 위해 vertical 패딩을 넉넉히 설정한 TextFormField
                        TextFormField(
                          controller: _nameController,
                          keyboardType: TextInputType.name,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: "실명을 입력해 주세요",
                            hintStyle: TextStyle(color: Color(0xFFA0AEC0)),
                            filled: true,
                            fillColor: const Color(0xFFF7FAFC), // 3. 부드러운 그레이 배경
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18), // 3. 높이 55px 이상 확보용 패딩
                            prefixIcon: Icon(Icons.person_outline, color: Color(0xFF718096)), // 3. 회색조 인물 아이콘 왼쪽 내장
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), // 3. 테두리 라운딩 12px
                              borderSide: BorderSide(color: Color(0xFFCBD5E0), width: 1), // 3. 얇은 외곽선
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Color(0xFFE2E8F0), width: 1),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Color(0xFFFF7A00), width: 1.5),
                            ),
                          ),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "성명을 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 휴대폰 번호 입력칸
                        Text("휴대폰 번호 (로그인 ID)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: "- 없이 숫자만 입력해 주세요",
                            hintStyle: TextStyle(color: Color(0xFFA0AEC0)),
                            filled: true,
                            fillColor: const Color(0xFFF7FAFC), // 3. 부드러운 그레이 배경
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18), // 3. 높이 55px 이상 확보용 패딩
                            prefixIcon: Icon(Icons.phone_android_outlined, color: Color(0xFF718096)), // 3. 회색조 스마트폰 아이콘 왼쪽 내장
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), // 3. 테두리 라운딩 12px
                              borderSide: BorderSide(color: Color(0xFFCBD5E0), width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Color(0xFFE2E8F0), width: 1),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Color(0xFFFF7A00), width: 1.5),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return "휴대폰 번호를 입력해 주세요";
                            }
                            if (value.length < 10) {
                              return "올바른 번호 형식이 아닙니다";
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 20),

                        // 비밀번호 입력칸
                        Text("비밀번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: "4자리 이상 입력해 주세요",
                            hintStyle: TextStyle(color: Color(0xFFA0AEC0)),
                            filled: true,
                            fillColor: const Color(0xFFF7FAFC), // 3. 부드러운 그레이 배경
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18), // 3. 높이 55px 이상 확보용 패딩
                            prefixIcon: Icon(Icons.lock_outline, color: Color(0xFF718096)), // 3. 회색조 자물쇠 아이콘 왼쪽 내장
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), // 3. 테두리 라운딩 12px
                              borderSide: BorderSide(color: Color(0xFFCBD5E0), width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Color(0xFFE2E8F0), width: 1),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Color(0xFFFF7A00), width: 1.5),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                color: const Color(0xFF718096),
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          validator: (value) => (value == null || value.length < 4) ? "비밀번호는 4자리 이상이어야 합니다" : null,
                        ),

                        // 5. 중복 가입 에러 발생 시 입력창 바로 아래에 경고문 표시 (요구사항 5 준수 🚨)
                        if (_errorMessage != null) ...[
                          SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF5F5), // 연한 빨간색 배경
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red[200]!, width: 1),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline, color: Colors.red, size: 20), // 5. 경고 아이콘
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: TextStyle(
                                      color: Colors.red[800], // 5. 진한 빨간색 메테리얼 컬러
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        // 차주일 때만 다이내믹 노출되는 '직접 운행 여부' 필드
                        if (!_isDriverRole) ...[
                          SizedBox(height: 12),
                          Divider(height: 24),
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              "차주 본인이 직접 덤프 운행 (기사 겸직)",
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
                            ),
                            subtitle: Text("체크 시 기사(Driver) 권한도 동시에 획득합니다.", style: TextStyle(fontSize: 12)),
                            value: _isDirectDriver,
                            activeColor: const Color(0xFF004D5A), // 다크 청록 포인트
                            onChanged: (val) => setState(() => _isDirectDriver = val),
                          ),
                        ]
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(height: 24),

              // 4. 액션 가입 완료 버튼 (화면 하단 꽉 차는 대형 라운드 버튼)
              ElevatedButton(
                onPressed: _isLoading ? null : _submitRegister,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF004D5A), // 4. 메인 버튼 컬러: 신뢰감을 주는 다크 청록(#004D5A) 적용
                  foregroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
                  disabledBackgroundColor: const Color(0xFF80B3BC),
                  padding: const EdgeInsets.symmetric(vertical: 18), // 4. 대형 버튼에 맞춘 넓은 세로 패딩
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14), // 4. 라운드 처리된 대형 버튼
                  ),
                  elevation: 0,
                ),
                child: _isLoading
                    ? SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)), strokeWidth: 2.5),
                      )
                    : Text(
                        _isDriverRole ? "기사로 가입 완료" : "차주로 가입 완료",
                        style: TextStyle(
                          fontSize: 18, // 4. 글자 18pt(18) 크기 적용
                          fontWeight: FontWeight.bold, // 4. 볼드(Bold) 적용
                          letterSpacing: 0.5,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

