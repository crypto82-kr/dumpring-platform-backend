import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../shared/widgets/layouts/dr_scaffold.dart';

class JobManagementScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const JobManagementScreen({
    super.key,
    required this.user,
    required this.token,
  });

  @override
  State<JobManagementScreen> createState() => _JobManagementScreenState();
}

class _JobManagementScreenState extends State<JobManagementScreen> {
  String get _baseUrl => AppConfig.baseUrl;
  bool _isLoading = false;
  List<dynamic> _siteMappings = [];
  List<dynamic> _myJobs = [];
  List<dynamic> _openDropOffRequests = [];
  List<dynamic> _availableDropOffs = [];

  // 공고 등록 및 수정에 필요한 상태 변수 및 컨트롤러
  final _jobFormKey = GlobalKey<FormState>();
  int? _selectedSiteId;
  int? _selectedDropOffRequestId;
  bool _isDirectMatching = false; // 기본값은 하차지 미지정 (지주 매칭 대기)
  String _selectedMaterialType = "GOOD_SOIL";
  String _selectedTruckType = "T_25";
  String _selectedPayerType = "SITE_PAYS";
  DateTime _selectedWorkDate = DateTime.now().add(const Duration(days: 1));

  final TextEditingController _jobRequiredTrucksController = TextEditingController(text: "10");
  final TextEditingController _inviteCodeController = TextEditingController();
  Map<String, dynamic>? _searchedDropOffRequest;
  bool _isSearchingCode = false;
  final TextEditingController _jobUnitPriceController = TextEditingController(text: "50000");
  final TextEditingController _jobMemoController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchMySites();
    _fetchAvailableDropOffs();
    _fetchMyJobs();
    _fetchOpenDropOffRequests();
  }

  @override
  void dispose() {
    _jobRequiredTrucksController.dispose();
    _jobUnitPriceController.dispose();
    _jobMemoController.dispose();
    _inviteCodeController.dispose();
    super.dispose();
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
          final approvedSites = _siteMappings.where((m) => m['status'] == 'APPROVED').toList();
          if (approvedSites.isNotEmpty) {
            _selectedSiteId = approvedSites.first['site_id'];
          } else if (_siteMappings.isNotEmpty) {
            _selectedSiteId = _siteMappings.first['site_id'];
          }
        });
      }
    } catch (e) {
      debugPrint("현장 목록 조회 에러: $e");
    }
  }

  Future<void> _fetchMyJobs() async {
    setState(() => _isLoading = true);
    final endpoint = "$_baseUrl/api/jobs/my-posts";
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
          _myJobs = decoded;
        });
      }
    } catch (e) {
      debugPrint("공고 목록 조회 실패: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchOpenDropOffRequests() async {
    final endpoint = "$_baseUrl/api/drop-offs/requests";
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
          _openDropOffRequests = decoded;
          if (_openDropOffRequests.isNotEmpty) {
            _selectedDropOffRequestId = _openDropOffRequests.first['id'];
          }
        });
      }
    } catch (e) {
      debugPrint("열려있는 하차지 수용 공고 조회 실패: $e");
    }
  }

  Future<void> _searchDropOffByCode(String code, StateSetter setDialogState) async {
    final cleanCode = code.trim().toUpperCase().replaceAll(' ', '');
    if (cleanCode.isEmpty) return;
    setDialogState(() {
      _isSearchingCode = true;
    });
    final endpoint = "$_baseUrl/api/jobs/drop-offs/requests/search-by-code?code=${Uri.encodeComponent(cleanCode)}";
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
          _searchedDropOffRequest = decoded;
          _selectedDropOffRequestId = decoded['id'];
        });
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "해당 코드로 공고를 찾을 수 없습니다.");
        setDialogState(() {
          _searchedDropOffRequest = null;
          _selectedDropOffRequestId = null;
        });
      }
    } catch (e) {
      _showErrorDialog("네트워크 오류가 발생했습니다.");
    } finally {
      setDialogState(() {
        _isSearchingCode = false;
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

    setState(() => _isLoading = true);
    
    final String endpoint = _isDirectMatching 
        ? "$_baseUrl/api/jobs" 
        : "$_baseUrl/api/jobs/site-post";

    final Map<String, dynamic> requestData = _isDirectMatching
        ? {
            "site_id": _selectedSiteId,
            "drop_off_request_id": _selectedDropOffRequestId,
            "work_date": _selectedWorkDate.toIso8601String(),
            "required_trucks": int.tryParse(_jobRequiredTrucksController.text.trim()) ?? 10,
            "is_direct_match": true,
          }
        : {
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
        Navigator.of(context).pop(); // 다이얼로그 닫기
        _clearJobControllers();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 기사 모집공고가 등록되었습니다.")),
        );
        _fetchMyJobs();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "공고 등록에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // 기사 모집 공고(JobPost) 수정 API 호출 (PATCH)
  Future<void> _updateJobPost(int jobId) async {
    if (!_jobFormKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final endpoint = "$_baseUrl/api/jobs/$jobId";
    final requestData = {
      "material_type": _selectedMaterialType,
      "truck_type": _selectedTruckType,
      "work_date": _selectedWorkDate.toIso8601String(),
      "required_trucks": int.tryParse(_jobRequiredTrucksController.text.trim()) ?? 10,
      "offered_unit_price": int.tryParse(_jobUnitPriceController.text.trim()) ?? 50000,
      "payer_type": _selectedPayerType,
      "memo": _jobMemoController.text.trim().isEmpty ? null : _jobMemoController.text.trim(),
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
        _clearJobControllers();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 모집 공고 정보가 수정되었습니다.")),
        );
        _fetchMyJobs();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "공고 수정에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // 하차지 매칭 최종 승인 API 호출
  Future<void> _approveMatch(int jobId) async {
    setState(() => _isLoading = true);
    final endpoint = "$_baseUrl/api/jobs/$jobId/confirm-match";
    try {
      final response = await http.patch(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 하차지 매칭이 승인되어 기사 모집이 시작되었습니다.")),
        );
        _fetchMyJobs();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(decoded["detail"] ?? "매칭 승인에 실패했습니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  String _getDropOffRequestDisplayText(int requestId) {
    final req = _openDropOffRequests.firstWhere((r) => r['id'] == requestId, orElse: () => null);
    if (req == null) return "하차지 공고를 검색해 선택하세요";
    final name = req['drop_off_name'] ?? '하차지';
    final mat = _translateMaterial(req['material_type']);
    final trk = _translateTruck(req['truck_type']);
    final price = req['unit_price'];
    return "$name ($mat / $trk / $price원)";
  }

  void _openDropOffSearchDialog(StateSetter parentSetState) {
    String searchQuery = "";
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setPopupState) {
            final filtered = _openDropOffRequests.where((r) {
              final name = (r['drop_off_name'] ?? '').toLowerCase();
              final addr = (r['drop_off_address'] ?? '').toLowerCase();
              final query = searchQuery.toLowerCase();
              return name.contains(query) || addr.contains(query);
            }).toList();

            return AlertDialog(
              backgroundColor: AppColors.surface,
              insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  const Icon(Icons.search, color: AppColors.success),
                  const SizedBox(width: 8),
                  Text("하차지 공고 상세 검색", style: AppTextStyles.h3),
                ],
              ),
              content: SizedBox(
                width: MediaQuery.of(context).size.width > 600 ? 550 : MediaQuery.of(context).size.width * 0.95,
                height: 480,
                child: Column(
                  children: [
                    TextField(
                      style: TextStyle(color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        hintText: "하차지명 또는 주소 검색",
                        hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 13),
                        prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.success),
                        filled: true,
                        fillColor: AppColors.surface,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.divider)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.divider)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.primary, width: 1.5))),
                      onChanged: (val) {
                        setPopupState(() {
                          searchQuery = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: filtered.isEmpty
                          ? Center(
                              child: Text(
                                "검색 결과가 없습니다.",
                                style: AppTextStyles.caption.copyWith(color: AppColors.textTertiary),
                              ),
                            )
                          : ListView.builder(
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final r = filtered[index];
                                final hasWash = r['has_washing_facility'] == true;
                                final allowNight = r['night_work_allowed'] == true;
                                final allowRain = r['rain_work_allowed'] == true;

                                return Card(
                                  color: AppColors.background,
                                  margin: const EdgeInsets.only(bottom: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: BorderSide(color: AppColors.divider),
                                  ),
                                  child: InkWell(
                                    onTap: () {
                                      parentSetState(() {
                                        _selectedDropOffRequestId = r['id'];
                                      });
                                      Navigator.of(context).pop();
                                    },
                                    borderRadius: BorderRadius.circular(12),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            r['drop_off_name'] ?? '하차지',
                                            style: AppTextStyles.body1.copyWith(fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            r['drop_off_address'] ?? '주소 미등록',
                                            style: AppTextStyles.caption,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 6),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                "${_translateMaterial(r['material_type'])} / ${_translateTruck(r['truck_type'])}",
                                                style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                                              ),
                                              Text(
                                                "${r['unit_price']}원",
                                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.amber),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Wrap(
                                            spacing: 6,
                                            children: [
                                              _buildTag("세륜기", hasWash),
                                              _buildTag("야간작업", allowNight),
                                              _buildTag("우천작업", allowRain),
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
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text("닫기", style: TextStyle(color: AppColors.textSecondary)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildTag(String label, bool isEnabled) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isEnabled ? AppColors.success.withValues(alpha: 0.15) : AppColors.divider.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isEnabled ? AppColors.success : AppColors.textSecondary,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  void _clearJobControllers() {
    _jobRequiredTrucksController.text = "10";
    _jobUnitPriceController.text = "50000";
    _jobMemoController.clear();
    _inviteCodeController.clear();
    _searchedDropOffRequest = null;
    _selectedMaterialType = "GOOD_SOIL";
    _selectedTruckType = "T_25";
    _selectedPayerType = "SITE_PAYS";
    _selectedWorkDate = DateTime.now().add(const Duration(days: 1));
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

  // 모집 공고 생성/수정 다이얼로그 오픈
  void _openJobDialog({Map<String, dynamic>? existingJob}) {
    final bool isEdit = existingJob != null;
    final approvedSites = _siteMappings.where((m) => m['status'] == 'APPROVED').toList();

    if (isEdit) {
      _selectedSiteId = existingJob['site_id'];
      _selectedMaterialType = existingJob['material_type'] ?? 'GOOD_SOIL';
      _selectedTruckType = existingJob['truck_type'] ?? 'T_25';
      _selectedPayerType = existingJob['payer_type'] ?? 'SITE_PAYS';
      _selectedWorkDate = DateTime.parse(existingJob['work_date']);
      _jobRequiredTrucksController.text = existingJob['required_trucks']?.toString() ?? '10';
      _jobUnitPriceController.text = existingJob['offered_unit_price']?.toString() ?? '50000';
      _jobMemoController.text = existingJob['memo'] ?? '';
    } else {
      _clearJobControllers();
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: AppColors.surface,
              insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  Icon(isEdit ? Icons.edit_calendar : Icons.add_alert_outlined, color: AppColors.success),
                  const SizedBox(width: 8),
                  Text(isEdit ? "기사 모집공고 수정" : "새 기사 모집공고 등록", style: AppTextStyles.h3),
                ],
              ),
              content: SizedBox(
                width: MediaQuery.of(context).size.width > 600 ? 520 : MediaQuery.of(context).size.width * 0.95,
                child: SingleChildScrollView(
                  child: Form(
                    key: _jobFormKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (!isEdit) ...[
                          Text("발주 공사현장", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          if (approvedSites.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                              child: Text("승인된 현장이 없습니다.", style: AppTextStyles.caption),
                            )
                          else
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.divider),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<int>(
                                  value: _selectedSiteId,
                                  dropdownColor: AppColors.surface,
                                  isExpanded: true,
                                  style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                                  onChanged: (value) => setDialogState(() => _selectedSiteId = value),
                                  items: approvedSites.map<DropdownMenuItem<int>>((s) {
                                    return DropdownMenuItem<int>(value: s['site_id'], child: Text(s['site_name'] ?? '현장'));
                                  }).toList(),
                                ),
                              ),
                            ),
                          const SizedBox(height: 12),
                          Text("하차지 설정 방식", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: RadioListTile<bool>(
                                  title: Text("매칭 대기", style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                                  value: false,
                                  groupValue: _isDirectMatching,
                                  contentPadding: EdgeInsets.zero,
                                  activeColor: AppColors.primary,
                                  onChanged: (val) => setDialogState(() {
                                    _isDirectMatching = val!;
                                    _selectedDropOffRequestId = null;
                                    _searchedDropOffRequest = null;
                                    _inviteCodeController.clear();
                                  }),
                                ),
                              ),
                              Expanded(
                                child: RadioListTile<bool>(
                                  title: Text("하차지 직접 선택", style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                                  value: true,
                                  groupValue: _isDirectMatching,
                                  contentPadding: EdgeInsets.zero,
                                  activeColor: AppColors.primary,
                                  onChanged: (val) => setDialogState(() {
                                    _isDirectMatching = val!;
                                    _selectedDropOffRequestId = null;
                                    _searchedDropOffRequest = null;
                                    _inviteCodeController.clear();
                                  }),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (_isDirectMatching) ...[
                            Text("하차지 초대코드 입력", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _inviteCodeController,
                                    style: TextStyle(color: AppColors.textPrimary),
                                    decoration: _buildInputDecoration("초대코드 입력 (예: DR-5)"),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                _isSearchingCode
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.success),
                                      )
                                    : ElevatedButton(
                                        onPressed: () => _searchDropOffByCode(_inviteCodeController.text, setDialogState),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.success,
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        child: const Text("검색"),
                                      ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (_searchedDropOffRequest != null) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.success.withValues(alpha: 0.05),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "🔍 검색된 하차지: ${_searchedDropOffRequest!['drop_off_name'] ?? '하차지'}",
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.success),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      "주소: ${_searchedDropOffRequest!['drop_off_address'] ?? '주소 미등록'}",
                                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      "단가: ${_searchedDropOffRequest!['unit_price']}원 / 토사: ${_translateMaterial(_searchedDropOffRequest!['material_type'])}",
                                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],
                            Text("또는 하차지 공고 목록에서 선택", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            if (_openDropOffRequests.isEmpty)
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                                child: Text("선택할 수 있는 활성 하차지 공고가 없습니다.", style: AppTextStyles.caption),
                              )
                            else
                              InkWell(
                                onTap: () => _openDropOffSearchDialog(setDialogState),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: AppColors.background,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppColors.divider),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _selectedDropOffRequestId == null
                                              ? "하차지 공고를 검색해 선택하세요"
                                              : _getDropOffRequestDisplayText(_selectedDropOffRequestId!),
                                          style: TextStyle(
                                            color: _selectedDropOffRequestId == null ? AppColors.textTertiary : AppColors.textPrimary,
                                            fontSize: 13,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const Icon(Icons.search, color: AppColors.success, size: 20),
                                    ],
                                  ),
                                ),
                              ),
                            const SizedBox(height: 12),
                          ],
                        ],
                        if (!_isDirectMatching || isEdit) ...[
                          Text("토사 종류", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.divider),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedMaterialType,
                                dropdownColor: AppColors.surface,
                                isExpanded: true,
                                style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                                onChanged: (value) => setDialogState(() => _selectedMaterialType = value!),
                                items: const [
                                  DropdownMenuItem(value: "GOOD_SOIL", child: Text("양질토")),
                                  DropdownMenuItem(value: "MUD_SOIL", child: Text("뻘흙")),
                                  DropdownMenuItem(value: "ROCK", child: Text("암버럭")),
                                  DropdownMenuItem(value: "MIXED", child: Text("혼합 토사")),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text("차량 규격", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.divider),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedTruckType,
                                dropdownColor: AppColors.surface,
                                isExpanded: true,
                                style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                                onChanged: (value) => setDialogState(() => _selectedTruckType = value!),
                                items: const [
                                  DropdownMenuItem(value: "T_15", child: Text("15톤")),
                                  DropdownMenuItem(value: "T_25", child: Text("25톤")),
                                  DropdownMenuItem(value: "T_27", child: Text("27톤")),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text("비용 지급 주체", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.divider),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedPayerType,
                                dropdownColor: AppColors.surface,
                                isExpanded: true,
                                style: AppTextStyles.body1.copyWith(color: AppColors.textPrimary),
                                onChanged: (value) => setDialogState(() => _selectedPayerType = value!),
                                items: const [
                                  DropdownMenuItem(value: "SITE_PAYS", child: Text("현장 지불")),
                                  DropdownMenuItem(value: "DROP_OFF_PAYS", child: Text("하차지 지불")),
                                  DropdownMenuItem(value: "FREE", child: Text("무상")),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        Text("작업 희망일", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () async {
                            await _selectDate();
                            setDialogState(() {});
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.divider),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text("${_selectedWorkDate.year}년 ${_selectedWorkDate.month}월 ${_selectedWorkDate.day}일"),
                                const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.success),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text("모집 덤프 대수", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _jobRequiredTrucksController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: AppColors.textPrimary),
                          decoration: _buildInputDecoration("대수 숫자 입력"),
                          validator: (value) => value == null || int.tryParse(value.trim()) == null ? "대수를 입력해 주세요" : null,
                        ),
                        if (!_isDirectMatching || isEdit) ...[
                          Text("상차지 제시 단가 (원)", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _jobUnitPriceController,
                            keyboardType: TextInputType.number,
                            style: TextStyle(color: AppColors.textPrimary),
                            decoration: _buildInputDecoration("단가 입력 (예: 50000)"),
                            validator: (value) => value == null || int.tryParse(value.trim()) == null ? "단가를 입력해 주세요" : null,
                          ),
                          const SizedBox(height: 12),
                          Text("안내 메모", style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _jobMemoController,
                            maxLines: 2,
                            style: TextStyle(color: AppColors.textPrimary),
                            decoration: _buildInputDecoration("기사 요청 메모"),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    _clearJobControllers();
                    Navigator.of(context).pop();
                  },
                  child: Text("취소", style: TextStyle(color: AppColors.textSecondary)),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (isEdit) {
                      _updateJobPost(existingJob['id']);
                    } else {
                      _registerJobPost();
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  child: Text(isEdit ? "저장" : "등록", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // 공고 상세 보기 다이얼로그
  void _showJobDetails(Map<String, dynamic> job) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.description_outlined, color: AppColors.success),
              const SizedBox(width: 8),
              Text("공고 상세 정보", style: AppTextStyles.h3),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailItem("발주 현장명", job['site_name'] ?? '현장명 없음'),
                _buildDetailItem("토사 종류", _translateMaterial(job['material_type'])),
                _buildDetailItem("차량 규격", _translateTruck(job['truck_type'])),
                _buildDetailItem("비용 지급", _translatePayer(job['payer_type'])),
                _buildDetailItem("모집 덤프 대수", "${job['required_trucks']}대"),
                _buildDetailItem("제시 단가", "${job['offered_unit_price']}원"),
                _buildDetailItem("작업 희망일", job['work_date']?.split("T")?.first ?? ''),
                _buildDetailItem("공고 상태", _translateStatus(job['status']), isHighlight: true),
                _buildDetailItem("기사 안내 메모", job['memo'] ?? '메모 없음'),
                if (job['matched_drop_off_id'] != null) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.link, size: 18, color: AppColors.success),
                      const SizedBox(width: 4),
                      Text("연결된 하차지 정보", style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _buildDetailItem("하차지명", job['drop_off_name']),
                  _buildDetailItem("하차지 주소", job['drop_off_address']),
                  _buildDetailItem("예상 운행 거리 / 시간", "${job['distance'] ?? '-'} km / ${job['estimated_time'] ?? '-'} 분"),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text("닫기", style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                _showJobVehiclesDialog(job);
              },
              icon: const Icon(Icons.local_shipping, size: 16, color: Colors.white),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.deepOrange),
              label: const Text("배차 차량 관제", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            if (job['status'] == 'WAITING_APPROVAL' && job['matched_drop_off_id'] != null)
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _approveMatch(job['id']);
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                child: const Text("매칭 승인", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            if (job['status'] == 'OPEN' || job['status'] == 'WAITING_MATCH' || job['status'] == 'WAITING_APPROVAL')
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _openJobDialog(existingJob: job);
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

  String _translateMaterial(String? val) {
    switch (val) {
      case 'GOOD_SOIL': return '양질토';
      case 'MUD_SOIL': return '뻘흙';
      case 'ROCK': return '암버럭';
      case 'MIXED': return '혼합 토사';
      default: return val ?? '';
    }
  }

  String _translateTruck(String? val) {
    switch (val) {
      case 'T_15': return '15톤';
      case 'T_25': return '25톤';
      case 'T_27': return '27톤';
      default: return val ?? '';
    }
  }

  String _translatePayer(String? val) {
    switch (val) {
      case 'SITE_PAYS': return '현장 지불';
      case 'DROP_OFF_PAYS': return '하차지 지불';
      case 'FREE': return '무상';
      default: return val ?? '';
    }
  }

  String _translateStatus(String? val) {
    switch (val) {
      case 'OPEN': return '모집중';
      case 'WAITING_APPROVAL': return '승인대기';
      case 'WAITING_MATCH': return '매칭대기';
      case 'ACTIVE': return '운행중';
      case 'COMPLETED': return '완료';
      case 'CANCELLED': return '취소';
      default: return val ?? '';
    }
  }

  Color _getStatusColor(String? val) {
    switch (val) {
      case 'OPEN': return AppColors.success;
      case 'WAITING_APPROVAL': return AppColors.warning;
      case 'WAITING_MATCH': return AppColors.primary;
      case 'COMPLETED': return AppColors.textSecondary;
      case 'CANCELLED': return AppColors.danger;
      default: return AppColors.textPrimary;
    }
  }

  InputDecoration _buildInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 13),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.divider)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.divider)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final approvedSites = _siteMappings.where((m) => m['status'] == 'APPROVED').toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        title: Text("공고 관리", style: AppTextStyles.h2),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.success),
            onPressed: _fetchMyJobs,
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: approvedSites.isEmpty
            ? () => _showErrorDialog("공고를 개설하기 전, 먼저 승인 완료된 공사현장이 필요합니다.")
            : () => _openJobDialog(),
        backgroundColor: approvedSites.isEmpty ? AppColors.divider : AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("새 공고 등록", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.success))
          : RefreshIndicator(
              onRefresh: _fetchMyJobs,
              child: _myJobs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment, color: AppColors.textTertiary, size: 64),
                          const SizedBox(height: 12),
                          Text("등록된 기사 모집공고가 없습니다.", style: AppTextStyles.body1.copyWith(color: AppColors.textSecondary)),
                          const SizedBox(height: 8),
                          Text("우측 하단 버튼을 눌러 새 공고를 추가하세요.", style: AppTextStyles.caption),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _myJobs.length,
                      itemBuilder: (context, index) {
                        final job = _myJobs[index];
                        final statusStr = job['status'];

                        return Card(
                          color: AppColors.surface,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: AppColors.divider),
                          ),
                          child: InkWell(
                            onTap: () => _showJobDetails(job),
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Builder(
                                          builder: (context) {
                                            final siteName = job['site_name'] ?? '현장명 없음';
                                            final mat = _translateMaterial(job['material_type']);
                                            final trk = _translateTruck(job['truck_type']);
                                            final hasDropOff = job['matched_drop_off_id'] != null || job['drop_off_name'] != null;
                                            final dropOffName = job['drop_off_name'] ?? '';

                                            if (hasDropOff) {
                                              return Text(
                                                "[$siteName] ➔ [$dropOffName]\n$mat 운반 ($trk)",
                                                style: AppTextStyles.h3.copyWith(fontSize: 13, height: 1.3),
                                              );
                                            } else {
                                              return Text(
                                                "[$siteName] $mat 반출\n(하차지 매칭 대기) • $trk",
                                                style: AppTextStyles.h3.copyWith(fontSize: 13, height: 1.3),
                                              );
                                            }
                                          },
                                        ),
                                        const SizedBox(height: 6),
                                        Text("작업일: ${job['work_date']?.split("T")?.first ?? ''}", style: AppTextStyles.caption),
                                        const SizedBox(height: 6),
                                        Text(
                                          "${job['offered_unit_price']}원 • ${job['required_trucks']}대 모집",
                                          style: TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
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
                                          color: _getStatusColor(statusStr).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          _translateStatus(statusStr),
                                          style: TextStyle(
                                            color: _getStatusColor(statusStr),
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


  Future<void> _fetchAvailableDropOffs() async {
    try {
      final res = await http.get(
        Uri.parse("$_baseUrl/api/drop-offs/all"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
        setState(() {
          _availableDropOffs = data;
        });
      }
    } catch (e) {
      debugPrint("사토장 목록 로드 실패: $e");
    }
  }

  // 🚛 [공고관리: 실시간 배차 차량 관제 및 하차지 변경 다이얼로그]
  Future<void> _showJobVehiclesDialog(Map<String, dynamic> job) async {
    final int jobId = job['id'] ?? 0;
    final String siteName = job['site_name'] ?? '현장';
    final String originalDropoff = job['drop_off_name'] ?? '지정 사토장';

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return FutureBuilder<List<dynamic>>(
              future: _fetchJobTickets(jobId),
              builder: (context, snapshot) {
                return AlertDialog(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  title: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.orange.withAlpha(30),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.local_shipping, color: Colors.deepOrange, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("[$siteName] 배차 차량 관제", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text("목적지: $originalDropoff | 배차 차량 실시간 현황", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  content: SizedBox(
                    width: MediaQuery.of(context).size.width > 600 ? 560 : MediaQuery.of(context).size.width * 0.95,
                    height: 440,
                    child: snapshot.connectionState == ConnectionState.waiting
                        ? const Center(child: CircularProgressIndicator())
                        : (snapshot.data == null || snapshot.data!.isEmpty)
                            ? const Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.check_circle_outline, color: Colors.green, size: 48),
                                    SizedBox(height: 12),
                                    Text("현재 배차되어 운행 중인 차량이 없습니다.", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                itemCount: snapshot.data!.length,
                                separatorBuilder: (_, __) => const Divider(height: 1),
                                itemBuilder: (ctx, idx) {
                                  final ticket = snapshot.data![idx];
                                  final driver = ticket['driver'] ?? {};
                                  final car = ticket['car'] ?? {};
                                  final String status = ticket['status'] ?? '';
                                  final int ticketId = ticket['id'] ?? 0;
                                  final String currentDropoff = ticket['changed_drop_off']?['name'] ?? originalDropoff;

                                  String statusKorean = "운행 중";
                                  Color statusColor = Colors.blue;
                                  if (status == "ACCEPTED") {
                                    statusKorean = "상차지로 이동 중";
                                    statusColor = Colors.teal;
                                  } else if (status == "ARRIVED_LOADING") {
                                    statusKorean = "상차지 도착";
                                    statusColor = Colors.indigo;
                                  } else if (status == "ARRIVED") {
                                    statusKorean = "하차지 도착";
                                    statusColor = Colors.orange;
                                  } else if (status == "REJECTED") {
                                    statusKorean = "반입 거부(대체지 필요)";
                                    statusColor = Colors.red;
                                  } else if (status == "APPROVED" || status == "COMPLETED") {
                                    statusKorean = "운행 완료";
                                    statusColor = Colors.grey;
                                  }

                                  final bool canChange = status == "DRIVING" || status == "ARRIVED" || status == "REJECTED";

                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Flexible(
                                                    child: Text(
                                                      "${car['car_number'] ?? '차량번호 미기재'} (${driver['name'] ?? '기사'})",
                                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: statusColor.withAlpha(25),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Text(
                                                      statusKorean,
                                                      style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                "목적지: $currentDropoff | 품목: ${_translateMaterial(ticket['actual_material_type'] ?? job['material_type'])}",
                                                style: TextStyle(color: Colors.grey.shade700, fontSize: 11),
                                              ),
                                              if (ticket['dropoff_rejection_reason'] != null)
                                                Padding(
                                                  padding: const EdgeInsets.only(top: 2),
                                                  child: Text(
                                                    "반려 사유: ${ticket['dropoff_rejection_reason']}",
                                                    style: const TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold),
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                        if (canChange)
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.deepOrange,
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                              minimumSize: Size.zero,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                            ),
                                            onPressed: () {
                                              Navigator.pop(dialogCtx);
                                              _showChangeMaterialDropoffDialog(
                                                job,
                                                ticket,
                                                carNumber: car['car_number'],
                                                driverName: driver['name'],
                                              );
                                            },
                                            child: const Text("하차지 변경", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                          ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(dialogCtx),
                      child: const Text("닫기"),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  Future<List<dynamic>> _fetchJobTickets(int jobId) async {
    try {
      final res = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/job/$jobId/tickets"),
        headers: {"Authorization": "Bearer ${widget.token}"},
      );
      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes));
      }
    } catch (e) {
      debugPrint("공고 티켓 조회 실패: $e");
    }
    return [];
  }

  // 🚨 [현장관리자: 특정 차량의 하차지 및 토질 긴급 변경 다이얼로그]
  void _showChangeMaterialDropoffDialog(
    Map<String, dynamic> job,
    Map<String, dynamic> ticket, {
    String? carNumber,
    String? driverName,
  }) {
    final int ticketId = ticket['id'] ?? 0;
    final String currentMaterial = ticket['actual_material_type'] ?? job['material_type'] ?? 'GOOD_SOIL';
    final int? currentDropoffId = ticket['changed_drop_off_id'] ?? (job['drop_off_id'] ?? job['dropoff_id']) as int?;

    String selectedMaterial = currentMaterial;
    int? selectedDropoffId = currentDropoffId;
    final reasonController = TextEditingController();

    final List<Map<String, String>> soilOptions = [
      {"code": "GOOD_SOIL", "label": "양질토 (일반 흙)"},
      {"code": "MUD_SOIL", "label": "뻘흙 / 함수비 과다"},
      {"code": "ROCK", "label": "암버럭 / 암석"},
      {"code": "MIXED", "label": "혼합토 / 폐콘혼합"},
      {"code": "SAND", "label": "모래 / 마사토"},
    ];

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.withAlpha(30),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.edit_location_alt_rounded, color: Colors.orange, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("목적지 사토장 긴급 변경", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text("운행 중 또는 하차지 대기 차량의 사토장 변경", style: TextStyle(color: Colors.grey, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.local_shipping, size: 18, color: Colors.blueGrey),
                          const SizedBox(width: 8),
                          Text(
                            "${carNumber ?? '배차 차량'} (${driverName ?? '기사'})",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text("1. 적재 자재(토질)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedMaterial,
                          isExpanded: true,
                          items: soilOptions.map((opt) {
                            return DropdownMenuItem<String>(
                              value: opt["code"],
                              child: Text(opt["label"]!, style: const TextStyle(fontSize: 13)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setDialogState(() => selectedMaterial = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text("2. 변경 목적지(대체 사토장)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: selectedDropoffId,
                          hint: const Text("변경할 사토장을 선택하세요", style: TextStyle(fontSize: 13)),
                          isExpanded: true,
                          items: _availableDropOffs.map<DropdownMenuItem<int>>((item) {
                            final int id = item['id'] ?? 0;
                            final String name = item['name'] ?? '사토장 #$id';
                            final String addr = item['address'] ?? '';
                            return DropdownMenuItem<int>(
                              value: id,
                              child: Text(
                                "$name ${addr.isNotEmpty ? '($addr)' : ''}",
                                style: const TextStyle(fontSize: 13),
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setDialogState(() => selectedDropoffId = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text("3. 변경 사유 입력", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: reasonController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: "예: 사토장 반입 거부 또는 현장 지시에 의한 변경",
                        hintStyle: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text("취소", style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () async {
                    if (selectedDropoffId == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("변경할 목적지 사토장을 선택해주세요.")),
                      );
                      return;
                    }
                    Navigator.pop(ctx);
                    await _executeChangeMaterialDropoff(
                      ticketId: ticketId,
                      materialType: selectedMaterial,
                      newDropoffId: selectedDropoffId!,
                      reason: reasonController.text.trim().isEmpty ? "현장 사정에 의한 긴급 변경" : reasonController.text.trim(),
                    );
                  },
                  child: const Text("하차지 변경 전송", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _executeChangeMaterialDropoff({
    required int ticketId,
    required String materialType,
    required int newDropoffId,
    required String reason,
  }) async {
    setState(() => _isLoading = true);
    try {
      final res = await http.patch(
        Uri.parse("$_baseUrl/api/dispatch/tickets/$ticketId/change-material-dropoff"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "actual_material_type": materialType,
          "new_drop_off_id": newDropoffId,
          "reason": reason,
        }),
      );

      if (res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("🎉 하차지가 성공적으로 변경되었습니다. 기사 앱 내비게이션 및 미터기에 실시간 반영됩니다."),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else {
        final err = jsonDecode(utf8.decode(res.bodyBytes));
        _showErrorDialog(err['detail'] ?? "하차지 변경 실패");
      }
    } catch (e) {
      _showErrorDialog("통신 오류 발생: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

}
