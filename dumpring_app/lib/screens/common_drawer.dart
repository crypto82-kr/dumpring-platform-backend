import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'profile_edit_screen.dart';
import 'login_screen.dart';
import 'admin_home_screen.dart';
import 'owner_home_screen.dart';
import 'driver_home_screen.dart';
import 'driver_history_screen.dart';
import 'dashboard_screen.dart';
import 'drop_off_home_screen.dart';

class CommonDrawer extends StatelessWidget {
  final Map<String, dynamic> user;
  final String token;
  final Function(Map<String, dynamic> newUser) onProfileUpdated;

  const CommonDrawer({
    Key? key,
    required this.user,
    required this.token,
    required this.onProfileUpdated,
  }) : super(key: key);

  String _getUserRoleText() {
    // existing method unchanged
    List<String> roles = [];
    if (user['is_admin'] == true) roles.add("본사 관리자");
    if (user['is_owner'] == true) roles.add("차주");
    if (user['is_driver'] == true) roles.add("기사");
    if (user['is_site_manager'] == true) roles.add("현장관리자");
    if (user['is_site_worker'] == true) roles.add("현장담당자");
    if (user['is_drop_off'] == true) roles.add("하차지지주");
    return roles.isNotEmpty ? roles.join(', ') : '일반 사용자';
  }

