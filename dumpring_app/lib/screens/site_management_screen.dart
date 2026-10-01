import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'package:image_picker/image_picker.dart';
import '../shared/widgets/dr_qr_scanner_dialog.dart';

class SiteManagementScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const SiteManagementScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<SiteManagementScreen> createState() => _SiteManagementScreenState();
}

class _SiteManagementScreenState extends State<SiteManagementScreen> {
  String get _baseUrl => AppConfig.baseUrl;
  bool _isLoading = false;
  List<dynamic> _siteMappings = [];

  // 현장 생성/수정용 컨트롤러들
  final _siteFormKey = GlobalKey<FormState>();
  final TextEditingController _siteNameController = TextEditingController();
  final TextEditingController _siteCompanyController = TextEditingController();
  final TextEditingController _siteBizNumController = TextEditingController();
  final TextEditingController _siteAddressController = TextEditingController();
  final TextEditingController _siteLatController = TextEditingController();
  final TextEditingController _siteLngController = TextEditingController();
  final TextEditingController _siteRadiusController = TextEditingController(text: "200.0");

  @override
  void initState() {
    super.initState();
    _fetchMySites();
  }

  @override
  void dispose() {
    _siteNameController.dispose();
    _siteCompanyController.dispose();
    _siteBizNumController.dispose();
    _siteAddressController.dispose();
    _siteLatController.dispose();
    _siteLngController.dispose();
    _siteRadiusController.dispose();
    super.dispose();
  }

