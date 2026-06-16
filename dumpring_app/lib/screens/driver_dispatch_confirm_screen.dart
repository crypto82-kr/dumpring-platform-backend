import 'package:flutter/material.dart';
import '../shared/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'driver_meter_screen.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';

class DriverDispatchConfirmScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final Map<String, dynamic> job;
  final bool isApproved;
  final Map<String, dynamic>? ticket;
  final bool hasDrivingTicket;

  const DriverDispatchConfirmScreen({
    Key? key,
    required this.user,
    required this.token,
    required this.job,
    this.isApproved = false,
    this.ticket,
    this.hasDrivingTicket = false,
  }) : super(key: key);

  @override
  State<DriverDispatchConfirmScreen> createState() => _DriverDispatchConfirmScreenState();
}

class _DriverDispatchConfirmScreenState extends State<DriverDispatchConfirmScreen> {
  String get _baseUrl => AppConfig.baseUrl;
  bool _isSubmitting = false;
  Map<String, dynamic>? _ticket;

  bool _hasOtherDrivingTicket = false;

  @override
  void initState() {
    super.initState();
    _ticket = widget.ticket;
    _hasOtherDrivingTicket = widget.hasDrivingTicket;
    if (_ticket != null) {
      _checkDrivingInProgress();
      _reloadTicketStatus();
    }
  }

