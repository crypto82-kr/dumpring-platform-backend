import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'common_drawer.dart';

class OwnerHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final bool isApproved;
  final int initialTabIndex;

  const OwnerHomeScreen({
    Key? key,
    required this.user,
    required this.token,
    this.isApproved = false,
    this.initialTabIndex = 0,
  }) : super(key: key);

  @override
  State<OwnerHomeScreen> createState() => _OwnerHomeScreenState();
}

class _OwnerHomeScreenState extends State<OwnerHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String get _baseUrl => "https://dumpring-api.onrender.com";

  List<Map<String, dynamic>> _drivers = [];
  List<Map<String, dynamic>> _cars = [];
  bool _isLoading = true;
  late Map<String, dynamic> _currentUser;

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialTabIndex);
    _fetchAllData();
  }

  Future<void> _fetchAllData() async {
    setState(() => _isLoading = true);
    await Future.wait([_fetchDrivers(), _fetchCars()]);
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _fetchDrivers() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/fleet/my-drivers"),
        headers: {"Authorization": "Bearer ${widget.token}"},
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(response.bodyBytes));
        if (mounted) {
          setState(() {
            _drivers = data.map((d) => {
              "id": d["driver_id"],
              "name": d["name"] ?? "선등록 대기기사",
              "phone": d["phone_number"] ?? "",
              "car": d["car_number"] ?? "미배정",
              "status": (d["is_approved"] == true) ? "승인완료" : "승인대기",
              "tonnage": "${d['tonnage']}톤",
            }).toList().cast<Map<String, dynamic>>();
          });
        }
      }
    } catch (e) {
      debugPrint("기사 조회 오류: $e");
    }
  }

  Future<void> _fetchCars() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/fleet/my-cars"),
        headers: {"Authorization": "Bearer ${widget.token}"},
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(response.bodyBytes));
        if (mounted) {
          setState(() {
            _cars = data.map((c) => {
              "car_number": c["car_number"] ?? "",
              "tonnage": "${c['tonnage']} 톤",
              "driver": c["driver_name"] ?? "미배정",
              "status": "정상",
              "inspection_date": c["inspection_date"] ?? "미등록",
            }).toList().cast<Map<String, dynamic>>();
          });
        }
      }
    } catch (e) {
      debugPrint("차량 조회 오류: $e");
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // 기사 초대 바텀시트
  void _inviteDriverBottomSheet() {
    final TextEditingController phoneController = TextEditingController();
    final TextEditingController nameController = TextEditingController();

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
            const Row(
              children: [
                Icon(Icons.person_add, color: Color(0xFF004D5A)),
                SizedBox(width: 8),
                Text(
                  "신규 소속 기사 초대",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                ),
              ],
            ),
            const SizedBox(height: 20),

            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: "기사 성명",
                hintText: "예: 홍길동",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: "휴대폰 번호",
                hintText: "- 없이 입력",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 28),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("📲 입력하신 번호로 기사 초대 및 앱 설치 SMS 링크가 정상적으로 발송되었습니다."),
                    backgroundColor: Color(0xFF004D5A),
                  ),
                );
                _fetchDrivers();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF004D5A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("초대 문자 발송 및 선등록 완료", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // 차량 등록 바텀시트
  void _registerCarBottomSheet() {
    final TextEditingController numberController = TextEditingController();
    String tonnage = "25.5";

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
            const Row(
              children: [
                Icon(Icons.commute, color: Color(0xFF004D5A)),
                SizedBox(width: 8),
                Text(
                  "신규 소유 차량 등록",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
                ),
              ],
            ),
            const SizedBox(height: 20),

            TextField(
              controller: numberController,
              decoration: const InputDecoration(
                labelText: "차량 번호",
                hintText: "예: 서울80사1234",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: tonnage,
              decoration: const InputDecoration(
                labelText: "차량 규격 (톤수)",
                border: OutlineInputBorder(),
              ),
              items: ["15.0", "24.0", "25.5", "27.0"].map((e) {
                return DropdownMenuItem(value: e, child: Text("$e 톤"));
              }).toList(),
              onChanged: (val) {
                if (val != null) tonnage = val;
              },
            ),
            const SizedBox(height: 28),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("🚚 차량 마스터 정보 등록 및 본사 차량 검증 승인이 완료되었습니다."),
                    backgroundColor: Color(0xFF004D5A),
                  ),
                );
                _fetchCars();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF004D5A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("차량 마스터 정보 등록 완료", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D), // 피그마 다크 테마 통일
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
        backgroundColor: const Color(0xFF151C2C), // 다크 네이비 헤더
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("운송사 통합 관리 시스템", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFFFD700), // 형광 옐로우 골드
          labelColor: const Color(0xFFFFD700),
          unselectedLabelColor: const Color(0xFF8F9BB3),
          tabs: const [
            Tab(icon: Icon(Icons.people), text: "기사 관리"),
            Tab(icon: Icon(Icons.local_shipping), text: "차량 관리"),
            Tab(icon: Icon(Icons.payments), text: "수익/정산"),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 안전 점검 / 보험 만료 지능형 알림 위젯
            _buildSafetyAlarmWidget(),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildDriverTab(),
                  _buildCarTab(),
                  _buildEarningsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSafetyAlarmWidget() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: const BoxDecoration(
        color: Color(0xFF1E2638), // 다크 알림창
        border: Border(bottom: BorderSide(color: Color(0xFF222B45))),
      ),
      child: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Color(0xFFFFD700), size: 22), // 옐로우 경고 아이콘
          SizedBox(width: 12),
          Expanded(
            child: Text(
              "⚠️ [차량 관리 경보] 경기80아5678 차량의 정기안전점검 및 의무 보험 만료일이 7일 남았습니다. 만료 전 반드시 검사 갱신을 수행해 주세요.",
              style: TextStyle(color: Color(0xFFFFD700), fontSize: 11, fontWeight: FontWeight.bold, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  // 1. 기사 관리 탭
  Widget _buildDriverTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFFFD700)));
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("👨‍✈️ 소속 운전기사 리스트", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ElevatedButton.icon(
                onPressed: widget.isApproved
                    ? _inviteDriverBottomSheet
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text("🔒 가입 심사 승인 완료 후에 기사 등록이 가능합니다."),
                            backgroundColor: Colors.redAccent,
                          ),
                        );
                      },
                icon: const Icon(Icons.add, size: 16),
                label: const Text("기사 초대"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFD700),
                  foregroundColor: const Color(0xFF0A0F1D),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              )
            ],
          ),
          const SizedBox(height: 16),
          if (_drivers.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Center(
                child: Text("등록된 소속 기사가 없습니다.\n기사 초대 버튼을 눌러 기사를 추가해 주세요.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 14, height: 1.6)),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _drivers.length,
              itemBuilder: (context, index) {
                final d = _drivers[index];
                return Card(
                  color: const Color(0xFF151C2C),
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFF222B45), width: 1),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    title: Text(d['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    subtitle: Text(
                      "연락처: ${d['phone'] ?? ''} / 배정차량: ${d['car'] ?? '미배정'}\n규격: ${d['tonnage'] ?? ''}",
                      style: const TextStyle(color: Color(0xFF8F9BB3), fontSize: 12, height: 1.4),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: d['status'] == '승인완료'
                            ? const Color(0xFFFFD700).withOpacity(0.15)
                            : const Color(0xFF222B45),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: d['status'] == '승인완료'
                              ? const Color(0xFFFFD700).withOpacity(0.3)
                              : Colors.transparent,
                        ),
                      ),
                      child: Text(
                        d['status'] ?? '',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: d['status'] == '승인완료'
                              ? const Color(0xFFFFD700)
                              : const Color(0xFF8F9BB3),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // 2. 차량 관리 탭
  Widget _buildCarTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFFFD700)));
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("🚚 보유 덤프트럭 리스트", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ElevatedButton.icon(
                onPressed: widget.isApproved
                    ? _registerCarBottomSheet
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text("🔒 가입 심사 승인 완료 후에 차량 추가가 가능합니다."),
                            backgroundColor: Colors.redAccent,
                          ),
                        );
                      },
                icon: const Icon(Icons.add, size: 16),
                label: const Text("차량 추가"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFD700),
                  foregroundColor: const Color(0xFF0A0F1D),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              )
            ],
          ),
          const SizedBox(height: 16),
          if (_cars.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Center(
                child: Text("등록된 차량이 없습니다.\n차량 추가 버튼을 눌러 차량을 등록해 주세요.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF8F9BB3), fontSize: 14, height: 1.6)),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _cars.length,
              itemBuilder: (context, index) {
                final c = _cars[index];
                return Card(
                  color: const Color(0xFF151C2C),
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFF222B45), width: 1),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    title: Text(c['car_number'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    subtitle: Text(
                      "규격: ${c['tonnage'] ?? ''} / 배정기사: ${c['driver'] ?? '미배정'}\n다음 안전검사일: ${c['inspection_date'] ?? '미등록'}",
                      style: const TextStyle(color: Color(0xFF8F9BB3), fontSize: 12, height: 1.4),
                    ),
                    trailing: const Icon(Icons.check_circle, color: Color(0xFFFFD700)),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // 3. 수익/정산 탭
  Widget _buildEarningsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("💵 법인 매출 요약 대시보드", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 16),
          Card(
            color: const Color(0xFF151C2C),
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFF222B45), width: 1),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("이번 주 운송사 수령 정산금액", style: TextStyle(color: Color(0xFF8F9BB3), fontSize: 13)),
                  const SizedBox(height: 8),
                  const Text("5,420,000 원", style: TextStyle(color: Color(0xFFFFD700), fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text("(총 56건 운행 완료, 플랫폼 수수료 차감 완료)", style: TextStyle(color: Color(0xFF8F9BB3), fontSize: 11)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Divider(color: Color(0xFF222B45), thickness: 1.5),
          const SizedBox(height: 12),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(backgroundColor: Color(0xFF1E2638), child: Icon(Icons.account_balance, color: Color(0xFFFFD700))),
            title: Text("정산 수령 법인계좌 설정", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
            subtitle: Text("신한은행 110-123-456789 (예금주: 주식회사 덤프운송)", style: TextStyle(fontSize: 12, color: Color(0xFF8F9BB3))),
            trailing: Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF8F9BB3)),
          ),
        ],
      ),
    );
  }
}
