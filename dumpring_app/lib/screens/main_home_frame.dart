import 'package:flutter/material.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'driver_home_screen.dart';
import 'driver_history_screen.dart';
import 'owner_home_screen.dart';
import 'dashboard_screen.dart';
import 'drop_off_home_screen.dart';
import 'admin_home_screen.dart';
import 'common_drawer.dart';

/// 로그인 이후 역할별 홈 화면으로 분기 및 공통 레이아웃(DRScaffold + BottomNav)을 제공하는 통합 프레임.
class MainHomeFrame extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final bool isApproved;
  final int initialTabIndex;

  MainHomeFrame({
    Key? key,
    required this.user,
    required this.token,
    this.isApproved = false,
    this.initialTabIndex = 0,
  }) : super(key: key);

  @override
  State<MainHomeFrame> createState() => _MainHomeFrameState();
}

class _MainHomeFrameState extends State<MainHomeFrame> {
  late Map<String, dynamic> _currentUser;
  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
    _currentNavIndex = widget.initialTabIndex;
  }

  @override
  Widget build(BuildContext context) {
    if (_currentUser['is_admin'] == true) {
      return AdminHomeScreen(user: _currentUser, token: widget.token);
    }
    
    if (_currentUser['is_owner'] == true) {
      return DRScaffold(
        type: DRLayoutType.home,
        drawer: CommonDrawer(
          user: _currentUser,
          token: widget.token,
          onProfileUpdated: (newUser) {
            setState(() {
              _currentUser = newUser;
            });
          },
        ),
        bottomNavBar: OwnerBottomNav(
          currentIndex: _currentNavIndex,
          onTap: (index) => setState(() => _currentNavIndex = index),
        ),
        body: OwnerHomeScreen(
          user: _currentUser,
          token: widget.token,
          isApproved: widget.isApproved,
          initialTabIndex: _currentNavIndex,
        ),
      );
    }

    if (_currentUser['is_driver'] == true) {
      return DRScaffold(
        type: DRLayoutType.home,
        drawer: CommonDrawer(
          user: _currentUser,
          token: widget.token,
          onProfileUpdated: (newUser) {
            setState(() {
              _currentUser = newUser;
            });
          },
        ),
        bottomNavBar: DriverBottomNav(
          currentIndex: _currentNavIndex ?? 0,
          onTap: (index) => setState(() => _currentNavIndex = index),
        ),
        body: IndexedStack(
          index: _currentNavIndex ?? 0,
          children: [
            DriverHomeScreen(
              user: _currentUser,
              token: widget.token,
              isApproved: widget.isApproved,
            ),
            // 배차 검색 탭 (홈과 동일한 배차 검색 영역으로 임시 공유)
            DriverHomeScreen(
              user: _currentUser,
              token: widget.token,
              isApproved: widget.isApproved,
            ),
            // 작업기록 탭
            DriverHistoryScreen(
              user: _currentUser,
              token: widget.token,
            ),
            // 마이페이지 탭
            DriverHomeScreen(
              user: _currentUser,
              token: widget.token,
              isApproved: widget.isApproved,
            ),
          ],
        ),
      );
    }

    if (_currentUser['is_site_manager'] == true || _currentUser['is_site_worker'] == true) {
      return DRScaffold(
        type: DRLayoutType.home,
        drawer: CommonDrawer(
          user: _currentUser,
          token: widget.token,
          onProfileUpdated: (newUser) {
            setState(() {
              _currentUser = newUser;
            });
          },
        ),
        bottomNavBar: SiteBottomNav(
          currentIndex: _currentNavIndex,
          onTap: (index) => setState(() => _currentNavIndex = index),
        ),
        body: DashboardScreen(user: _currentUser, token: widget.token),
      );
    }

    if (_currentUser['is_drop_off'] == true) {
      return DRScaffold(
        type: DRLayoutType.home,
        drawer: CommonDrawer(
          user: _currentUser,
          token: widget.token,
          onProfileUpdated: (newUser) {
            setState(() {
              _currentUser = newUser;
            });
          },
        ),
        bottomNavBar: DropoffBottomNav(
          currentIndex: _currentNavIndex,
          onTap: (index) => setState(() => _currentNavIndex = index),
        ),
        body: DropOffHomeScreen(user: _currentUser, token: widget.token),
      );
    }

    // 등록된 역할 권한이 없는 경우 안내 화면
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.warning_amber_rounded, color: Theme.of(context).colorScheme.primary, size: 64),
            SizedBox(height: 20),
            Text(
              "등록된 역할 권한이 없습니다.\n본사에 문의해 주세요.",
              textAlign: TextAlign.center,
              style: TextStyle(color: (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? (Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF1F2937)) : Color(0xFF1F2937)) : Color(0xFF1F2937)) : Color(0xFF1F2937)) : Color(0xFF1F2937)), fontSize: 16, height: 1.5),
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.maybePop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0A0F1D) : Colors.white),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              ),
              child: Text("돌아가기", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

