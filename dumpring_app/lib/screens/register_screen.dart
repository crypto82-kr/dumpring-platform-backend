import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import '../shared/widgets/layouts/dr_scaffold.dart'; // AppColors, AppTextStyles 패키지 임포트
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'dart:convert';

class RegisterScreen extends StatefulWidget {
  final bool initialIsDriver;
  const RegisterScreen({Key? key, this.initialIsDriver = true}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  String get _baseUrl => AppConfig.baseUrl;

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
  String? _errorMessage; // 화면 에러 메시지

  // 업로드된 파일명 보관 변수 (MOCK 업로드용)
  String? _licenseFile; // 운전면허증
  String? _safetyTrainingFile; // 건설업 기초안전교육 이수증
  String? _specialLaborTrainingFile; // 교육실시확인서 (특수형태근로자)

  String? _bizLicenseFile; // 사업자등록증
  String? _machineryRegFile; // 건설기계 등록증·검사증
  String? _insuranceFile; // 보험가입증

  // 각 문서별 업로드 진행률 모사 상태
  final Map<String, bool> _uploadingStates = {};

  @override
  void initState() {
    super.initState();
    _isDriverRole = widget.initialIsDriver;
    
    // 입력 상태 변화에 따라 가입 완료 버튼 활성화 상태를 반응형으로 갱신하기 위한 리스너 등록
    _nameController.addListener(() => setState(() {}));
    _phoneController.addListener(() => setState(() {}));
    _passwordController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // 필수 항목 및 서류들이 누락 없이 채워졌는지 유효성 검사
  bool get _isFormValid {
    if (_nameController.text.trim().isEmpty ||
        _phoneController.text.trim().length < 10 ||
        _passwordController.text.length < 4) {
      return false;
    }
    if (_isDriverRole) {
      return _licenseFile != null &&
          _safetyTrainingFile != null &&
          _specialLaborTrainingFile != null;
    } else {
      bool ownerFilesOk = _bizLicenseFile != null &&
          _machineryRegFile != null &&
          _insuranceFile != null;
      if (_isDirectDriver) {
        return ownerFilesOk &&
            _licenseFile != null &&
            _safetyTrainingFile != null &&
            _specialLaborTrainingFile != null;
      }
      return ownerFilesOk;
    }
  }

  Future<void> _pickAndUploadDocument(String docCode) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (image == null) return;

      setState(() {
        _uploadingStates[docCode] = true;
      });

      // 백엔드 파일 업로드 API multipart 요청 전송
      final request = http.MultipartRequest(
        'POST',
        Uri.parse("${AppConfig.baseUrl}/api/files/upload"),
      );

      final bytes = await image.readAsBytes();
      final multipartFile = http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: image.name,
        contentType: MediaType('image', 'jpeg'),
      );

      request.files.add(multipartFile);
      request.fields['category'] = 'documents';

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final String uploadedUrl = decoded['url'] as String;

        setState(() {
          switch (docCode) {
            case "LICENSE":
              _licenseFile = uploadedUrl;
              break;
            case "SAFETY_TRAINING":
              _safetyTrainingFile = uploadedUrl;
              break;
            case "SPECIAL_LABOR_TRAINING":
              _specialLaborTrainingFile = uploadedUrl;
              break;
            case "BIZ_LICENSE":
              _bizLicenseFile = uploadedUrl;
              break;
            case "MACHINERY_REG":
              _machineryRegFile = uploadedUrl;
              break;
            case "INSURANCE":
              _insuranceFile = uploadedUrl;
              break;
          }
        });
      }
    } catch (e) {
      debugPrint("서류 업로드 예외: $e");
    } finally {
      setState(() {
        _uploadingStates[docCode] = false;
      });
    }
  }

  // 업로드한 서류 삭제 처리
  void _deleteDocument(String docCode) {
    setState(() {
      switch (docCode) {
        case "LICENSE":
          _licenseFile = null;
          break;
        case "SAFETY_TRAINING":
          _safetyTrainingFile = null;
          break;
        case "SPECIAL_LABOR_TRAINING":
          _specialLaborTrainingFile = null;
          break;
        case "BIZ_LICENSE":
          _bizLicenseFile = null;
          break;
        case "MACHINERY_REG":
          _machineryRegFile = null;
          break;
        case "INSURANCE":
          _insuranceFile = null;
          break;
      }
    });
  }

  // 회원가입 API 전송
  Future<void> _submitRegister() async {
    if (!_formKey.currentState!.validate() || !_isFormValid) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final String endpoint = _isDriverRole 
        ? "$_baseUrl/api/auth/register-driver" 
        : "$_baseUrl/api/auth/register-owner";

    final Map<String, dynamic> requestData = {
      "phone_number": _phoneController.text.trim(),
      "password": _passwordController.text,
      "name": _nameController.text.trim(),
      "ci": "MOCK_MOBILE_CI_KEY_${_phoneController.text.trim()}"
    };

    if (_isDriverRole) {
      requestData["license_file"] = _licenseFile;
      requestData["safety_training_file"] = _safetyTrainingFile;
      requestData["special_labor_training_file"] = _specialLaborTrainingFile;
    } else {
      requestData["biz_license_file"] = _bizLicenseFile;
      requestData["machinery_reg_file"] = _machineryRegFile;
      requestData["insurance_file"] = _insuranceFile;
      requestData["is_direct_driver"] = _isDirectDriver;
      if (_isDirectDriver) {
        requestData["license_file"] = _licenseFile;
        requestData["safety_training_file"] = _safetyTrainingFile;
        requestData["special_labor_training_file"] = _specialLaborTrainingFile;
      }
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
          _errorMessage = "이미 가입된 휴대폰 번호입니다. 로그인해 주세요.";
        });
        _showErrorDialog("이미 가입된 휴대폰 번호입니다. 로그인해 주세요.");
      } else {
        final detailMsg = decodedResponse["detail"] ?? "가입 처리 도중 에러가 발생했습니다.";
        setState(() {
          _errorMessage = detailMsg.toString();
        });
        _showErrorDialog(detailMsg.toString());
      }
    } catch (e) {
      setState(() {
        _errorMessage = "서버 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.";
      });
      _showErrorDialog("서버와 통신할 수 없습니다.\n베이스 URL 주소: $endpoint");
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
          _isDriverRole 
              ? "덤프 기사님 회원가입이 완료되었습니다!\n제출하신 필수서류(3종)는 관리자 확인 후 승인 처리됩니다." 
              : "차주 사장님 회원가입이 완료되었습니다!\n제출하신 필수서류는 본사 검증을 거치게 되며, 소속 기사 및 차량을 미리 등록하실 수 있습니다.",
          style: AppTextStyles.body1,
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // 팝업 닫기
              Navigator.of(context).pop(); // 가입창 닫기
            },
            child: Text("확인", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.danger, size: 28),
            const SizedBox(width: 8),
            Text("오류 발생", style: AppTextStyles.h2),
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

  // 필수 서류 업로드 컴포넌트 뷰 헬퍼
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
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        elevation: 0.5,
        title: Text(
          "덤프링 회원가입",
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
              // 사용자 유형 선택 세그먼트
              Container(
                decoration: BoxDecoration(
                  color: themeIsDark ? Colors.grey[900] : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    // 기사 가입 탭
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _isDriverRole = true;
                          _errorMessage = null;
                        }),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isDriverRole ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "기사로 가입",
                            style: AppTextStyles.h3.copyWith(
                              color: _isDriverRole 
                                  ? (ThemeData.estimateBrightnessForColor(AppColors.primary) == Brightness.dark ? Colors.white : Colors.black) 
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    // 차주 가입 탭
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _isDriverRole = false;
                          _errorMessage = null;
                        }),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !_isDriverRole ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          alignment: Alignment.center,
                          child: Text(
                            "차주로 가입",
                            style: AppTextStyles.h3.copyWith(
                              color: !_isDriverRole 
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

              // 입력 폼 카드
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
                        // 성명 입력칸
                        Text("성명 (실명)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _nameController,
                          keyboardType: TextInputType.name,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: "실명을 입력해 주세요",
                            hintStyle: TextStyle(color: AppColors.textTertiary),
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                            prefixIcon: Icon(Icons.person_outline, color: AppColors.textSecondary),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.divider, width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.divider, width: 1),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.primary, width: 1.5),
                            ),
                          ),
                          validator: (value) => (value == null || value.trim().isEmpty) ? "성명을 입력해 주세요" : null,
                        ),
                        const SizedBox(height: 20),

                        // 휴대폰 번호 입력칸
                        Text("휴대폰 번호 (로그인 ID)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: "- 없이 숫자만 입력해 주세요",
                            hintStyle: TextStyle(color: AppColors.textTertiary),
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                            prefixIcon: Icon(Icons.phone_android_outlined, color: AppColors.textSecondary),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.divider, width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.divider, width: 1),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.primary, width: 1.5),
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
                        const SizedBox(height: 20),

                        // 비밀번호 입력칸
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
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.divider, width: 1),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.divider, width: 1),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.primary, width: 1.5),
                            ),
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

                        // 중복 가입 에러 경고문
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

                        // 차주일 때 '직접 운행 여부' 필드
                        if (!_isDriverRole) ...[
                          const SizedBox(height: 12),
                          Divider(color: AppColors.divider, height: 24),
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              "차주 본인이 직접 덤프 운행 (기사 겸직)",
                              style: AppTextStyles.h3.copyWith(fontSize: 14),
                            ),
                            subtitle: Text(
                              "체크 시 기사(Driver) 서류도 함께 첨부해야 합니다.",
                              style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                            ),
                            value: _isDirectDriver,
                            activeColor: AppColors.primary,
                            onChanged: (val) => setState(() => _isDirectDriver = val),
                          ),
                        ],

                        // ----------------------------------------
                        // 필수 제출 서류 업로드 섹션
                        // ----------------------------------------
                        const SizedBox(height: 16),
                        Divider(color: AppColors.divider, height: 24),
                        Text(
                          "필수 서류 첨부",
                          style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                        ),
                        const SizedBox(height: 12),

                        // 역할에 따른 필수 서류 분기 노출
                        if (_isDriverRole || _isDirectDriver) ...[
                          _buildDocUploadTile(
                            title: "운전면허증 (대형/1종)",
                            docCode: "LICENSE",
                            currentFileName: _licenseFile,
                          ),
                          _buildDocUploadTile(
                            title: "건설업 기초안전교육 이수증",
                            docCode: "SAFETY_TRAINING",
                            currentFileName: _safetyTrainingFile,
                          ),
                          _buildDocUploadTile(
                            title: "교육실시확인서 (특수형태근로자)",
                            docCode: "SPECIAL_LABOR_TRAINING",
                            currentFileName: _specialLaborTrainingFile,
                          ),
                        ],
                        if (!_isDriverRole) ...[
                          _buildDocUploadTile(
                            title: "사업자등록증",
                            docCode: "BIZ_LICENSE",
                            currentFileName: _bizLicenseFile,
                          ),
                          _buildDocUploadTile(
                            title: "건설기계 등록증·검사증",
                            docCode: "MACHINERY_REG",
                            currentFileName: _machineryRegFile,
                          ),
                          _buildDocUploadTile(
                            title: "보험가입증",
                            docCode: "INSURANCE",
                            currentFileName: _insuranceFile,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // 가입 완료 버튼
              ElevatedButton(
                onPressed: (_isLoading || !_isFormValid) ? null : _submitRegister,
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
                        child: CircularProgressIndicator(
                          color: themeIsDark ? Colors.white : Colors.black,
                          strokeWidth: 2.5,
                        ),
                      )
                    : Text(
                        _isDriverRole ? "기사로 가입 완료" : "차주로 가입 완료",
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
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
