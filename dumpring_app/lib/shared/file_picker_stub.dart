import 'dart:typed_data';

class SelectedFile {
  final String name;
  final Uint8List bytes;
  final String? path; // null on web

  SelectedFile({required this.name, required this.bytes, this.path});
}

class FilePickerHelper {
  static Future<SelectedFile?> pickFile() async {
    throw UnimplementedError('Unsupported platform');
  }
}
