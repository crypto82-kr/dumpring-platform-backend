import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'dart:async';
import 'dart:convert';
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

  // 진행 중인 배차 티켓 확인 API 연동
  Future<void> _checkActiveTicket() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/active-ticket"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        final ticket = jsonDecode(utf8.decode(response.bodyBytes));
        if (ticket != null && ticket['id'] != null) {
          setState(() {
            _isWaitingForDispatch = false;
          });
          if (!mounted) return;
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Text("진행 중인 운행 감지", style: TextStyle(fontWeight: FontWeight.bold)),
              content: Text("🚨 아직 완료되지 않은 운행(티켓 ID: #${ticket['id']})이 존재합니다.\n미터기 화면으로 이동하여 운행을 계속하시겠습니까?"),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text("취소", style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => DriverMeterScreen(
                          user: widget.user,
                          token: widget.token,
                          ticketId: ticket['id'],
                          onDriveCompleted: (earnings) {
                            setState(() {
                              _isWaitingForDispatch = true;
                            });
                            _loadOpenJobs();
                          },
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                  ),
                  child: Text("이동"),
                ),
              ],
            ),
          );
        } else {
          setState(() {
            _isWaitingForDispatch = true;
          });
        }
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
    return Scaffold(
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
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _loadOpenJobs(isRefresh: true),
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(20.0),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    // 2. 시군구 상세 검색 필터 탭 (전국 시군구 필터링 및 나의 관심 지역 통합 UI)
                    _buildLocationFilterPanel(),
                    const SizedBox(height: 20),
                  ]),
                ),
              ),

              // 4. 배차 모집 공고 리스트 (실시간 연동 데이터)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                sliver: _buildLiveJobsSliverList(),
              ),

              SliverPadding(
                padding: const EdgeInsets.all(20.0),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 20),
                    // 5. 오늘 실적 대시보드
                    _buildEarningsDashboard(),
                  ]),
                ),
              ),
            ],
          ),
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
            if (_selectedSido != null || _selectedSigungu != null || _searchController.text.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedSido = null;
                      _selectedSigungu = null;
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
                    Text(job['work_date'].toString().substring(0, 10), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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
                          ).then((_) {
                            _checkActiveTicket();
                            _loadOpenJobs();
                          });
                        }
                      : null,
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
}
