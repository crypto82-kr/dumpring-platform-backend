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
import '../shared/widgets/layouts/dr_scaffold.dart';

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
    return ListTile(
      leading: Icon(icon, color: AppColors.primary),
      title: Text(
        title, 
        style: TextStyle(
          fontWeight: FontWeight.w800, 
          color: AppColors.textPrimary,
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
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: AppColors.divider)),
          title: Row(
            children: [
              Icon(Icons.settings, color: AppColors.primary),
              const SizedBox(width: 8),
              Text("시스템 설정", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SwitchListTile(
                value: true,
                onChanged: (val) {},
                title: Text("실시간 배차 푸시 알림", style: TextStyle(fontSize: 14, color: AppColors.textPrimary)),
                activeColor: AppColors.primary,
              ),
              SwitchListTile(
                value: false,
                onChanged: (val) {},
                title: Text("야간 자동 무음 모드", style: TextStyle(fontSize: 14, color: AppColors.textPrimary)),
                activeColor: AppColors.primary,
              ),
              ListTile(
                title: Text("앱 버전 정보", style: TextStyle(fontSize: 14, color: AppColors.textPrimary)),
                subtitle: Text("v1.0.0 (최신 버전)", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                trailing: Icon(Icons.info_outline, size: 20, color: AppColors.primary),
              )
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("닫기", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }));
    return items;
  }


  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Container(
        color: AppColors.background,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            UserAccountsDrawerHeader(
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border(bottom: BorderSide(color: AppColors.divider, width: 1.5)),
              ),
              accountName: Text(
                user['name'] ?? '사용자',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
              ),
              accountEmail: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user['phone_number'] ?? '', style: TextStyle(color: AppColors.textSecondary)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getUserRoleText(),
                      style: TextStyle(color: AppColors.background, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: AppColors.background,
                child: Icon(Icons.person, color: AppColors.primary, size: 40),
              ),
            ),
            // Dynamic menu items based on role (ListView to prevent overflow)
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  ..._buildMenuItems(context),
                  Divider(color: AppColors.divider),
                  ListTile(
                    leading: const Icon(Icons.logout_outlined, color: Colors.redAccent),
                    title: const Text("로그아웃", style: TextStyle(fontWeight: FontWeight.w800, color: Colors.redAccent, fontSize: 15)),
                    onTap: () async {
                      showDialog(
                        context: context,
                        builder: (dialogContext) => AlertDialog(
                          backgroundColor: AppColors.surface,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: AppColors.divider)),
                          title: Text("로그아웃", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                          content: Text("로그아웃 하시겠습니까?", style: TextStyle(color: AppColors.textSecondary)),
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
