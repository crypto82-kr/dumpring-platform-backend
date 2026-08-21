import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'file_picker_stub.dart';
export 'file_picker_stub.dart';

class FilePickerHelper {
  static Future<SelectedFile?> pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      );
      if (result == null || result.files.isEmpty) return null;
      
      final file = result.files.first;
      Uint8List? bytes = file.bytes;
      if (bytes == null && file.path != null) {
        final ioFile = File(file.path!);
        bytes = await ioFile.readAsBytes();
      }
      
      if (bytes == null) return null;

      return SelectedFile(
        name: file.name,
        bytes: bytes,
        path: file.path,
      );
    } catch (e) {
      return null;
    }
  }
}