  Future<void> _fetchMySites() async {
    setState(() => _isLoading = true);
    final endpoint = "$_baseUrl/api/sites/my-mappings";
    try {
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          _siteMappings = decoded;
        });
      }
    } catch (e) {
      debugPrint("현장 조회 실패: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // 신규 공사 현장 개설 API 호출
  Future<void> _registerConstructionSite() async {
    if (!_siteFormKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final endpoint = "$_baseUrl/api/sites/create-site";
    final double? lat = double.tryParse(_siteLatController.text.trim());
    final double? lng = double.tryParse(_siteLngController.text.trim());
    final double radius = double.tryParse(_siteRadiusController.text.trim()) ?? 200.0;

    final requestData = {
      "site_name": _siteNameController.text.trim(),
      "company_name": _siteCompanyController.text.trim(),
      "business_number": _siteBizNumController.text.trim(),
      "site_address": _siteAddressController.text.trim().isEmpty ? null : _siteAddressController.text.trim(),
      "latitude": lat,
      "longitude": lng,
      "geofencing_radius": radius,
    };

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode(requestData),
      );

      if (response.statusCode == 200) {
        Navigator.of(context).pop(); // 다이얼로그 닫기
        _clearFormControllers();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 공사현장 개설이 완료되었습니다.")),
        );
        _fetchMySites();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "현장 개설에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // 현장 정보 수정 API 호출 (PATCH)
  Future<void> _updateConstructionSite(int siteId) async {
    if (!_siteFormKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final endpoint = "$_baseUrl/api/sites/$siteId";
    final double? lat = double.tryParse(_siteLatController.text.trim());
    final double? lng = double.tryParse(_siteLngController.text.trim());
    final double radius = double.tryParse(_siteRadiusController.text.trim()) ?? 200.0;

    final requestData = {
      "company_name": _siteCompanyController.text.trim(),
      "business_number": _siteBizNumController.text.trim(),
      "site_address": _siteAddressController.text.trim().isEmpty ? null : _siteAddressController.text.trim(),
      "latitude": lat,
      "longitude": lng,
      "geofencing_radius": radius,
    };

    try {
      final response = await http.patch(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode(requestData),
      );

      if (response.statusCode == 200) {
        Navigator.of(context).pop(); // 다이얼로그 닫기
        _clearFormControllers();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 현장 정보가 수정되었습니다.")),
        );
        _fetchMySites();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "현장 정보 수정에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _clearFormControllers() {
    _siteNameController.clear();
    _siteCompanyController.clear();
    _siteBizNumController.clear();
    _siteAddressController.clear();
    _siteLatController.clear();
    _siteLngController.clear();
    _siteRadiusController.text = "200.0";
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.danger, size: 24),
            const SizedBox(width: 8),
            Text("오류 발생", style: AppTextStyles.h3),
          ],
        ),
        content: Text(message, style: AppTextStyles.body1),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("닫기", style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // 현장 등록/수정 다이얼로그 오픈
  void _openSiteDialog({Map<String, dynamic>? existingSite}) {
    final bool isEdit = existingSite != null;

    if (isEdit) {
      _siteNameController.text = existingSite['site_name'] ?? '';
      _siteCompanyController.text = existingSite['company_name'] ?? '';
      _siteBizNumController.text = existingSite['business_number'] ?? '';
      _siteAddressController.text = existingSite['site_address'] ?? '';
      _siteLatController.text = existingSite['latitude']?.toString() ?? '';
      _siteLngController.text = existingSite['longitude']?.toString() ?? '';
      _siteRadiusController.text = existingSite['geofencing_radius']?.toString() ?? '200.0';
    } else {
      _clearFormControllers();
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(isEdit ? Icons.edit_note : Icons.add_business_outlined, color: AppColors.success),
              const SizedBox(width: 8),
              Text(isEdit ? "공사현장 정보 수정" : "새 공사현장 개설", style: AppTextStyles.h3),
            ],
          ),
          content: SingleChildScrollView(
            child: Form(
              key: _siteFormKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!isEdit) ...[
                    Text("공사현장명", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _siteNameController,
                      style: TextStyle(color: AppColors.textPrimary),
                      decoration: _buildInputDecoration("현장 명칭 (예: 강남 아파트 신축공사)"),
                      validator: (value) => value == null || value.trim().isEmpty ? "현장명을 입력해 주세요" : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                  Text("건설사/상호명", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _siteCompanyController,
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: _buildInputDecoration("건설사명 (예: 현대건설)"),
                    validator: (value) => value == null || value.trim().isEmpty ? "건설사명을 입력해 주세요" : null,
                  ),
                  const SizedBox(height: 12),
                  Text("사업자등록번호", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _siteBizNumController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: _buildInputDecoration("숫자 10자리 입력"),
                    validator: (value) => value == null || value.trim().length < 10 ? "올바른 사업자번호를 입력해 주세요" : null,
                  ),
                  const SizedBox(height: 12),
                  Text("현장 지번/도로명 주소", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _siteAddressController,
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: _buildInputDecoration("상세 주소 입력"),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("위도 (Latitude)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _siteLatController,
                              style: TextStyle(color: AppColors.textPrimary),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: _buildInputDecoration("예: 37.56"),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("경도 (Longitude)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _siteLngController,
                              style: TextStyle(color: AppColors.textPrimary),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: _buildInputDecoration("예: 126.97"),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text("지오펜싱 반경 (m)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _siteRadiusController,
                    style: TextStyle(color: AppColors.textPrimary),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: _buildInputDecoration("도착 인식 반경 (기본 200.0)"),
                    validator: (value) => value == null || value.trim().isEmpty ? "반경을 입력해 주세요" : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                _clearFormControllers();
                Navigator.of(context).pop();
              },
              child: Text("취소", style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () {
                if (isEdit) {
                  _updateConstructionSite(existingSite['site_id']);
                } else {
                  _registerConstructionSite();
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: Text(isEdit ? "저장" : "등록", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  // 직원 목록 데이터
  List<dynamic> _employees = [];
  bool _isLoadingEmployees = false;

  Future<void> _fetchEmployees(int siteId, StateSetter setDialogState) async {
    setDialogState(() => _isLoadingEmployees = true);
    final endpoint = "$_baseUrl/api/sites/$siteId/employees";
    try {
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        setDialogState(() {
          _employees = decoded;
        });
      }
    } catch (e) {
      debugPrint("직원 목록 조회 에러: $e");
    } finally {
      setDialogState(() => _isLoadingEmployees = false);
    }
  }

  Future<void> _registerEmployee(int siteId, String phone, String role, StateSetter setDialogState) async {
    if (phone.isEmpty) return;
    setDialogState(() => _isLoadingEmployees = true);
    final endpoint = "$_baseUrl/api/sites/$siteId/employees";
    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "phone_number": phone,
          "employee_role": role,
        }),
      );
      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 현장 직원이 성공적으로 등록되었습니다.")),
        );
        await _fetchEmployees(siteId, setDialogState);
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorMsg(decoded['detail'] ?? "직원 등록에 실패했습니다.");
      }
    } catch (e) {
      debugPrint("직원 등록 에러: $e");
    } finally {
      setDialogState(() => _isLoadingEmployees = false);
    }
  }

  Future<void> _deleteEmployee(int siteId, int employeeId, StateSetter setDialogState) async {
    setDialogState(() => _isLoadingEmployees = true);
    final endpoint = "$_baseUrl/api/sites/$siteId/employees/$employeeId";
    try {
      final response = await http.delete(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("정상적으로 직원이 소속 해제되었습니다.")),
        );
        await _fetchEmployees(siteId, setDialogState);
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorMsg(decoded['detail'] ?? "직원 해제에 실패했습니다.");
      }
    } catch (e) {
      debugPrint("직원 해제 에러: $e");
    } finally {
      setDialogState(() => _isLoadingEmployees = false);
    }
  }

  void _showErrorMsg(String msg) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("오류"),
        content: Text(msg),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("확인"))
        ],
      ),
    );
  }

  void _openEmployeeManagementDialog(int siteId, String siteName) {
    final TextEditingController phoneController = TextEditingController();
    bool hasInitialLoaded = false;
    _employees = [];
    _isLoadingEmployees = true;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            // 다이얼로그 오픈 시 단 1회만 초기 로딩 실행
            if (!hasInitialLoaded) {
              hasInitialLoaded = true;
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _fetchEmployees(siteId, setDialogState);
              });
            }

            return AlertDialog(
              backgroundColor: AppColors.surface,
              insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  const Icon(Icons.people_outline, color: AppColors.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "$siteName 직원 관리",
                      style: AppTextStyles.h3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              content: SizedBox(
                width: MediaQuery.of(context).size.width > 600 ? 500 : MediaQuery.of(context).size.width * 0.95,
                height: 520,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 신규 직원 등록 섹션
                    Card(
                      color: AppColors.background,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: AppColors.divider),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("➕ 신규 직원 선등록", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: phoneController,
                                    keyboardType: TextInputType.phone,
                                    style: TextStyle(color: AppColors.textPrimary, fontSize: 12),
                                    decoration: InputDecoration(
                                      hintText: "휴대폰 번호 입력 (예: 01012345678)",
                                      hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 11),
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: () {
                                    final phone = phoneController.text.trim();
                                    if (phone.isNotEmpty) {
                                      _registerEmployee(siteId, phone, "staff", setDialogState);
                                      phoneController.clear();
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: const Text("등록", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text("👥 소속 직원 목록", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(height: 8),
                    Expanded(
                      child: _isLoadingEmployees
                          ? const Center(child: CircularProgressIndicator(color: AppColors.success))
                          : _employees.isEmpty
                              ? Center(
                                  child: Text("등록된 직원이 없습니다.", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                )
                              : ListView.builder(
                                  itemCount: _employees.length,
                                  itemBuilder: (context, idx) {
                                    final emp = _employees[idx];
                                    final isJoined = emp['status'] == '가입 완료';

                                    return Card(
                                      color: AppColors.background,
                                      margin: const EdgeInsets.only(bottom: 8),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(10),
                                        side: BorderSide(color: AppColors.divider),
                                      ),
                                      child: ListTile(
                                        dense: true,
                                        leading: CircleAvatar(
                                          backgroundColor: AppColors.primaryLight,
                                          radius: 16,
                                          child: Icon(
                                            Icons.person,
                                            color: AppColors.primary,
                                            size: 16,
                                          ),
                                        ),
                                        title: Row(
                                          children: [
                                            Text(
                                              emp['name'] ?? '가입 대기',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: isJoined ? AppColors.textPrimary : AppColors.textTertiary,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: isJoined ? AppColors.success.withOpacity(0.15) : Colors.orange.withOpacity(0.15),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                emp['status'] ?? '대기',
                                                style: TextStyle(
                                                  color: isJoined ? AppColors.success : Colors.orange,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        subtitle: Text(
                                          emp['registered_phone'] ?? emp['phone_number'] ?? '',
                                          style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                        ),
                                        trailing: IconButton(
                                          icon: const Icon(Icons.person_remove, color: AppColors.danger, size: 18),
                                          onPressed: () {
                                            _deleteEmployee(siteId, emp['id'], setDialogState);
                                          },
                                        ),
                                      ),
                                    );
                                  },
                                ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    _employees = [];
                    _isLoadingEmployees = false;
                    phoneController.dispose();
                    Navigator.of(context).pop();
                  },
                  child: Text("닫기", style: TextStyle(color: AppColors.textSecondary)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // 기사가 제시한 상차 확인용 QR 스캔 및 상차 승인 처리
  Future<void> _scanDriverQrForSite(Map<String, dynamic> site) async {
    try {
      final String? scannedPayload = await DrQrScannerDialog.scan(
        context,
        title: "상차 덤프 기사 QR 스캔",
        description: "[${site['site_name'] ?? '현장'}]에 도착하여 상차를 마친 기사의\n스마트폰 화면 [상차 확인 QR]을 스캔합니다.",
      );

      if (scannedPayload != null && scannedPayload.isNotEmpty) {
        // dumpring://ticket/{ticket_id}?type=LOADING 또는 쿼리스트링 파싱
        int? ticketId;
        try {
          final uri = Uri.parse(scannedPayload);
          if (uri.queryParameters.containsKey('id')) {
            ticketId = int.tryParse(uri.queryParameters['id']!);
          } else if (uri.pathSegments.isNotEmpty) {
            ticketId = int.tryParse(uri.pathSegments.last);
          }
          if (ticketId == null) {
            final match = RegExp(r'ticket[s]?/(\d+)').firstMatch(scannedPayload) ??
                RegExp(r'id=(\d+)').firstMatch(scannedPayload) ??
                RegExp(r'(\d+)').firstMatch(scannedPayload);
            if (match != null) {
              ticketId = int.tryParse(match.group(1)!);
            }
          }
        } catch (_) {}

        if (ticketId != null) {
          // 백엔드에서 해당 티켓의 상세 정보(기사명, 차량번호, 목적지, 배차 품목) 조회
          try {
            final ticketRes = await http.get(
              Uri.parse("$_baseUrl/api/dispatch/tickets/$ticketId"),
              headers: {
                "Authorization": "Bearer ${widget.token}",
              },
            );

            if (ticketRes.statusCode == 200) {
              final ticketData = jsonDecode(utf8.decode(ticketRes.bodyBytes));
              if (mounted) {
                _showLoadingInspectionDialog(site, ticketData);
              }
              return;
            }
          } catch (err) {
            debugPrint("티켓 상세 조회 에러: $err");
          }

          // 상세 조회가 안 될 경우 즉시 승인 요청 fallback
          await _executeApproveLoading(ticketId);
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("✅ 기사 QR 인식 성공! ($scannedPayload)"),
                backgroundColor: AppColors.primary,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorMsg("QR 스캔 중 오류 발생: $e");
      }
    }
  }

  // 한글 품목명(공통코드명) 매핑 함수
  String _translateSoilName(String? code) {
    switch (code) {
      case "GOOD_SOIL":
        return "양질토";
      case "MUD_SOIL":
        return "뻘흙";
      case "ROCK":
        return "암버럭";
      case "MIXED":
        return "혼합토";
      case "SAND":
        return "모래";
      case "CLAY":
        return "점토";
      case "GRAVEL":
        return "자갈";
      case "NORMAL_SOIL":
        return "일반토";
      default:
        return code ?? "일반토사";
    }
  }

  // 상차 현장 검수 및 승인 다이얼로그
  void _showLoadingInspectionDialog(Map<String, dynamic> site, Map<String, dynamic> ticket) {
    final int ticketId = ticket['id'] ?? 0;
    final driver = ticket['driver'] ?? {};
    final car = ticket['car'] ?? {};
    final job = ticket['job_post'] ?? {};

    final String driverName = driver['name'] ?? "기사";
    final String driverPhone = driver['phone_number'] ?? "";
    final String carNumber = car['car_number'] ?? "차량미배정";
    final dynamic tonnageVal = car['tonnage'] ?? 25.5;
    final String tonnageStr = "$tonnageVal톤";

    // 하차지 목적지명
    String dropoffName = "하차지 미지정";
    if (job['drop_off_request'] != null && job['drop_off_request']['drop_off'] != null) {
      dropoffName = job['drop_off_request']['drop_off']['name'] ?? "사토장";
    } else if (job['matched_drop_off'] != null) {
      dropoffName = job['matched_drop_off']['name'] ?? "사토장";
    } else if (job['drop_off_name'] != null) {
      dropoffName = job['drop_off_name'];
    }

    // 오직 한글명만 깔끔하게 노출
    final String rawMaterial = job['material_type'] ?? "GOOD_SOIL";
    final String materialKoreanName = _translateSoilName(rawMaterial);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        final screenWidth = MediaQuery.of(ctx).size.width;
        final screenHeight = MediaQuery.of(ctx).size.height;
        final dialogWidth = screenWidth > 380 ? 350.0 : (screenWidth * 0.92);

        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          backgroundColor: AppColors.surface,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: dialogWidth,
              maxHeight: screenHeight * 0.85,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. 헤더 (고정)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.fact_check_outlined, color: Colors.white, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "상차 자재 및 목적지 검수",
                              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              "티켓 #${ticketId > 0 ? ticketId : '-'}",
                              style: TextStyle(color: Colors.white.withAlpha(200), fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // 2. 내용 스크롤 영역 (작은 화면에서도 오버플로 절대 방지)
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 기사 및 차량 정보 (말줄임 없이 온전한 확인 가능)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.cardBackground,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.divider),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    width: 60,
                                    child: Text("운행 기사", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ),
                                  Expanded(
                                    child: Text(
                                      "$driverName${driverPhone.isNotEmpty ? ' ($driverPhone)' : ''}",
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    width: 60,
                                    child: Text("배차 차량", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ),
                                  Expanded(
                                    child: Text(
                                      "$carNumber ($tonnageStr)",
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // 목적지(하차지) (줄바꿈 허용으로 전체 주소/사토장명 확인)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.cardBackground,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.divider),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.pin_drop_rounded, size: 16, color: AppColors.primary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text("지정 하차지 (도착 사토장)", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    const SizedBox(height: 2),
                                    Text(
                                      dropoffName,
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // 배차 지정 적재 품목 (영문 없이 오직 한글명만 깔끔하게 노출)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.amber.withAlpha(25),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.withAlpha(120)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.layers_outlined, color: Colors.amber, size: 26),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      "배차 지정 적재 품목",
                                      style: TextStyle(fontSize: 11, color: Colors.brown, fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      materialKoreanName,
                                      style: const TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.brown,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "* 실제 적재 자재가 [$materialKoreanName]과 일치하는지 확인 후 승인해 주세요.",
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ),

                // 3. 하단 액션 버튼 바 (고정)
                Container(
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: AppColors.divider)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            Navigator.of(ctx).pop();
                            _showLoadingRejectionReasonDialog(ticketId, carNumber: carNumber, driverName: driverName);
                          },
                          child: Container(
                            height: 48,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.danger.withAlpha(20),
                              borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(20)),
                            ),
                            child: Text(
                              "상차 보류",
                              style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ),
                      ),
                      Container(width: 1, height: 48, color: AppColors.divider),
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            Navigator.of(ctx).pop();
                            await _executeApproveLoading(ticketId, carNumber: carNumber, driverName: driverName, materialName: materialKoreanName);
                          },
                          child: Container(
                            height: 48,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.success.withAlpha(30),
                              borderRadius: const BorderRadius.only(bottomRight: Radius.circular(20)),
                            ),
                            child: Text(
                              "자재 일치 / 승인",
                              style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // 상차 보류 사유 선택 다이얼로그 (4대 퀵 칩 + 기타 직접입력)
  void _showLoadingRejectionReasonDialog(int ticketId, {String? carNumber, String? driverName}) {
    final List<String> presetReasons = [
      "적재 품목 불일치",
      "기준 과적 / 정량 초과",
      "적재함 덮개 미체결",
      "배차 차량 / 기사 불일치",
    ];

    String? selectedReason;
    final otherTextController = TextEditingController();
    bool isOtherSelected = false;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (reasonCtx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              titlePadding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              actionsPadding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
              title: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    "상차 보류 사유 선택",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                ],
              ),
              content: SizedBox(
                width: 320,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        "차량: ${carNumber ?? '-'} (${driverName ?? '기사'})\n기사 스마트폰에 즉시 전달될 사유를 선택해 주세요.",
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                      ),
                      const SizedBox(height: 12),

                      // 1. 4대 퀵 프리셋 사유 버튼
                      ...presetReasons.map((reason) {
                        final isSelected = !isOtherSelected && selectedReason == reason;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: InkWell(
                            onTap: () {
                              setModalState(() {
                                isOtherSelected = false;
                                selectedReason = reason;
                              });
                            },
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 14),
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.danger.withAlpha(25) : AppColors.cardBackground,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected ? AppColors.danger : AppColors.divider,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                    size: 16,
                                    color: isSelected ? AppColors.danger : AppColors.textTertiary,
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    reason,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      color: isSelected ? AppColors.danger : AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),

                      // 2. 기타 (직접 입력)
                      InkWell(
                        onTap: () {
                          setModalState(() {
                            isOtherSelected = true;
                            selectedReason = null;
                          });
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 14),
                          decoration: BoxDecoration(
                            color: isOtherSelected ? AppColors.danger.withAlpha(25) : AppColors.cardBackground,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isOtherSelected ? AppColors.danger : AppColors.divider,
                              width: isOtherSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isOtherSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                size: 16,
                                color: isOtherSelected ? AppColors.danger : AppColors.textTertiary,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                "기타 (직접 입력)",
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isOtherSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isOtherSelected ? AppColors.danger : AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // 기타 선택 시 나타나는 한 줄 텍스트 입력창
                      if (isOtherSelected) ...[
                        const SizedBox(height: 10),
                        TextField(
                          controller: otherTextController,
                          autofocus: true,
                          style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: "사유를 간략히 입력하세요 (예: 타이어 수리 필요)",
                            hintStyle: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                            filled: true,
                            fillColor: AppColors.cardBackground,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: AppColors.divider),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: AppColors.danger),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(reasonCtx).pop(),
                  child: Text("취소", style: TextStyle(color: AppColors.textTertiary)),
                ),
                ElevatedButton(
                  onPressed: () async {
                    String finalReason = "";
                    if (isOtherSelected) {
                      finalReason = otherTextController.text.trim();
                      if (finalReason.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("기타 사유를 입력해 주세요.")),
                        );
                        return;
                      }
                    } else if (selectedReason != null) {
                      finalReason = selectedReason!;
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("보류 사유를 선택해 주세요.")),
                      );
                      return;
                    }

                    Navigator.of(reasonCtx).pop();
                    await _executeRejectLoading(ticketId, finalReason, carNumber: carNumber);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.danger,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  ),
                  child: const Text("보류 전송", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // 실제 상차 보류 API 호출 실행
  Future<void> _executeRejectLoading(int ticketId, String reason, {String? carNumber}) async {
    try {
      final rejectRes = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/$ticketId/reject-loading"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({"reason": reason}),
      );

      if (mounted) {
        if (rejectRes.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("⛔ 기사(${carNumber ?? ''})에게 상차 보류 사유가 전송되었습니다: [$reason]"),
              backgroundColor: AppColors.danger,
              duration: const Duration(seconds: 4),
            ),
          );
        } else {
          final err = jsonDecode(utf8.decode(rejectRes.bodyBytes));
          _showErrorMsg(err['detail'] ?? "상차 보류 처리 실패");
        }
      }
    } catch (e) {
      if (mounted) _showErrorMsg("서버 통신 실패: $e");
    }
  }

  // 실제 상차 승인 API 호출 실행
  Future<void> _executeApproveLoading(int ticketId, {String? carNumber, String? driverName, String? materialName}) async {
    try {
      final approveRes = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/$ticketId/approve-loading"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({"approval_type": "QR"}),
      );

      if (mounted) {
        if (approveRes.statusCode == 200) {
          final infoText = (driverName != null && carNumber != null && materialName != null)
              ? "🎉 [$driverName / $carNumber] $materialName 상차 승인 완료!"
              : "🎉 기사 티켓(#$ticketId) 상차 승인이 완료되었습니다!";
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(infoText),
              backgroundColor: AppColors.success,
              duration: const Duration(seconds: 3),
            ),
          );
        } else {
          final decoded = jsonDecode(utf8.decode(approveRes.bodyBytes));
          _showErrorMsg(decoded["detail"] ?? "상차 승인에 실패했습니다.");
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorMsg("상차 승인 통신 오류: $e");
      }
    }
  }

  void _showSiteQrScannerModal(Map<String, dynamic> site) {
    final int siteId = site['site_id'] ?? site['id'] ?? 0;
    final String siteName = site['site_name'] ?? '상차지 현장';

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      backgroundColor: AppColors.surface,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.textSecondary.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    "상차 덤프 기사 QR 스캔",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                "[$siteName]에 도착하여 상차를 마친 덤프 기사의\n스마트폰 화면에 표시된 [상차 확인 QR]을 카메라로 스캔합니다.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 20),
              InkWell(
                onTap: () {
                  Navigator.pop(context);
                  _scanDriverQrForSite(site);
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 150,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.primary, width: 2),
                    borderRadius: BorderRadius.circular(16),
                    color: AppColors.primary.withOpacity(0.04),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt_rounded, size: 52, color: AppColors.primary),
                      const SizedBox(height: 8),
                      Text(
                        "여기를 터치하여 카메라 켜기",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "실제 카메라로 기사 스마트폰 QR 촬영",
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _scanDriverQrForSite(site);
                  },
                  icon: const Icon(Icons.camera_alt_outlined, size: 18),
                  label: const Text("카메라로 QR 스캔"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  // 상차지 고정형 QR 코드 보기 다이얼로그 (A4 인쇄/부착용)
  void _showSiteFixedQrDialog(Map<String, dynamic> site) {
    final int siteId = site['site_id'] ?? site['id'] ?? 0;
    final String siteName = site['site_name'] ?? '상차지 현장';
    final String qrPayload = "dumpring://site/loading?id=$siteId";
    final String qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${Uri.encodeComponent(qrPayload)}&margin=10";

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: AppColors.surface,
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.qr_code_2_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("상차지 고정형 QR 안내", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(siteName, style: TextStyle(fontSize: 12, color: AppColors.textSecondary), overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.divider),
                ),
                child: const Text(
                  "📌 [기사가 현장 QR을 촬영하는 모드]일 때 사용됩니다.\n출입 게이트 또는 현장 사무실에 인쇄 부착해 두시면, 상차를 마친 기사가 앱으로 촬영하여 승인합니다.",
                  style: TextStyle(fontSize: 11, height: 1.4),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Image.network(
                  qrImageUrl,
                  width: 180,
                  height: 180,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.check),
                  label: const Text("확인 완료"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 상세 보기 다이얼로그
  void _showSiteDetails(Map<String, dynamic> site) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          actionsPadding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.business_rounded, color: AppColors.success, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  site['site_name'] ?? '현장 상세 정보',
                  style: AppTextStyles.h3.copyWith(fontSize: 16),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          content: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.55,
            ),
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDetailItem("현장명", site['site_name']),
                  _buildDetailItem("건설사명", site['company_name']),
                  _buildDetailItem("사업자등록번호", site['business_number']),
                  _buildDetailItem("초대코드 (현장 키)", site['site_key'], isHighlight: true),
                  _buildDetailItem("현장 주소", site['site_address'] ?? '주소 미등록'),
                  _buildDetailItem("GPS 좌표", site['latitude'] != null ? "${site['latitude']}, ${site['longitude']}" : '좌표 미등록'),
                  _buildDetailItem("지오펜싱 반경", "${site['geofencing_radius'] ?? 200.0}m"),
                  _buildDetailItem("승인 상태", site['status'] == 'APPROVED' ? '승인완료' : '승인대기'),
                ],
              ),
            ),
          ),
          actions: [
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  child: Text("닫기", style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
                if (site['status'] == 'APPROVED') ...[
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _scanDriverQrForSite(site);
                    },
                    icon: const Icon(Icons.qr_code_scanner, size: 14),
                    label: const Text("기사 QR", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(color: AppColors.primary.withAlpha(150)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _showSiteFixedQrDialog(site);
                    },
                    icon: const Icon(Icons.qr_code_2, size: 14),
                    label: const Text("고정 QR", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(color: AppColors.primary.withAlpha(150)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _openSiteDialog(existingSite: site);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text("수정", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _buildDetailItem(String label, String? value, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.caption.copyWith(color: AppColors.textTertiary)),
          const SizedBox(height: 2),
          Text(
            value ?? '없음',
            style: AppTextStyles.body1.copyWith(
              color: isHighlight ? AppColors.primary : AppColors.textPrimary,
              fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          const Divider(height: 12),
        ],
      ),
    );
  }

  InputDecoration _buildInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 13),
      filled: true,
      fillColor: AppColors.background,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.divider)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.divider)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        title: Text("현장 관리", style: AppTextStyles.h2),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.success),
            onPressed: _fetchMySites,
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openSiteDialog(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("새 현장 개설", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.success))
          : RefreshIndicator(
              onRefresh: _fetchMySites,
              child: _siteMappings.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.business, color: AppColors.textTertiary, size: 64),
                          const SizedBox(height: 12),
                          Text("개설된 공사현장이 없습니다.", style: AppTextStyles.body1.copyWith(color: AppColors.textSecondary)),
                          const SizedBox(height: 8),
                          Text("우측 하단 버튼을 눌러 새 현장을 추가하세요.", style: AppTextStyles.caption),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _siteMappings.length,
                      itemBuilder: (context, index) {
                        final site = _siteMappings[index];
                        final bool isApproved = site['status'] == 'APPROVED';

                        return Card(
                          color: AppColors.surface,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: AppColors.divider),
                          ),
                          child: InkWell(
                            onTap: () => _showSiteDetails(site),
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(site['site_name'] ?? '현장명 없음', style: AppTextStyles.h3),
                                        const SizedBox(height: 4),
                                        Text("건설사: ${site['company_name']}", style: AppTextStyles.caption),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: AppColors.background,
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(color: AppColors.divider),
                                              ),
                                              child: Text(
                                                "초대코드: ${site['site_key']}",
                                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: isApproved ? AppColors.success.withOpacity(0.15) : AppColors.divider,
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          isApproved ? "승인완료" : "승인대기",
                                          style: TextStyle(
                                            color: isApproved ? AppColors.success : AppColors.textSecondary,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      if (isApproved) ...[
                                        Row(
                                          children: [
                                            TextButton.icon(
                                              onPressed: () => _scanDriverQrForSite(site),
                                              icon: const Icon(Icons.qr_code_scanner, size: 14),
                                              label: const Text("QR 스캔", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                              style: TextButton.styleFrom(
                                                foregroundColor: AppColors.primary,
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                                minimumSize: Size.zero,
                                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            TextButton.icon(
                                              onPressed: () => _openEmployeeManagementDialog(site['site_id'], site['site_name'] ?? '현장'),
                                              icon: const Icon(Icons.people_outline, size: 14),
                                              label: const Text("직원 관리", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                              style: TextButton.styleFrom(
                                                foregroundColor: AppColors.success,
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                                minimumSize: Size.zero,
                                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Text("상세보기", style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                                          Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
