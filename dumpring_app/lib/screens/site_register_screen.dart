import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SiteRegisterScreen extends StatefulWidget {
  const SiteRegisterScreen({Key? key}) : super(key: key);

  @override
  State<SiteRegisterScreen> createState() => _SiteRegisterScreenState();
}

class _SiteRegisterScreenState extends State<SiteRegisterScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  final _formKey = GlobalKey<FormState>();

  // 가입 상세 입력창 컨트롤러
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _companyController = TextEditingController();
  final TextEditingController _siteController = TextEditingController();
  final TextEditingController _businessNumController = TextEditingController();

  // 역할 토글 변수
  bool _isManagerRole = true; // true: 현장관리자, false: 현장담당자
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _companyController.dispose();
    _siteController.dispose();
    _businessNumController.dispose();
    super.dispose();
  }

  Future<void> _submitSiteRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    // 현장 가입 구분별 API 주소 분기
    final String endpoint = _isManagerRole
        ? "$_baseUrl/api/auth/signup/site-manager"
        : "$_baseUrl/api/auth/signup/site-worker";

    final Map<String, dynamic> requestData = {
      "phone_number": _phoneController.text.trim(),
      "password": _passwordController.text,
      "name": _nameController.text.trim(),
      "ci": "MOCK_SITE_CI_${_phoneController.text.trim()}",
      "company_name": _companyController.text.trim(),
      "site_name": _siteController.text.trim(),
      "business_number": _businessNumController.text.trim(),
    };

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(requestData),
      );

      final decodedResponse = jsonDecode(utf8.decode(response.bodyBytes));

      if (response.statusCode == 201) {
        _showSuccessDialog();
      } else if (response.statusCode == 400 &&
                 decodedResponse["error_code"] == "ALREADY_REGISTERED") {
        setState(() {
          _errorMessage = "이미 가입된 휴대폰 번호입니다.";
        });
        _showErrorDialog("이미 가입된 휴대폰 번호입니다. 로그인해 주세요.");
      } else {
        final detailMsg = decodedResponse["detail"] ?? "가입 처리 도중 서버 에러가 발생했습니다.";
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

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text("🎉 회원가입 완료", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(
          _isManagerRole
              ? "공사현장 마스터 관리자 회원가입이 완료되었습니다!\n이제 로그인하여 공사현장 오더를 등록해 보세요."
              : "공사현장 실무 담당자 회원가입이 완료되었습니다!\n(소장님이 선등록해 둔 직원인 경우 자동 현장 연동 완료)"
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 팝업 닫기
              Navigator.of(context).pop(); // 역할 선택창 닫고 로그인창 복귀
            },
            child: Text("확인", style: TextStyle(color: Color(0xFF004D5A), fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red),
            SizedBox(width: 8),
            Text("가입 실패", style: TextStyle(fontWeight: FontWeight.bold)),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: Text(
          "공사현장 회원가입",
          style: TextStyle(color: Color(0xFF1A202C), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. 역할 세그먼트 탭
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isManagerRole = true),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isManagerRole ? const Color(0xFFFF7A00) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "현장관리자",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: _isManagerRole ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF4A5568),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isManagerRole = false),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !_isManagerRole ? const Color(0xFFFF7A00) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "현장담당자",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: !_isManagerRole ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF4A5568),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 24),

              // 2. 가입 폼 카드
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
                        // 성명
                        Text("성명 (실명)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _nameController,
                          keyboardType: TextInputType.name,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("실명을 입력해 주세요", Icons.person_outline),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "성명을 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 휴대폰 번호
                        Text("휴대폰 번호 (로그인 ID)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("- 없이 숫자만 입력해 주세요", Icons.phone_android_outlined),
                          validator: (value) => (value == null || value.trim().length < 10) ? "올바른 휴대폰 번호를 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 비밀번호
                        Text("비밀번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: "4자리 이상 입력해 주세요",
                            hintStyle: TextStyle(color: Color(0xFFA0AEC0)),
                            filled: true,
                            fillColor: const Color(0xFFF7FAFC),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                            prefixIcon: Icon(Icons.lock_outline, color: Color(0xFF718096)),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Color(0xFFE2E8F0))),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Color(0xFFE2E8F0))),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Color(0xFFFF7A00), width: 1.5)),
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
                        SizedBox(height: 20),

                        Divider(height: 12),
                        SizedBox(height: 12),

                        // 건설사명 / 상호명
                        Text("건설사 / 상호명", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _companyController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("상호명을 입력해 주세요 (예: 현대건설)", Icons.business_outlined),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "상호명을 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 현장명
                        Text("공사 현장명", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _siteController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("소속 현장명을 입력해 주세요", saConstructionIcon()),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "현장명을 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 사업자번호
                        Text("사업자등록번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _businessNumController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("세금계산서 발행용 10자리 입력", Icons.assignment_outlined),
                          validator: (value) => (value == null || value.trim().length < 10) ? "올바른 사업자등록번호를 입력해 주세요" : null,
                        ),

                        // 에러 텍스트 표시 상주 에러창
                        if (_errorMessage != null) ...[
                          SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF5F5),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red[200]!, width: 1),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline, color: Colors.red, size: 20),
                                SizedBox(width: 8),
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
              SizedBox(height: 24),

              // 3. 완료 대형 버튼
              ElevatedButton(
                onPressed: _isLoading ? null : _submitSiteRegister,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF004D5A),
                  foregroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
                  disabledBackgroundColor: const Color(0xFF80B3BC),
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
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
                        _isManagerRole ? "현장관리자 가입 완료" : "현장담당자 가입 완료",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 빌드용 아이콘 매핑 유틸
  IconData saConstructionIcon() => Icons.construction_outlined;

  InputDecoration _buildInputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Color(0xFFA0AEC0)),
      filled: true,
      fillColor: const Color(0xFFF7FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      prefixIcon: Icon(icon, color: const Color(0xFF718096)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Color(0xFFE2E8F0))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Color(0xFFFF7A00), width: 1.5)),
    );
  }
}
