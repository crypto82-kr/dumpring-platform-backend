import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'common_drawer.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';

class DropOffHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const DropOffHomeScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<DropOffHomeScreen> createState() => _DropOffHomeScreenState();
}

class _DropOffHomeScreenState extends State<DropOffHomeScreen> {
  String get _baseUrl => AppConfig.baseUrl;

  // 모의 반입 한도 데이터
  final double _dailyLimitTons = 1000.0;
  double _currentImportedTons = 420.0;

  List<dynamic> _arrivedTickets = [];
  bool _isLoadingArrived = false;
  Timer? _refreshTimer;

  bool _isLoadingB2B = false;
  final List<Map<String, dynamic>> _pendingB2BJobs = [];
  final List<Map<String, dynamic>> _completedImports = [];
  late Map<String, dynamic> _currentUser;

  // 추가된 탭 및 매칭/설정용 상태 변수
  int _currentTabIndex = 0;
  List<dynamic> _waitingMatchJobs = [];
  bool _isLoadingWaitingMatch = false;
  List<dynamic> _myDropOffs = [];
  bool _isLoadingMyDropOffs = false;

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _fetchPendingB2BJobs();
    _fetchArrivedTickets();
    _fetchWaitingMatchJobs();
    _fetchMyDropOffs();
    
