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

  /// 포트원(PortOne) V2 본인인증 키
  static const String portoneStoreId = "store-d234f526-1ff5-408d-a485-67e36e53f003";
  static const String portoneChannelKey = "channel-key-b9cc6ecd-0a1c-4d4e-a849-9e9c5168c25e";
}

