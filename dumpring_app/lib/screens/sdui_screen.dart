import 'package:flutter/material.dart';
import '../sdui/sdui_model.dart';
import '../sdui/sdui_renderer.dart';
import '../sdui/sdui_service.dart';
import 'register_screen.dart';
import 'site_register_screen.dart';
import 'drop_off_register_screen.dart';

class SduiScreen extends StatefulWidget {
  final String templateId;
  final String? token;
  final String title;

  const SduiScreen({
    Key? key,
    required this.templateId,
    this.token,
    this.title = "덤프링 스마트 서비스",
  }) : super(key: key);

  @override
  State<SduiScreen> createState() => _SduiScreenState();
}

class _SduiScreenState extends State<SduiScreen> {
  late Future<SduiComponent> _sduiFuture;
  final Map<String, TextEditingController> _controllers = {};

  @override
  void initState() {
    super.initState();
    _loadTemplate();
  }

  void _loadTemplate() {
    setState(() {
      _sduiFuture = SduiService.fetchTemplate(widget.templateId, token: widget.token);
    });
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _handleAction(BuildContext context, Map<String, dynamic> action) {
    final type = action['type'] as String?;
    switch (type?.toLowerCase()) {
      case 'navigate':
        final target = action['target'] as String?;
        _navigateTarget(context, target);
        break;
      case 'api_call':
        final endpoint = action['endpoint'] as String?;
        _executeApiCall(context, endpoint);
        break;
      case 'dialog':
        final title = action['title'] ?? '알림';
        final message = action['message'] ?? '';
        _showSduiDialog(context, title, message);
        break;
      default:
        debugPrint("미지원 액션 타입: $type");
    }
  }

  void _navigateTarget(BuildContext context, String? target) {
    if (target == null) return;
    
    Widget destination;
    switch (target.toLowerCase()) {
      case 'register_driver':
        destination = const RegisterScreen(initialIsDriver: true);
        break;
      case 'register_owner':
        destination = const RegisterScreen(initialIsDriver: false);
        break;
      case 'register_site':
        destination = const SiteRegisterScreen();
        break;
      case 'register_dropoff':
        destination = const DropOffRegisterScreen();
        break;
      default:
        // 다른 SDUI 템플릿으로 연쇄 동적 라우팅 지원 (대기 상태 전환 등)
        destination = SduiScreen(templateId: target, token: widget.token);
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => destination),
    );
  }

  Future<void> _executeApiCall(BuildContext context, String? endpoint) async {
    if (endpoint == null) return;
    
    // 로딩 모달 띄우기
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFFD700)),
        ),
      ),
    );

    // API 통신 시뮬레이션 및 데이터 리로딩
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      Navigator.pop(context); // 로딩 닫기
      _loadTemplate(); // 템플릿 리로드
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("성공적으로 새로고침 완료!"),
          backgroundColor: Color(0xFF1E2638),
        ),
      );
    }
  }

  void _showSduiDialog(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E2638),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFFFD700), width: 1.0),
        ),
        title: Text(
          title,
          style: const TextStyle(color: Color(0xFFFFD700), fontWeight: FontWeight.bold),
        ),
        content: Text(
          message,
          style: const TextStyle(color: Colors.white, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              "확인",
              style: TextStyle(color: Color(0xFFFFD700), fontWeight: FontWeight.bold),
            ),
          )
        ],
      ),
    );
  }

  void _showFigmaLinkInputDialog(BuildContext context) {
    final TextEditingController urlController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E2638),
        title: const Text(
          "🔗 피그마 라이브 프레임 연동",
          style: TextStyle(color: Color(0xFFFFD700), fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "피그마 프레임의 전체 주소(URL)를 붙여넣으세요. 해당 디자인 구조가 즉시 모바일에 실시간 반영됩니다.",
              style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.45),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: urlController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                hintText: "https://www.figma.com/file/...",
                hintStyle: TextStyle(color: Colors.white38),
                filled: true,
                fillColor: Color(0xFF0A0F1D),
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("취소", style: TextStyle(color: Colors.white38)),
          ),
          TextButton(
            onPressed: () {
              final String input = urlController.text.trim();
              Navigator.pop(context);
              _applyFigmaUrl(input);
            },
            child: const Text(
              "즉시 적용",
              style: TextStyle(color: Color(0xFFFFD700), fontWeight: FontWeight.bold),
            ),
          )
        ],
      ),
    );
  }

  void _applyFigmaUrl(String url) {
    try {
      String fileKey = "";
      String nodeId = "";

      if (url.contains("/file/")) {
        final parts = url.split("/file/");
        if (parts.length > 1) {
          fileKey = parts[1].split("/")[0];
        }
      } else if (url.contains("/design/")) {
        final parts = url.split("/design/");
        if (parts.length > 1) {
          fileKey = parts[1].split("/")[0];
        }
      }

      if (url.contains("node-id=")) {
        final nodePart = url.split("node-id=")[1].split("&")[0];
        nodeId = Uri.decodeComponent(nodePart).replaceAll("-", ":");
      }

      if (fileKey.isEmpty || nodeId.isEmpty) {
        final rawParts = url.split(" ");
        if (rawParts.length >= 2) {
          fileKey = rawParts[0];
          nodeId = rawParts[1].replaceAll("-", ":");
        } else {
          throw Exception("올바른 피그마 URL 또는 'Key NodeID' 형식을 입력해 주세요.");
        }
      }

      setState(() {
        _sduiFuture = SduiService.fetchFigmaDirect(fileKey, nodeId);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("피그마 노드($nodeId) 적용 연동 성공!"),
          backgroundColor: const Color(0xFFFFD700),
        ),
      );
    } catch (e) {
      _showSduiDialog(context, "연동 에러", e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D), // 딥 다크 블루 일체화
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1D),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () => Navigator.maybePop(context),
        ),
        title: Text(
          widget.title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.link, color: Color(0xFFFFD700)),
            tooltip: "피그마 주소 직접 연동",
            onPressed: () => _showFigmaLinkInputDialog(context),
          )
        ],
      ),
      body: FutureBuilder<SduiComponent>(
        future: _sduiFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFFD700)),
              ),
            );
          } else if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                  const SizedBox(height: 16),
                  Text(
                    "화면을 불러오지 못했습니다.\n${snapshot.error}",
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadTemplate,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFFD700)),
                    child: const Text("재시도", style: TextStyle(color: Colors.black)),
                  )
                ],
              ),
            );
          }

          final sduiComponent = snapshot.data!;
          return RefreshIndicator(
            color: const Color(0xFFFFD700),
            backgroundColor: const Color(0xFF1E2638),
            onRefresh: () async {
              _loadTemplate();
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SduiRenderer(
                component: sduiComponent,
                controllers: _controllers,
                onAction: _handleAction,
              ),
            ),
          );
        },
      ),
    );
  }
}
