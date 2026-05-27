import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
  // 모의 반입 한도 데이터
  final double _dailyLimitTons = 1000.0;
  double _currentImportedTons = 420.0;

  // 실시간 반입 대기 트럭 큐 목록
  final List<Map<String, dynamic>> _waitingTrucks = [
    {
      "id": 501,
      "car_number": "서울80사1234",
      "tonnage": "25.5 톤",
      "driver_name": "김철수 기사",
      "soil_type": "양질토",
      "eta": "방금 도착",
    },
    {
      "id": 502,
      "car_number": "경기80아5678",
      "tonnage": "15.0 톤",
      "driver_name": "이영희 기사",
      "soil_type": "암버럭",
      "eta": "3분 뒤 도착",
    }
  ];

  String get _baseUrl => "https://dumpring-api.onrender.com";
  bool _isLoadingB2B = false;

  // B2B 매칭 오더 승인 대기열 데이터 (하차지 승인 기능 🚨)
  final List<Map<String, dynamic>> _pendingB2BJobs = [
    {
      "id": 701,
      "site_name": "동작 재개발 현장",
      "required_trucks": 50,
      "work_date": "2026-05-28",
      "material_type": "양질토",
    },
    {
      "id": 702,
      "site_name": "강남 아파트 신축 현장",
      "required_trucks": 30,
      "work_date": "2026-05-29",
      "material_type": "암버럭",
    }
  ];

  // 최근 반입 완료 이력
  final List<Map<String, dynamic>> _completedImports = [
    {
      "car_number": "인천80바9876",
      "tonnage": 25.5,
      "soil": "양질토",
      "time": "16:45",
      "fare": 95000,
    },
    {
      "car_number": "경기80사4321",
      "tonnage": 24.0,
      "soil": "혼합토",
      "time": "15:20",
      "fare": 88000,
    }
  ];

  @override
  void initState() {
    super.initState();
    _fetchPendingB2BJobs();
  }

  // 백엔드 API에서 실시간 하차지 승인 대기 목록 조회
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
              "site_name": item["site_name"] ?? "매칭 요청 현장",
              "required_trucks": item["required_trucks"] ?? 10,
              "work_date": item["work_date"] ?? "일정 협의",
              "material_type": item["material_type"] ?? "양질토",
            });
          }
        });
      }
    } catch (e) {
      // 오프라인이거나 백엔드 연결 불가 시 데모/모의 데이터로 우아하게 대체
      debugPrint("⚠️ 백엔드 API 연결 실패 (모의 데모 모드로 자동 전환): $e");
    } finally {
      setState(() {
        _isLoadingB2B = false;
      });
    }
  }

  // 백엔드 API를 호출하여 하차지 승인/반려 최종 변경 처리
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

        if (response.statusCode != 200 && response.statusCode != 201) {
          final errBody = jsonDecode(utf8.decode(response.bodyBytes));
          throw Exception(errBody["detail"] ?? "승인 처리 실패");
        }
      } catch (e) {
        debugPrint("⚠️ API 승인 요청 실패 (로컬 디바이스 모의 승인 완료 처리): $e");
      }
    }

    // 상태 동적 갱신 및 유저 알림
    setState(() {
      _pendingB2BJobs.removeWhere((element) => element['id'] == jobId);
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isApprove
            ? "🎉 ${job['site_name']} 현장의 ${job['required_trucks']}대 매칭 모집 오더가 최종 승인되어 기사들에게 공고(OPEN) 상태로 즉시 배포되었습니다."
            : "🔴 ${job['site_name']} 현장의 매칭 오더 요청이 반려되었습니다."),
        backgroundColor: isApprove ? Colors.green : Colors.red,
      ),
    );
  }

  // 새 가상 트럭 강제 도착 추가 (테스트 편의 기능 🚨)
  void _simulateIncomingTruck() {
    setState(() {
      final id = 500 + _waitingTrucks.length + 3;
      _waitingTrucks.add({
        "id": id,
        "car_number": "인천80아${1000 + id}",
        "tonnage": "25.5 톤",
        "driver_name": "홍길동 기사",
        "soil_type": "양질토",
        "eta": "방금 도착",
      });
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("🚚 [모의 신호] 새로운 덤프 트럭이 하차지 게이트에 도달했습니다."),
        backgroundColor: Color(0xFF004D5A),
      ),
    );
  }

  // 도착 차량 처리 다이얼로그 (승인/거부 분기)
  void _processIncomingTruck(Map<String, dynamic> truck) {
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
              // 헤더
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
                      truck['car_number'],
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),

              // 상세 내용 및 입력
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text("운송 기사: ${truck['driver_name']}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 6),
                    Text("신고 톤수: ${truck['tonnage']}", style: const TextStyle(fontSize: 13, color: Colors.grey)),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 8),
                    const Text(
                      "실제 반입 정보를 검증하고 승인해 주세요.",
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),

              // 액션 분기 버튼
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pop();
                        _rejectTruckFlow(truck);
                      },
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFF5F5),
                          borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20)),
                          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                        ),
                        child: const Text(
                          "반입 거부",
                          style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pop();
                        _approveTruckFlow(truck);
                      },
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.only(bottomRight: Radius.circular(20)),
                        ),
                        child: Text(
                          "반입 승인",
                          style: TextStyle(color: Colors.green[800], fontWeight: FontWeight.bold, fontSize: 14),
                        ),
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

  // 승인 폼 입력 바텀시트 (반입량 및 토사 입력)
  void _approveTruckFlow(Map<String, dynamic> truck) {
    final TextEditingController volumeController = TextEditingController(text: "25.5");
    String selectedSoil = "양질토";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.green, size: 24),
                const SizedBox(width: 8),
                Text(
                  "${truck['car_number']} 반입 승인 정보 입력",
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 실제 반입 중량(t) 입력
            const Text("실제 반입 중량 (톤 단위)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
            const SizedBox(height: 8),
            TextField(
              controller: volumeController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFFF7FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
            ),
            const SizedBox(height: 20),

            // 실제 토사 종류 확인
            const Text("토사 종류 육안 검증", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: selectedSoil,
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFFF7FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
              items: ["양질토", "뻘흙", "암버럭", "혼합토"].map((e) {
                return DropdownMenuItem(value: e, child: Text(e));
              }).toList(),
              onChanged: (val) {
                if (val != null) selectedSoil = val;
              },
            ),
            const SizedBox(height: 28),

            // 최종 승인 및 정산 트리거 버튼
            ElevatedButton(
              onPressed: () {
                final double finalWeight = double.tryParse(volumeController.text) ?? 25.5;
                setState(() {
                  _waitingTrucks.removeWhere((element) => element['id'] == truck['id']);
                  _currentImportedTons += finalWeight;
                  _completedImports.insert(0, {
                    "car_number": truck['car_number'],
                    "tonnage": finalWeight,
                    "soil": selectedSoil,
                    "time": "${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}",
                    "fare": 95000,
                  });
                });
                Navigator.of(context).pop(); // 바텀시트 닫기
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("🎉 ${truck['car_number']} 차량 반입 승인 및 실시간 '정산 완료(정산 트리거)' 처리되었습니다."),
                    backgroundColor: Colors.green,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF004D5A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("정산 트리거 작동 및 승인완료", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // 반입 거부 입력 바텀시트
  void _rejectTruckFlow(Map<String, dynamic> truck) {
    final TextEditingController reasonController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.cancel, color: Colors.red, size: 24),
                const SizedBox(width: 8),
                Text(
                  "${truck['car_number']} 반입 거부 처리",
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red),
                ),
              ],
            ),
            const SizedBox(height: 20),

            const Text("반입 거부 및 회차 사유 입력", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF718096))),
            const SizedBox(height: 8),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                hintText: "허가 외 토사 종류 유입, 수용 한도 초과 등 사유 기입",
                filled: true,
                fillColor: const Color(0xFFF7FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
            ),
            const SizedBox(height: 28),

            ElevatedButton(
              onPressed: () {
                setState(() {
                  _waitingTrucks.removeWhere((element) => element['id'] == truck['id']);
                });
                Navigator.of(context).pop(); // 바텀시트 닫기
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("🔴 ${truck['car_number']} 차량 반입 거부 및 회차 지시(분쟁 처리 시스템 접수) 완료."),
                    backgroundColor: Colors.red,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("반입 거부 및 회차 명령", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildB2BMatchApprovalsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("🤝 B2B 매칭 오더 승인 대기열", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
            Text("지주 승인 필요", style: TextStyle(fontSize: 11, color: Color(0xFFFF7A00), fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),
        if (_isLoadingB2B)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24.0),
            child: Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF004D5A)),
              ),
            ),
          )
        else if (_pendingB2BJobs.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.grey, size: 36),
                  SizedBox(height: 8),
                  Text("승인 대기 중인 B2B 매칭 오더가 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                ],
              ),
            ),
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
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            job['site_name'],
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1A202C)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE6F4EA),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              job['material_type'],
                              style: const TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text("요청 날짜: ${job['work_date']}", style: const TextStyle(fontSize: 13, color: Color(0xFF718096))),
                      Text("요청 차량수: ${job['required_trucks']}대", style: const TextStyle(fontSize: 13, color: Color(0xFF718096))),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _approveB2BJob(job, false),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: const BorderSide(color: Colors.red),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text("반려", style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => _approveB2BJob(job, true),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF004D5A),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                elevation: 0,
                              ),
                              child: const Text("최종 승인", style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final double percent = (_currentImportedTons / _dailyLimitTons).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF004D5A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("하차지 관리 시스템", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_alert),
            onPressed: _simulateIncomingTruck, // 테스트용 모의 트럭 호출 🚨
          )
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. 일일 반입 수용량 한도 프로그레스 그래프
              _buildLimitCard(percent),
              const SizedBox(height: 24),

              // 2. B2B 매칭 오더 승인 대기열 (하차지 지주 승인)
              _buildB2BMatchApprovalsSection(),
              const SizedBox(height: 24),

              // 3. 실시간 대기 차량 목록 (확인/거부 큐)
              _buildWaitingQueueSection(),
              const SizedBox(height: 24),

              // 4. 최근 반입 완료 목록 및 정산 이력
              _buildCompletedSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLimitCard(double percent) {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "오늘의 토사 반입량 한도",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF2D3748)),
                ),
                Icon(Icons.bar_chart, color: Color(0xFFFF7A00)),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "${_currentImportedTons.toStringAsFixed(1)} 톤 수용",
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                ),
                Text(
                  "일일 한도 ${_dailyLimitTons.toStringAsFixed(0)} 톤",
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: percent,
                minHeight: 14,
                backgroundColor: const Color(0xFFE2E8F0),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFF7A00)),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "현재 전체 일일 허가 수용량의 ${(percent * 100).toStringAsFixed(1)}%가 반입 완료되었습니다.",
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaitingQueueSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("🚚 실시간 게이트 반입 대기열", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
            Text("실시간 수신 중", style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),
        if (_waitingTrucks.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(Icons.done_all, color: Colors.green, size: 36),
                  SizedBox(height: 8),
                  Text("현재 게이트에 대기 중인 덤프 트럭이 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                ],
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _waitingTrucks.length,
            itemBuilder: (context, index) {
              final truck = _waitingTrucks[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFFFF4E5),
                    child: Icon(Icons.airport_shuttle, color: Color(0xFFFF7A00)),
                  ),
                  title: Text(truck['car_number'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("${truck['driver_name']} / ${truck['tonnage']} (${truck['soil_type']})"),
                  trailing: ElevatedButton(
                    onPressed: () => _processIncomingTruck(truck),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF004D5A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: const Text("반입 처리", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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
        const Text("📊 오늘 반입 완료 이력 (실시간 정산)", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
        const SizedBox(height: 12),
        if (_completedImports.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text("오늘 반입 완료된 이력이 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          )
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
                  title: Text(item['car_number'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("수용 중량: ${item['tonnage']} 톤 (${item['soil']}) - ${item['time']}"),
                  trailing: Text(
                    "+ ${_formatter(item['fare'])} 원",
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 14),
                  ),
                ),
              );
            },
          ),
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
