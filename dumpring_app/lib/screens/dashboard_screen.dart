import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
  String get _baseUrl => "https://dumpring-api.onrender.com";

  bool _isLoading = false;
  List<dynamic> _siteMappings = [];
  List<dynamic> _unloadingSites = [];

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

  @override
  void initState() {
    super.initState();
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

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Text("오류 발생", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("닫기", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isSiteManager = widget.user['is_site_manager'] == true;
    final bool isDropOff = widget.user['is_drop_off'] == true;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF004D5A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("DUMPRING 대시보드", style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Navigator.of(context).pop(); // 로그아웃 처리 후 복귀
            },
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF004D5A)))
            : RefreshIndicator(
                onRefresh: _fetchData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 환영 카드
                      _buildWelcomeCard(),
                      const SizedBox(height: 20),

                      // 1. 현장관리자 전용: 공사현장 등록 폼 및 내 현장 목록
                      if (isSiteManager) ...[
                        _buildSiteRegisterForm(),
                        const SizedBox(height: 20),
                        _buildSiteListSection(),
                      ],

                      // 2. 하차지 지주 전용: 하차지 정보 등록 폼 및 내 하차지 목록
                      if (isDropOff) ...[
                        _buildDropOffRegisterForm(),
                        const SizedBox(height: 20),
                        _buildUnloadingSiteListSection(),
                      ],

                      // 그 외 역할인 경우 기본 목록 안내
                      if (!isSiteManager && !isDropOff) ...[
                        const Card(
                          margin: EdgeInsets.only(top: 40),
                          child: Padding(
                            padding: EdgeInsets.all(24.0),
                            child: Text(
                              "기사 또는 실무 담당자님 환영합니다!\n상단 메뉴를 이용하시거나 대시보드 오더 수락 기능을 기다려 주세요.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 16, height: 1.5, color: Color(0xFF4A5568)),
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
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            colors: [Color(0xFF004D5A), Color(0xFF002D35)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "${widget.user['name']} 님",
              style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              widget.user['phone_number'],
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFF7A00).withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFFF7A00).withOpacity(0.4)),
              ),
              child: Text(
                _getRoleText(),
                style: const TextStyle(color: Color(0xFFFF7A00), fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getRoleText() {
    List<String> roles = [];
    if (widget.user['is_site_manager'] == true) roles.add("현장관리자");
    if (widget.user['is_site_worker'] == true) roles.add("현장담당자");
    if (widget.user['is_owner'] == true) roles.add("차주");
    if (widget.user['is_driver'] == true) roles.add("기사");
    if (widget.user['is_drop_off'] == true) roles.add("하차지 지주");
    return roles.isEmpty ? "일반유저" : roles.join(", ");
  }

  // 공사현장 신규 개설 폼
  Widget _buildSiteRegisterForm() {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _siteFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  Icon(Icons.add_business_outlined, color: Color(0xFF004D5A)),
                  SizedBox(width: 8),
                  Text(
                    "새 공사현장 개설",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _siteCompanyController,
                decoration: _buildInputDecoration("건설사/상호명 (예: 현대건설)", Icons.business),
                validator: (value) => value == null || value.trim().isEmpty ? "건설사명을 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _siteNameController,
                decoration: _buildInputDecoration("공사현장 명칭 (예: 강남 아파트 신축공사)", Icons.place_outlined),
                validator: (value) => value == null || value.trim().isEmpty ? "현장명칭을 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _siteBizNumController,
                keyboardType: TextInputType.number,
                decoration: _buildInputDecoration("사업자등록번호 10자리", Icons.assignment_outlined),
                validator: (value) => value == null || value.trim().length < 10 ? "올바른 사업자번호를 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _siteLatController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: _buildInputDecoration("위도 (예: 37.56)", Icons.location_on_outlined),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _siteLngController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: _buildInputDecoration("경도 (예: 126.97)", Icons.location_on_outlined),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _siteRadiusController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: _buildInputDecoration("지오펜싱 반경 (m 단위, 기본 200.0)", Icons.radar_outlined),
                validator: (value) => value == null || value.trim().isEmpty ? "지오펜싱 반경을 입력해 주세요" : null,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _registerConstructionSite,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF004D5A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text("현장 개설 및 자동 매핑", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _dropoffFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  Icon(Icons.mountain_flag_outlined, color: Color(0xFF004D5A)),
                  SizedBox(width: 8),
                  Text(
                    "새 하차지 / 사토장 등록",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _unloadingNameController,
                decoration: _buildInputDecoration("사토장 명칭 (예: 신촌지구 사토장)", Icons.place_outlined),
                validator: (value) => value == null || value.trim().isEmpty ? "하차지 명칭을 입력해 주세요" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _unloadingSoilController,
                decoration: _buildInputDecoration("수용 가능 토사 종류 (콤마 구분, 예: NORMAL,ROCK)", Icons.grass),
                validator: (value) => value == null || value.trim().isEmpty ? "수용 가능 토사 종류를 입력해 주세요" : null,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _registerUnloadingSite,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF004D5A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
        const Text(
          "내 소속 현장 목록",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
        ),
        const SizedBox(height: 8),
        if (_siteMappings.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text("소속된 현장이 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _siteMappings.length,
            itemBuilder: (context, index) {
              final mapping = _siteMappings[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  title: Text(mapping['site_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text("초대코드: ${mapping['site_key'] ?? ''}", style: const TextStyle(color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
                      if (mapping['latitude'] != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          "GPS: ${mapping['latitude']}, ${mapping['longitude']} (반경 ${mapping['geofencing_radius']}m)",
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ],
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: mapping['status'] == 'APPROVED' ? const Color(0xFFE6F4EA) : const Color(0xFFFFF4E5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      mapping['status'] == 'APPROVED' ? "승인완료" : "승인대기",
                      style: TextStyle(
                        color: mapping['status'] == 'APPROVED' ? Colors.green[800] : Colors.orange[800],
                        fontSize: 12,
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
        const Text(
          "내 하차지/사토장 목록",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
        ),
        const SizedBox(height: 8),
        if (_unloadingSites.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text("등록된 하차지가 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _unloadingSites.length,
            itemBuilder: (context, index) {
              final site = _unloadingSites[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFE2F0F2),
                    child: Icon(Icons.mountain_flag, color: Color(0xFF004D5A)),
                  ),
                  title: Text(site['site_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("수용 토사 종류: ${site['preferred_soil_types'] ?? ''}"),
                  trailing: const Icon(Icons.check_circle, color: Color(0xFF004D5A)),
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
      hintStyle: const TextStyle(color: Color(0xFFA0AEC0), fontSize: 14),
      filled: true,
      fillColor: const Color(0xFFF7FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      prefixIcon: Icon(icon, color: const Color(0xFF718096), size: 20),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFFF7A00), width: 1.5)),
    );
  }
}