    // 2초마다 도착 차량을 실시간 갱신하는 타이머 가동 (실시간 양방향 매칭 연동 🚨)
    _refreshTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (_currentTabIndex == 0) {
        _fetchArrivedTickets();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  // 1. 하차지 게이트 진입 차량 실시간 조회 API 연동
  Future<void> _fetchArrivedTickets() async {
    if (_isLoadingArrived) return;
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/arrived-tickets"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _arrivedTickets = jsonDecode(utf8.decode(response.bodyBytes));
        });
      }
    } catch (e) {
      debugPrint("도착 차량 조회 실패: $e");
    }
  }

  // 2. 하차 최종 판정(승인/거절) API 연동
  Future<void> _submitInspection(int ticketId, String decision, String soilType) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/$ticketId/inspection"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "decision": decision,
          "soil_type": soilType,
        }),
      );

      if (response.statusCode == 200) {
        _fetchArrivedTickets();
        setState(() {
          if (decision == "APPROVED") {
            _currentImportedTons += 25.5; // 평균 중량 가산
            _completedImports.insert(0, {
              "car_number": "덤프 트럭 #$ticketId",
              "tonnage": 25.5,
              "soil": soilType,
              "time": "${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}",
              "fare": 95000,
            });
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(decision == "APPROVED" ? "🟢 최종 반입 승인 및 기사 정산 완료" : "🔴 반입 거부 및 회차 지시 완료"),
            backgroundColor: decision == "APPROVED" ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (e) {
      debugPrint("반입 처리 실패: $e");
    }
  }

  // B2B 매칭 오더 승인 대기열 데이터 (하차지 승인 기능 🚨)
  Future<void> _fetchPendingB2BJobs() async {
    setState(() {
      _isLoadingB2B = true;
    });

    final String url = "$_baseUrl/api/jobs/pending";
    try {
      final response = await http.get(
        Uri.parse(url),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer ${widget.token}",
        },
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          _pendingB2BJobs.clear();
          for (var item in data) {
            _pendingB2BJobs.add({
              "id": item["id"],
              "site_name": item["site_name"] ?? "매칭 요청 현장 #${item['site_id']}",
              "required_trucks": item["required_trucks"] ?? 10,
              "work_date": item["work_date"] ?? "일정 협의",
              "material_type": item["material_type"] ?? "GOOD_SOIL",
            });
          }
        });
      }
    } catch (e) {
      debugPrint("B2B 펜딩 조회 실패: $e");
    } finally {
      setState(() {
        _isLoadingB2B = false;
      });
    }
  }

  Future<void> _approveB2BJob(Map<String, dynamic> job, bool isApprove) async {
    final int jobId = job['id'];
    
    if (isApprove) {
      final String url = "$_baseUrl/api/jobs/$jobId/approve";
      try {
        final response = await http.patch(
          Uri.parse(url),
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer ${widget.token}",
          },
        ).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200 || response.statusCode == 201) {
          _fetchPendingB2BJobs();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("🎉 ${job['site_name']} 현장의 ${job['required_trucks']}대 매칭 모집 오더가 최종 승인되었습니다."),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        debugPrint("API 승인 실패: $e");
      }
    } else {
      setState(() {
        _pendingB2BJobs.removeWhere((element) => element['id'] == jobId);
      });
    }
  }

  // 매칭 대기 중인 상차지 공고 조회 (흐름 B)
  Future<void> _fetchWaitingMatchJobs() async {
    setState(() => _isLoadingWaitingMatch = true);
    final endpoint = "$_baseUrl/api/jobs/waiting-match";
    try {
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        setState(() {
          _waitingMatchJobs = jsonDecode(utf8.decode(response.bodyBytes));
        });
      }
    } catch (e) {
      debugPrint("매칭 대기 상차지 조회 실패: $e");
    } finally {
      setState(() => _isLoadingWaitingMatch = false);
    }
  }

  // 지주 소유의 하차지 목록 조회
  Future<void> _fetchMyDropOffs() async {
    setState(() => _isLoadingMyDropOffs = true);
    final endpoint = "$_baseUrl/api/drop-offs/me";
    try {
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );
      if (response.statusCode == 200) {
        setState(() {
          _myDropOffs = jsonDecode(utf8.decode(response.bodyBytes));
        });
      }
    } catch (e) {
      debugPrint("하차지 목록 조회 실패: $e");
    } finally {
      setState(() => _isLoadingMyDropOffs = false);
    }
  }

  // 상차지 매칭 요청 (지주 -> 현장공고)
  Future<void> _requestMatch(int jobId, int dropOffId) async {
    final endpoint = "$_baseUrl/api/jobs/$jobId/match";
    try {
      final response = await http.patch(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({"drop_off_id": dropOffId}),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 상차지 공고에 내 사토장을 매칭 요청했습니다. 현장관리자의 승인 후 기사 매칭이 시작됩니다.")),
        );
        _fetchWaitingMatchJobs();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showError(decoded["detail"] ?? "매칭 신청에 실패했습니다.");
      }
    } catch (e) {
      _showError("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    }
  }

  // 신규 하차지 생성
  Future<void> _registerNewDropOff(String name, String address, String permitNum, double lat, double lng, double radius) async {
    final endpoint = "$_baseUrl/api/drop-offs";
    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "name": name,
          "address": address,
          "permit_number": permitNum,
          "latitude": lat,
          "longitude": lng,
          "radius_meter": radius,
        }),
      );
      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 새로운 하차지가 개설되었습니다.")),
        );
        _fetchMyDropOffs();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showError(decoded["detail"] ?? "하차지 개설에 실패했습니다.");
      }
    } catch (e) {
      _showError("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    }
  }

  // 하차지 수용 조건 공고(DropOffRequest) 발행
  Future<void> _createDropOffRequest(int dropOffId, Map<String, dynamic> data) async {
    final endpoint = "$_baseUrl/api/drop-offs/$dropOffId/requests";
    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode(data),
      );
      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🎉 하차지 수용 공고(매립 수용 조건)가 활성화되어 등록되었습니다.")),
        );
        _fetchMyDropOffs();
      } else {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        _showError(decoded["detail"] ?? "수용 공고 개설에 실패했습니다.");
      }
    } catch (e) {
      _showError("서버 연결 실패. 네트워크 상태를 확인해 주세요.");
    }
  }

  void _showError(String msg) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: const Text("안내", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("확인"),
          )
        ],
      ),
    );
  }

  void _processIncomingTruck(dynamic ticket) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: EdgeInsets.zero,
        content: Container(
          width: 320,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                decoration: const BoxDecoration(
                  color: Color(0xFF004D5A),
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_shipping, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      "티켓 ID: #${ticket['id']}",
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text("주행 기사 ID: ${ticket['driver_id']}", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black))),
                    const SizedBox(height: 6),
                    Text("주행 거리: ${ticket['drive_distance_km']} km", style: const TextStyle(fontSize: 13, color: Colors.grey)),
                    Text("누적 요금: ${ticket['accumulated_fare']} 원", style: const TextStyle(fontSize: 13, color: Colors.grey)),
                    if (ticket['proof_photo'] != null) ...[
                      const SizedBox(height: 16),
                      const Text("📸 현장 증빙 사진", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange)),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          "$_baseUrl${ticket['proof_photo']}",
                          height: 160,
                          fit: BoxFit.cover,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return Container(
                              height: 160,
                              color: Colors.grey[200],
                              child: const Center(child: CircularProgressIndicator(color: Colors.orange)),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              height: 160,
                              color: Colors.grey[300],
                              child: const Center(child: Icon(Icons.broken_image, color: Colors.red, size: 40)),
                            );
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 8),
                    const Text("실제 반입 상태를 검증하고 판정해 주세요.", style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pop();
                        _submitInspection(ticket['id'], "REJECTED", "MUD_SOIL");
                      },
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFF5F5),
                          borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20)),
                          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                        ),
                        child: const Text("반입 거부(회차)", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pop();
                        _submitInspection(ticket['id'], "APPROVED", "GOOD_SOIL");
                      },
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4EA),
                          borderRadius: const BorderRadius.only(bottomRight: Radius.circular(20)),
                        ),
                        child: Text("반입 승인", style: TextStyle(color: Colors.green[800], fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ),
                ],
              )
            ],
          ),
        ),
      ),
    );
  }

  // Tab 0: 반입 관제 화면 빌드
  Widget _buildTab0Control() {
    final double percent = (_currentImportedTons / _dailyLimitTons).clamp(0.0, 1.0);
    return RefreshIndicator(
      onRefresh: () async {
        _fetchPendingB2BJobs();
        _fetchArrivedTickets();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildLimitCard(percent),
            const SizedBox(height: 20),
            _buildB2BMatchApprovalsSection(),
            const SizedBox(height: 20),
            _buildWaitingQueueSection(),
            const SizedBox(height: 20),
            _buildCompletedSection(),
          ],
        ),
      ),
    );
  }

  // Tab 1: 상차지 공고 조회 및 매칭 신청 화면 빌드
  Widget _buildTab1Matching() {
    return RefreshIndicator(
      onRefresh: () async {
        _fetchWaitingMatchJobs();
        _fetchMyDropOffs();
      },
      child: _isLoadingWaitingMatch
          ? const Center(child: CircularProgressIndicator(color: AppColors.success))
          : _waitingMatchJobs.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.assignment_late_outlined, color: Colors.grey, size: 64),
                      const SizedBox(height: 12),
                      Text(
                        "현재 매칭 대기 중인 상차지 공고가 없습니다.",
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white70 : Colors.black54), fontSize: 13),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _waitingMatchJobs.length,
                  itemBuilder: (context, index) {
                    final job = _waitingMatchJobs[index];
                    return Card(
                      color: Theme.of(context).cardColor,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB))),
                      ),
                      child: InkWell(
                        onTap: () => _showWaitingJobDetails(job),
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      job['site_name'] ?? '상차지 현장',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      "매칭 대기",
                                      style: TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text("토사 종류: ${_translateMaterial(job['material_type'])}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text("차량 규격: ${_translateTruck(job['truck_type'])}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text("작업 희망일: ${job['work_date']?.split("T")?.first ?? ''}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "${_formatter(job['offered_unit_price'] ?? 50000)}원",
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.amber),
                                  ),
                                  Text(
                                    "모집 대수: ${job['required_trucks']}대",
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
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
    );
  }

  void _showWaitingJobDetails(Map<String, dynamic> job) {
    int? selectedDropOffIdForMatch;
    if (_myDropOffs.isNotEmpty) {
      selectedDropOffIdForMatch = _myDropOffs.first['id'];
    }

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Theme.of(context).cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text("상차지 공고 상세 및 매칭 신청", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildPopupDetailItem("현장명", job['site_name'] ?? '현장명 없음'),
                    _buildPopupDetailItem("토사 종류", _translateMaterial(job['material_type'])),
                    _buildPopupDetailItem("차량 규격", _translateTruck(job['truck_type'])),
                    _buildPopupDetailItem("제시 단가", "${_formatter(job['offered_unit_price'] ?? 50000)}원"),
                    _buildPopupDetailItem("비용 지급", _translatePayer(job['payer_type'])),
                    _buildPopupDetailItem("모집 덤프 대수", "${job['required_trucks']}대"),
                    _buildPopupDetailItem("작업 희망일", job['work_date']?.split("T")?.first ?? ''),
                    _buildPopupDetailItem("안내 메모", job['memo'] ?? '메모 없음'),
                    const SizedBox(height: 16),
                    const Text("내 사토장 선택 (매칭 신청)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.success)),
                    const SizedBox(height: 6),
                    if (_myDropOffs.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: Colors.red.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                        child: const Text("매칭을 신청하려면 먼저 하차지를 등록하셔야 합니다.", style: TextStyle(color: Colors.red, fontSize: 11)),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.withOpacity(0.3)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<int>(
                            value: selectedDropOffIdForMatch,
                            dropdownColor: Theme.of(context).cardColor,
                            isExpanded: true,
                            style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black), fontSize: 12),
                            onChanged: (value) => setDialogState(() => selectedDropOffIdForMatch = value),
                            items: _myDropOffs.map<DropdownMenuItem<int>>((d) {
                              return DropdownMenuItem<int>(
                                value: d['id'],
                                child: Text(d['name'] ?? '하차지'),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text("닫기", style: TextStyle(color: Colors.grey)),
                ),
                if (_myDropOffs.isNotEmpty)
                  ElevatedButton(
                    onPressed: () {
                      if (selectedDropOffIdForMatch != null) {
                        Navigator.of(context).pop();
                        _requestMatch(job['id'], selectedDropOffIdForMatch!);
                      }
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.primary),
                    child: Text(
                      "매칭 신청",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                      ),
                    ),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildPopupDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  // Tab 2: 하차지 설정 및 수용 설정 화면 빌드
  Widget _buildTab2Settings() {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openRegisterDropOffDialog(),
        backgroundColor: Theme.of(context).colorScheme.primary,
        icon: Icon(Icons.add, color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white)),
        label: Text(
          "신규 하차지 등록",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          _fetchMyDropOffs();
        },
        child: _isLoadingMyDropOffs
            ? const Center(child: CircularProgressIndicator(color: AppColors.success))
            : _myDropOffs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.location_off_outlined, color: Colors.grey, size: 64),
                        const SizedBox(height: 12),
                        const Text(
                          "등록된 하차지(사토장)가 없습니다.",
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "우측 하단 버튼을 눌러 하차지를 새로 개설하세요.",
                          style: TextStyle(color: Colors.grey.withOpacity(0.6), fontSize: 11),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _myDropOffs.length,
                    itemBuilder: (context, index) {
                      final drop = _myDropOffs[index];
                      return Card(
                        color: Theme.of(context).cardColor,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB))),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    drop['name'] ?? '하차지',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      drop['status'] == 'ACTIVE' ? "운영중" : "정지됨",
                                      style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text("인허가번호: ${drop['permit_number']}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text("주소: ${drop['address']}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text("지오펜싱 범위: ${drop['radius_meter']} m", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  ElevatedButton.icon(
                                    onPressed: () => _openCreateDropOffRequestDialog(drop['id']),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF004D5A),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    icon: const Icon(Icons.campaign_outlined, size: 16, color: Colors.white),
                                    label: const Text("수용 공고 등록", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  void _openRegisterDropOffDialog() {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final addressController = TextEditingController();
    final permitController = TextEditingController();
    final latController = TextEditingController(text: "37.5665");
    final lngController = TextEditingController(text: "126.9780");
    final radiusController = TextEditingController(text: "200");

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Theme.of(context).cardColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text("신규 하차지(사토장) 등록", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameController,
                    style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                    decoration: const InputDecoration(labelText: "하차지명 (예: 김포 검단 사토장)"),
                    validator: (v) => v == null || v.trim().isEmpty ? "하차지명을 입력하세요" : null,
                  ),
                  TextFormField(
                    controller: addressController,
                    style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                    decoration: const InputDecoration(labelText: "주소 입력"),
                    validator: (v) => v == null || v.trim().isEmpty ? "주소를 입력하세요" : null,
                  ),
                  TextFormField(
                    controller: permitController,
                    style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                    decoration: const InputDecoration(labelText: "토사반입 인허가번호"),
                    validator: (v) => v == null || v.trim().isEmpty ? "인허가번호를 입력하세요" : null,
                  ),
                  TextFormField(
                    controller: latController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                    decoration: const InputDecoration(labelText: "하차지 위도 (GPS Latitude)"),
                    validator: (v) => double.tryParse(v ?? '') == null ? "위도 숫자를 입력하세요" : null,
                  ),
                  TextFormField(
                    controller: lngController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                    decoration: const InputDecoration(labelText: "하차지 경도 (GPS Longitude)"),
                    validator: (v) => double.tryParse(v ?? '') == null ? "경도 숫자를 입력하세요" : null,
                  ),
                  TextFormField(
                    controller: radiusController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                    decoration: const InputDecoration(labelText: "감지 범위 반경 (m)"),
                    validator: (v) => int.tryParse(v ?? '') == null ? "범위를 입력하세요" : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text("취소", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  Navigator.of(context).pop();
                  _registerNewDropOff(
                    nameController.text.trim(),
                    addressController.text.trim(),
                    permitController.text.trim(),
                    double.parse(latController.text.trim()),
                    double.parse(lngController.text.trim()),
                    double.parse(radiusController.text.trim()),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.primary),
              child: Text(
                "등록",
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  void _openCreateDropOffRequestDialog(int dropOffId) {
    final formKey = GlobalKey<FormState>();
    String selectedMaterial = "GOOD_SOIL";
    String selectedTruck = "T_25";
    String selectedPayer = "SITE_PAYS";
    String selectedPaymentMethod = "MONTHLY";
    final unitPriceController = TextEditingController(text: "45000");
    final targetQtyController = TextEditingController(text: "100");
    bool hasWashing = false;
    bool allowNight = false;
    bool allowRain = false;
    DateTime startDate = DateTime.now();
    DateTime endDate = DateTime.now().add(const Duration(days: 30));

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Theme.of(context).cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text("하차지 수용 공고 등록", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("수용 토사 종류", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                      DropdownButton<String>(
                        value: selectedMaterial,
                        dropdownColor: Theme.of(context).cardColor,
                        isExpanded: true,
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black), fontSize: 13),
                        onChanged: (v) => setDialogState(() => selectedMaterial = v!),
                        items: const [
                          DropdownMenuItem(value: "GOOD_SOIL", child: Text("양질토")),
                          DropdownMenuItem(value: "MUD_SOIL", child: Text("뻘흙")),
                          DropdownMenuItem(value: "ROCK", child: Text("암버럭")),
                          DropdownMenuItem(value: "MIXED", child: Text("혼합 토사")),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text("수용 차량 종류", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                      DropdownButton<String>(
                        value: selectedTruck,
                        dropdownColor: Theme.of(context).cardColor,
                        isExpanded: true,
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black), fontSize: 13),
                        onChanged: (v) => setDialogState(() => selectedTruck = v!),
                        items: const [
                          DropdownMenuItem(value: "T_15", child: Text("15톤")),
                          DropdownMenuItem(value: "T_25", child: Text("25톤")),
                          DropdownMenuItem(value: "T_27", child: Text("27톤")),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: unitPriceController,
                        keyboardType: TextInputType.number,
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                        decoration: const InputDecoration(labelText: "수용 단가 (원)"),
                        validator: (v) => int.tryParse(v ?? '') == null ? "수용 단가를 입력하세요" : null,
                      ),
                      TextFormField(
                        controller: targetQtyController,
                        keyboardType: TextInputType.number,
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                        decoration: const InputDecoration(labelText: "목표 수량 (대수)"),
                        validator: (v) => int.tryParse(v ?? '') == null ? "목표 수량을 입력하세요" : null,
                      ),
                      const SizedBox(height: 10),
                      const Text("비용 지급 주체", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                      DropdownButton<String>(
                        value: selectedPayer,
                        dropdownColor: Theme.of(context).cardColor,
                        isExpanded: true,
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black), fontSize: 13),
                        onChanged: (v) => setDialogState(() => selectedPayer = v!),
                        items: const [
                          DropdownMenuItem(value: "SITE_PAYS", child: Text("상차지(현장) 지불")),
                          DropdownMenuItem(value: "DROP_OFF_PAYS", child: Text("하차지(지주) 지불")),
                          DropdownMenuItem(value: "FREE", child: Text("무상")),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text("정산 방식", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                      DropdownButton<String>(
                        value: selectedPaymentMethod,
                        dropdownColor: Theme.of(context).cardColor,
                        isExpanded: true,
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black), fontSize: 13),
                        onChanged: (v) => setDialogState(() => selectedPaymentMethod = v!),
                        items: const [
                          DropdownMenuItem(value: "MONTHLY", child: Text("월정산")),
                          DropdownMenuItem(value: "DAILY", child: Text("주정산/일정산")),
                        ],
                      ),
                      const SizedBox(height: 10),
                      CheckboxListTile(
                        title: const Text("세륜시설 구비", style: TextStyle(fontSize: 12)),
                        value: hasWashing,
                        contentPadding: EdgeInsets.zero,
                        onChanged: (v) => setDialogState(() => hasWashing = v!),
                      ),
                      CheckboxListTile(
                        title: const Text("야간작업 수용 가능", style: TextStyle(fontSize: 12)),
                        value: allowNight,
                        contentPadding: EdgeInsets.zero,
                        onChanged: (v) => setDialogState(() => allowNight = v!),
                      ),
                      CheckboxListTile(
                        title: const Text("우천작업 수용 가능", style: TextStyle(fontSize: 12)),
                        value: allowRain,
                        contentPadding: EdgeInsets.zero,
                        onChanged: (v) => setDialogState(() => allowRain = v!),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text("취소", style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (formKey.currentState!.validate()) {
                      Navigator.of(context).pop();
                      _createDropOffRequest(dropOffId, {
                        "material_type": selectedMaterial,
                        "truck_type": selectedTruck,
                        "unit_price": int.parse(unitPriceController.text.trim()),
                        "target_quantity": int.parse(targetQtyController.text.trim()),
                        "payer_type": selectedPayer,
                        "payment_method": selectedPaymentMethod,
                        "has_washing_facility": hasWashing,
                        "night_work_allowed": allowNight,
                        "rain_work_allowed": allowRain,
                        "start_date": startDate.toIso8601String(),
                        "end_date": endDate.toIso8601String(),
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.primary),
                  child: Text(
                    "공고 발행",
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor, // 피그마 다크 테마 통일
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
        backgroundColor: Theme.of(context).cardColor, // 다크 네이비 헤더
        foregroundColor: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
        elevation: 0,
        title: Text(
          _currentTabIndex == 0
              ? "반입 관제 시스템"
              : _currentTabIndex == 1
                  ? "상차지 매칭 신청"
                  : "하차지 설정 및 수용 등록",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)),
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _currentTabIndex,
          children: [
            _buildTab0Control(),
            _buildTab1Matching(),
            _buildTab2Settings(),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTabIndex,
        onTap: (index) {
          setState(() {
            _currentTabIndex = index;
          });
          if (index == 0) {
            _fetchPendingB2BJobs();
            _fetchArrivedTickets();
          } else if (index == 1) {
            _fetchWaitingMatchJobs();
            _fetchMyDropOffs();
          } else if (index == 2) {
            _fetchMyDropOffs();
          }
        },
        backgroundColor: Theme.of(context).cardColor,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: "반입 관제"),
          BottomNavigationBarItem(icon: Icon(Icons.compare_arrows), label: "상차지 매칭"),
          BottomNavigationBarItem(icon: Icon(Icons.settings_outlined), label: "하차지 설정"),
        ],
      ),
    );
  }

  Widget _buildLimitCard(double percent) {
    return Card(
      color: Theme.of(context).cardColor, // 다크 카드
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB)), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("오늘의 토사 반입량 한도", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)))),
                Icon(Icons.bar_chart, color: Theme.of(context).colorScheme.primary),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "${_currentImportedTons.toStringAsFixed(1)} 톤 수용",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary),
                ),
                Text("일일 한도 ${_dailyLimitTons.toStringAsFixed(0)} 톤", style: TextStyle(fontSize: 12, color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF8F9BB3) : const Color(0xFF4B5563)))),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: percent,
                minHeight: 14,
                backgroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB)),
                valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildB2BMatchApprovalsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text("🤝 B2B 매칭 오더 승인 대기열", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            Text("지주 승인 필요", style: TextStyle(fontSize: 11, color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),
        if (_isLoadingB2B)
          const Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator()))
        else if (_pendingB2BJobs.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB))),
            ),
            child: const Center(child: Text("대기 중인 B2B 매칭 오더가 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 12))),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _pendingB2BJobs.length,
            itemBuilder: (context, index) {
              final job = _pendingB2BJobs[index];
              return Card(
                color: Theme.of(context).cardColor,
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB))),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(job['site_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text("차량 ${job['required_trucks']}대", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                        ],
                      ),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          OutlinedButton(
                            onPressed: () => _approveB2BJob(job, false),
                            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                            child: const Text("반려", style: TextStyle(fontSize: 11)),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () => _approveB2BJob(job, true),
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF004D5A)),
                            child: Text(
                              "최종 승인",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildWaitingQueueSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("🚚 실시간 게이트 반입 대기열", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)))),
            Text("GPS 실시간 연동", style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),
        if (_arrivedTickets.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB))),
            ),
            child: Center(child: Text("도착 대기 중인 트럭이 없습니다 (실시간 감지 작동 중)", style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF8F9BB3) : const Color(0xFF4B5563)), fontSize: 12))),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _arrivedTickets.length,
            itemBuilder: (context, index) {
              final ticket = _arrivedTickets[index];
              return Card(
                color: Theme.of(context).cardColor,
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB)), width: 1),
                ),
                child: ListTile(
                  title: Text("덤프트럭 티켓 #${ticket['id']}", style: TextStyle(fontWeight: FontWeight.bold, color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)))),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "기사 ID: ${ticket['driver_id']} | 거리 ${ticket['drive_distance_km']}km",
                        style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF8F9BB3) : const Color(0xFF4B5563))),
                      ),
                      if (ticket['status'] == 'WAITING_ABSENT_APPROVAL') ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.orange),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.camera_alt_outlined, size: 12, color: Colors.orange),
                              SizedBox(width: 4),
                              Text(
                                "지주 부재 (증빙 사진 제출됨)",
                                style: TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  trailing: ElevatedButton(
                    onPressed: () => _processIncomingTruck(ticket),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      elevation: 2,
                    ),
                    child: const Text("반입 검사", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildCompletedSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text("📊 오늘 반입 완료 이력", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        if (_completedImports.isEmpty)
          const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("오늘 완료된 이력이 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 12)))
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _completedImports.length,
            itemBuilder: (context, index) {
              final item = _completedImports[index];
              return Card(
                color: Theme.of(context).cardColor,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  title: Text(item['car_number'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("${item['soil']} - ${item['time']}"),
                  trailing: Text("+ ${_formatter(item['fare'])} 원", style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                ),
              );
            },
          )
      ],
    );
  }

  String _translateMaterial(String? type) {
    switch (type) {
      case "GOOD_SOIL": return "양질토";
      case "MUD_SOIL": return "뻘흙";
      case "ROCK": return "암버럭";
      case "MIXED": return "혼합 토사";
      default: return type ?? "일반토사";
    }
  }

  String _translateTruck(String? type) {
    switch (type) {
      case "T_15": return "15톤";
      case "T_25": return "25톤";
      case "T_27": return "27톤";
      default: return type ?? "25톤";
    }
  }

  String _translatePayer(String? type) {
    switch (type) {
      case "SITE_PAYS": return "현장 지불";
      case "DROP_OFF_PAYS": return "하차지 지불";
      case "FREE": return "무상";
      default: return type ?? "현장 지불";
    }
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