  Future<void> _checkDrivingInProgress() async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/active-tickets"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        final List<dynamic> tickets = jsonDecode(utf8.decode(response.bodyBytes));
        final hasOther = tickets.any((t) => t['status'] == 'DRIVING' && t['id'] != _ticket?['id']);
        if (mounted) {
          setState(() {
            _hasOtherDrivingTicket = hasOther;
          });
        }
      }
    } catch (e) {
      debugPrint("다른 운행 확인 실패: $e");
    }
  }

  bool _isWorkDateToday() {
    if (widget.job['work_date'] == null) return false;
    try {
      final parsed = DateTime.parse(widget.job['work_date']);
      final localDate = parsed.isUtc ? parsed.toLocal() : parsed;
      final now = DateTime.now();
      return localDate.year == now.year &&
          localDate.month == now.month &&
          localDate.day == now.day;
    } catch (e) {
      return false;
    }
  }

  bool _isStartButtonEnabled() {
    if (_ticket == null) return false;
    if (_ticket!['status'] != 'ACCEPTED') return true;
    if (!_isWorkDateToday()) return false;
    if (_hasOtherDrivingTicket) return false;
    return true;
  }

  // 1회당 단가 포맷용
  String _formatCurrency(int amount) {
    return amount.toString().replaceAllMapped(
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

  Future<void> _acceptDispatch() async {
    if (!widget.isApproved) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text("오더 수락 제한", style: TextStyle(fontWeight: FontWeight.bold)),
          content: Text("🔒 가입 심사가 완료되지 않았습니다.\n심사 승인 완료 후에 오더 수락 및 즉시 운행 시작이 가능합니다."),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("확인", style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold)),
            )
          ],
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/jobs/${widget.job['id']}/accept"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
          "Content-Type": "application/json",
        },
      );

      if (response.statusCode == 201) {
        if (!mounted) return;
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("🚀 배차 수락이 완료되었습니다. 내 배차 현황에서 확인 가능합니다."),
            backgroundColor: AppColors.primary,
          ),
        );

        Navigator.pop(context, {'action': 'accept', 'jobId': widget.job['id']});
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        _showErrorDialog(err['detail'] ?? "이미 다른 기사님이 수락했거나 만료된 공고입니다.");
      }
    } catch (e) {
      _showErrorDialog("서버 네트워크 연결에 실패했습니다.");
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _showErrorDialog(String msg) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text("오더 수락 불가", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text("확인", style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  Future<void> _cancelActiveTicket() async {
    if (_ticket == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("배차 취소", style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text("수락하신 배차를 취소하시겠습니까?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text("아니오", style: TextStyle(color: AppColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("예", style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${_ticket!['id']}/cancel"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("🚀 배차가 성공적으로 취소되었습니다.")),
        );
        Navigator.pop(context, {'action': 'cancel', 'ticketId': _ticket!['id']});
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        if (!mounted) return;
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text("배차 취소 실패"),
            content: Text(err['detail'] ?? "이미 다른 기사가 수락하였거나 취소할 수 없습니다."),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text("확인"))
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("배차 취소 실패: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _startOrContinueDriving() {
    if (_ticket == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => DriverMeterScreen(
          user: widget.user,
          token: widget.token,
          ticketId: _ticket!['id'],
          onDriveCompleted: (earnings) {
            Navigator.pop(context, {'action': 'complete'});
          },
        ),
      ),
    ).then((val) {
      if (val != null) {
        Navigator.pop(context, val);
      } else {
        _reloadTicketStatus();
      }
    });
  }

  Future<void> _reloadTicketStatus() async {
    if (_ticket == null) return;
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/api/dispatch/tickets/${_ticket!['id']}"),
        headers: {
          "Authorization": "Bearer ${widget.token}",
        },
      );
      if (response.statusCode == 200) {
        final ticket = jsonDecode(utf8.decode(response.bodyBytes));
        if (mounted) {
          setState(() {
            _ticket = ticket;
          });
        }
      }
    } catch (e) {
      debugPrint("티켓 상태 재로드 실패: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    // 실제 공고 데이터(widget.job)에서 필요한 세부 정보 추출
    final double distance = (widget.job['distance'] ?? 0.0).toDouble(); 
    final int estimatedTimeMinutes = widget.job['estimated_time'] ?? 0;
    final int unitPrice = widget.job['offered_unit_price'] ?? 0; // 기본 단가 설정
    final int platformFee = (unitPrice * 0.03).round(); // 수수료 3%
    final int netEarning = unitPrice - platformFee;

    final String materialType = widget.job['material_type'] == 'GOOD_SOIL'
        ? '양질토'
        : widget.job['material_type'] == 'MUD_SOIL'
            ? '뻘흙'
            : widget.job['material_type'] == 'ROCK'
                ? '암버럭'
                : widget.job['material_type'] == 'MIXED'
                    ? '혼합'
                    : widget.job['material_type'] ?? '미정';

    final String truckType = widget.job['truck_type'] == 'T_15'
        ? '15톤 덤프 트럭'
        : widget.job['truck_type'] == 'T_25'
            ? '25.5톤 덤프 트럭'
            : widget.job['truck_type'] == 'T_27'
                ? '27톤 덤프 트럭'
                : widget.job['truck_type'] ?? '미정';

    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) {
        if (didPop) return;
        Navigator.pop(context, true);
      },
      child: Scaffold(
        backgroundColor: AppColors.background, // 프리미엄 다크 테마 배경
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary),
            onPressed: () => Navigator.pop(context, true),
          ),
        title: Text(
          widget.ticket != null ? "배차 현황 상세" : "배차 현장 확인",
          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. 프리미엄 지도 시각화 카드 (운행 경로 미리보기)
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.divider),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(76),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        // 물결 치는 듯한 지도 배경 라인 그래픽 모사
                        Positioned.fill(
                          child: Opacity(
                            opacity: 0.15,
                            child: CustomPaint(
                              painter: PathMapPainter(),
                            ),
                          ),
                        ),
                        // 거리 및 시간 팝업 배지
                        Positioned(
                          bottom: 16,
                          left: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.warning,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.navigation_rounded, color: AppColors.textPrimary, size: 14),
                                SizedBox(width: 6),
                                Text(
                                  "$distance km · $estimatedTimeMinutes분 소요 예상",
                                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 24),

                  // 2. 경로 타임라인 정보 카드 (상차지 -> 하차지)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.divider),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 상차지 (출발지)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Column(
                              children: [
                                CircleAvatar(
                                  radius: 10,
                                  backgroundColor: AppColors.primary, // 택시 스타일 블루
                                  child: Icon(Icons.circle, color: AppColors.textPrimary, size: 8),
                                ),
                                Container(
                                  width: 2,
                                  height: 40,
                                  color: AppColors.divider,
                                ),
                              ],
                            ),
                            SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "상차지 (출발)",
                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    widget.job['site_name'] ?? "현장명 없음",
                                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    widget.job['site_address'] ?? "상차지 주소 없음",
                                    style: TextStyle(color: AppColors.textTertiary, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        // 하차지 (도착지)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 10,
                              backgroundColor: AppColors.warning, // 덤프링 시그니처 오렌지
                              child: Icon(Icons.local_shipping_rounded, color: AppColors.textPrimary, size: 10),
                            ),
                            SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "하차지 (도착)",
                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    widget.job['drop_off_name'] ?? "하차지명 없음",
                                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    widget.job['drop_off_address'] ?? "하차지 주소 없음",
                                    style: TextStyle(color: AppColors.textTertiary, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 16),

                  // 3. 작업 스펙 및 추가 디테일 카드
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.divider),
                    ),
                    child: Column(
                      children: [
                        _buildDetailRow("토사 종류", materialType, Icons.category_rounded),
                        Divider(color: AppColors.divider, height: 24),
                        _buildDetailRow("작업 예정일", _formatWorkDate(widget.job['work_date']), Icons.calendar_today_rounded),
                        Divider(color: AppColors.divider, height: 24),
                        _buildDetailRow("필요 차종", truckType, Icons.local_shipping_rounded),
                      ],
                    ),
                  ),
                  SizedBox(height: 16),

                  // 4. 프리미엄 요금 / 운송료 정산 카드 (택시 미터기 요금판 컨셉)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: AppColors.primary, width: 1.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          "예상 실 정산 수입 (1회당)",
                          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 10),
                        Text(
                          "₩${_formatCurrency(netEarning)}",
                          style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.w800, fontSize: 28, letterSpacing: -0.5),
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("기본 운반료", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                            Text("₩${_formatCurrency(unitPrice)}", style: TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("플랫폼 수수료 (3%)", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                            Text("-₩${_formatCurrency(platformFee)}", style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 36),

                  // 5. 작업 거절 & 수락 버튼 (바텀 액션 바 스타일)
                  if (_ticket == null)
                    Row(
                      children: [
                        // 거절 단추
                        Expanded(
                          flex: 3,
                          child: InkWell(
                            onTap: _isSubmitting ? null : () => Navigator.pop(context),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              height: 60,
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.divider),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "취소",
                                style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 12),
                        // 수락 및 즉시 운행 단추
                        Expanded(
                          flex: 7,
                          child: InkWell(
                            onTap: _isSubmitting ? null : _acceptDispatch,
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              height: 60,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [AppColors.warning, AppColors.warning.withAlpha(200)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.warning.withAlpha(76),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "배차",
                                style: TextStyle(
                                  color: _isSubmitting ? AppColors.textPrimary.withAlpha(128) : AppColors.textPrimary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  else
                    Row(
                      children: [
                        if (_ticket!['status'] == 'ACCEPTED') ...[
                          Expanded(
                            child: InkWell(
                              onTap: _isSubmitting ? null : _cancelActiveTicket,
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                height: 60,
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.danger),
                                ),
                                alignment: Alignment.center,
                                child: const Text(
                                  "배차 취소",
                                  style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        Builder(
                          builder: (context) {
                            final bool isStartEnabled = _isStartButtonEnabled();
                            final String buttonText = _ticket!['status'] == 'ACCEPTED'
                                ? (isStartEnabled 
                                    ? "운행 시작하기" 
                                    : (!_isWorkDateToday() ? "운행일 아님" : "다른 운행 진행중"))
                                : "운행 계속하기";
                            return Expanded(
                              flex: _ticket!['status'] == 'ACCEPTED' ? 2 : 1,
                              child: InkWell(
                                onTap: (_isSubmitting || !isStartEnabled) ? null : _startOrContinueDriving,
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  height: 60,
                                  decoration: BoxDecoration(
                                    gradient: isStartEnabled
                                        ? LinearGradient(
                                            colors: [AppColors.primary, AppColors.primary.withAlpha(200)],
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                          )
                                        : null,
                                    color: isStartEnabled ? null : AppColors.divider,
                                    borderRadius: BorderRadius.circular(16),
                                    boxShadow: isStartEnabled
                                        ? [
                                            BoxShadow(
                                              color: AppColors.primary.withAlpha(76),
                                              blurRadius: 12,
                                              offset: const Offset(0, 4),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    buttonText,
                                    style: TextStyle(
                                      color: isStartEnabled
                                          ? (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white)
                                          : AppColors.textSecondary,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }
                        ),
                      ],
                    ),
                ],
              ),
            ),
            if (_isSubmitting)
              Container(
                color: Colors.black.withAlpha(128),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppColors.primary),
                      const SizedBox(height: 16),
                      const Text(
                        "요청을 처리 중입니다...",
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildDetailRow(String title, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.textTertiary, size: 18),
        SizedBox(width: 12),
        Text(title, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const Spacer(),
        Text(value, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    );
  }
}

// 지도 노선 경로 효과를 내기 위한 커스텀 페인터
class PathMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary.withAlpha(76)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    path.moveTo(size.width * 0.15, size.height * 0.7);
    path.quadraticBezierTo(
      size.width * 0.35,
      size.height * 0.2,
      size.width * 0.55,
      size.height * 0.6,
    );
    path.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.9,
      size.width * 0.85,
      size.height * 0.3,
    );

    canvas.drawPath(path, paint);

    // 출발지 점
    final startPaint = Paint()..color = AppColors.primary;
    canvas.drawCircle(Offset(size.width * 0.15, size.height * 0.7), 6, startPaint);

    // 도착지 점
    final endPaint = Paint()..color = AppColors.warning;
    canvas.drawCircle(Offset(size.width * 0.85, size.height * 0.3), 8, endPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
