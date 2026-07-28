import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'file_picker_stub.dart';
export 'file_picker_stub.dart';

class FilePickerHelper {
  static Future<SelectedFile?> pickFile() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file == null) return null;
    
    final bytes = await file.readAsBytes();
    return SelectedFile(
      name: file.name,
      bytes: bytes,
      path: file.path,
    );
  }
}
