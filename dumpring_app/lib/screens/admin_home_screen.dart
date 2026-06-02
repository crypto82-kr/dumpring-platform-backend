import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'common_drawer.dart';

class AdminHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const AdminHomeScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Map<String, dynamic> _currentUser;

  // 1. 실제 승인 대기 회원 리스트
  List<Map<String, dynamic>> _pendingMembers = [];
  bool _isLoadingPending = false;
  String get _baseUrl => "https://dumpring-api.onrender.com";

  Future<void> _fetchPendingMembers() async {
    setState(() {
      _isLoadingPending = true;
    });

    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/auth/admin/pending-members"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes)) as List;
        setState(() {
          _pendingMembers = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
        });
      }
    } catch (e) {
      debugPrint("대기 회원 조회 실패: $e");
    } finally {
      setState(() {
        _isLoadingPending = false;
      });
    }
  }

  // 2. 실시간 배차 모니터링
  final List<Map<String, dynamic>> _activeDispatches = [
    {
      "id": 901,
      "site": "강남 아파트 신축공사",
      "drop_off": "신촌지구 사토장",
      "truck": "서울80사1234",
      "status": "상차지 이동 중",
    },
    {
      "id": 902,
      "site": "동작 재개발 지구",
      "drop_off": "김포 사토장",
      "truck": "경기80아5678",
      "status": "미터기 주행 중",
    }
  ];

  // 3. 분쟁 조정 목록
  final List<Map<String, dynamic>> _disputes = [
    {
      "id": 301,
      "driver": "임꺽정 기사",
      "drop_off": "인천 영종도 사토장",
      "issue": "육안 검사 시 뻘흙 판정으로 인한 회차 분쟁 발생",
      "status": "분쟁 검토 대기",
    }
  ];

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _tabController = TabController(length: 3, vsync: this);
    _fetchPendingMembers();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // 실제 회원 가입 승인 처리
  void _approveMember(Map<String, dynamic> member, bool isApprove) async {
    if (isApprove) {
      try {
        final response = await http.post(
          Uri.parse("$_baseUrl/api/auth/admin/members/${member['id']}/approve"),
          headers: {
            "Authorization": "Bearer ${widget.token}",
            "Content-Type": "application/json",
          },
        );

        if (response.statusCode == 200) {
          setState(() {
            _pendingMembers.removeWhere((element) => element['id'] == member['id']);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("📢 [심사 승인 완료] ${member['name']}님의 가입 신청이 최종 승인되었습니다."),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        debugPrint("승인 처리 실패: $e");
      }
    } else {
      // 반려 처리 - 반려 사유 입력 다이얼로그 표시
      final controller = TextEditingController();
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text("가입 신청 반려 사유 입력", style: TextStyle(fontWeight: FontWeight.bold)),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: "반려 사유를 입력해 주세요 (예: 서류 식별 불가)",
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text("취소", style: TextStyle(color: Colors.grey)),
            ),
            TextButton(
              onPressed: () async {
                final reason = controller.text.trim();
                if (reason.isEmpty) return;
                Navigator.of(context).pop();
                
                try {
                  final response = await http.post(
                    Uri.parse("$_baseUrl/api/auth/admin/members/${member['id']}/reject?reject_reason=$reason"),
                    headers: {
                      "Authorization": "Bearer ${widget.token}",
                      "Content-Type": "application/json",
                    },
                  );

                  if (response.statusCode == 200) {
                    setState(() {
                      _pendingMembers.removeWhere((element) => element['id'] == member['id']);
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("📢 [심사 반려 완료] ${member['name']}님의 가입 신청이 반려되었습니다."),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                } catch (e) {
                  debugPrint("반려 처리 실패: $e");
                }
              },
              child: const Text("반려 확정", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }
  }

  // 배차 강제 개입 처리
  void _interveneDispatch(Map<String, dynamic> dispatch) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("배차 강제 개입 통제", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text("차량 ${dispatch['truck']}의 운행 정보에 강제 개입합니다.\n운행 취소 또는 다른 대체 기사를 긴급 재배정할 수 있습니다."),
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                _activeDispatches.removeWhere((element) => element['id'] == dispatch['id']);
              });
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("🔴 플랫폼 강제 명령으로 해당 배차가 즉시 취소 및 회차 처리되었습니다."), backgroundColor: Colors.red),
              );
            },
            child: const Text("강제 운행 취소", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("닫기", style: TextStyle(color: Colors.grey)),
          )
        ],
      ),
    );
  }

  // 분쟁 강제 중재 정산 조정 처리
  void _resolveDispute(Map<String, dynamic> dispute) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(
              child: Text(
                "⚖️ 운송 분쟁 직권 중재 판결",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 12),
            const Text(
              "플랫폼이 기사 차량의 GPS 이동 궤적 로그 및 주행 거리 기록을 실시간 디코딩 분석한 결과, 하차지 반경 진입 후 회차 지시가 확인되었습니다. 운반비 70% 직권 정산 조정을 제안합니다.",
              style: TextStyle(fontSize: 12, color: Color(0xFF4A5568), height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _disputes.removeWhere((element) => element['id'] == dispute['id']);
                });
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("⚖️ [직권 중재 완료] 정산금 70% 지급 조정 명령(`SETTLE_ADJUSTED`)이 원장에 적용되었습니다."),
                    backgroundColor: Color(0xFF004D5A),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF004D5A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text("직권 정산 강제 조정 완료 (SETTLE_ADJUSTED)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
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
        backgroundColor: const Color(0xFF1A202C), // 플랫폼 마스터 어두운 그레이/블랙 헤더
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("덤프링 본사 총괄 Admin", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFFF7A00),
          labelColor: const Color(0xFFFF7A00),
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.verified_user), text: "가입 심사"),
            Tab(icon: Icon(Icons.monitor_heart), text: "실시간 배차"),
            Tab(icon: Icon(Icons.gavel), text: "분쟁 중재"),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildApprovalTab(),
            _buildMonitorTab(),
            _buildDisputeTab(),
          ],
        ),
      ),
    );
  }

  // 1. 회원 가입 서류 심사 탭
  Widget _buildApprovalTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("📋 신규 가입 서류 심사 대기열", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
          const SizedBox(height: 16),
          if (_pendingMembers.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Text("심사 대기 중인 신규 가입 서류가 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _pendingMembers.length,
              itemBuilder: (context, index) {
                final m = _pendingMembers[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(m['type'], style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFF7A00), fontSize: 13)),
                            Text("ID: #${m['id']}", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(m['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF2D3748))),
                        const SizedBox(height: 4),
                        Text("첨부 서류: ${m['docs']}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => _approveMember(m, false),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.red,
                                  side: const BorderSide(color: Colors.red),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: const Text("반려 처리", style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => _approveMember(m, true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1A202C),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  elevation: 0,
                                ),
                                child: const Text("심사 승인", style: TextStyle(fontWeight: FontWeight.bold)),
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
      ),
    );
  }

  // 2. 실시간 배차 모니터링 탭
  Widget _buildMonitorTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("🛰️ 실시간 관제 및 배차 현황판", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _activeDispatches.length,
            itemBuilder: (context, index) {
              final d = _activeDispatches[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFFF7A00),
                    child: Icon(Icons.flash_on, color: Colors.white),
                  ),
                  title: Text("${d['site']} ➔ ${d['drop_off']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text("관제 차량: ${d['truck']} / 현재상태: ${d['status']}"),
                  trailing: ElevatedButton(
                    onPressed: () => _interveneDispatch(d),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red[50],
                      foregroundColor: Colors.red,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text("강제 개입", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // 3. 운송 분쟁 중재 조정 탭
  Widget _buildDisputeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("⚖️ 운임 및 반입 분쟁 중재 대기열", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
          const SizedBox(height: 16),
          if (_disputes.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Text("접수된 미결 분쟁이 없습니다.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _disputes.length,
              itemBuilder: (context, index) {
                final d = _disputes[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("덤프비/토질 분쟁", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13)),
                            Text("분쟁 코드: #DP-${d['id']}", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text("기사: ${d['driver']} / 사토장: ${d['drop_off']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 6),
                        Text(d['issue'], style: const TextStyle(color: Color(0xFF4A5568), fontSize: 12, height: 1.4)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => _resolveDispute(d),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1A202C),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            elevation: 0,
                          ),
                          child: const Center(
                            child: Text("GPS 분석 및 직권 중재 조정", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
