import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';
import 'file_picker_stub.dart';
export 'file_picker_stub.dart';

class FilePickerHelper {
  static Future<SelectedFile?> pickFile() async {
    final completer = Completer<SelectedFile?>();
    
    final input = html.FileUploadInputElement();
    input.accept = 'image/*,application/pdf';
    input.multiple = false;
    
    input.onChange.listen((event) {
      final files = input.files;
      if (files == null || files.isEmpty) {
        completer.complete(null);
        return;
      }
      
      final file = files.first;
      final reader = html.FileReader();
      
      reader.onLoadEnd.listen((loadEvent) {
        final result = reader.result;
        if (result is Uint8List) {
          completer.complete(SelectedFile(
            name: file.name,
            bytes: result,
          ));
        } else {
          completer.complete(null);
        }
      });
      
      reader.onError.listen((errorEvent) {
        completer.complete(null);
      });
      
      reader.readAsArrayBuffer(file);
    });
    
    input.click();
    
    return completer.future;
  }
}
