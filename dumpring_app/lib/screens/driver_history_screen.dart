import 'package:flutter/material.dart';

class DriverHistoryScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const DriverHistoryScreen({
    Key? key,
    required this.user,
    required this.token,
  }) : super(key: key);

  @override
  State<DriverHistoryScreen> createState() => _DriverHistoryScreenState();
}

class _DriverHistoryScreenState extends State<DriverHistoryScreen> {
  // 모의 운행 이력 목록
  final List<Map<String, dynamic>> _mockHistories = [
    {
      "id": 101,
      "date": "2026-05-27",
      "time": "14:15 ~ 14:50",
      "loading": "강남 아파트 신축공사 현장",
      "unloading": "신촌지구 사토장",
      "distance": "12.8 km",
      "duration": "35분",
      "fare": 97800,
      "status": "SETTLED", // 정산 완료
    },
    {
      "id": 102,
      "date": "2026-05-27",
      "time": "09:30 ~ 10:10",
      "loading": "강남 아파트 신축공사 현장",
      "unloading": "신촌지구 사토장",
      "distance": "13.1 km",
      "duration": "40분",
      "fare": 95200,
      "status": "APPROVED", // 지주 승인 (정산 예정)
    },
    {
      "id": 103,
      "date": "2026-05-26",
      "time": "16:00 ~ 16:45",
      "loading": "강남 아파트 신축공사 현장",
      "unloading": "수동 입력 사토지",
      "distance": "16.4 km",
      "duration": "45분",
      "fare": 128000,
      "status": "SETTLED",
    },
    {
      "id": 104,
      "date": "2026-05-25",
      "time": "11:00 ~ 11:35",
      "loading": "동작 빌라 재개발 현장",
      "unloading": "인천 영종도 사토장",
      "distance": "28.5 km",
      "duration": "35분",
      "fare": 185000,
      "status": "SETTLED",
    },
  ];

  // 상세 전표 다이얼로그
  void _showReceiptModal(Map<String, dynamic> item) {
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
                "덤프링 전자 전표",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A)),
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 12),
            _buildReceiptRow("전표 번호", "#DR-${item['id']}"),
            _buildReceiptRow("운행 날짜", item['date']),
            _buildReceiptRow("운행 시간", item['time']),
            _buildReceiptRow("상차지", item['loading']),
            _buildReceiptRow("하차지", item['unloading']),
            _buildReceiptRow("주행 거리", item['distance']),
            _buildReceiptRow("소요 시간", item['duration']),
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("정산 금액", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(
                  "${_formatter(item['fare'])} 원",
                  style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFFFF7A00), fontSize: 20),
                ),
              ],
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF004D5A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text("닫기", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(value, style: const TextStyle(color: Color(0xFF2D3748), fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 요약 실적 집계
    int totalSettled = 0;
    int totalPending = 0;
    for (var item in _mockHistories) {
      if (item['status'] == "SETTLED") {
        totalSettled += item['fare'] as int;
      } else {
        totalPending += item['fare'] as int;
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF1A202C)),
        title: const Text(
          "운행 이력 및 정산 내역",
          style: TextStyle(color: Color(0xFF1A202C), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 상단 총 정산 요약 카드 대시보드 (프리미엄 🚨)
            _buildSummaryDashboard(totalSettled, totalPending),

            // 이력 목록 영역
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: _mockHistories.length,
                itemBuilder: (context, index) {
                  final item = _mockHistories[index];
                  final bool isSettled = item['status'] == "SETTLED";

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      title: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            item['date'],
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isSettled ? const Color(0xFFE6F4EA) : const Color(0xFFFFF4E5),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              isSettled ? "입금완료" : "정산예정",
                              style: TextStyle(
                                color: isSettled ? Colors.green[800] : Colors.orange[800],
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.circle, color: Colors.blue, size: 10),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item['loading'],
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2D3748), fontSize: 14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.circle, color: Colors.orange, size: 10),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item['unloading'],
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2D3748), fontSize: 14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "${item['time']} (${item['distance']} / ${item['duration']})",
                            style: const TextStyle(color: Colors.grey, fontSize: 11),
                          )
                        ],
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            "${_formatter(item['fare'])} 원",
                            style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF004D5A), fontSize: 15),
                          ),
                          const SizedBox(height: 4),
                          const Icon(Icons.receipt_long_outlined, size: 18, color: Color(0xFFFF7A00)),
                        ],
                      ),
                      onTap: () => _showReceiptModal(item),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryDashboard(int settled, int pending) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSummaryItem("입금 완료액", settled, Colors.green[800]!),
              ),
              Container(width: 1, height: 40, color: const Color(0xFFE2E8F0)),
              Expanded(
                child: _buildSummaryItem("정산 대기액", pending, const Color(0xFFFF7A00)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, int amount, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Text(
          "${_formatter(amount)} 원",
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: color),
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
