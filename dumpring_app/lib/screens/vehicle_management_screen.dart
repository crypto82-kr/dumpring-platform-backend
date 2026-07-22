import 'package:flutter/material.dart';
import 'dart:typed_data';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../shared/widgets/layouts/dr_scaffold.dart';

class VehicleManagementScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final bool isReadOnly;

  const VehicleManagementScreen({
    super.key,
    required this.user,
    required this.token,
    this.isReadOnly = false,
  });

  @override
  State<VehicleManagementScreen> createState() => _VehicleManagementScreenState();
}

class _VehicleManagementScreenState extends State<VehicleManagementScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  final _formKey = GlobalKey<FormState>();
  late TextEditingController _vehicleNumController;
  late TextEditingController _tonnageController;
  late TextEditingController _carModelController;
  late TextEditingController _inspectionDateController;

  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;
  
  // 서류 파일 상태 변수 및 미리보기 데이터
  String? _machineryRegFile;
  String? _bizLicenseFile;
  String? _insuranceFile;

  String? _machineryRegUrl;
  String? _bizLicenseUrl;
  String? _insuranceUrl;

  List<int>? _machineryRegBytes;
  List<int>? _bizLicenseBytes;
  List<int>? _insuranceBytes;

  bool _isUploadingRegFile = false;
  bool _isUploadingBizFile = false;
  bool _isUploadingInsuranceFile = false;

  String _approvalStatus = "APPROVED"; // APPROVED, PENDING, REJECTED

  @override
  void initState() {
    super.initState();
    _vehicleNumController = TextEditingController(text: widget.user['vehicle_number'] ?? widget.user['car_number'] ?? '');
    _tonnageController = TextEditingController(text: (widget.user['tonnage'] ?? widget.user['vehicle_capacity'] ?? '').toString());
    _carModelController = TextEditingController(text: widget.user['car_model'] ?? '');
    _inspectionDateController = TextEditingController(text: widget.user['inspection_date'] ?? '2026-12-31');
    _machineryRegFile = widget.user['machinery_reg_file'];
    _bizLicenseFile = widget.user['biz_license_file'];
    _insuranceFile = widget.user['insurance_file'];
    _loadStoredDocuments();
    _fetchVehicleInfo();
  }

  Future<void> _loadStoredDocuments() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final carKey = _vehicleNumController.text.trim();
      if (carKey.isNotEmpty) {
        setState(() {
          _machineryRegFile ??= prefs.getString("doc_reg_$carKey");
          _bizLicenseFile ??= prefs.getString("doc_biz_$carKey");
          _insuranceFile ??= prefs.getString("doc_ins_$carKey");

          final regB64 = prefs.getString("doc_reg_b64_$carKey");
          if (regB64 != null) _machineryRegBytes = base64Decode(regB64);

          final bizB64 = prefs.getString("doc_biz_b64_$carKey");
          if (bizB64 != null) _bizLicenseBytes = base64Decode(bizB64);

          final insB64 = prefs.getString("doc_ins_b64_$carKey");
          if (insB64 != null) _insuranceBytes = base64Decode(insB64);
        });
      }
    } catch (e) {
      debugPrint("SharedPreferences 불러오기 예외: $e");
    }
  }

  @override
  void dispose() {
    _vehicleNumController.dispose();
    _tonnageController.dispose();
    _carModelController.dispose();
    _inspectionDateController.dispose();
    super.dispose();
  }

  Future<void> _fetchVehicleInfo() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/auth/profile"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        final user = data['user'] ?? data;
        setState(() {
          if (_vehicleNumController.text.isEmpty) {
            _vehicleNumController.text = user['vehicle_number'] ?? user['car_number'] ?? '';
          }
          if (_tonnageController.text.isEmpty) {
            _tonnageController.text = (user['tonnage'] ?? user['vehicle_capacity'] ?? '').toString();
          }
          if (_carModelController.text.isEmpty) {
            _carModelController.text = user['car_model'] ?? '';
          }
          _machineryRegFile ??= user['machinery_reg_file'];
          _bizLicenseFile ??= user['biz_license_file'];
          _insuranceFile ??= user['insurance_file'];
        });
      }
    } catch (e) {
      debugPrint("차량 정보 로딩 오류: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveVehicleInfo() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final double parsedTonnage = double.tryParse(_tonnageController.text.trim()) ?? 25.0;

      // 1. 차주 보유 차량 DB 추가/업데이트 API 호출
      final carResponse = await http.post(
        Uri.parse("$_baseUrl/api/fleet/my-cars"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer ${widget.token}",
        },
        body: jsonEncode({
          "car_number": _vehicleNumController.text.trim(),
          "tonnage": parsedTonnage,
          "car_model": _carModelController.text.trim(),
          "machinery_reg_file": _machineryRegFile,
        }),
      );

      // 2. 프로필 정보 업데이트
      await http.put(
        Uri.parse("$_baseUrl/api/auth/profile"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer ${widget.token}",
        },
        body: jsonEncode({
          "vehicle_number": _vehicleNumController.text.trim(),
          "tonnage": _tonnageController.text.trim(),
          "car_model": _carModelController.text.trim(),
          "machinery_reg_file": _machineryRegFile,
        }),
      );

      // 3. 앱 내 비동기 로컬 저장소에 차량별 서류 파일명 및 이미지 바이트 영구 저장
      try {
        final prefs = await SharedPreferences.getInstance();
        final carKey = _vehicleNumController.text.trim();
        if (_machineryRegFile != null) await prefs.setString("doc_reg_$carKey", _machineryRegFile!);
        if (_bizLicenseFile != null) await prefs.setString("doc_biz_$carKey", _bizLicenseFile!);
        if (_insuranceFile != null) await prefs.setString("doc_ins_$carKey", _insuranceFile!);

        if (_machineryRegBytes != null) await prefs.setString("doc_reg_b64_$carKey", base64Encode(_machineryRegBytes!));
        if (_bizLicenseBytes != null) await prefs.setString("doc_biz_b64_$carKey", base64Encode(_bizLicenseBytes!));
        if (_insuranceBytes != null) await prefs.setString("doc_ins_b64_$carKey", base64Encode(_insuranceBytes!));
      } catch (e) {
        debugPrint("SharedPreferences 저장 예외: $e");
      }

      if (carResponse.statusCode == 200 || carResponse.statusCode == 201) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("🚚 신규 보유 차량 및 서류 등록이 완료되었습니다."),
            backgroundColor: Color(0xFF004D5A),
          ),
        );
        Navigator.pop(context, true);
      } else {
        final decoded = jsonDecode(utf8.decode(carResponse.bodyBytes));
        setState(() {
          _errorMessage = decoded['detail'] ?? "차량 저장에 실패했습니다.";
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "서버 통신 오류가 발생했습니다. 네트워크를 확인해 주세요.";
      });
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _uploadDocument(String docType) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (image == null) return;

      setState(() {
        if (docType == 'REG') _isUploadingRegFile = true;
        if (docType == 'BIZ') _isUploadingBizFile = true;
        if (docType == 'INS') _isUploadingInsuranceFile = true;
      });

      // 백엔드 파일 업로드 API multipart 요청 전송
      final request = http.MultipartRequest(
        'POST',
        Uri.parse("$_baseUrl/api/files/upload"),
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
        final String realOriginalName = image.name;

        setState(() {
          if (docType == 'REG') {
            _machineryRegFile = realOriginalName;
            _machineryRegUrl = uploadedUrl;
            _machineryRegBytes = bytes;
          } else if (docType == 'BIZ') {
            _bizLicenseFile = realOriginalName;
            _bizLicenseUrl = uploadedUrl;
            _bizLicenseBytes = bytes;
          } else if (docType == 'INS') {
            _insuranceFile = realOriginalName;
            _insuranceUrl = uploadedUrl;
            _insuranceBytes = bytes;
          }
        });

        if (mounted) {
          final label = docType == 'REG' ? '건설기계 등록증' : docType == 'BIZ' ? '사업자등록증' : '영업용 자동차 보험증';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("📄 $label 서류가 성공적으로 업로드되었습니다.")),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("⚠️ 서류 파일 업로드에 실패했습니다.")),
          );
        }
      }
    } catch (e) {
      debugPrint("서류 파일 업로드 예외: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingRegFile = false;
          _isUploadingBizFile = false;
          _isUploadingInsuranceFile = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.isReadOnly ? "배정 차량 정보 조회" : "등록 차량 및 서류 관리",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 차량 승인 상태 카드
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF16A34A).withOpacity(0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.verified, color: Color(0xFF15803D), size: 24),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text(
                                    "정상 등록 승인 차량",
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF166534)),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    "운송 배차 신청 및 정산 등록이 활성화되어 있습니다.",
                                    style: TextStyle(fontSize: 12, color: Color(0xFF15803D)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // 차량 상세 입력 카드
                      Card(
                        color: AppColors.surface,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: AppColors.divider),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.directions_car, color: AppColors.primary, size: 20),
                                  const SizedBox(width: 8),
                                  Text(
                                    "차량 정보 입력",
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),

                              Text("차량 번호", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _vehicleNumController,
                                enabled: !widget.isReadOnly,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                decoration: InputDecoration(
                                  hintText: "예: 88덤 1234",
                                  filled: true,
                                  fillColor: AppColors.background,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                ),
                                validator: (val) => (val == null || val.trim().isEmpty) ? "차량 번호를 입력해 주세요." : null,
                              ),
                              const SizedBox(height: 16),

                              Text("차종 / 모델", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _carModelController,
                                enabled: !widget.isReadOnly,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                decoration: InputDecoration(
                                  hintText: "예: 현대 덤프트럭 25톤",
                                  filled: true,
                                  fillColor: AppColors.background,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                ),
                              ),
                              const SizedBox(height: 16),

                              Text("적재 톤수 (톤)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _tonnageController,
                                enabled: !widget.isReadOnly,
                                keyboardType: TextInputType.number,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                decoration: InputDecoration(
                                  hintText: "예: 25",
                                  suffixText: "톤",
                                  filled: true,
                                  fillColor: AppColors.background,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                ),
                                validator: (val) => (val == null || val.trim().isEmpty) ? "톤수를 입력해 주세요." : null,
                              ),
                              const SizedBox(height: 16),

                              Text("정기 안전점검 / 검사 만료예정일", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _inspectionDateController,
                                enabled: !widget.isReadOnly,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                decoration: InputDecoration(
                                  hintText: "예: 2026-12-31",
                                  suffixIcon: const Icon(Icons.calendar_today, size: 18),
                                  filled: true,
                                  fillColor: AppColors.background,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // 필수 제출 서류 섹션
                      Card(
                        color: AppColors.surface,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: AppColors.divider),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.folder_open, color: AppColors.primary, size: 20),
                                  const SizedBox(width: 8),
                                  Text(
                                    "차량 구비 서류 (필수 3종)",
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "건설기계 등록증, 사업자등록증, 영업용 자동차 보험증을 등록해 주세요.",
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                              const Divider(height: 24),
                              // 1. 건설기계 등록증/검사증
                              _buildDocRow(
                                title: "1. 건설기계 등록증 / 검사증",
                                file: _machineryRegFile,
                                fileUrl: _machineryRegUrl,
                                fileBytes: _machineryRegBytes,
                                isUploading: _isUploadingRegFile,
                                onUpload: () => _uploadDocument('REG'),
                              ),
                              const SizedBox(height: 12),

                              // 2. 사업자등록증
                              _buildDocRow(
                                title: "2. 사업자등록증 (운송사/차주)",
                                file: _bizLicenseFile,
                                fileUrl: _bizLicenseUrl,
                                fileBytes: _bizLicenseBytes,
                                isUploading: _isUploadingBizFile,
                                onUpload: () => _uploadDocument('BIZ'),
                              ),
                              const SizedBox(height: 12),

                              // 3. 영업용 자동차 보험증
                              _buildDocRow(
                                title: "3. 영업용 자동차 보험가입증서",
                                file: _insuranceFile,
                                fileUrl: _insuranceUrl,
                                fileBytes: _insuranceBytes,
                                isUploading: _isUploadingInsuranceFile,
                                onUpload: () => _uploadDocument('INS'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      if (!widget.isReadOnly) ...[
                        if (_errorMessage != null) ...[
                          Text(
                            _errorMessage!,
                            style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                        ],

                        ElevatedButton(
                          onPressed: _isSaving ? null : _saveVehicleInfo,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Theme.of(context).colorScheme.primary,
                            foregroundColor: AppColors.background,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          child: _isSaving
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text("차량 정보 저장하기", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildDocRow({
    required String title,
    required String? file,
    String? fileUrl,
    List<int>? fileBytes,
    required bool isUploading,
    required VoidCallback onUpload,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Icon(Icons.description, color: AppColors.primary, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 2),
                InkWell(
                  onTap: file != null ? () => _previewDocument(title, file, fileUrl, fileBytes) : null,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          file ?? "등록된 파일 없음",
                          style: TextStyle(
                            fontSize: 12,
                            color: file != null ? Colors.blue[700] : AppColors.textTertiary,
                            decoration: file != null ? TextDecoration.underline : TextDecoration.none,
                            fontWeight: file != null ? FontWeight.w600 : FontWeight.normal,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (file != null) ...[
                        const SizedBox(width: 4),
                        Icon(Icons.open_in_new, size: 14, color: Colors.blue[700]),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (!widget.isReadOnly)
            TextButton.icon(
              onPressed: isUploading ? null : onUpload,
              icon: isUploading
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.upload_file, size: 16),
              label: Text(file != null ? "재업로드" : "첨부하기"),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                visualDensity: VisualDensity.compact,
              ),
            ),
        ],
      ),
    );
  }

  void _previewDocument(String docTitle, String fileName, String? fileUrl, List<int>? fileBytes) {
    final String fullImageUrl = fileUrl != null
        ? "$_baseUrl$fileUrl"
        : "$_baseUrl/static/uploads/documents/$fileName";

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.verified_user, color: Color(0xFF004D5A)),
            const SizedBox(width: 8),
            Expanded(child: Text(docTitle, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold))),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.insert_drive_file, color: Color(0xFF004D5A), size: 28),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fileName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          const Text("서버 검수 완료 원본 이미지", style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 실제 올린 서류 사진 / 이미지 뷰어
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxHeight: 280),
                  color: Colors.black12,
                  child: fileBytes != null
                      ? Image.memory(
                          Uint8List.fromList(fileBytes),
                          fit: BoxFit.contain,
                        )
                      : Image.network(
                          fullImageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24.0),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.description, size: 48, color: Color(0xFF004D5A)),
                                    SizedBox(height: 8),
                                    Text("공식 검수 원본 문서", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    SizedBox(height: 4),
                                    Text("덤프링 안전검수팀 보관용 문서입니다.", style: TextStyle(fontSize: 12, color: Colors.grey)),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                "📌 해당 서류는 덤프링 안전검수팀 및 현장 관리자가 원본 서류 확인 시 참조하는 공식 등록 문서입니다.",
                style: TextStyle(fontSize: 12, color: Color(0xFF4B5563), height: 1.4),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("닫기"),
          ),
        ],
      ),
    );
  }
}
