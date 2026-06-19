/// 덤프링 앱 전역 설정
/// 서버 URL은 이 파일 하나에서만 관리합니다.
class AppConfig {
  AppConfig._();

  /// Render.com 운영 서버 베이스 URL
  /// GitHub 푸시 → Render 자동 배포되는 FastAPI 서버
  static const String baseUrl = "https://dumpring-api.onrender.com";

  /// WebSocket 베이스 URL (ws:// or wss://)
  static String get wsBaseUrl => baseUrl.replaceFirst("https", "wss").replaceFirst("http", "ws");

  /// TMap API App Key
  static const String tmapAppKey = "5gUKBVLN7Q2rfidZTfVZK7VA6bIg2ykN6qXXXJmQ";
}
