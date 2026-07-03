import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../sdui/sdui_theme_model.dart';
import '../../../sdui/sdui_service.dart';

// ============================================================
// 1. 앱 컬러 & 텍스트 상수 (서버 SDUI 테마 동적 바인딩)
// ============================================================

class AppColors {
  static SduiTheme get _theme => SduiService.currentTheme;

  static Color get primary      => _theme.primary;       // 시그니처 색상
  static Color get primaryLight => _theme.primary.withAlpha(40);
  static Color get dark         => _theme.background;    // 배경 색상

  // 시맨틱 (상태 피드백)
  static const success     = Color(0xFF22C55E);
  static const danger      = Color(0xFFEF4444);
  static Color get warning => _theme.accent;             // 액센트 피드백
  static const info        = Color(0xFF3B82F6);

  static bool get _isDark => ThemeData.estimateBrightnessForColor(_theme.background) == Brightness.dark;

  // 텍스트
  static Color get textPrimary   => _theme.text;         // 기본 텍스트 색상
  static Color get textSecondary => _isDark ? const Color(0xFF8F9BB3) : const Color(0xFF4B5563); // 매트 그레이/미디엄 그레이
  static Color get textTertiary  => _isDark ? const Color(0xFF4A5568) : const Color(0xFF9CA3AF);

  // 배경 및 표면
  static Color get background    => _theme.background;   // 배경색
  static Color get surface       => _theme.surface;      // 카드/표면색
  static Color get divider       => _isDark ? const Color(0xFF222B45) : const Color(0xFFE5E7EB); // 보더라인
}

class AppTextStyles {
  static TextStyle get h1    => TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
  static TextStyle get h2    => TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary);
  static TextStyle get h3    => TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary);
  static TextStyle get body1 => TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary);
  static TextStyle get body2 => TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondary);
  static TextStyle get caption => TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: AppColors.textTertiary);
  static TextStyle get numLg => TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
}


// ============================================================
// 2. 홈 앱바 (HomeAppBar)
// ============================================================

class HomeAppBar extends StatelessWidget implements PreferredSizeWidget {
  final int unreadCount; // 알림 미읽음 수
  final VoidCallback? onNotificationTap;
  final Widget? drawer; // 기존 드로어 호환 지원용
  final Widget? leading;

  HomeAppBar({
    super.key,
    this.unreadCount = 0,
    this.onNotificationTap,
    this.drawer,
    this.leading,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.dark, // 상태바 아이콘 어둡게
      automaticallyImplyLeading: true,
      leading: leading,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(0.5),
        child: Container(height: 0.5, color: AppColors.divider),
      ),
      title: Row(
        children: [
          // 로고
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: 'dump',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                TextSpan(
                  text: 'ring',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        // 알림 아이콘 + 뱃지
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: Icon(Icons.notifications_outlined, color: AppColors.textSecondary),
              onPressed: onNotificationTap,
            ),
            if (unreadCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppColors.danger,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      unreadCount > 9 ? '9+' : '$unreadCount',
                      style: TextStyle(fontSize: 9, color: AppColors.textPrimary, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
          ],
        ),
        SizedBox(width: 4),
      ],
    );
  }
}


// ============================================================
// 3. 서브 앱바 (SubAppBar)
// ============================================================

class SubAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final VoidCallback? onBackPressed;
  final bool showDivider;

  SubAppBar({
    super.key,
    required this.title,
    this.actions,
    this.onBackPressed,
    this.showDivider = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      bottom: showDivider
          ? PreferredSize(
              preferredSize: const Size.fromHeight(0.5),
              child: Container(height: 0.5, color: AppColors.divider),
            )
          : null,
      leading: IconButton(
        icon: Icon(Icons.arrow_back_ios_new, size: 20, color: AppColors.textPrimary),
        onPressed: onBackPressed ?? () => Navigator.maybePop(context),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: AppColors.textPrimary,
        ),
      ),
      centerTitle: true,
      // actions 없으면 SizedBox로 균형 유지
      actions: actions ?? [SizedBox(width: 48)],
    );
  }
}


// ============================================================
// 4. 탭 앱바 (TabAppBar)
// ============================================================

class TabAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<String> tabs;
  final TabController controller;
  final List<Widget>? actions;
  final VoidCallback? onBackPressed;

  TabAppBar({
    super.key,
    required this.title,
    required this.tabs,
    required this.controller,
    this.actions,
    this.onBackPressed,
  });

  @override
  // 앱바 56 + 탭바 44 = 100
  Size get preferredSize => const Size.fromHeight(100);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      leading: IconButton(
        icon: Icon(Icons.arrow_back_ios_new, size: 20, color: AppColors.textPrimary),
        onPressed: onBackPressed ?? () => Navigator.maybePop(context),
      ),
      title: Text(
        title,
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
      ),
      centerTitle: true,
      actions: actions ?? [SizedBox(width: 48)],
      bottom: TabBar(
        controller: controller,
        tabs: tabs.map((t) => Tab(text: t)).toList(),
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textTertiary,
        labelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        unselectedLabelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
        indicatorColor: AppColors.primary,
        indicatorWeight: 2,
        dividerColor: AppColors.divider,
      ),
    );
  }
}


// ============================================================
// 5. 역할별 하단 네비게이션 바 컴포넌트
// ============================================================

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
}

class _DRBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<_NavItem> items;
  final bool hasCurvedFAB; // 중앙 FAB 대응을 위해 둥글게 깎인 영역 비워두기 플래그

  const _DRBottomNav({
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.hasCurvedFAB = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.divider, width: 0.5)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: Row(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final isActive = i == currentIndex;
              
              // 중앙 FAB용 빈 공간 슬롯 삽입 (Curved FAB 적용 시)
              if (hasCurvedFAB && i == (items.length / 2).floor()) {
                return Expanded(child: SizedBox.shrink());
              }

              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isActive ? item.activeIcon : item.icon,
                        size: 22,
                        color: isActive ? AppColors.primary : AppColors.textTertiary,
                      ),
                      SizedBox(height: 2),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 10,
                          color: isActive ? AppColors.primary : AppColors.textTertiary,
                          fontWeight: isActive ? FontWeight.w500 : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

// 기사 하단 탭바
class DriverBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool hasCurvedFAB;

  DriverBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.hasCurvedFAB = false,
  });

  @override
  Widget build(BuildContext context) {
    return _DRBottomNav(
      currentIndex: currentIndex,
      onTap: onTap,
      hasCurvedFAB: hasCurvedFAB,
      items: const [
        _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home, label: '홈'),
        _NavItem(icon: Icons.search_outlined, activeIcon: Icons.search, label: '배차 검색'),
        _NavItem(icon: Icons.description_outlined, activeIcon: Icons.description, label: '작업기록'),
        _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: '마이페이지'),
      ],
    );
  }
}

// 차주 하단 탭바
class OwnerBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  OwnerBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _DRBottomNav(
      currentIndex: currentIndex,
      onTap: onTap,
      items: const [
        _NavItem(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: '대시보드'),
        _NavItem(icon: Icons.group_outlined, activeIcon: Icons.group, label: '기사 관리'),
        _NavItem(icon: Icons.local_shipping_outlined, activeIcon: Icons.local_shipping, label: '차량'),
        _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: '마이페이지'),
      ],
    );
  }
}

// 현장 관리자 하단 탭바
class SiteBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  SiteBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _DRBottomNav(
      currentIndex: currentIndex,
      onTap: onTap,
      items: const [
        _NavItem(icon: Icons.business_outlined, activeIcon: Icons.business, label: '현장 관리'),
        _NavItem(icon: Icons.assignment_outlined, activeIcon: Icons.assignment, label: '공고 관리'),
        _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: '마이페이지'),
      ],
    );
  }
}

// 하차지 지주 하단 탭바
class DropoffBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  DropoffBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _DRBottomNav(
      currentIndex: currentIndex,
      onTap: onTap,
      items: const [
        _NavItem(icon: Icons.bar_chart_outlined, activeIcon: Icons.bar_chart, label: '반입 현황'),
        _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: '마이페이지'),
      ],
    );
  }
}

// 어드민 하단 탭바
class AdminBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  AdminBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _DRBottomNav(
      currentIndex: currentIndex,
      onTap: onTap,
      items: const [
        _NavItem(icon: Icons.fact_check_outlined, activeIcon: Icons.fact_check, label: '서류 검증'),
        _NavItem(icon: Icons.map_outlined, activeIcon: Icons.map, label: '관제'),
      ],
    );
  }
}


// ============================================================
// 6. 레이아웃 래퍼 (DRScaffold)
// ============================================================

enum DRLayoutType {
  home,       // HomeAppBar + BottomNav
  sub,        // SubAppBar, 뒤로가기, BottomNav 없음
  tab,        // TabAppBar + BottomNav 없음
  fullscreen, // 앱바/네비바 없음
  auth,       // 앱바 없음 + 키보드 대응
  mapView,    // 백그라운드 맵 + 드래그형 하단 시트 (Bottom Sheet)
}

class DRScaffold extends StatelessWidget {
  final DRLayoutType type;
  final Widget body;