  // Helper to create a ListTile with consistent styling (Easy Ride Premium Font style)
  Widget _tile(BuildContext context, IconData icon, String title, VoidCallback onTap) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark || true; // 다크 모드 우선 고정 호환
    return ListTile(
      leading: Icon(icon, color: const Color(0xFFFFD700)), // Easy Ride Signature Yellow
      title: Text(
        title, 
        style: TextStyle(
          fontWeight: FontWeight.w800, 
          color: isDark ? Colors.white : const Color(0xFF0A0F1D),
          fontSize: 15,
          letterSpacing: -0.5,
        ),
      ),
      onTap: onTap,
    );
  }

  // Build menu items according to user roles
  List<Widget> _buildMenuItems(BuildContext context) {
    final List<Widget> items = [];
    // Home - always present
    items.add(_tile(context, Icons.home_outlined, "홈", () {
      Navigator.pop(context);
    }));
    // Role‑specific menus
    if (user['is_admin'] == true) {
      items.addAll([
        _tile(context, Icons.manage_accounts_outlined, "사용자 관리", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => AdminHomeScreen(user: user, token: token)));
        }),
        _tile(context, Icons.map_outlined, "현장 현황", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => DashboardScreen(user: user, token: token)));
        }),
      ]);
    }
    if (user['is_owner'] == true) {
      items.addAll([
        _tile(context, Icons.receipt_long, "주문 및 정산 관리", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => OwnerHomeScreen(user: user, token: token, isApproved: true, initialTabIndex: 0)));
        }),
        _tile(context, Icons.directions_car, "소속 차량 관리", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => OwnerHomeScreen(user: user, token: token, isApproved: true, initialTabIndex: 1)));
        }),
      ]);
    }
    if (user['is_driver'] == true) {
      items.addAll([
        _tile(context, Icons.delivery_dining, "배달 현황", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => DriverHomeScreen(user: user, token: token)));
        }),
        _tile(context, Icons.history, "작업 기록", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => DriverHistoryScreen(user: user, token: token)));
        }),
      ]);
    }
    if (user['is_site_manager'] == true || user['is_site_worker'] == true) {
      items.addAll([
        _tile(context, Icons.map_outlined, "현장 현황", () {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => DashboardScreen(user: user, token: token)));
        }),
        _tile(context, Icons.assignment, "작업 할당", () {
          Navigator.pop(context);
          // TODO: implement assignment screen
        }),
      ]);
    }
    if (user['is_drop_off'] == true) {
      items.add(_tile(context, Icons.local_shipping, "하차 관리", () {
        Navigator.pop(context);
        Navigator.push(context, MaterialPageRoute(builder: (_) => DropOffHomeScreen(user: user, token: token)));
      }));
    }
    // Common menu – profile edit
    items.add(_tile(context, Icons.manage_accounts_outlined, "개인정보 및 등록정보 수정", () {
      Navigator.pop(context);
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ProfileEditScreen(
            user: user,
            token: token,
            onProfileUpdated: onProfileUpdated,
          ),
        ),
      );
    }));
    // Settings menu with active modal interactions (WOW feature 🚨)
    items.add(_tile(context, Icons.settings, "설정", () {
      Navigator.pop(context);
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF151C2C),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Color(0xFF222B45))),
          title: const Row(
            children: [
              Icon(Icons.settings, color: Color(0xFFFFD700)),
              SizedBox(width: 8),
              Text("시스템 설정", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SwitchListTile(
                value: true,
                onChanged: (val) {},
                title: const Text("실시간 배차 푸시 알림", style: TextStyle(fontSize: 14, color: Colors.white)),
                activeColor: const Color(0xFFFFD700),
              ),
              SwitchListTile(
                value: false,
                onChanged: (val) {},
                title: const Text("야간 자동 무음 모드", style: TextStyle(fontSize: 14, color: Colors.white)),
                activeColor: const Color(0xFFFFD700),
              ),
              const ListTile(
                title: Text("앱 버전 정보", style: TextStyle(fontSize: 14, color: Colors.white)),
                subtitle: Text("v1.0.0 (최신 버전)", style: TextStyle(fontSize: 12, color: Color(0xFF8F9BB3))),
                trailing: Icon(Icons.info_outline, size: 20, color: Color(0xFFFFD700)),
              )
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("닫기", style: TextStyle(color: Color(0xFFFFD700), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }));
    return items;
  }


  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark || true;
    return Drawer(
      child: Container(
        color: const Color(0xFF0A0F1D), // 피그마 다크 블루 테마 통일
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(
                color: Color(0xFF151C2C), // 다크 청록 -> 피그마 매트 다크 블루로 교체
                border: Border(bottom: BorderSide(color: Color(0xFF222B45), width: 1.5)),
              ),
              accountName: Text(
                user['name'] ?? '사용자',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
              ),
              accountEmail: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user['phone_number'] ?? '', style: const TextStyle(color: Color(0xFF8F9BB3))),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFD700), // 형광 옐로우 골드 배지
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getUserRoleText(),
                      style: const TextStyle(color: Color(0xFF0A0F1D), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              currentAccountPicture: const CircleAvatar(
                backgroundColor: Color(0xFF1E2638),
                child: Icon(Icons.person, color: Color(0xFFFFD700), size: 40),
              ),
            ),
            // Dynamic menu items based on role (ListView to prevent overflow)
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  ..._buildMenuItems(context),
                  const Divider(color: Color(0xFF222B45)),
                  ListTile(
                    leading: const Icon(Icons.logout_outlined, color: Colors.redAccent),
                    title: const Text("로그아웃", style: TextStyle(fontWeight: FontWeight.w800, color: Colors.redAccent, fontSize: 15)),
                    onTap: () async {
                      showDialog(
                        context: context,
                        builder: (dialogContext) => AlertDialog(
                          backgroundColor: const Color(0xFF151C2C),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Color(0xFF222B45))),
                          title: const Text("로그아웃", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          content: const Text("로그아웃 하시겠습니까?", style: TextStyle(color: Color(0xFF8F9BB3))),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(dialogContext),
                              child: const Text("취소", style: TextStyle(color: Colors.grey)),
                            ),
                            TextButton(
                              onPressed: () async {
                                final prefs = await SharedPreferences.getInstance();
                                await prefs.remove('token');
                                onProfileUpdated({});
                                Navigator.of(context).pushAndRemoveUntil(
                                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                                  (route) => false,
                                );
                              },
                              child: const Text("확인", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
