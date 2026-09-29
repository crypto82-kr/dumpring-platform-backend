import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'layouts/dr_scaffold.dart';

/// 앱 내부 실시간 카메라 QR 뷰파인더 스캐너 모달
/// 기본 카메라 앱(ImagePicker)으로 빠져나가지 않고 앱 안에서 즉시 QR을 디코딩
class DrQrScannerDialog extends StatefulWidget {
  final String title;
  final String description;

  const DrQrScannerDialog({
    super.key,
    required this.title,
    required this.description,
  });

  /// 바텀시트 또는 풀스크린 모달로 띄워 스캔된 raw payload 문자열을 반환
  static Future<String?> scan(BuildContext context, {required String title, required String description}) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DrQrScannerDialog(
        title: title,
        description: description,
      ),
    );
  }

  @override
  State<DrQrScannerDialog> createState() => _DrQrScannerDialogState();
}

class _DrQrScannerDialogState extends State<DrQrScannerDialog> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _hasDetected = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasDetected) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final raw = barcode.rawValue;
      if (raw != null && raw.trim().isNotEmpty) {
        _hasDetected = true;
        Navigator.of(context).pop(raw.trim());
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final double screenHeight = MediaQuery.of(context).size.height;

    return Container(
      height: screenHeight * 0.75,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          // 상단 드래그 인디케이터 바
          Container(
            width: 48,
            height: 5,
            decoration: BoxDecoration(
              color: AppColors.textSecondary.withAlpha(80),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(height: 16),
          // 타이틀 영역
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(35),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      widget.title,
                      style: AppTextStyles.h3.copyWith(fontSize: 17),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(null),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Text(
              widget.description,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
            ),
          ),
          const SizedBox(height: 12),
          // 실제 카메라 뷰파인더 영역
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(24),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    controller: _controller,
                    onDetect: _onDetect,
                  ),
                  // 가이드라인 오버레이 (정중앙 사각 스캔 박스)
                  Center(
                    child: Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.primary, width: 3),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withAlpha(70),
                            blurRadius: 16,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                    ),
                  ),
                  // 손전등 토글 버튼
                  Positioned(
                    bottom: 16,
                    right: 16,
                    child: CircleAvatar(
                      backgroundColor: Colors.black.withAlpha(160),
                      radius: 24,
                      child: IconButton(
                        icon: const Icon(
                          Icons.flash_on,
                          color: Colors.white,
                          size: 22,
                        ),
                        onPressed: () => _controller.toggleTorch(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // 하단 취소 버튼
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(null),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textSecondary,
                  side: BorderSide(color: AppColors.divider),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text("스캔 취소", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
