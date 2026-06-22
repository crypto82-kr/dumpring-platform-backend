import sys
import os

def main():
    hwp_path = "D:\\Projects\\dumpring\\dumpring-platform-backend\\docs\\덤프링_플랫폼_인프라_및_용어_정의서.hwp"
    
    if not os.path.exists(hwp_path):
        print("Error: HWP file not found.")
        return
        
    try:
        import win32com.client
        hwp = win32com.client.Dispatch("HWPFrame.HwpObject")
        hwp.Open(hwp_path)
        
        # Get all text from HWP
        # GetTextFile(format, option)
        text_data = hwp.GetTextFile("TEXT", "")
        hwp.Quit()
        
        print(f"HWP file text length: {len(text_data)}")
        print("Preview:")
        print(text_data[:500])
    except Exception as e:
        print(f"Error checking HWP file: {e}")

if __name__ == '__main__':
    main()
