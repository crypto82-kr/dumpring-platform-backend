import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class DropOffRegisterScreen extends StatefulWidget {
  const DropOffRegisterScreen({Key? key}) : super(key: key);

  @override
  State<DropOffRegisterScreen> createState() => _DropOffRegisterScreenState();
}

class _DropOffRegisterScreenState extends State<DropOffRegisterScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  final _formKey = GlobalKey<FormState>();

  // 가입 상세 입력창 컨트롤러
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _permitController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _locationController.dispose();
    _addressController.dispose();
    _permitController.dispose();
    super.dispose();
  }

  Future<void> _submitDropOffRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final String endpoint = "$_baseUrl/api/auth/signup/drop-off";
    final Map<String, dynamic> requestData = {
      "phone_number": _phoneController.text.trim(),
      "password": _passwordController.text,
      "name": _nameController.text.trim(),
      "ci": "MOCK_DROPOFF_CI_${_phoneController.text.trim()}",
      "location_name": _locationController.text.trim(),
      "address": _addressController.text.trim(),
      "permit_number": _permitController.text.trim(),
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
          "사토 하차지 지주 회원가입이 완료되었습니다!\n이제 로그인하여 사토 반입 승인 및 관리를 진행해 보세요."
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
          "사토 하차지 지주 회원가입",
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
              // 가입 폼 카드
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
                        Text("지주 성명 (실명)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
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

                        // 하차지명
                        Text("하차지 / 사토장 명칭", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _locationController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("사토장 이름을 입력해 주세요 (예: 신촌지구 사토장)", Icons.place_outlined),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "하차지 명칭을 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 하차지 주소
                        Text("하차지 상세 주소", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _addressController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("지번 또는 도로명 주소를 입력해 주세요", Icons.map_outlined),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "주소를 입력해 주세요" : null,
                        ),
                        SizedBox(height: 20),

                        // 허가증 번호
                        Text("개발행위 / 토사 반입 허가증 번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
                        SizedBox(height: 8),
                        TextFormField(
                          controller: _permitController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                          decoration: _buildInputDecoration("관할 지자체 발행 허가증 번호", Icons.verified_user_outlined),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "허가증 번호를 입력해 주세요" : null,
                        ),

                        // 에러 표시 창
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

              // 가입 완료 버튼
              ElevatedButton(
                onPressed: _isLoading ? null : _submitDropOffRegister,
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
                        "하차지 지주 가입 완료",
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
