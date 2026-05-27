import 'package:flutter/material.dart';

class OwnerHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const OwnerHomeScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<OwnerHomeScreen> createState() => _OwnerHomeScreenState();
}

class _OwnerHomeScreenState extends State<OwnerHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // 모의 기사 목록
  final List<Map<String, dynamic>> _drivers = [
    {
      "id": 201,
      "name": "강태풍 기사",
      "phone": "010-1234-5678",
      "car": "서울80사1234",
      "status": "운행 중",
      "rating": "4.9/5",
    },
    {
      "id": 202,
      "name": "조선풍 기사",
      "phone": "010-9876-5432",
      "car": "경기80아5678",
      "status": "배차 대기",
      "rating": "4.8/5",
    },
    {
      "id": 203,
      "name": "정직원 기사 (초대됨)",
      "phone": "010-5555-5555",
      "car": "미배정",
      "status": "가입 승인 대기",
      "rating": "신규",
    }
  ];

  // 모의 차량 목록
  final List<Map<String, dynamic>> _cars = [
    {
      "car_number": "서울80사1234",
      "tonnage": "25.5 톤",
      "driver": "강태풍 기사",
      "status": "정상",
      "inspection_date": "2026-06-25", // 만료 30일 이내
    },
    {
      "car_number": "경기80아5678",
      "tonnage": "15.0 톤",
      "driver": "조선풍 기사",
      "status": "정상",
      "inspection_date": "2026-06-03", // 만료 7일 이내
    }
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
                setState(() {
                  _drivers.add({
                    "id": 200 + _drivers.length + 1,
                    "name": "${nameController.text.trim()} 기사 (초대됨)",
                    "phone": phoneController.text.trim(),
                    "car": "미배정",
                    "status": "가입 승인 대기",
                    "rating": "신규",
                  });
                });
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("📲 입력하신 번호로 기사 초대 및 앱 설치 SMS 링크가 정상적으로 발송되었습니다."),
                    backgroundColor: Color(0xFF004D5A),
                  ),
                );
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
                setState(() {
                  _cars.add({
                    "car_number": numberController.text.trim(),
                    "tonnage": "$tonnage 톤",
                    "driver": "미지정 기사",
                    "status": "정상",
                    "inspection_date": "2026-12-31",
                  });
                });
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("🚚 차량 마스터 정보 등록 및 본사 차량 검증 승인이 완료되었습니다."),
                    backgroundColor: Color(0xFF004D5A),
                  ),
                );
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
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF004D5A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("운송사 통합 관리 시스템", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFFF7A00),
          labelColor: const Color(0xFFFF7A00),
          unselectedLabelColor: Colors.white70,
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
            // 안전 점검 / 보험 만료 지능형 알림 위젯 (WOW 요인 🚨)
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
      color: const Color(0xFFFFF4E5),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      border: const Border(bottom: BorderSide(color: Color(0xFFFFE6CC))),
      child: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Color(0xFFFF7A00), size: 22),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              "⚠️ [차량 관리 경보] 경기80아5678 차량의 정기안전점검 및 의무 보험 만료일이 7일 남았습니다. 만료 전 반드시 검사 갱신을 수행해 주세요.",
              style: TextStyle(color: Color(0xFF995C00), fontSize: 11, fontWeight: FontWeight.bold, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  // 1. 기사 관리 탭
  Widget _buildDriverTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("👨‍✈️ 소속 운전기사 리스트", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
              ElevatedButton.icon(
                onPressed: _inviteDriverBottomSheet,
                icon: const Icon(Icons.add, size: 16),
                label: const Text("기사 초대"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF004D5A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              )
            ],
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _drivers.length,
            itemBuilder: (context, index) {
              final d = _drivers[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  title: Text(d['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("연락처: ${d['phone']} / 배정차량: ${d['car']}"),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: d['status'] == '운행 중'
                          ? const Color(0xFFE6F4EA)
                          : (d['status'] == '배차 대기' ? const Color(0xFFFFF4E5) : const Color(0xFFF1F3F5)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      d['status'],
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: d['status'] == '운행 중'
                            ? Colors.green[800]
                            : (d['status'] == '배차 대기' ? Colors.orange[800] : Colors.grey[700]),
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
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("🚚 보유 덤프트럭 리스트", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
              ElevatedButton.icon(
                onPressed: _registerCarBottomSheet,
                icon: const Icon(Icons.add, size: 16),
                label: const Text("차량 추가"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF004D5A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              )
            ],
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _cars.length,
            itemBuilder: (context, index) {
              final c = _cars[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  title: Text(c['car_number'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("규격: ${c['tonnage']} / 배정기사: ${c['driver']}\n다음 안전검사일: ${c['inspection_date']}"),
                  trailing: const Icon(Icons.check_circle, color: Color(0xFF004D5A)),
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
    return const SingleChildScrollView(
      padding: EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text("💵 법인 매출 요약 대시보드", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A202C))),
          SizedBox(height: 16),
          Card(
            color: Color(0xFF004D5A),
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("이번 주 운송사 수령 정산금액", style: TextStyle(color: Colors.white70, fontSize: 13)),
                  SizedBox(height: 8),
                  Text("5,420,000 원", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text("(총 56건 운행 완료, 플랫폼 수수료 차감 완료)", style: TextStyle(color: Colors.white60, fontSize: 11)),
                ],
              ),
            ),
          ),
          SizedBox(height: 20),
          Divider(),
          SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(backgroundColor: Color(0xFFF1F3F5), child: Icon(Icons.account_balance, color: Colors.grey)),
            title: Text("정산 수령 법인계좌 설정", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text("신한은행 110-123-456789 (예금주: 주식회사 덤프운송)", style: TextStyle(fontSize: 12)),
            trailing: Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
