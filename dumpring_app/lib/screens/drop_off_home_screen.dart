import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'common_drawer.dart';

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

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _fetchPendingB2BJobs();
    _fetchArrivedTickets();
    
    // 2초마다 도착 차량을 실시간 갱신하는 타이머 가동 (실시간 양방향 매칭 연동 WOW 🚨)
    _refreshTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _fetchArrivedTickets();
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
                decoration: BoxDecoration(
                  color: Color(0xFF004D5A),
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.local_shipping, color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937))),
                    SizedBox(width: 8),
                    Text(
                      "티켓 ID: #${ticket['id']}",
                      style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)), fontSize: 16, fontWeight: FontWeight.bold),
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
                    SizedBox(height: 6),
                    Text("주행 거리: ${ticket['drive_distance_km']} km", style: TextStyle(fontSize: 13, color: Colors.grey)),
                    Text("누적 요금: ${ticket['accumulated_fare']} 원", style: TextStyle(fontSize: 13, color: Colors.grey)),
                    if (ticket['proof_photo'] != null) ...[
                      SizedBox(height: 16),
                      const Text("📸 현장 증빙 사진", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange)),
                      SizedBox(height: 8),
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
                    SizedBox(height: 16),
                    Divider(),
                    SizedBox(height: 8),
                    Text("실제 반입 상태를 검증하고 판정해 주세요.", style: TextStyle(fontSize: 12, color: Colors.grey)),
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
                        decoration: BoxDecoration(
                          color: Color(0xFFFFF5F5),
                          borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20)),
                          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                        ),
                        child: Text("반입 거부(회차)", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 14)),
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
                          color: Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.only(bottomRight: Radius.circular(20)),
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

  @override
  Widget build(BuildContext context) {
    final double percent = (_currentImportedTons / _dailyLimitTons).clamp(0.0, 1.0);

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
        title: Text("하차지 관리 시스템 (Enterprise)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)))),
        centerTitle: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            _fetchPendingB2BJobs();
            _fetchArrivedTickets();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildLimitCard(percent),
                SizedBox(height: 24),
                _buildB2BMatchApprovalsSection(),
                SizedBox(height: 24),
                _buildWaitingQueueSection(),
                SizedBox(height: 24),
                _buildCompletedSection(),
              ],
            ),
          ),
        ),
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
                Text("오늘의 토사 반입량 한도", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)))),
                Icon(Icons.bar_chart, color: Theme.of(context).colorScheme.primary),
              ],
            ),
            SizedBox(height: 20),
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
            SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: percent,
                minHeight: 14,
                backgroundColor: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB)) : const Color(0xFFE5E7EB)),
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
          children: [
            Text("🤝 B2B 매칭 오더 승인 대기열", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
            Text("지주 승인 필요", style: TextStyle(fontSize: 11, color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
          ],
        ),
        SizedBox(height: 12),
        if (_isLoadingB2B)
          Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator()))
        else if (_pendingB2BJobs.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24),
            decoration: BoxDecoration(
              color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(child: Text("대기 중인 B2B 매칭 오더가 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 12))),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _pendingB2BJobs.length,
            itemBuilder: (context, index) {
              final job = _pendingB2BJobs[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(job['site_name'], style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text("차량 ${job['required_trucks']}대", style: TextStyle(color: Colors.grey, fontSize: 11)),
                        ],
                      ),
                      Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          OutlinedButton(
                            onPressed: () => _approveB2BJob(job, false),
                            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                            child: Text("반려", style: TextStyle(fontSize: 11)),
                          ),
                          SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () => _approveB2BJob(job, true),
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF004D5A)),
                            child: Text("최종 승인", style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)), fontSize: 11)),
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
            Text("🚚 실시간 게이트 반입 대기열", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)))),
            Text("GPS 실시간 연동", style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
          ],
        ),
        SizedBox(height: 12),
        if (_arrivedTickets.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB)) : const Color(0xFFE5E7EB))),
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
                  title: Text("덤프트럭 티켓 #${ticket['id']}", style: TextStyle(fontWeight: FontWeight.bold, color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : const Color(0xFF1F2937)))),
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
                    child: Text("반입 검사", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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
        Text("📊 오늘 반입 완료 이력", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
        SizedBox(height: 12),
        if (_completedImports.isEmpty)
          Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("오늘 완료된 이력이 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 12)))
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _completedImports.length,
            itemBuilder: (context, index) {
              final item = _completedImports[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  title: Text(item['car_number'], style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("${item['soil']} - ${item['time']}"),
                  trailing: Text("+ ${_formatter(item['fare'])} 원", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                ),
              );
            },
          )
      ],
    );
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
