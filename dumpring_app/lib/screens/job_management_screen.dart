import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../shared/widgets/layouts/dr_scaffold.dart';

class JobManagementScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const JobManagementScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<JobManagementScreen> createState() => _JobManagementScreenState();
}

class _JobManagementScreenState extends State<JobManagementScreen> {
  String get _baseUrl => AppConfig.baseUrl;
  bool _isLoading = false;
  List<dynamic> _siteMappings = [];
  List<dynamic> _myJobs = [];

  // 공고 등록 및 수정에 필요한 상태 변수 및 컨트롤러
  final _jobFormKey = GlobalKey<FormState>();
  int? _selectedSiteId;
  String _selectedMaterialType = "GOOD_SOIL";
  String _selectedTruckType = "T_25";
  String _selectedPayerType = "SITE_PAYS";
  DateTime _selectedWorkDate = DateTime.now().add(const Duration(days: 1));

  final TextEditingController _jobRequiredTrucksController = TextEditingController(text: "10");
  final TextEditingController _jobUnitPriceController = TextEditingController(text: "50000");
  final TextEditingController _jobMemoController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchMySites();
    _fetchMyJobs();
  }

  @override
  void dispose() {
    _jobRequiredTrucksController.dispose();
    _jobUnitPriceController.dispose();
    _jobMemoController.dispose();
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

  // 신규 기사 모집 공고(JobPost) 등록 API 호출
  Future<void> _registerJobPost() async {
    if (!_jobFormKey.currentState!.validate()) return;
    if (_selectedSiteId == null) {
      _showErrorDialog("공고를 등록할 발주 공사현장을 선택해 주세요.");
      return;
    }

    setState(() => _isLoading = true);
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
    final endpoint = "$_baseUrl/api/jobs/jobs/$jobId";
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

  void _clearJobControllers() {
    _jobRequiredTrucksController.text = "10";
    _jobUnitPriceController.text = "50000";
    _jobMemoController.clear();
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
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  Icon(isEdit ? Icons.edit_calendar : Icons.add_alert_outlined, color: AppColors.success),
                  const SizedBox(width: 8),
                  Text(isEdit ? "기사 모집공고 수정" : "새 기사 모집공고 등록", style: AppTextStyles.h3),
                ],
              ),
              content: SingleChildScrollView(
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
                      ],
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
                      const SizedBox(height: 12),
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
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text("닫기", style: TextStyle(color: AppColors.textSecondary)),
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
      fillColor: AppColors.background,
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
                                        Text(
                                          "${_translateMaterial(job['material_type'])} • ${_translateTruck(job['truck_type'])}",
                                          style: AppTextStyles.h3,
                                        ),
                                        const SizedBox(height: 4),
                                        Text("현장명: ${job['site_name'] ?? '현장명 없음'}", style: AppTextStyles.caption),
                                        const SizedBox(height: 2),
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
                                          color: _getStatusColor(statusStr).withOpacity(0.15),
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
}
