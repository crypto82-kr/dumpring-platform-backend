import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'package:url_launcher/url_launcher.dart';

class DriverDetailScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final int driverId;

  const DriverDetailScreen({
    super.key,
    required this.user,
    required this.token,
    required this.driverId,
  });

  @override
  State<DriverDetailScreen> createState() => _DriverDetailScreenState();
}

class _DriverDetailScreenState extends State<DriverDetailScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  bool _isLoading = false;
  bool _isSaving = false;
  Map<String, dynamic>? _driverInfo;
  List<dynamic> _availableCars = [];
  int? _selectedCarId;

  @override
  void initState() {
    super.initState();
    _fetchDriverAndCars();
  }

  Future<void> _fetchDriverAndCars() async {
    setState(() => _isLoading = true);
    try {
      // 1. Fetch Driver Details
      final detailResponse = await http.get(
        Uri.parse("$_baseUrl/api/fleet/driver-detail/${widget.driverId}"),
        headers: {"Authorization": "Bearer ${widget.token}"},
      );
      if (detailResponse.statusCode == 200) {
        _driverInfo = jsonDecode(utf8.decode(detailResponse.bodyBytes));
      }

      // 2. Fetch Owner's Cars
      final carsResponse = await http.get(
        Uri.parse("$_baseUrl/api/fleet/my-cars"),
        headers: {"Authorization": "Bearer ${widget.token}"},
      );
      if (carsResponse.statusCode == 200) {
        _availableCars = jsonDecode(utf8.decode(carsResponse.bodyBytes));
        
        // Find which car this driver is currently assigned to
        if (_driverInfo != null && _driverInfo!['car_number'] != '미배정') {
          for (var car in _availableCars) {
            if (car['car_number'] == _driverInfo!['car_number']) {
              _selectedCarId = car['id'];
              break;
            }
          }
        }
      }
    } catch (e) {
      debugPrint("기사 상세 로드 에러: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _assignVehicle() async {
    setState(() => _isSaving = true);
    try {
      if (_selectedCarId == null) {
        // If unassigning, find the current car of the driver and unassign
        int? currentCarId;
        if (_driverInfo != null && _driverInfo!['car_number'] != '미배정') {
          for (var car in _availableCars) {
            if (car['car_number'] == _driverInfo!['car_number']) {
              currentCarId = car['id'];
              break;
            }
          }
        }

        if (currentCarId != null) {
          await http.post(
            Uri.parse("$_baseUrl/api/fleet/assign-driver"),
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer ${widget.token}",
            },
            body: jsonEncode({
              "car_id": currentCarId,
              "driver_id": null,
            }),
          );
        }
      } else {
        final response = await http.post(
          Uri.parse("$_baseUrl/api/fleet/assign-driver"),
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer ${widget.token}",
          },
          body: jsonEncode({
            "car_id": _selectedCarId,
            "driver_id": widget.driverId,
          }),
        );
        if (response.statusCode != 200) {
          final decoded = jsonDecode(utf8.decode(response.bodyBytes));
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text("오류: ${decoded['detail'] ?? '배정 실패'}")),
            );
          }
        }
      }
      _fetchDriverAndCars();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("차량 배정 정보가 성공적으로 반영되었습니다.")),
        );
      }
    } catch (e) {
      debugPrint("차량 배정 에러: $e");
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _kickDriver() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("소속 기사 삭제", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text("'${_driverInfo?['name'] ?? '대기기사'}' 기사를 정말 소속 해제하시겠습니까?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("취소")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("삭제", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSaving = true);
    try {
      final response = await http.delete(
        Uri.parse("$_baseUrl/api/fleet/kick-driver/${widget.driverId}"),
        headers: {"Authorization": "Bearer ${widget.token}"},
      );
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("기사가 성공적으로 소속 해제되었습니다.")),
          );
          Navigator.pop(context, true);
        }
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("삭제 실패: ${decoded['detail'] ?? ''}")),
          );
        }
      }
    } catch (e) {
      debugPrint("기사 삭제 에러: $e");
    } finally {
      setState(() => _isSaving = false);
    }
  }

  void _viewDocumentImage(String url) {
    if (url.isEmpty) return;
    final sanitizedUrl = url.replaceAll(RegExp(r'(?<!:)/+'), '/');
    final String fullUrl = sanitizedUrl.startsWith("http") ? sanitizedUrl : "$_baseUrl$sanitizedUrl";

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            InteractiveViewer(
              child: Image.network(
                fullUrl,
                headers: {"Authorization": "Bearer ${widget.token}"},
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(40),
                  child: const Text("서류 이미지를 로딩할 수 없거나 PDF 파일입니다.", textAlign: TextAlign.center, style: TextStyle(color: Colors.black54)),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 30),
              onPressed: () => Navigator.pop(ctx),
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final info = _driverInfo;
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
        title: const Text("기사 상세 정보", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : info == null
              ? const Center(child: Text("기사 정보를 불러올 수 없습니다.", style: TextStyle(color: Colors.grey)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 기사 승인/대기 상태 정보 카드
                      Card(
                        color: AppColors.surface,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: AppColors.divider),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AppColors.primary.withOpacity(0.15),
                                    child: Icon(Icons.person, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          info['name'] ?? '선등록 대기기사',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          "연락처: ${info['phone_number'] ?? ''}",
                                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: info['is_approved'] == true
                                          ? AppColors.primary.withOpacity(0.15)
                                          : AppColors.danger.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      info['is_approved'] == true ? "승인완료" : "승인대기",
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: info['is_approved'] == true ? AppColors.primary : AppColors.danger,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 32),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text("현재 배정 차량 번호", style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                  Text(
                                    info['car_number'] ?? '미배정',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: info['car_number'] == '미배정' ? Colors.grey : AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              )
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // 차량 배정 설정 카드
                      Card(
                        color: AppColors.surface,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: AppColors.divider),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.directions_car, color: AppColors.primary, size: 20),
                                  const SizedBox(width: 8),
                                  Text("운행 차량 배정", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                                ],
                              ),
                              const Divider(height: 24),
                              DropdownButtonFormField<int?>(
                                value: _selectedCarId,
                                dropdownColor: AppColors.surface,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: AppColors.background,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.divider)),
                                ),
                                items: [
                                  const DropdownMenuItem<int?>(
                                    value: null,
                                    child: Text("미배정 (배정 해제)", style: TextStyle(fontSize: 14)),
                                  ),
                                  ..._availableCars.where((c) => c['driver_name'] == "미배정" || c['id'] == _selectedCarId).map((c) => DropdownMenuItem<int?>(
                                    value: c['id'] as int?,
                                    child: Text("${c['car_number']} (${c['tonnage']}톤)", style: const TextStyle(fontSize: 14)),
                                  )),
                                ],
                                onChanged: (val) {
                                  setState(() {
                                    _selectedCarId = val;
                                  });
                                },
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: _isSaving ? null : _assignVehicle,
                                child: _isSaving
                                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Text("배정 정보 저장 및 승인 처리", style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // 기사 제출 필수 서류 카드
                      Card(
                        color: AppColors.surface,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: AppColors.divider),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.description, color: AppColors.primary, size: 20),
                                  const SizedBox(width: 8),
                                  Text("기사 제출 서류 확인", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                                ],
                              ),
                              const Divider(height: 24),
                              if (info['documents'] == null || (info['documents'] as List).isEmpty)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 16),
                                  child: Center(
                                    child: Text(
                                      "기사님이 아직 필수 구비서류를 업로드하지 않았습니다.",
                                      style: TextStyle(color: Colors.grey, fontSize: 12),
                                    ),
                                  ),
                                )
                              else
                                ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: (info['documents'] as List).length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                                  itemBuilder: (context, idx) {
                                    final doc = info['documents'][idx];
                                    final String url = doc['file_url'] ?? '';
                                    return Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppColors.background,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(Icons.attachment_rounded, color: AppColors.primary),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  doc['code_name'] ?? '제출서류',
                                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                                ),
                                                Text(
                                                  doc['file_name'] ?? '',
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                                )
                                              ],
                                            ),
                                          ),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.surface,
                                              foregroundColor: AppColors.primary,
                                              side: BorderSide(color: AppColors.primary),
                                              minimumSize: const Size(60, 32),
                                              padding: const EdgeInsets.symmetric(horizontal: 10),
                                            ),
                                            onPressed: () => _viewDocumentImage(url),
                                            child: const Text("보기", style: TextStyle(fontSize: 12)),
                                          )
                                        ],
                                      ),
                                    );
                                  },
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),

                      // 기사 소속 해제(제거) 버튼
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.redAccent.withOpacity(0.15),
                          foregroundColor: Colors.redAccent,
                          side: const BorderSide(color: Colors.redAccent),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _isSaving ? null : _kickDriver,
                        icon: const Icon(Icons.delete_forever),
                        label: const Text("이 기사를 소속 해제 및 삭제", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
    );
  }
}
