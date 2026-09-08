import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../shared/app_config.dart';
import '../shared/widgets/layouts/dr_scaffold.dart';

class PortoneIdentityScreen extends StatefulWidget {
  final String? storeId;
  final String? channelKey;
  final String title;

  const PortoneIdentityScreen({
    super.key,
    this.storeId,
    this.channelKey,
    this.title = "휴대폰 본인확인",
  });

  @override
  State<PortoneIdentityScreen> createState() => _PortoneIdentityScreenState();
}

class _PortoneIdentityScreenState extends State<PortoneIdentityScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  late final String _issueId;

  String get _effectiveStoreId => widget.storeId ?? AppConfig.portoneStoreId;
  String get _effectiveChannelKey => widget.channelKey ?? AppConfig.portoneChannelKey;

  @override
  void initState() {
    super.initState();
    _issueId = 'dumpring-${DateTime.now().millisecondsSinceEpoch}';
    _initWebView();
  }

  void _initWebView() {
    const String redirectUrl = 'https://dumpring.co.kr/portone/complete';

    final String htmlContent = '''
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${widget.title}</title>
  <script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      background-color: #0F172A;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid rgba(255, 255, 255, 0.15);
      border-top: 4px solid #3B82F6;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .title {
      font-size: 17px;
      font-weight: 700;
      color: #F1F5F9;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .retry-btn {
      display: none;
      background-color: #3B82F6;
      color: #FFFFFF;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 10px;
      border: none;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="spinner" id="spinner"></div>
  <div class="title" id="status-title">본인확인 연결 중</div>
  <div class="desc" id="status-desc">인증 화면(문자인증 / PASS)으로 이동하고 있습니다...</div>
  <button class="retry-btn" id="retry-btn" onclick="startVerification()">다시 시도하기</button>

  <script>
    async function startVerification() {
      const title = document.getElementById('status-title');
      const desc = document.getElementById('status-desc');
      const spinner = document.getElementById('spinner');
      const retryBtn = document.getElementById('retry-btn');

      spinner.style.display = 'block';
      retryBtn.style.display = 'none';
      title.innerText = "본인확인 연결 중";
      desc.innerText = "인증 화면(문자인증 / PASS)으로 이동하고 있습니다...";

      try {
        if (typeof PortOne === 'undefined') {
          throw new Error("포트원 SDK 로딩에 실패했습니다. 인터넷 연결을 확인해 주세요.");
        }

        console.log("Requesting PortOne Identity Verification...", "$_issueId");

        const response = await PortOne.requestIdentityVerification({
          storeId: '$_effectiveStoreId',
          identityVerificationId: '$_issueId',
          channelKey: '$_effectiveChannelKey',
          redirectUrl: '$redirectUrl',
          forceRedirect: true
        });

        if (response && response.code != null) {
          throw new Error(response.message || "본인인증 요청이 취소되었습니다.");
        }
      } catch (err) {
        console.error("PortOne verification error:", err);
        spinner.style.display = 'none';
        retryBtn.style.display = 'inline-block';
        title.innerText = "본인인증 안내";
        desc.innerText = err.message || "인증창을 불러오는 중 문제가 발생했습니다.";
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(startVerification, 200);
    });
  </script>
</body>
</html>
''';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F172A))
      ..setOnConsoleMessage((JavaScriptConsoleMessage msg) {
        debugPrint("[PortOne JS Console] ${msg.message}");
      })
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            debugPrint("WebView onPageStarted: $url");
            setState(() {
              _isLoading = true;
            });
          },
          onPageFinished: (String url) {
            debugPrint("WebView onPageFinished: $url");
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint("WebView ResourceError: ${error.errorCode} - ${error.description}");
          },
          onNavigationRequest: (NavigationRequest request) async {
            final String url = request.url;
            debugPrint("Navigation Request: $url");

            // 1. 인증 완료 리디렉션 감지
            if (url.startsWith('https://dumpring.co.kr/portone/complete') || url.contains('/portone/complete')) {
              final Uri uri = Uri.parse(url);
              final String? code = uri.queryParameters['code'];
              final String? message = uri.queryParameters['message'];
              final String? verifiedId = uri.queryParameters['identityVerificationId'];

              if (code != null) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(message ?? "본인인증이 취소되었거나 실패했습니다."),
                      backgroundColor: AppColors.danger,
                    ),
                  );
                  Navigator.of(context).pop(null);
                }
              } else {
                if (mounted) {
                  Navigator.of(context).pop(verifiedId ?? _issueId);
                }
              }
              return NavigationDecision.prevent;
            }

            // 2. 외부 앱 실행 스킴 (PASS, 카카오, 토스, 마켓 등)
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:blank')) {
              try {
                final Uri uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else {
                  // intent: URL 파싱 처리
                  if (url.startsWith('intent:')) {
                    final schemeMatch = RegExp(r'scheme=([^;]+)').firstMatch(url);
                    final packageMatch = RegExp(r'package=([^;]+)').firstMatch(url);
                    bool launched = false;
                    if (schemeMatch != null) {
                      final fallbackScheme = schemeMatch.group(1);
                      final raw = url.split('#Intent;')[0].replaceFirst(RegExp(r'^intent:/*'), '');
                      final fallbackUri = Uri.parse('$fallbackScheme://$raw');
                      if (await canLaunchUrl(fallbackUri)) {
                        await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
                        launched = true;
                      }
                    }
                    if (!launched && packageMatch != null) {
                      final packageName = packageMatch.group(1);
                      final marketUri = Uri.parse('market://details?id=$packageName');
                      if (await canLaunchUrl(marketUri)) {
                        await launchUrl(marketUri, mode: LaunchMode.externalApplication);
                      }
                    }
                  }
                }
              } catch (e) {
                debugPrint("외부 앱 스킴 실행 오류: $e");
              }
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadHtmlString(htmlContent, baseUrl: "https://dumpring.co.kr");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          widget.title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          tooltip: "인증 닫기",
          onPressed: () => Navigator.of(context).pop(null),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(color: AppColors.info),
            ),
        ],
      ),
    );
  }
}
