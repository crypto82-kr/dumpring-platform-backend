import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'common_drawer.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const DashboardScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  bool _isLoading = false;
  List<dynamic> _siteMappings = [];
  List<dynamic> _unloadingSites = [];
  late Map<String, dynamic> _currentUser;

  // 현장 등록 폼 컨트롤러
  final _siteFormKey = GlobalKey<FormState>();
  final TextEditingController _siteNameController = TextEditingController();
  final TextEditingController _siteCompanyController = TextEditingController();
  final TextEditingController _siteBizNumController = TextEditingController();
  final TextEditingController _siteLatController = TextEditingController();
  final TextEditingController _siteLngController = TextEditingController();
  final TextEditingController _siteRadiusController = TextEditingController(text: "200.0");

  // 하차지 등록 폼 컨트롤러
  final _dropoffFormKey = GlobalKey<FormState>();
  final TextEditingController _unloadingNameController = TextEditingController();
  final TextEditingController _unloadingSoilController = TextEditingController(text: "NORMAL,ROCK");

  // --- 신규 공고(JobPost) 등록용 상태 변수 및 컨트롤러 ---
  final _jobFormKey = GlobalKey<FormState>();
  int? _selectedSiteId;
  String _selectedMaterialType = "GOOD_SOIL";
  String _selectedTruckType = "T_25";
  String _selectedPayerType = "SITE_PAYS";
  DateTime _selectedWorkDate = DateTime.now().add(const Duration(days: 1)); // 기본값 내일로 설정
  
  final TextEditingController _jobRequiredTrucksController = TextEditingController(text: "10");
  final TextEditingController _jobUnitPriceController = TextEditingController(text: "50000");
  final TextEditingController _jobMemoController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _fetchData();
  }

  @override
  void dispose() {
    _siteNameController.dispose();
    _siteCompanyController.dispose();
    _siteBizNumController.dispose();
    _siteLatController.dispose();
    _siteLngController.dispose();
    _siteRadiusController.dispose();
    _unloadingNameController.dispose();
    _unloadingSoilController.dispose();
    
    _jobRequiredTrucksController.dispose();
    _jobUnitPriceController.dispose();
    _jobMemoController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
    });

    if (widget.user['is_site_manager'] == true || widget.user['is_site_worker'] == true) {
      await _fetchMySites();
    }
    if (widget.user['is_drop_off'] == true) {
      await _fetchMyUnloadingSites();
    }

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _fetchMySites() async {
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
          // 등록된 현장 목록이 있을 시 첫 번째 현장을 기본값으로 선택
          if (_siteMappings.isNotEmpty) {
            final approvedSites = _siteMappings.where((m) => m['status'] == 'APPROVED').toList();
            if (approvedSites.isNotEmpty) {
              _selectedSiteId = approvedSites.first['site_id'];
            } else {
              _selectedSiteId = _siteMappings.first['site_id'];
            }
          }
        });
      }
    } catch (e) {
      debugPrint("현장 조회 실패: $e");
    }
  }

  Future<void> _fetchMyUnloadingSites() async {
    final endpoint = "$_baseUrl/api/sites/my-unloading-sites";
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
          _unloadingSites = decoded;
        });
      }
    } catch (e) {
      debugPrint("하차지 조회 실패: $e");
    }
  }

  // 신규 공사 현장 개설 API 호출
  Future<void> _registerConstructionSite() async {
    if (!_siteFormKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    final endpoint = "$_baseUrl/api/sites/create-site";
    final double? lat = double.tryParse(_siteLatController.text.trim());
    final double? lng = double.tryParse(_siteLngController.text.trim());
    final double radius = double.tryParse(_siteRadiusController.text.trim()) ?? 200.0;

    final requestData = {
      "site_name": _siteNameController.text.trim(),
      "company_name": _siteCompanyController.text.trim(),
      "business_number": _siteBizNumController.text.trim(),
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
        _siteNameController.clear();
        _siteCompanyController.clear();
        _siteBizNumController.clear();
        _siteLatController.clear();
        _siteLngController.clear();
        _siteRadiusController.text = "200.0";
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 공사현장 개설 및 승인이 완료되었습니다.")),
        );
        await _fetchMySites();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "현장 개설에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // 신규 하차지/사토장 정보 등록 API 호출
  Future<void> _registerUnloadingSite() async {
    if (!_dropoffFormKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    final endpoint = "$_baseUrl/api/sites/create-unloading-site";
    final requestData = {
      "site_name": _unloadingNameController.text.trim(),
      "preferred_soil_types": _unloadingSoilController.text.trim(),
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
        _unloadingNameController.clear();
        _unloadingSoilController.text = "NORMAL,ROCK";

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 하차지/사토장 정보가 성공적으로 등록되었습니다.")),
        );
        await _fetchMyUnloadingSites();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "하차지 등록에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // 신규 기사 모집 공고(JobPost) 등록 API 호출
  Future<void> _registerJobPost() async {
    if (!_jobFormKey.currentState!.validate()) return;
    if (_selectedSiteId == null) {
      _showErrorDialog("공고를 등록할 발주 공사현장을 선택해 주세요.");
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final endpoint = "$_baseUrl/api/jobs/site-post";
    final requestData = {
      "site_id": _selectedSiteId,
      "material_type": _selectedMaterialType,
      "truck_type": _selectedTruckType,
      "work_date": _selectedWorkDate.toIso8601String(),
      "required_trucks": int.tryParse(_jobRequiredTrucksController.text.trim()) ?? 10,
      "offered_unit_price": int.tryParse(_jobUnitPriceController.text.trim()) ?? 50000,
      "payer_type": _selectedPayerType,
      "memo": _jobMemoController.text.trim().isEmpty ? null : _jobMemoController.text.trim(),
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

      if (response.statusCode == 201) {
        _jobMemoController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 기사 모집공고가 실시간 등록 완료되었습니다.")),
        );
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "공고 등록에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
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

  // 달력 위젯 호출 유틸
  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedWorkDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 60)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedWorkDate = DateTime(
          picked.year,
          picked.month,
          picked.day,
          _selectedWorkDate.hour,
          _selectedWorkDate.minute,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isSiteManager = _currentUser['is_site_manager'] == true ||
        _currentUser['is_site_worker'] == true;
    final bool isDropOff = _currentUser['is_drop_off'] == true;
    final bool themeIsDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppColors.background,
      drawer: CommonDrawer(
        user: _currentUser,
        token: widget.token,
        onProfileUpdated: (newUser) {
          setState(() {
            _currentUser = newUser;
          });
        },
      ),
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0.5,
        title: Text("DUMPRING 대시보드", style: AppTextStyles.h2),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.success))
            : RefreshIndicator(
                onRefresh: _fetchData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildWelcomeCard(),
                      const SizedBox(height: 20),

                      // 1. 현장관리자 전용: 공사현장 개설 + 신규 공고 등록 + 내 현장 목록
                      if (isSiteManager) ...[
                        _buildSiteRegisterForm(),
                        const SizedBox(height: 20),
                        _buildJobPostForm(), // 새 모집공고 등록 폼 추가!
                        const SizedBox(height: 20),
                        _buildSiteListSection(),
                      ],

                      // 2. 하차지 지주 전용: 하차지 정보 등록 폼 및 내 하차지 목록
                      if (isDropOff) ...[
                        _buildDropOffRegisterForm(),
                        const SizedBox(height: 20),
                        _buildUnloadingSiteListSection(),
                      ],

                      // 일반 유저
                      if (!isSiteManager && !isDropOff) ...[
                        Card(
                          color: AppColors.surface,
                          margin: const EdgeInsets.only(top: 40),
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Text(
                              "기사 또는 실무 담당자님 환영합니다!\n상단 메뉴를 이용하시거나 대시보드 오더 수락 기능을 기다려 주세요.",
                              textAlign: TextAlign.center,
                              style: AppTextStyles.body1.copyWith(color: AppColors.textSecondary, height: 1.5),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildWelcomeCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: AppColors.surface,
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "${_currentUser['name']} 님",
              style: AppTextStyles.h1,
            ),
            const SizedBox(height: 4),
            Text(
              _currentUser['phone_number'] ?? '',
              style: AppTextStyles.body2,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
              ),
              child: Text(
                _getRoleText(),
                style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getRoleText() {
    List<String> roles = [];
    if (_currentUser['is_site_manager'] == true) roles.add("현장관리자");
    if (_currentUser['is_site_worker'] == true) roles.add("현장담당자");
    if (_currentUser['is_owner'] == true) roles.add("차주");
    if (_currentUser['is_driver'] == true) roles.add("기사");
    if (_currentUser['is_drop_off'] == true) roles.add("하차지 지주");
    return roles.isEmpty ? "일반유저" : roles.join(", ");
  }

  // 공사현장 신규 개설 폼
  Widget _buildSiteRegisterForm() {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _siteFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.add_business_outlined, color: AppColors.success),
                  const SizedBox(width: 8),
                  Text(
                    "새 공사현장 개설",
                    style: AppTextStyles.h3,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _siteCompanyController,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("건설사/상호명 (예: 현대건설)", Icons.business),
                validator: (value) => value == null || value.trim().isEmpty ? "건설사명을 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _siteNameController,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("공사현장 명칭 (예: 강남 아파트 신축공사)", Icons.place_outlined),
                validator: (value) => value == null || value.trim().isEmpty ? "현장명칭을 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _siteBizNumController,
                keyboardType: TextInputType.number,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("사업자등록번호 10자리", Icons.assignment_outlined),
                validator: (value) => value == null || value.trim().length < 10 ? "올바른 사업자번호를 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _siteLatController,
                      style: TextStyle(color: AppColors.textPrimary),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: _buildInputDecoration("위도 (예: 37.56)", Icons.location_on_outlined),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _siteLngController,
                      style: TextStyle(color: AppColors.textPrimary),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: _buildInputDecoration("경도 (예: 126.97)", Icons.location_on_outlined),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _siteRadiusController,
                style: TextStyle(color: AppColors.textPrimary),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: _buildInputDecoration("지오펜싱 반경 (m 단위, 기본 200.0)", Icons.radar_outlined),
                validator: (value) => value == null || value.trim().isEmpty ? "지오펜싱 반경을 입력해 주세요" : null,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _registerConstructionSite,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text("현장 개설 및 자동 매핑", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- 신규 모집 공고 등록 폼 ---
  Widget _buildJobPostForm() {
    final approvedSites = _siteMappings.where((m) => m['status'] == 'APPROVED').toList();

    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _jobFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.add_alert_outlined, color: AppColors.success),
                  const SizedBox(width: 8),
                  Text(
                    "새 기사 모집공고 올리기",
                    style: AppTextStyles.h3,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 1. 발주 공사현장 선택 Dropdown
              Text("발주 공사현장", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (approvedSites.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Text("승인 완료된 현장이 없습니다. 현장을 개설해 주세요.", style: AppTextStyles.body2),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: _selectedSiteId,
                      dropdownColor: AppColors.surface,
                      icon: const Icon(Icons.arrow_drop_down, color: AppColors.success),
                      isExpanded: true,
                      style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                      onChanged: (int? value) {
                        setState(() {
                          _selectedSiteId = value;
                        });
                      },
                      items: approvedSites.map<DropdownMenuItem<int>>((site) {
                        return DropdownMenuItem<int>(
                          value: site['site_id'],
                          child: Text(site['site_name'] ?? '현장명 없음'),
                        );
                      }).toList(),
                    ),
                  ),
                ),
              const SizedBox(height: 16),

              // 2. 토사 종류 Dropdown
              Text("토사 종류", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.divider),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedMaterialType,
                    dropdownColor: AppColors.surface,
                    icon: const Icon(Icons.arrow_drop_down, color: AppColors.success),
                    isExpanded: true,
                    style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                    onChanged: (value) => setState(() => _selectedMaterialType = value!),
                    items: const [
                      DropdownMenuItem(value: "GOOD_SOIL", child: Text("양질토")),
                      DropdownMenuItem(value: "MUD_SOIL", child: Text("뻘흙")),
                      DropdownMenuItem(value: "ROCK", child: Text("암버럭")),
                      DropdownMenuItem(value: "MIXED", child: Text("혼합 토사")),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 3. 차량 규격 Dropdown
              Text("모집 차량 규격", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.divider),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedTruckType,
                    dropdownColor: AppColors.surface,
                    icon: const Icon(Icons.arrow_drop_down, color: AppColors.success),
                    isExpanded: true,
                    style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                    onChanged: (value) => setState(() => _selectedTruckType = value!),
                    items: const [
                      DropdownMenuItem(value: "T_15", child: Text("15톤")),
                      DropdownMenuItem(value: "T_25", child: Text("25톤")),
                      DropdownMenuItem(value: "T_27", child: Text("27톤")),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 4. 비용 지급 주체 Dropdown
              Text("비용 지급 주체", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.divider),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedPayerType,
                    dropdownColor: AppColors.surface,
                    icon: const Icon(Icons.arrow_drop_down, color: AppColors.success),
                    isExpanded: true,
                    style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                    onChanged: (value) => setState(() => _selectedPayerType = value!),
                    items: const [
                      DropdownMenuItem(value: "SITE_PAYS", child: Text("현장 지불")),
                      DropdownMenuItem(value: "DROP_OFF_PAYS", child: Text("하차지 지불")),
                      DropdownMenuItem(value: "FREE", child: Text("무상")),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 5. 작업 희망 일자 선택기
              Text("작업 희망 일자", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              InkWell(
                onTap: _selectDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "${_selectedWorkDate.year}년 ${_selectedWorkDate.month}월 ${_selectedWorkDate.day}일",
                        style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                      ),
                      const Icon(Icons.calendar_today_outlined, color: AppColors.success, size: 20),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 6. 필요 대수 입력
              Text("모집 덤프 대수", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _jobRequiredTrucksController,
                keyboardType: TextInputType.number,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("필요한 덤프 대수 (숫자만)", Icons.tag),
                validator: (value) => value == null || int.tryParse(value.trim()) == null ? "대수를 숫자로 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),

              // 7. 제시 단가 입력
              Text("상차지 제시 단가 (원)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _jobUnitPriceController,
                keyboardType: TextInputType.number,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("제시할 1회전 운임 단가 (예: 50000)", Icons.monetization_on_outlined),
                validator: (value) => value == null || int.tryParse(value.trim()) == null ? "단가를 숫자로 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),

              // 8. 특이사항 메모
              Text("기사 안내 메모 (선택)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _jobMemoController,
                maxLines: 2,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("예: 양질토 반출, 세륜기 구비됨", Icons.notes),
              ),
              const SizedBox(height: 16),

              // 9. 제출 버튼
              ElevatedButton(
                onPressed: approvedSites.isEmpty ? null : _registerJobPost,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.divider,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text("기사 모집 공고 올리기", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 하차지 정보 등록 폼
  Widget _buildDropOffRegisterForm() {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _dropoffFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.flag_outlined, color: AppColors.success),
                  const SizedBox(width: 8),
                  Text(
                    "새 하차지 / 사토장 등록",
                    style: AppTextStyles.h3,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _unloadingNameController,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("사토장 명칭 (예: 신촌지구 사토장)", Icons.place_outlined),
                validator: (value) => value == null || value.trim().isEmpty ? "하차지 명칭을 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _unloadingSoilController,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: _buildInputDecoration("수용 가능 토사 종류 (예: NORMAL,ROCK)", Icons.grass),
                validator: (value) => value == null || value.trim().isEmpty ? "수용 가능 토사 종류를 입력해 주세요" : null,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _registerUnloadingSite,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text("하차지 정보 등록 완료", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSiteListSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          "내 소속 현장 목록",
          style: AppTextStyles.h2,
        ),
        const SizedBox(height: 8),
        if (_siteMappings.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text("소속된 현장이 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _siteMappings.length,
            itemBuilder: (context, index) {
              final mapping = _siteMappings[index];
              return Card(
                color: AppColors.surface,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppColors.divider, width: 1),
                ),
                child: ListTile(
                  title: Text(mapping['site_name'] ?? '', style: AppTextStyles.h3),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text("초대코드: ${mapping['site_key'] ?? ''}", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                      if (mapping['latitude'] != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          "GPS: ${mapping['latitude']}, ${mapping['longitude']} (반경 ${mapping['geofencing_radius']}m)",
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ],
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: mapping['status'] == 'APPROVED' 
                          ? AppColors.success.withOpacity(0.15) 
                          : AppColors.divider,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: mapping['status'] == 'APPROVED' 
                            ? AppColors.success.withOpacity(0.3) 
                            : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      mapping['status'] == 'APPROVED' ? "승인완료" : "승인대기",
                      style: TextStyle(
                        color: mapping['status'] == 'APPROVED' ? AppColors.success : AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildUnloadingSiteListSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          "내 하차지/사토장 목록",
          style: AppTextStyles.h2,
        ),
        const SizedBox(height: 8),
        if (_unloadingSites.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text("등록된 하차지가 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _unloadingSites.length,
            itemBuilder: (context, index) {
              final site = _unloadingSites[index];
              return Card(
                color: AppColors.surface,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppColors.divider, width: 1),
                ),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.background,
                    child: const Icon(Icons.flag, color: AppColors.success),
                  ),
                  title: Text(site['site_name'] ?? '', style: AppTextStyles.h3),
                  subtitle: Text("수용 토사 종류: ${site['preferred_soil_types'] ?? ''}", style: TextStyle(color: AppColors.textSecondary)),
                  trailing: const Icon(Icons.check_circle, color: AppColors.success),
                ),
              );
            },
          ),
      ],
    );
  }

  InputDecoration _buildInputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 14),
      filled: true,
      fillColor: AppColors.background,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      prefixIcon: Icon(icon, color: AppColors.textSecondary, size: 20),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.primary, width: 2)),
    );
  }
}
