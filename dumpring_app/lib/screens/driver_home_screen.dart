import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'driver_meter_screen.dart';
import 'driver_history_screen.dart';
import 'driver_dispatch_confirm_screen.dart';
import 'common_drawer.dart';

class DriverHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final bool isApproved;

  const DriverHomeScreen({
    Key? key,
    required this.user,
    required this.token,
    this.isApproved = false,
  }) : super(key: key);

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> with SingleTickerProviderStateMixin {
  String get _baseUrl => "https://dumpring-api.onrender.com";

  bool _isWaitingForDispatch = false;
  List<dynamic> _openJobs = [];
  List<dynamic> _favorites = [];
  bool _isLoadingJobs = false;

  // 필터용 지역 설정 변수
  String? _selectedSido;
  String? _selectedSigungu;
  bool _useFavoritesFilter = false;

  // 전국 표준 시도/시군구 모의 맵 데이터 (간소화)
  final Map<String, List<String>> _koreanRegions = {
    "서울특별시": ["영등포구", "강남구", "마포구", "서초구", "송파구"],
    "경기도": ["김포시", "인천 검단", "고양시", "성남시", "수원시"],
    "인천광역시": ["서구", "중구", "남동구", "부평구"],
    "강원도": ["춘천시", "원주시", "강릉시"]
  };

  // 대시보드 데이터
  int _todayWorkCount = 0;
  int _todayEarnings = 0;
  int _monthlyEarnings = 3450000;

  late Map<String, dynamic> _currentUser;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _loadFavorites();
    _loadOpenJobs();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  // 1. 즐겨찾는 지역 조회 API 연동
  Future<void> _loadFavorites() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/favorites"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        setState(() {
          _favorites = jsonDecode(utf8.decode(response.bodyBytes));
        });
      }
    } catch (e) {
      debugPrint("즐겨찾는 지역 조회 실패: $e");
    }
  }

  // 2. 즐겨찾는 지역 추가 API 연동
  Future<void> _addFavorite(String sido, String sigungu) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/favorites"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "sido": sido,
          "sigungu": sigungu,
        }),
      );
      if (response.statusCode == 201) {
        _loadFavorites();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("⭐ $sido $sigungu 관심지역 추가 완료")),
        );
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("⚠️ ${err['detail'] ?? '등록 실패'}")),
        );
      }
    } catch (e) {
      debugPrint("관심지역 등록 실패: $e");
    }
  }

  // 3. 즐겨찾는 지역 삭제 API 연동
  Future<void> _deleteFavorite(int favId) async {
    try {
      final response = await http.delete(
        Uri.parse("$_baseUrl/api/dispatch/favorites/$favId"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        _loadFavorites();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("정상적으로 관심지역이 해제되었습니다.")),
        );
      }
    } catch (e) {
      debugPrint("관심지역 삭제 실패: $e");
    }
  }

  // 4. 전국 시군구 배차 검색 API 연동
  Future<void> _loadOpenJobs() async {
    setState(() {
      _isLoadingJobs = true;
    });

    try {
      String queryParams = "";
      if (_useFavoritesFilter) {
        queryParams = "?use_favorites=true";
      } else {
        List<String> params = [];
        if (_selectedSido != null) params.add("sido=$_selectedSido");
        if (_selectedSigungu != null) params.add("sigungu=$_selectedSigungu");
        if (params.isNotEmpty) queryParams = "?${params.join('&')}";
      }

      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/open-jobs$queryParams"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _openJobs = jsonDecode(utf8.decode(response.bodyBytes));
        });
      }
    } catch (e) {
      debugPrint("배차 공고 검색 실패: $e");
    } finally {
      setState(() {
        _isLoadingJobs = false;
      });
    }
  }

  // 5. 배차 수락 API 연동 및 운행 미터기 전환
  Future<void> _acceptJob(int jobId) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/jobs/$jobId/accept"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 201) {
        final ticket = jsonDecode(utf8.decode(response.bodyBytes));
        
        // 배차 수락 성공 시 미터기 주행 화면으로 이동
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => DriverMeterScreen(
              user: widget.user,
              token: widget.token,
              ticketId: ticket['id'],
              onDriveCompleted: (earnings) {
                setState(() {
                  _todayWorkCount += 1;
                  _todayEarnings += earnings;
                  _monthlyEarnings += earnings;
                });
                _loadOpenJobs();
              },
            ),
          ),
        );
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text("배차 수락 불가"),
            content: Text(err['detail'] ?? "이미 다른 기사가 수락하였거나 배차 가능 차량이 없습니다."),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text("확인"))
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("배차 수락 실패: $e");
    }
  }

  void _toggleWaitingState(bool val) {
    setState(() {
      _isWaitingForDispatch = val;
    });

    if (_isWaitingForDispatch) {
      _pulseController.repeat(reverse: true);
      _loadOpenJobs();
    } else {
      _pulseController.stop();
    }
  }

  // 관심지역 등록 다이얼로그 팝업
  void _showAddFavoriteDialog() {
    String? tempSido;
    String? tempSigungu;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text("⭐ 관심지역 즐겨찾기 추가", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: "시/도 선택"),
                value: tempSido,
                items: _koreanRegions.keys.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (val) {
                  setDialogState(() {
                    tempSido = val;
                    tempSigungu = null; // 시도 변경 시 시군구 리셋
                  });
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: "시/군/구 선택"),
                value: tempSigungu,
                items: tempSido == null
                    ? []
                    : _koreanRegions[tempSido]!.map((sg) => DropdownMenuItem(value: sg, child: Text(sg))).toList(),
                onChanged: (val) {
                  setDialogState(() {
                    tempSigungu = val;
                  });
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text("취소")),
            ElevatedButton(
              onPressed: (tempSido != null && tempSigungu != null)
                  ? () {
                      _addFavorite(tempSido!, tempSigungu!);
                      Navigator.pop(context);
                    }
                  : null,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF004D5A)),
              child: const Text("추가"),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D), // 피그마 다크 블루 테마 통일
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
        backgroundColor: const Color(0xFF151C2C), // 딥 그레이 헤더
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text("덤프링 기사용 홈 (Enterprise)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded, color: Color(0xFFFFD700)),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => DriverHistoryScreen(user: _currentUser, token: widget.token),
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadOpenJobs,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. 배차 수신 모드 토글
                _buildDispatchStatusPanel(),
                const SizedBox(height: 20),

                // 2. 시군구 상세 검색 필터 탭 (전국 시군구 필터링 UI)
                _buildLocationFilterPanel(),
                const SizedBox(height: 20),

                // 3. 기사 즐겨찾기(관심지역) 매니저
                _buildFavoritesManager(),
                const SizedBox(height: 20),

                // 4. 배차 모집 공고 리스트 (실시간 연동 데이터)
                _buildLiveJobsList(),
                const SizedBox(height: 20),

                // 5. 오늘 실적 대시보드
                _buildEarningsDashboard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDispatchStatusPanel() {
    return Card(
      color: const Color(0xFF151C2C), // 다크 카드
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFF222B45), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isWaitingForDispatch ? "실시간 배차 수신 중" : "배차 정지 상태",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: _isWaitingForDispatch ? const Color(0xFFFFD700) : Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text("대기 상태를 켜면 오더를 수락할 수 있습니다.", style: TextStyle(color: Color(0xFF8F9BB3), fontSize: 11)),
                  ],
                ),
                Switch(
                  value: _isWaitingForDispatch,
                  onChanged: _toggleWaitingState,
                  activeColor: const Color(0xFFFFD700),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationFilterPanel() {
    return Card(
      color: const Color(0xFF151C2C), // 다크 카드
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF222B45), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("📍 전국 시군구 배차 검색", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                Row(
                  children: [
                    const Text("즐겨찾는 지역만", style: TextStyle(fontSize: 11, color: Color(0xFF8F9BB3))),
                    const SizedBox(width: 4),
                    Checkbox(
                      value: _useFavoritesFilter,
                      onChanged: (val) {
                        setState(() {
                          _useFavoritesFilter = val ?? false;
                        });
                        _loadOpenJobs();
                      },
                      activeColor: const Color(0xFFFFD700),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (!_useFavoritesFilter)
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(horizontal: 12),
                        border: OutlineInputBorder(),
                        labelText: "시/도",
                      ),
                      value: _selectedSido,
                      items: _koreanRegions.keys.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12)))).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedSido = val;
                          _selectedSigungu = null;
                        });
                        _loadOpenJobs();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(horizontal: 12),
                        border: OutlineInputBorder(),
                        labelText: "시/군/구",
                      ),
                      value: _selectedSigungu,
                      items: _selectedSido == null
                          ? []
                          : _koreanRegions[_selectedSido]!.map((sg) => DropdownMenuItem(value: sg, child: Text(sg, style: const TextStyle(fontSize: 12)))).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedSigungu = val;
                        });
                        _loadOpenJobs();
                      },
                    ),
                  ),
                ],
              ),
            if (_selectedSido != null || _selectedSigungu != null)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedSido = null;
                      _selectedSigungu = null;
                    });
                    _loadOpenJobs();
                  },
                  icon: const Icon(Icons.refresh, size: 14),
                  label: const Text("필터 초기화 및 전체 조회", style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(foregroundColor: const Color(0xFFFF7A00)),
                ),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildFavoritesManager() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text("⭐ 나의 관심 배차 지역", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF2D3748))),
            TextButton.icon(
              onPressed: _showAddFavoriteDialog,
              icon: const Icon(Icons.add, size: 14),
              label: const Text("추가", style: TextStyle(fontSize: 12)),
              style: TextButton.styleFrom(foregroundColor: const Color(0xFF004D5A)),
            ),
          ],
        ),
        if (_favorites.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8.0),
            child: Text("등록된 관심 지역이 없습니다. 관심 지역을 추가하여 빠르게 필터링해 보세요.", style: TextStyle(color: Colors.grey, fontSize: 11)),
          )
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _favorites.map((fav) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: InputChip(
                    label: Text("${fav['sido']} ${fav['sigungu']}", style: const TextStyle(fontSize: 11)),
                    backgroundColor: Colors.white,
                    selectedColor: const Color(0xFFE2F0F2),
                    selected: _selectedSido == fav['sido'] && _selectedSigungu == fav['sigungu'],
                    onPressed: () {
                      setState(() {
                        _selectedSido = fav['sido'];
                        _selectedSigungu = fav['sigungu'];
                        _useFavoritesFilter = false;
                      });
                      _loadOpenJobs();
                    },
                    onDeleted: () => _deleteFavorite(fav['id']),
                    deleteIconColor: Colors.red[400],
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildLiveJobsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text("📡 매칭 가능 실시간 배차 공고", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1A202C))),
        const SizedBox(height: 12),
        if (_isLoadingJobs)
          const Center(child: Padding(padding: EdgeInsets.all(20.0), child: CircularProgressIndicator()))
        else if (_openJobs.isEmpty)
          Container(
            height: 120,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Text("현재 조건에 매칭되는 활성화된 공고가 없습니다.", style: TextStyle(color: Colors.grey, fontSize: 12)),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _openJobs.length,
            itemBuilder: (context, index) {
              final job = _openJobs[index];
              return Card(
                color: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF004D5A).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text("매칭 모집중", style: TextStyle(color: Color(0xFF004D5A), fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                          Text("필요차량 ${job['required_trucks']}대", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.circle, color: Color(0xFF004D5A), size: 12),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "상차지: 현장 ID ${job['site_id']}", 
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF2D3748))
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.circle, color: Color(0xFFFF7A00), size: 12),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "하차지: 매칭 ID ${job['matched_drop_off_id'] ?? '지주 승인 완료'}", 
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF2D3748))
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("작업 예정일", style: TextStyle(color: Colors.grey, fontSize: 10)),
                              const SizedBox(height: 2),
                              Text(job['work_date'].toString().substring(0, 10), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          ElevatedButton(
                            onPressed: _isWaitingForDispatch
                                ? () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                          builder: (context) => DriverDispatchConfirmScreen(
                                            user: widget.user,
                                            token: widget.token,
                                            job: job,
                                            isApproved: widget.isApproved,
                                          ),
                                      ),
                                    ).then((_) => _loadOpenJobs());
                                  }
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFF7A00),
                              disabledBackgroundColor: Colors.grey[300],
                              elevation: 2,
                              shadowColor: const Color(0xFFFF7A00).withOpacity(0.3),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            ),
                            child: const Text("오더 확인", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
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

  Widget _buildEarningsDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          "📊 오늘의 정산 및 실적 요약",
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Card(
                color: Colors.white,
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
                      const Text("완료 건수", style: TextStyle(color: Colors.grey, fontSize: 11)),
                      const SizedBox(height: 6),
                      Text("$_todayWorkCount 건", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF004D5A))),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Card(
                color: Colors.white,
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
                      const Text("오늘 예상 수입", style: TextStyle(color: Colors.grey, fontSize: 11)),
                      const SizedBox(height: 6),
                      Text("${_formatter(_todayEarnings)} 원", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFFF7A00))),
                    ],
                  ),
                ),
              ),
            ),
          ],
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
