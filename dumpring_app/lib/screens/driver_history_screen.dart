import 'package:flutter/material.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';

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
  String get _baseUrl => AppConfig.baseUrl;

  List<dynamic> _histories = [];
  List<dynamic> _filteredHistories = [];
  bool _isLoading = false;

  // 검색 및 필터 변수
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";
  String _statusFilter = "ALL"; // "ALL", "APPROVED", "REJECTED", "CANCELLED"

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // API 연동: 기사 운행 이력 목록 조회
  Future<void> _fetchHistory() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/tickets/history?limit=100&offset=0"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          _histories = data;
          _applyFilter();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("⚠️ 이력을 불러오지 못했습니다. (코드: ${response.statusCode})")),
        );
      }
    } catch (e) {
      debugPrint("운행 이력 조회 실패: $e");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // 클라이언트 측 실시간 검색 및 필터 적용
  void _applyFilter() {
    setState(() {
      _filteredHistories = _histories.where((ticket) {
        // 1. 상태 필터 적용
        if (_statusFilter != "ALL" && ticket['status'] != _statusFilter) {
          return false;
        }

        // 2. 검색어 필터 적용
        if (_searchQuery.isNotEmpty) {
          final jp = ticket['job_post'];
          final siteName = jp != null ? (jp['site_name'] ?? "").toString().toLowerCase() : "";
          final dropOffName = jp != null ? (jp['drop_off_name'] ?? "").toString().toLowerCase() : "";
          final query = _searchQuery.toLowerCase();
          
          if (!siteName.contains(query) && !dropOffName.contains(query)) {
            return false;
          }
        }

        return true;
      }).toList();
    });
  }

  // 상세 전표 다이얼로그
  void _showReceiptModal(Map<String, dynamic> item) {
    final jp = item['job_post'] ?? {};
    final String workDate = jp['work_date'] != null 
        ? jp['work_date'].toString().substring(0, 10) 
        : (item['completed_at'] != null ? item['completed_at'].toString().substring(0, 10) : "-");

    final String startTime = item['driving_started_at'] != null 
        ? DateFormat('HH:mm').format(DateTime.parse(item['driving_started_at'])) 
        : "-";
    final String endTime = item['completed_at'] != null 
        ? DateFormat('HH:mm').format(DateTime.parse(item['completed_at'])) 
        : "-";

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Text(
                "덤프링 전자 전표",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
            SizedBox(height: 16),
            Divider(color: AppColors.divider),
            SizedBox(height: 12),
            _buildReceiptRow("전표 번호", "#DR-${item['id']}"),
            _buildReceiptRow("운행 날짜", workDate),
            _buildReceiptRow("운행 시간", "$startTime ~ $endTime"),
            _buildReceiptRow("상차지", jp['site_name'] ?? "상차 현장"),
            _buildReceiptRow("하차지", jp['drop_off_name'] ?? "하차 사토장"),
            _buildReceiptRow("주행 거리", "${(item['drive_distance_km'] ?? 0.0).toStringAsFixed(1)} km"),
            _buildReceiptRow("소요 시간", "${(item['drive_time_seconds'] ?? 0) ~/ 60}분"),
            SizedBox(height: 12),
            Divider(color: AppColors.divider),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("정산 금액", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                Text(
                  "${_formatter(item['accumulated_fare'] ?? 0)} 원",
                  style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.warning, fontSize: 20),
                ),
              ],
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
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
          Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          Text(value, style: TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 실시간 총 정산 금액 집계
    int totalSettled = 0;
    int totalPending = 0;

    for (var item in _histories) {
      final fare = item['accumulated_fare'] as int? ?? 0;
      if (item['status'] == "APPROVED") {
        totalSettled += fare;
      } else if (item['status'] == "REJECTED") {
        totalPending += fare;
      }
    }

    return DRScaffold(
      type: DRLayoutType.sub,
      title: "운행 이력 및 정산 내역",
      body: SafeArea(
        child: Column(
          children: [
            // 1. 상단 실적 집계 대시보드
            _buildSummaryDashboard(totalSettled, totalPending),

            // 2. 검색 및 필터 패널
            _buildSearchAndFilterPanel(),

            // 3. 이력 목록 영역
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _fetchHistory,
                      child: _filteredHistories.isEmpty
                          ? const Center(
                              child: Text(
                                "조건에 부합하는 운행 이력이 없습니다.",
                                style: TextStyle(color: Colors.grey, fontSize: 13),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(20),
                              itemCount: _filteredHistories.length,
                              itemBuilder: (context, index) {
                                final item = _filteredHistories[index];
                                final jp = item['job_post'] ?? {};
                                final String status = item['status'];
                                final bool isApproved = status == "APPROVED";

                                final String workDate = jp['work_date'] != null 
                                    ? jp['work_date'].toString().substring(0, 10) 
                                    : (item['completed_at'] != null ? item['completed_at'].toString().substring(0, 10) : "-");

                                final String startTime = item['driving_started_at'] != null 
                                    ? DateFormat('HH:mm').format(DateTime.parse(item['driving_started_at'])) 
                                    : "-";
                                final String endTime = item['completed_at'] != null 
                                    ? DateFormat('HH:mm').format(DateTime.parse(item['completed_at'])) 
                                    : "-";

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  elevation: 0,
                                  color: AppColors.surface,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: BorderSide(color: AppColors.divider),
                                  ),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                    title: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          workDate,
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: isApproved 
                                                ? AppColors.success.withAlpha(30) 
                                                : (status == "REJECTED" ? AppColors.error.withAlpha(30) : AppColors.divider.withAlpha(30)),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            isApproved 
                                                ? "입금완료" 
                                                : (status == "REJECTED" ? "반출반려" : "운행취소"),
                                            style: TextStyle(
                                              color: isApproved 
                                                  ? AppColors.success 
                                                  : (status == "REJECTED" ? AppColors.error : AppColors.textSecondary),
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
                                            Icon(Icons.circle, color: AppColors.info, size: 10),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                jp['site_name'] ?? "상차 현장",
                                                style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 14),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            Icon(Icons.circle, color: AppColors.warning, size: 10),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                jp['drop_off_name'] ?? "하차 사토장",
                                                style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 14),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          "$startTime ~ $endTime (${(item['drive_distance_km'] ?? 0.0).toStringAsFixed(1)}km / ${(item['drive_time_seconds'] ?? 0) ~/ 60}분)",
                                          style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                        )
                                      ],
                                    ),
                                    trailing: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          "${_formatter(item['accumulated_fare'] ?? 0)} 원",
                                          style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary, fontSize: 15),
                                        ),
                                        const SizedBox(height: 4),
                                        Icon(Icons.receipt_long_outlined, size: 18, color: AppColors.warning),
                                      ],
                                    ),
                                    onTap: () => _showReceiptModal(item),
                                  ),
                                );
                              },
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // 요약 실적 집계 대시보드
  Widget _buildSummaryDashboard(int settled, int pending) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: _buildSummaryItem("입금 완료액 (승인)", settled, AppColors.success),
          ),
          Container(width: 1, height: 40, color: AppColors.divider),
          Expanded(
            child: _buildSummaryItem("반려 금액 (반려)", pending, AppColors.error),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, int amount, Color color) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Text(
          "${_formatter(amount)} 원",
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: color),
        ),
      ],
    );
  }

  // 검색 및 필터 패널
  Widget _buildSearchAndFilterPanel() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. 텍스트 검색창
          TextField(
            controller: _searchController,
            style: TextStyle(color: AppColors.textPrimary, fontSize: 13),
            decoration: InputDecoration(
              hintText: "상차지 또는 하차지명으로 검색",
              hintStyle: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              prefixIcon: Icon(Icons.search, color: AppColors.primary, size: 18),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 16),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = "";
                        });
                        _applyFilter();
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.divider),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
            onChanged: (val) {
              setState(() {
                _searchQuery = val.trim();
              });
              _applyFilter();
            },
          ),
          const SizedBox(height: 12),
          // 2. 상태 구분 필터 칩
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip("전체", "ALL"),
                const SizedBox(width: 8),
                _filterChip("입금완료", "APPROVED"),
                const SizedBox(width: 8),
                _filterChip("반출반려", "REJECTED"),
                const SizedBox(width: 8),
                _filterChip("운행취소", "CANCELLED"),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final bool isSelected = _statusFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _statusFilter = value;
          });
          _applyFilter();
        }
      },
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.background,
      labelStyle: TextStyle(
        color: isSelected 
            ? (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white)
            : AppColors.textSecondary,
        fontSize: 11,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.divider,
        ),
      ),
    );
  }

  String _formatter(int val) {
    return val.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}