  // home 타입
  final int? currentNavIndex;
  final ValueChanged<int>? onNavTap;
  final Widget? bottomNavBar;
  final int? unreadCount;
  final VoidCallback? onNotificationTap;
  final Widget? drawer; // 기존 Drawer 구조 호환 지원용
  final Widget? appBarLeading;

  // sub / tab 타입
  final String? title;
  final List<Widget>? actions;
  final VoidCallback? onBackPressed;

  // tab 타입
  final List<String>? tabs;
  final TabController? tabController;

  // Option 4 (FAB Center Docked) 설정
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;

  // Option 5 (Draggable bottom Sheet) 설정
  final Widget? backgroundMapWidget; // 배경 지도 위젯
  final double? initialSheetSize;
  final double? minSheetSize;
  final double? maxSheetSize;

  // 공통
  final Color? backgroundColor;
  final bool? resizeToAvoidBottomInset;

  DRScaffold({
    super.key,
    required this.type,
    required this.body,
    this.currentNavIndex,
    this.onNavTap,
    this.bottomNavBar,
    this.unreadCount,
    this.onNotificationTap,
    this.drawer,
    this.appBarLeading,
    this.title,
    this.actions,
    this.onBackPressed,
    this.tabs,
    this.tabController,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.backgroundMapWidget,
    this.initialSheetSize = 0.35,
    this.minSheetSize = 0.15,
    this.maxSheetSize = 0.85,
    this.backgroundColor,
    this.resizeToAvoidBottomInset,
  });

  @override
  Widget build(BuildContext context) {
    switch (type) {
      case DRLayoutType.home:
        return Scaffold(
          backgroundColor: backgroundColor ?? AppColors.background,
          drawer: drawer,
          appBar: HomeAppBar(
            unreadCount: unreadCount ?? 0,
            onNotificationTap: onNotificationTap,
            drawer: drawer,
            leading: appBarLeading,
          ),
          body: body,
          bottomNavigationBar: bottomNavBar,
          floatingActionButton: floatingActionButton,
          floatingActionButtonLocation: floatingActionButtonLocation,
        );

      case DRLayoutType.sub:
        return Scaffold(
          backgroundColor: backgroundColor ?? AppColors.background,
          drawer: drawer,
          appBar: SubAppBar(
            title: title ?? '',
            actions: actions,
            onBackPressed: onBackPressed,
          ),
          body: body,
          floatingActionButton: floatingActionButton,
          floatingActionButtonLocation: floatingActionButtonLocation,
          resizeToAvoidBottomInset: resizeToAvoidBottomInset ?? true,
        );

      case DRLayoutType.tab:
        assert(tabs != null && tabController != null, 'tab 타입에는 tabs, tabController 필수');
        return Scaffold(
          backgroundColor: backgroundColor ?? AppColors.background,
          drawer: drawer,
          appBar: TabAppBar(
            title: title ?? '',
            tabs: tabs!,
            controller: tabController!,
            actions: actions,
            onBackPressed: onBackPressed,
          ),
          body: body,
          floatingActionButton: floatingActionButton,
          floatingActionButtonLocation: floatingActionButtonLocation,
        );

      case DRLayoutType.fullscreen:
        return Scaffold(
          backgroundColor: Colors.transparent,
          extendBodyBehindAppBar: true,
          body: body,
          floatingActionButton: floatingActionButton,
          floatingActionButtonLocation: floatingActionButtonLocation,
        );

      case DRLayoutType.auth:
        return Scaffold(
          backgroundColor: AppColors.surface,
          resizeToAvoidBottomInset: true,
          body: SafeArea(child: body),
        );

      case DRLayoutType.mapView:
        return Scaffold(
          backgroundColor: Colors.transparent,
          body: Stack(
            children: [
              // 배경 지도
              if (backgroundMapWidget != null) backgroundMapWidget!,
              
              // 드래그 가능한 하단 패널
              DraggableScrollableSheet(
                initialChildSize: initialSheetSize ?? 0.35,
                minChildSize: minSheetSize ?? 0.15,
                maxChildSize: maxSheetSize ?? 0.85,
                builder: (context, scrollController) {
                  return Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(20),
                        topRight: Radius.circular(20),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(25),
                          blurRadius: 10,
                          offset: Offset(0, -3),
                        )
                      ],
                    ),
                    child: Column(
                      children: [
                        // 드래그 핸들 지시선
                        Center(
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 12),
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: AppColors.divider,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        Expanded(
                          child: ListView(
                            controller: scrollController,
                            padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                            children: [body],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
          floatingActionButton: floatingActionButton,
          floatingActionButtonLocation: floatingActionButtonLocation,
        );
    }
  }
}
