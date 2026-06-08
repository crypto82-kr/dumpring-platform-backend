import 'package:flutter/material.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';
import 'register_screen.dart';
import 'site_register_screen.dart';
import 'drop_off_register_screen.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        title: Text(
          "회원 유형 선택",
          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 30.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                "덤프링에 오신 것을 환영합니다! 🎉",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 10),
              Text(
                "가입하시려는 회원 유형을 선택해 주세요.\n유형에 맞는 맞춤형 서비스를 제공해 드립니다.",
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 36),

              // 기사 가입 카드
              _buildRoleCard(
                context: context,
                icon: Icons.local_shipping_outlined,
                title: "덤프 트럭 기사",
                subtitle: "덤프 트럭 운전 기사님으로 회원가입합니다. 실시간 콜 배차 수락 및 미터기 운행 기능을 제공합니다.",
                color: AppColors.warning,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const RegisterScreen(initialIsDriver: true),
                    ),
                  );
                },
              ),
              SizedBox(height: 16),

              // 차주 가입 카드
              _buildRoleCard(
                context: context,
                icon: Icons.badge_outlined,
                title: "덤프 트럭 차주",
                subtitle: "덤프 트럭 소유자(사장님)로 가입합니다. 소속 기사 선등록 관리 및 차량 운행 관리가 가능합니다.",
                color: AppColors.primary,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const RegisterScreen(initialIsDriver: false),
                    ),
                  );
                },
              ),
              SizedBox(height: 16),

              // 공사현장 가입 카드
              _buildRoleCard(
                context: context,
                icon: Icons.engineering_outlined,
                title: "공사 현장 (소장 / 담당자)",
                subtitle: "건설사 소장님 또는 현장 담당 직원으로 가입합니다. 오더 발행 및 현장 출입 덤프를 직접 통제합니다.",
                color: AppColors.textSecondary,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SiteRegisterScreen(),
                    ),
                  );
                },
              ),
              SizedBox(height: 16),

              // 하차지 가입 카드
              _buildRoleCard(
                context: context,
                icon: saTerrainIcon(),
                title: "사토 하차지 (지주)",
                subtitle: "사토장 및 하차지 땅 주인으로 가입합니다. 현장별 덤프 오더의 토사 종류 승인 및 사토 반입을 관리합니다.",
                color: AppColors.textPrimary,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const DropOffRegisterScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData saTerrainIcon() {
    return Icons.landscape_outlined;
  }

  Widget _buildRoleCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20.0),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.divider, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 아이콘 박스
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                icon,
                size: 32,
                color: color,
              ),
            ),
            SizedBox(width: 18),
            // 설명 박스
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: saBoldFontWeight(),
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: saGrayTextColor(),
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: 4),
            // 오른쪽 화살표
            Align(
              alignment: Alignment.center,
              child: Padding(
                padding: const EdgeInsets.only(top: 14.0),
                child: Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: AppColors.textTertiary,
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}

FontWeight saBoldFontWeight() => FontWeight.bold;
Color saGrayTextColor() => AppColors.textSecondary;
