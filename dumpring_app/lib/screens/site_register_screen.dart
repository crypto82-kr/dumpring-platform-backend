import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import '../shared/widgets/layouts/dr_scaffold.dart'; // AppColors, AppTextStyles 패키지 임포트
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'portone_identity_screen.dart';

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
  bool _isVerifying = false;
  bool _isVerified = false;
  String? _ci;
  String? _errorMessage;

  // 필수 서류 파일 보관 변수 (현장관리자용)
  String? _dustReportFile; // 비산먼지 배출신고서
  String? _constructionContractFile; // 공사 계약서

  // 서류별 업로드 중 상태 관리
  final Map<String, bool> _uploadingStates = {};

  @override
  void initState() {
    super.initState();
    // 입력에 맞춰 완료 버튼 활성화를 갱신하기 위한 리스너 등록
    _nameController.addListener(() => setState(() {}));
    _phoneController.addListener(() => setState(() {}));
    _passwordController.addListener(() => setState(() {}));
    _companyController.addListener(() => setState(() {}));
    _siteController.addListener(() => setState(() {}));
    _businessNumController.addListener(() => setState(() {}));
  }

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

  // 폼 및 필수서류 완비 여부 검증
  bool get _isFormValid {
    if (!_isVerified || _ci == null) return false;
    if (_nameController.text.trim().isEmpty ||
        _phoneController.text.trim().length < 10 ||
        _passwordController.text.length < 4 ||
        _companyController.text.trim().isEmpty ||
        _siteController.text.trim().isEmpty ||
        _businessNumController.text.trim().length < 10) {
      return false;
    }
    // 현장 관리자의 경우 필수 서류 2종 첨부가 완료되어야 함
    if (_isManagerRole) {
      return _dustReportFile != null && _constructionContractFile != null;
    }
    return true; // 담당자는 추가서류 요구하지 않음
  }

  // 포트원 본인확인 (문자/PASS) 실행
  Future<void> _startPortOneVerification({String? channelKey, String? title, bool isDanal = true}) async {
    setState(() {
      _errorMessage = null;
    });

    String effectiveStoreId = AppConfig.portoneStoreId;
    String effectiveChannelKey = channelKey ?? (isDanal ? AppConfig.portoneDanalChannelKey : AppConfig.portonePassChannelKey);

    // Render 서버에서 최신 채널키(PORTONE_CHANNEL_KEY2 등) 실시간 동기화 조회
    try {
      final cfgRes = await http.get(Uri.parse("$_baseUrl/api/auth/portone/config")).timeout(const Duration(seconds: 4));
      if (cfgRes.statusCode == 200) {
        final cfg = jsonDecode(utf8.decode(cfgRes.bodyBytes));
        if (cfg["store_id"] != null && cfg["store_id"].toString().isNotEmpty) {
          effectiveStoreId = cfg["store_id"].toString();
        }
        if (isDanal) {
          final sKey = cfg["danal_channel_key"] ?? cfg["channel_key"];
          if (sKey != null && sKey.toString().isNotEmpty) {
            effectiveChannelKey = sKey.toString();
          }
        } else {
          final pKey = cfg["pass_channel_key"];
          if (pKey != null && pKey.toString().isNotEmpty) {
            effectiveChannelKey = pKey.toString();
          }
        }
      }
    } catch (e) {
      debugPrint("포트원 설정 실시간 조회 예외, 로컬 기본값 사용: $e");
    }

    final String? verificationId = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) => PortoneIdentityScreen(
          storeId: effectiveStoreId,
          channelKey: effectiveChannelKey,
          title: title ?? "휴대폰 본인확인",
        ),
      ),
    );

    if (verificationId == null) {
      return; // 사용자가 취소함
    }

    setState(() {
      _isVerifying = true;
    });

    try {
      final verifyRes = await http.post(
        Uri.parse("$_baseUrl/api/auth/portone/verify-identity"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"identity_verification_id": verificationId}),
      );

      final verifyData = jsonDecode(utf8.decode(verifyRes.bodyBytes));

      if (verifyRes.statusCode == 200 && verifyData["verified"] == true) {
        setState(() {
          _ci = verifyData["ci"];
          if (verifyData["name"] != null && verifyData["name"].toString().isNotEmpty) {
            _nameController.text = verifyData["name"];
          }
          if (verifyData["phone_number"] != null && verifyData["phone_number"].toString().isNotEmpty) {
            _phoneController.text = verifyData["phone_number"];
          }
          _isVerified = true;
          _errorMessage = null;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("본인확인이 완료되었습니다. (성명/휴대폰번호 자동 반영)"),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else if (verifyData["error_code"] == "ALREADY_REGISTERED") {
        _showErrorDialog(verifyData["message"] ?? "이미 가입된 본인인증 정보입니다. 로그인해 주세요.");
      } else {
        final msg = verifyData["detail"] ?? verifyData["message"] ?? "본인확인 검증에 실패했습니다.";
        _showErrorDialog(msg.toString());
      }
    } catch (e) {
      _showErrorDialog("인증 서버와 통신할 수 없습니다: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  // 가상의 프리미엄 서류 파일 업로드 시뮬레이션
  Future<void> _simulateUpload(String docCode) async {
    setState(() {
      _uploadingStates[docCode] = true;
    });

    await Future.delayed(const Duration(milliseconds: 800));

    setState(() {
      _uploadingStates[docCode] = false;
      final mockFileName = "MOCK_${docCode}_${DateTime.now().millisecondsSinceEpoch % 100000}.pdf";
      
      switch (docCode) {
        case "DUST_REPORT":
          _dustReportFile = mockFileName;
          break;
        case "CONSTRUCTION_CONTRACT":
          _constructionContractFile = mockFileName;
          break;
      }
    });
  }

  // 서류 삭제
  void _deleteDocument(String docCode) {
    setState(() {
      switch (docCode) {
        case "DUST_REPORT":
          _dustReportFile = null;
          break;
        case "CONSTRUCTION_CONTRACT":
          _constructionContractFile = null;
          break;
      }
    });
  }

  Future<void> _submitSiteRegister() async {
    if (!_formKey.currentState!.validate() || !_isFormValid) return;

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
      "ci": _ci,
      "company_name": _companyController.text.trim(),
      "site_name": _siteController.text.trim(),
      "business_number": _businessNumController.text.trim(),
    };

    // 현장관리자의 경우 서류 첨부 데이터 추가
    if (_isManagerRole) {
      requestData["dust_report_file"] = _dustReportFile;
      requestData["construction_contract_file"] = _constructionContractFile;
    }

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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: AppColors.success, size: 28),
            const SizedBox(width: 8),
            Text("회원가입 완료", style: AppTextStyles.h2),
          ],
        ),
        content: Text(
          _isManagerRole
              ? "공사현장 마스터 관리자 회원가입이 완료되었습니다!\n제출하신 서류(2종) 검토 후 최종 승인 처리됩니다."
              : "공사현장 실무 담당자 회원가입이 완료되었습니다!\n(소장님이 선등록해 둔 직원인 경우 자동 현장 연동 완료)"
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 팝업 닫기
              Navigator.of(context).pop(); // 역할 선택창 닫고 로그인창 복귀
            },
            child: Text("확인", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.danger, size: 28),
            const SizedBox(width: 8),
            Text("가입 실패", style: AppTextStyles.h2),
          ],
        ),
        content: Text(message, style: AppTextStyles.body1),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("닫기", style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  // 필수 서류 파일 업로드 뷰 헬퍼
  Widget _buildDocUploadTile({
    required String title,
    required String docCode,
    required String? currentFileName,
  }) {
    final bool isUploading = _uploadingStates[docCode] ?? false;
    final bool isUploaded = currentFileName != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUploaded ? AppColors.success.withOpacity(0.5) : AppColors.divider,
          width: isUploaded ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.h3.copyWith(fontSize: 14),
                ),
                const SizedBox(height: 4),
                if (isUploading)
                  Text("업로드 중...", style: AppTextStyles.caption.copyWith(color: AppColors.primary))
                else if (isUploaded)
                  Text(
                    currentFileName,
                    style: AppTextStyles.caption.copyWith(color: AppColors.success, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  )
                else
                  Text(
                    "서류 파일을 첨부해 주세요 (필수)",
                    style: AppTextStyles.caption.copyWith(color: AppColors.textTertiary),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          if (isUploading)
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.success),
            )
          else if (isUploaded)
            Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.danger, size: 20),
                  onPressed: () => _deleteDocument(docCode),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                )
              ],
            )
          else
            ElevatedButton(
              onPressed: () => _simulateUpload(docCode),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.textPrimary,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              child: const Text("파일 첨부", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool themeIsDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        title: Text(
          "공사현장 회원가입",
          style: AppTextStyles.h2,
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
                  color: themeIsDark ? Colors.grey[900] : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _isManagerRole = true;
                          _errorMessage = null;
                        }),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isManagerRole ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "현장관리자",
                            style: AppTextStyles.h3.copyWith(
                              color: _isManagerRole 
                                  ? (ThemeData.estimateBrightnessForColor(AppColors.primary) == Brightness.dark ? Colors.white : Colors.black) 
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _isManagerRole = false;
                          _errorMessage = null;
                        }),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !_isManagerRole ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "현장담당자",
                            style: AppTextStyles.h3.copyWith(
                              color: !_isManagerRole 
                                  ? (ThemeData.estimateBrightnessForColor(AppColors.primary) == Brightness.dark ? Colors.white : Colors.black) 
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // 2. 가입 폼 카드
              Card(
                color: AppColors.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppColors.divider, width: 1),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 포트원 통합 본인인증 안내/상태 카드
                        Container(
                          margin: const EdgeInsets.only(bottom: 24),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _isVerified
                                ? (themeIsDark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5))
                                : (themeIsDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _isVerified ? AppColors.success : AppColors.divider,
                              width: _isVerified ? 1.5 : 1.0,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    _isVerified ? Icons.verified : Icons.security,
                                    color: _isVerified ? AppColors.success : AppColors.primary,
                                    size: 26,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _isVerified ? "휴대폰 본인확인 완료" : "휴대폰 본인확인 필수",
                                          style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                            color: _isVerified ? AppColors.success : AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          _isVerified
                                              ? "실명 및 휴대폰 번호가 인증된 정보로 설정되었습니다."
                                              : "문자(SMS) 인증 또는 PASS 앱으로 인증해 주세요.",
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              if (!_isVerified) ...[
                                ElevatedButton.icon(
                                  onPressed: _isVerifying
                                      ? null
                                      : () => _startPortOneVerification(
                                            channelKey: AppConfig.portoneDanalChannelKey,
                                            title: "휴대폰 본인확인 (문자/PASS)",
                                            isDanal: true,
                                          ),
                                  icon: _isVerifying
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                        )
                                      : const Icon(Icons.sms_outlined, size: 18),
                                  label: Text(
                                    _isVerifying ? "인증 확인 중..." : "휴대폰 본인확인 (문자 SMS / PASS)",
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 13),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    elevation: 0,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                OutlinedButton.icon(
                                  onPressed: _isVerifying
                                      ? null
                                      : () => _startPortOneVerification(
                                            channelKey: AppConfig.portonePassChannelKey,
                                            title: "PASS 간편인증",
                                            isDanal: false,
                                          ),
                                  icon: const Icon(Icons.touch_app_outlined, size: 17),
                                  label: const Text(
                                    "PASS 간편인증 앱으로 바로하기",
                                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.textSecondary,
                                    side: BorderSide(color: AppColors.divider),
                                    padding: const EdgeInsets.symmetric(vertical: 11),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                ),
                              ] else
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      "CI: ${_ci != null ? '${_ci!.substring(0, _ci!.length.clamp(0, 16))}...' : ''}",
                                      style: TextStyle(fontSize: 11, color: AppColors.textTertiary, fontFamily: 'monospace'),
                                    ),
                                    TextButton(
                                      onPressed: () => _startPortOneVerification(
                                        channelKey: AppConfig.portoneDanalChannelKey,
                                        title: "휴대폰 본인확인 (문자/PASS)",
                                        isDanal: true,
                                      ),
                                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(60, 24)),
                                      child: Text("다시 인증하기", style: TextStyle(fontSize: 12, color: AppColors.primary)),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),

                        // 성명
                        Text("성명 (실명)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _nameController,
                          readOnly: _isVerified,
                          keyboardType: TextInputType.name,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: _buildInputDecoration(_isVerified ? "인증된 실명" : "본인인증 완료 시 자동 입력됩니다", Icons.person_outline),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "본인확인을 완료해 주세요" : null,
                        ),
                        const SizedBox(height: 20),

                        // 휴대폰 번호
                        Text("휴대폰 번호 (로그인 ID)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _phoneController,
                          readOnly: _isVerified,
                          keyboardType: TextInputType.phone,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: _buildInputDecoration(_isVerified ? "인증된 휴대폰 번호" : "본인인증 완료 시 자동 입력됩니다", Icons.phone_android_outlined),
                          validator: (value) => (value == null || value.trim().length < 10) ? "올바른 휴대폰 번호를 입력해 주세요" : null,
                        ),
                        const SizedBox(height: 20),

                        // 비밀번호
                        Text("비밀번호", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: "4자리 이상 입력해 주세요",
                            hintStyle: TextStyle(color: AppColors.textTertiary),
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                            prefixIcon: Icon(Icons.lock_outline, color: AppColors.textSecondary),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                color: AppColors.textSecondary,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          validator: (value) => (value == null || value.length < 4) ? "비밀번호는 4자리 이상이어야 합니다" : null,
                        ),
                        const SizedBox(height: 20),

                        Divider(color: AppColors.divider, height: 12),
                        const SizedBox(height: 12),

                        // 건설사명 / 상호명
                        Text("건설사 / 상호명", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _companyController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: _buildInputDecoration("상호명을 입력해 주세요 (예: 현대건설)", Icons.business_outlined),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "상호명을 입력해 주세요" : null,
                        ),
                        const SizedBox(height: 20),

                        // 현장명
                        Text("공사 현장명", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _siteController,
                          keyboardType: TextInputType.text,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: _buildInputDecoration("소속 현장명을 입력해 주세요", Icons.construction_outlined),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "현장명을 입력해 주세요" : null,
                        ),
                        const SizedBox(height: 20),

                        // 사업자번호
                        Text("사업자등록번호", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _businessNumController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: _buildInputDecoration("세금계산서 발행용 10자리 입력", Icons.assignment_outlined),
                          validator: (value) => (value == null || value.trim().length < 10) ? "올바른 사업자등록번호를 입력해 주세요" : null,
                        ),

                        // 현장관리자일 때만 동적으로 노출되는 서류 첨부 섹션
                        if (_isManagerRole) ...[
                          const SizedBox(height: 16),
                          Divider(color: AppColors.divider, height: 24),
                          Text(
                            "현장 개설 필수 서류 첨부",
                            style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                          ),
                          const SizedBox(height: 12),
                          _buildDocUploadTile(
                            title: "비산먼지 배출신고서",
                            docCode: "DUST_REPORT",
                            currentFileName: _dustReportFile,
                          ),
                          _buildDocUploadTile(
                            title: "공사 계약서",
                            docCode: "CONSTRUCTION_CONTRACT",
                            currentFileName: _constructionContractFile,
                          ),
                        ],

                        // 에러 텍스트 표시
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.danger.withOpacity(0.3), width: 1),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                                const SizedBox(width: 8),
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
              const SizedBox(height: 24),

              // 3. 완료 대형 버튼
              ElevatedButton(
                onPressed: (_isLoading || !_isFormValid) ? null : _submitSiteRegister,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: themeIsDark ? Colors.white : Colors.black,
                  disabledBackgroundColor: AppColors.divider,
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
                        child: CircularProgressIndicator(color: themeIsDark ? Colors.white : Colors.black, strokeWidth: 2.5),
                      )
                    : Text(
                        _isManagerRole ? "현장관리자 가입 완료" : "현장담당자 가입 완료",
                        style: const TextStyle(
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
      hintStyle: TextStyle(color: AppColors.textTertiary),
      filled: true,
      fillColor: AppColors.background,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      prefixIcon: Icon(icon, color: AppColors.textSecondary),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
    );
  }
}
