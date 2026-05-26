import urllib.request
import zipfile
import os
import shutil

url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
zip_path = "cmdline-tools.zip"
sdk_path = r"C:\Users\Crypto\AppData\Local\Android\Sdk\cmdline-tools"

try:
    print("1. Starting high-speed download of cmdline-tools from Google server...")
    urllib.request.urlretrieve(url, zip_path)
    print("2. Download complete! Extracting zip file...")

    # 임시 압축 해제 폴더 생성
    temp_extract = os.path.join(sdk_path, "temp")
    os.makedirs(temp_extract, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_extract)

    print("3. Extraction complete. Configuring folders...")
    latest_dir = os.path.join(sdk_path, "latest")
    if os.path.exists(latest_dir):
        shutil.rmtree(latest_dir)

    os.makedirs(latest_dir, exist_ok=True)

    # 임시 압축 해제된 폴더의 내용물을 'latest' 아래로 이식
    src_dir = os.path.join(temp_extract, "cmdline-tools")
    for item in os.listdir(src_dir):
        s = os.path.join(src_dir, item)
        d = os.path.join(latest_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    # 청소 및 뒷정리
    shutil.rmtree(temp_extract)
    if os.path.exists(zip_path):
        os.remove(zip_path)

    print("SUCCESS: cmdline-tools is successfully installed and configured at standard Sdk path!")

except Exception as e:
    print(f"FAILED: An error occurred during setup: {e}")
