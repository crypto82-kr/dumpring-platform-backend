import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'dart:async';
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'driver_meter_screen.dart';
import 'driver_history_screen.dart';
import 'driver_dispatch_confirm_screen.dart';
import 'common_drawer.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';

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
  String get _baseUrl => AppConfig.baseUrl;

  bool _isWaitingForDispatch = true;
  List<dynamic> _openJobs = [];
  List<dynamic> _favorites = [];
  bool _isLoadingJobs = false;
  List<dynamic> _activeTickets = []; // 진행 중인 배차 티켓 목록

  // 날짜 필터
  DateTime? _selectedDate;

  // 페이징 상태 변수
  int _offset = 0;
  final int _limit = 20;
  bool _hasMore = true;
  bool _isLoadingMore = false;
  bool _showBackToTop = false;
  late ScrollController _scrollController;

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
  final TextEditingController _searchController = TextEditingController();

  // SharedPreferences 키 생성 (계정별 고유 키)
  String get _prefsKey => "favorites_filter_${_currentUser['id'] ?? widget.user['id'] ?? 'default'}";

  // 상태 로드
  Future<void> _loadFavoritesFilterState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        _useFavoritesFilter = prefs.getBool(_prefsKey) ?? false;
      });
    } catch (e) {
      debugPrint("SharedPreferences 로드 에러: $e");
    }
  }

  // 상태 저장
  Future<void> _saveFavoritesFilterState(bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefsKey, value);
    } catch (e) {
      debugPrint("SharedPreferences 저장 에러: $e");
    }
  }

  Future<void> _initAndLoadJobs() async {
    await _loadFavoritesFilterState();
    _loadOpenJobs(isRefresh: true);
  }

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _scrollController = ScrollController()..addListener(_scrollListener);
    _loadFavorites();
    _initAndLoadJobs();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkActiveTicket();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _scrollController.removeListener(_scrollListener);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _scrollListener() {
    if (!_scrollController.hasClients) return;

    try {
      final pixels = _scrollController.position.pixels;
      
      // 바닥 감지 시 추가 페이징 로드
      if (pixels >= _scrollController.position.maxScrollExtent - 200) {
        _loadMoreJobs();
      }

      // 400px 기준으로 탑 이동 버튼 활성화 여부 결정
      final show = pixels > 400;
      if (show != _showBackToTop) {
        setState(() {
          _showBackToTop = show;
        });
      }
    } catch (e) {
      debugPrint("스크롤 리스너 작동 오류: $e");
    }
  }

  Future<void> _loadMoreJobs() async {
    if (_isLoadingJobs || _isLoadingMore || !_hasMore) return;
    setState(() {
      _isLoadingMore = true;
    });
    _offset += _limit;
    await _loadOpenJobs(isRefresh: false);
    if (mounted) {
      setState(() {
        _isLoadingMore = false;
      });
    }
  }

  // 진행 중인 배차 티켓 확인 API 연동 (상태에 저장하여 상단 섹션으로 표시)
  Future<void> _checkActiveTicket() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/active-tickets"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        final List<dynamic> tickets = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          _activeTickets = tickets;
        });
      }
    } catch (e) {
      debugPrint("진행 중인 배차 확인 실패: $e");
    }
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
  Future<bool> _addFavorite(String sido, String sigungu) async {
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
        await _loadFavorites();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("⭐ $sido $sigungu 관심지역 추가 완료")),
          );
        }
        return true;
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("⚠️ ${err['detail'] ?? '등록 실패'}")),
          );
        }
        return false;
      }
    } catch (e) {
      debugPrint("관심지역 등록 실패: $e");
      return false;
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
          SnackBar(content: Text("정상적으로 관심지역이 해제되었습니다.")),
        );
      }
    } catch (e) {
      debugPrint("관심지역 삭제 실패: $e");
    }
  }

  // 4. 전국 시군구 배차 검색 API 연동
  Future<void> _loadOpenJobs({bool isRefresh = true}) async {
    if (isRefresh) {
      _offset = 0;
      _hasMore = true;
    }

    setState(() {
      _isLoadingJobs = isRefresh;
    });

    try {
      String queryParams = "?limit=$_limit&offset=$_offset";
      
      final String keyword = _searchController.text.trim();
      if (keyword.isNotEmpty) {
        queryParams += "&search=${Uri.encodeComponent(keyword)}";
      }

      // 날짜 필터
      if (_selectedDate != null) {
        final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate!);
        queryParams += "&work_date=$dateStr";
      }

      if (_useFavoritesFilter) {
        queryParams += "&use_favorites=true";
      } else {
        if (_selectedSido != null && _selectedSido != "전체") queryParams += "&sido=${Uri.encodeComponent(_selectedSido!)}";
        if (_selectedSigungu != null && _selectedSigungu != "전체") queryParams += "&sigungu=${Uri.encodeComponent(_selectedSigungu!)}";
      }

      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/open-jobs$queryParams"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> fetchedJobs = jsonDecode(utf8.decode(response.bodyBytes));
        
        setState(() {
          if (isRefresh) {
            _openJobs = fetchedJobs;
          } else {
            _openJobs.addAll(fetchedJobs);
          }
          if (fetchedJobs.length < _limit) {
            _hasMore = false;
          }
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
            title: Text("배차 수락 불가"),
            content: Text(err['detail'] ?? "이미 다른 기사가 수락하였거나 배차 가능 차량이 없습니다."),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: Text("확인"))
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("배차 수락 실패: $e");
    }
  }



  // 관심지역 등록 다이얼로그 팝업
  void _showAddFavoriteDialog() {
    String? tempSido;
    String? tempSigungu;
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text("⭐ 관심지역 즐겨찾기 추가", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: isSaving
              ? const SizedBox(
                  height: 100,
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: "시/도 선택"),
                      value: tempSido,
                      items: _koreanRegions.keys.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      onChanged: (val) {
                        setDialogState(() {
                          tempSido = val;
                          tempSigungu = "전체"; // 시도 변경 시 기본값으로 '전체' 설정
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: "시/군/구 선택"),
                      value: tempSigungu,
                      items: tempSido == null
                          ? []
                          : [
                              const DropdownMenuItem(value: "전체", child: Text("전체")),
                              ..._koreanRegions[tempSido]!.map((sg) => DropdownMenuItem(value: sg, child: Text(sg)))
                            ],
                      onChanged: (val) {
                        setDialogState(() {
                          tempSigungu = val;
                        });
                      },
                    ),
                  ],
                ),
          actions: isSaving
              ? []
              : [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text("취소")),
                  ElevatedButton(
                    onPressed: (tempSido != null && tempSigungu != null)
                        ? () async {
                            final isDuplicate = _favorites.any((fav) =>
                                fav['sido'] == tempSido && fav['sigungu'] == tempSigungu);
                            if (isDuplicate) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text("⚠️ 이미 등록된 관심지역입니다: $tempSido $tempSigungu")),
                              );
                              Navigator.pop(context);
                              return;
                            }

                            setDialogState(() {
                              isSaving = true;
                            });

                            final success = await _addFavorite(tempSido!, tempSigungu!);
                            if (success) {
                              setState(() {
                                _useFavoritesFilter = true;
                              });
                              await _saveFavoritesFilterState(true);
                              _loadOpenJobs();
                            }

                            if (context.mounted) {
                              Navigator.pop(context);
                            }
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                    ),
                    child: const Text("추가"),
                  ),
                ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background, // 피그마 다크 블루 테마 통일
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
          backgroundColor: AppColors.surface, // 딥 그레이 헤더
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          title: Text(
            "덤프링",
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: AppColors.textPrimary,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: Icon(Icons.history_rounded, color: AppColors.primary),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => DriverHistoryScreen(user: _currentUser, token: widget.token),
                  ),
                );
              },
            ),
          ],
          bottom: TabBar(
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondary,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            tabs: const [
              Tab(text: "공고 검색"),
              Tab(text: "배차 현황"),
            ],
          ),
        ),
        body: SafeArea(
          child: TabBarView(
            children: [
              // 탭 1: 공고 검색
              RefreshIndicator(
                onRefresh: () => _loadOpenJobs(isRefresh: true),
                child: CustomScrollView(
                  controller: _scrollController,
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.all(20.0),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          // 검색 필터 패널 (날짜 필터 통합)
                          _buildLocationFilterPanel(),
                          const SizedBox(height: 20),
                        ]),
                      ),
                    ),
                    // 배차 모집 공고 리스트 (실시간 연동 데이터)
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      sliver: _buildLiveJobsSliverList(),
                    ),
                    const SliverPadding(
                      padding: EdgeInsets.only(bottom: 20),
                    ),
                  ],
                ),
              ),
              // 탭 2: 내 배차 & 정산
              RefreshIndicator(
                onRefresh: () async {
                  await _checkActiveTicket();
                },
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    // 진행 중인 배차 표시 (최상단)
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                      sliver: SliverToBoxAdapter(
                        child: _activeTickets.isNotEmpty
                            ? _buildActiveTicketsSection()
                            : Container(
                                height: 120,
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.divider),
                                ),
                                child: Center(
                                  child: Text(
                                    "현재 진행 중인 배차가 없습니다.",
                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                  ),
                                ),
                              ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.all(20.0),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          const SizedBox(height: 20),
                          // 오늘 실적 대시보드
                          _buildEarningsDashboard(),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        floatingActionButton: _showBackToTop
            ? FloatingActionButton(
                onPressed: () {
                  _scrollController.animateTo(
                    0.0,
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeInOut,
                  );
                },
                backgroundColor: AppColors.primary,
                foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                child: const Icon(Icons.arrow_upward),
              )
            : null,
      ),
    );
  }



  Widget _buildLocationFilterPanel() {
    return Card(
      color: AppColors.surface, // 다크 카드
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("📍 전국 현장 공고 검색", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                Row(
                  children: [
                    Text("관심지역", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    const SizedBox(width: 2),
                    Checkbox(
                      value: _useFavoritesFilter,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                      onChanged: (val) async {
                        final newValue = val ?? false;
                        setState(() {
                          _useFavoritesFilter = newValue;
                        });
                        await _saveFavoritesFilterState(newValue);
                        _loadOpenJobs();
                      },
                      activeColor: AppColors.primary,
                    ),
                    const SizedBox(width: 2),
                    TextButton.icon(
                      onPressed: _showAddFavoriteDialog,
                      icon: const Icon(Icons.add, size: 12),
                      label: const Text("추가", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                        foregroundColor: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "현장명, 하차지 또는 현장 ID 입력",
                      hintStyle: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      prefixIcon: Icon(Icons.search, color: AppColors.primary, size: 18),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.divider),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.primary, width: 1.5),
                      ),
                    ),
                    onSubmitted: (_) => _loadOpenJobs(),
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _loadOpenJobs,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text("조회", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            ),
            SizedBox(height: 12),
            // 날짜 필터 (검색 패널 통합)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _dateChip("전체", null),
                  _dateChip("오늘", DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day)),
                  _dateChip("내일", DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day).add(const Duration(days: 1))),
                  _dateChip("모레", DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day).add(const Duration(days: 2))),
                  _datePickerChip(),
                ],
              ),
            ),
            SizedBox(height: 12),
            if (!_useFavoritesFilter) ...[
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(),
                        labelText: "시/도",
                        labelStyle: TextStyle(fontSize: 12),
                      ),
                      value: _selectedSido,
                      items: [
                        const DropdownMenuItem(value: "전체", child: Text("전체", style: TextStyle(fontSize: 12))),
                        ..._koreanRegions.keys.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12))))
                      ],
                      onChanged: (val) {
                        setState(() {
                          _selectedSido = val;
                          _selectedSigungu = "전체"; // 기본적으로 '전체' 설정
                        });
                        _loadOpenJobs();
                      },
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(),
                        labelText: "시/군/구",
                        labelStyle: TextStyle(fontSize: 12),
                      ),
                      value: _selectedSigungu,
                      items: _selectedSido == null || _selectedSido == "전체"
                          ? [
                              const DropdownMenuItem(value: "전체", child: Text("전체", style: TextStyle(fontSize: 12))),
                            ]
                          : [
                              const DropdownMenuItem(value: "전체", child: Text("전체", style: TextStyle(fontSize: 12))),
                              ..._koreanRegions[_selectedSido]!.map((sg) => DropdownMenuItem(value: sg, child: Text(sg, style: const TextStyle(fontSize: 12))))
                            ],
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
            ],
            if (_selectedSido != null || _selectedSigungu != null || _searchController.text.isNotEmpty || _selectedDate != null)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedSido = null;
                      _selectedSigungu = null;
                      _selectedDate = null;
                      _searchController.clear();
                    });
                    _loadOpenJobs();
                  },
                  icon: const Icon(Icons.refresh, size: 14),
                  label: const Text("필터 초기화 및 전체 조회", style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(foregroundColor: AppColors.warning),
                ),
              ),
            if (_useFavoritesFilter) ...[
              const Divider(height: 24),
              _buildFavoritesManager(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFavoritesManager() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_favorites.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Text("등록된 관심 지역이 없습니다. 우측 상단의 '추가' 버튼을 눌러 등록해 보세요.", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
          )
        else
          Padding(
            padding: const EdgeInsets.only(top: 8.0, bottom: 4.0),
            child: Wrap(
              spacing: 8.0, // 칩 간 가로 간격
              runSpacing: 8.0, // 줄 바꿈 시 세로 간격
              children: _favorites.map((fav) {
                final String displayLabel = fav['sigungu'] == "전체"
                    ? "${fav['sido']} 전체"
                    : "${fav['sido']} ${fav['sigungu']}";
                return InputChip(
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  label: Text(displayLabel, style: const TextStyle(fontSize: 11)),
                  backgroundColor: AppColors.surface,
                  selectedColor: AppColors.primaryLight,
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
                  deleteIconColor: AppColors.danger,
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  // ── 진행 중인 배차 티켓 상단 섹션 (복수형 지원) ──
  Widget _buildActiveTicketsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          "📅 내 배차 현황 (${_activeTickets.length}건)",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 10),
        ..._activeTickets.map((ticket) => Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: _buildSingleActiveTicketCard(ticket),
        )).toList(),
      ],
    );
  }

  Widget _buildSingleActiveTicketCard(dynamic ticket) {
    final jobPost = ticket['job_post'];

    final String siteName = jobPost?['site_name'] ?? '현장명 없음';
    final String dropOffName = jobPost?['drop_off_name'] ?? '하차지명 없음';
    final String statusLabel = ticket['status'] == 'ACCEPTED'
        ? '수락 완료'
        : ticket['status'] == 'DRIVING'
            ? '운행 중'
            : ticket['status'] == 'ARRIVED'
                ? '도착 완료'
                : ticket['status'] ?? '진행 중';
    final Color statusColor = ticket['status'] == 'DRIVING'
        ? AppColors.primary
        : ticket['status'] == 'ARRIVED'
            ? AppColors.warning
            : Colors.green;

    // 공고 작업 예정일 정보 포맷팅 추가
    String workDateStr = "날짜 미정";
    if (jobPost?['work_date'] != null) {
      try {
        final parsedDate = DateTime.parse(jobPost['work_date']);
        // 로컬 시각(KST) 변환
        final kstDate = parsedDate.toLocal();
        workDateStr = "${kstDate.month}/${kstDate.day} (${['월', '화', '수', '목', '금', '토', '일'][kstDate.weekday - 1]})";
      } catch (e) {
        workDateStr = jobPost['work_date'].toString().substring(0, 10);
      }
    }

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => DriverDispatchConfirmScreen(
              user: widget.user,
              token: widget.token,
              job: jobPost,
              isApproved: widget.isApproved,
              ticket: ticket,
              hasDrivingTicket: _activeTickets.any((t) => t['status'] == 'DRIVING'),
            ),
          ),
        ).then((val) {
          if (val is Map && val['action'] == 'cancel') {
            final ticketId = val['ticketId'];
            setState(() {
              _activeTickets.removeWhere((t) => t['id'] == ticketId);
            });
          }
          _checkActiveTicket();
          _loadOpenJobs();
        });
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary.withAlpha(40), AppColors.warning.withAlpha(30)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.primary.withAlpha(120), width: 1.5),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(50),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withAlpha(120)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.local_shipping_rounded, color: statusColor, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        statusLabel,
                        style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text(
                  "작업일: $workDateStr",
                  style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Icon(Icons.circle, color: AppColors.primary, size: 10),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "상차: $siteName",
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13),
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
                    "하차: $dropOffName",
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // 거리/시간/단가 요약
            if (jobPost != null)
              Row(
                children: [
                  Icon(Icons.navigation_rounded, color: AppColors.textTertiary, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    jobPost['distance'] != null ? "${jobPost['distance']} km" : "거리 미정",
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.access_time_rounded, color: AppColors.textTertiary, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    jobPost['estimated_time'] != null ? "${jobPost['estimated_time']}분" : "시간 미정",
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.monetization_on_rounded, color: AppColors.primary, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    jobPost['offered_unit_price'] != null ? "${_formatter(jobPost['offered_unit_price'])}원" : "단가 미정",
                    style: TextStyle(color: AppColors.warning, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }


  // ── 날짜 선택 헬퍼 ──
  bool _isDateSelected(DateTime? target) {
    if (_selectedDate == null && target == null) return true;
    if (_selectedDate == null || target == null) return false;
    return _selectedDate!.year == target.year &&
        _selectedDate!.month == target.month &&
        _selectedDate!.day == target.day;
  }

  Widget _dateChip(String label, DateTime? date) {
    final selected = _isDateSelected(date);
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        showCheckmark: false,
        label: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
        selected: selected,
        selectedColor: AppColors.primaryLight,
        backgroundColor: AppColors.surface,
        side: BorderSide(color: selected ? AppColors.primary : AppColors.divider),
        labelStyle: TextStyle(
          color: selected ? AppColors.primary : AppColors.textSecondary,
          fontWeight: FontWeight.bold,
        ),
        onSelected: (_) {
          setState(() { _selectedDate = date; });
          _loadOpenJobs(isRefresh: true);
        },
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }

  Widget _datePickerChip() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final isCustom = _selectedDate != null &&
        !_isDateSelected(today) &&
        !_isDateSelected(today.add(const Duration(days: 1))) &&
        !_isDateSelected(today.add(const Duration(days: 2)));

    return ActionChip(
      avatar: isCustom ? null : Icon(Icons.calendar_month_rounded, size: 14, color: AppColors.textTertiary),
      label: Text(
        isCustom ? DateFormat('M/d (E)').format(_selectedDate!) : "달력",
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isCustom ? AppColors.primary : AppColors.textSecondary,
        ),
      ),
      backgroundColor: isCustom ? AppColors.primaryLight : AppColors.surface,
      side: BorderSide(color: isCustom ? AppColors.primary : AppColors.divider),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      onPressed: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: _selectedDate ?? today,
          firstDate: today.subtract(const Duration(days: 30)),
          lastDate: today.add(const Duration(days: 90)),
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: ColorScheme.dark(
                  primary: AppColors.primary,
                  onPrimary: Colors.white,
                  surface: AppColors.surface,
                  onSurface: AppColors.textPrimary,
                ),
              ),
              child: child!,
            );
          },
        );
        if (picked != null) {
          setState(() { _selectedDate = picked; });
          _loadOpenJobs(isRefresh: true);
        }
      },
    );
  }

  Widget _buildLiveJobsSliverList() {
    if (_isLoadingJobs) {
      return const SliverToBoxAdapter(
        child: Center(child: Padding(padding: EdgeInsets.all(20.0), child: CircularProgressIndicator())),
      );
    }
    
    if (_openJobs.isEmpty) {
      return SliverToBoxAdapter(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text("📡 실시간 등록 현장 공고", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
            SizedBox(height: 12),
            Container(
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.divider),
              ),
              child: Center(
                child: Text("현재 조건에 매칭되는 활성화된 현장 공고가 없습니다.", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ),
            ),
          ],
        ),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          if (index == 0) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text("📡 실시간 등록 현장 공고", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                SizedBox(height: 12),
                _buildJobCard(_openJobs[0]),
              ],
            );
          }
          if (index < _openJobs.length) {
            return _buildJobCard(_openJobs[index]);
          }
          // 로딩 인디케이터
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16.0),
            child: Center(child: CircularProgressIndicator()),
          );
        },
        childCount: _openJobs.length + (_isLoadingMore ? 1 : 0),
      ),
    );
  }

  Widget _buildJobCard(dynamic job) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider),
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
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text("기사 모집중", style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
                Text("모집 차량 ${job['required_trucks']}대", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
              ],
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.circle, color: AppColors.primary, size: 12),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "상차지: ${job['site_name'] ?? '현장 ID ${job['site_id']}'}", 
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.circle, color: AppColors.warning, size: 12),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "하차지: ${job['drop_off_name'] ?? '매칭 ID ${job['matched_drop_off_id'] ?? "지주 승인 완료"}'}", 
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            Row(
              children: [
                // 예상 거리
                Icon(Icons.navigation_rounded, color: AppColors.textTertiary, size: 14),
                SizedBox(width: 4),
                Text(
                  job['distance'] != null ? "${job['distance']} km" : "거리 미정",
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                SizedBox(width: 16),
                // 예상 소요시간
                Icon(Icons.access_time_rounded, color: AppColors.textTertiary, size: 14),
                SizedBox(width: 4),
                Text(
                  job['estimated_time'] != null ? "${job['estimated_time']}분" : "시간 미정",
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                SizedBox(width: 16),
                // 운반 단가
                Icon(Icons.monetization_on_rounded, color: AppColors.primary, size: 14),
                SizedBox(width: 4),
                Text(
                  job['offered_unit_price'] != null ? "${_formatter(job['offered_unit_price'])}원" : "단가 미정",
                  style: TextStyle(color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                   crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("작업 예정일", style: TextStyle(color: AppColors.textSecondary, fontSize: 10)),
                    SizedBox(height: 2),
                    Text(_formatWorkDate(job['work_date']), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (context) => DriverDispatchConfirmScreen(
                                user: widget.user,
                                token: widget.token,
                                job: job,
                                isApproved: widget.isApproved,
                                hasDrivingTicket: _activeTickets.any((t) => t['status'] == 'DRIVING'),
                              ),
                      ),
                    ).then((val) {
                      if (val != null) {
                        _checkActiveTicket();
                        _loadOpenJobs();
                      }
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.warning,
                    disabledBackgroundColor: AppColors.divider,
                    elevation: 2,
                    shadowColor: AppColors.warning.withAlpha(76),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                  child: Text("공고 확인", style: TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningsDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          "📊 오늘의 정산 및 실적 요약",
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Card(
                color: AppColors.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppColors.divider),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("완료 건수", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                      SizedBox(height: 6),
                      Text("$_todayWorkCount 건", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Card(
                color: AppColors.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppColors.divider),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("오늘의 운송 수익", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                      SizedBox(height: 6),
                      Text("${_formatter(_todayEarnings)} 원", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.warning)),
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

  String _formatWorkDate(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return "날짜 미정";
    try {
      final parsed = DateTime.parse(rawDate);
      final localDate = parsed.isUtc ? parsed.toLocal() : parsed;
      return "${localDate.year}-${localDate.month.toString().padLeft(2, '0')}-${localDate.day.toString().padLeft(2, '0')}";
    } catch (e) {
      if (rawDate.length >= 10) {
        return rawDate.substring(0, 10);
      }
      return rawDate;
    }
  }
}
