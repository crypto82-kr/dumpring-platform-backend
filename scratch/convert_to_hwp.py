import os
import sys
import shutil

def main():
    docx_path = "D:\\Projects\\dumpring\\dumpring-platform-backend\\docs\\덤프링_플랫폼_인프라_및_용어_정의서.docx"
    hwp_path = "D:\\Projects\\dumpring\\dumpring-platform-backend\\docs\\덤프링_플랫폼_인프라_및_용어_정의서.hwp"
    
    if not os.path.exists(docx_path):
        print(f"Error: DOCX file not found at {docx_path}", flush=True)
        return
        
    temp_docx = "D:\\Projects\\dumpring\\dumpring-platform-backend\\docs\\temp_infra.docx"
    temp_rtf = "D:\\Projects\\dumpring\\dumpring-platform-backend\\docs\\temp_infra.rtf"
    temp_hwp = "D:\\Projects\\dumpring\\dumpring-platform-backend\\docs\\temp_infra.hwp"
    
    try:
        shutil.copy2(docx_path, temp_docx)
        print(f"Copied source to temp ASCII path: {temp_docx}", flush=True)
    except Exception as e:
        print(f"Failed to copy source file: {e}", flush=True)
        return

    # Clean up old temp files
    for path in [temp_rtf, temp_hwp]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass

    print("Initializing MS Word OLE Automation to convert DOCX to RTF...", flush=True)
    try:
        import win32com.client
        print("win32com imported.", flush=True)
        word = win32com.client.Dispatch("Word.Application")
        print("Word.Application dispatched.", flush=True)
        word.Visible = False
        print(f"Opening temp docx: {temp_docx}", flush=True)
        doc = word.Documents.Open(temp_docx)
        print("Temp docx opened.", flush=True)
        # wdFormatRTF = 6
        print(f"Saving temp RTF: {temp_rtf}", flush=True)
        doc.SaveAs(temp_rtf, 6)
        print("Temp RTF saved.", flush=True)
        doc.Close()
        print("Doc closed.", flush=True)
        word.Quit()
        print("Word closed.", flush=True)
        print(f"Successfully converted DOCX to RTF: {temp_rtf}", flush=True)
    except Exception as e:
        print(f"Failed to convert DOCX to RTF via Word COM: {e}", flush=True)
        # Cleanup
        if os.path.exists(temp_docx):
            os.remove(temp_docx)
        return

    print("Initializing Hancom Office OLE Automation...", flush=True)
    try:
        # Launch Hancom Office
        print("Dispatching HWPFrame.HwpObject...", flush=True)
        hwp = win32com.client.GenPyUIDetect = False
        hwp = win32com.client.Dispatch("HWPFrame.HwpObject")
        print("Hancom Office launched successfully.", flush=True)
        
        # Open RTF file
        print(f"Opening temp RTF file: {temp_rtf}", flush=True)
        opened = hwp.Open(temp_rtf, "RTF", "")
        print(f"Open status: {opened}", flush=True)
        
        if opened:
            # Save as HWP file
            print(f"Saving temp HWP file: {temp_hwp}", flush=True)
            saved = hwp.SaveAs(temp_hwp, "HWP", "")
            print(f"Save status: {saved}", flush=True)
        else:
            print("Failed to open RTF file in Hancom Office.", flush=True)
            saved = False
        
        # Quit Hancom Office
        print("Closing HWP...", flush=True)
        hwp.Quit()
        print("Hancom Office closed.", flush=True)
        
        # Check if converted file exists and is not empty
        if saved and os.path.exists(temp_hwp) and os.path.getsize(temp_hwp) > 15000:
            # Move temp HWP to target HWP path
            if os.path.exists(hwp_path):
                os.remove(hwp_path)
            shutil.move(temp_hwp, hwp_path)
            print(f"Conversion completed successfully. Saved to: {hwp_path}", flush=True)
        else:
            print(f"Error: Converted HWP file is missing or too small (size: {os.path.getsize(temp_hwp) if os.path.exists(temp_hwp) else 'N/A'})", flush=True)
            
    except Exception as e:
        print(f"Failed to convert using Hancom Office COM: {e}", flush=True)
        print("Please make sure Hancom Office (아래아한글) is installed on your system.", flush=True)
    finally:
        # Clean up temp files
        for path in [temp_docx, temp_rtf, temp_hwp]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    print(f"Clean up error for {path}: {e}", flush=True)

if __name__ == '__main__':
    main()



