import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../shared/widgets/layouts/dr_scaffold.dart';

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

  // 상세 보기 다이얼로그
  void _showSiteDetails(Map<String, dynamic> site) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.info_outline, color: AppColors.success),
              const SizedBox(width: 8),
              Expanded(child: Text(site['site_name'] ?? '현장 상세 정보', style: AppTextStyles.h3, overflow: TextOverflow.ellipsis)),
            ],
          ),
          content: Column(
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
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text("닫기", style: TextStyle(color: AppColors.textSecondary)),
            ),
            if (site['status'] == 'APPROVED')
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _openSiteDialog(existingSite: site);
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text("수정하기", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
                                      const SizedBox(height: 12),
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
