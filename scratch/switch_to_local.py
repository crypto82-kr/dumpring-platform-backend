import os

def replace_in_file(filepath, old_str, new_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_str in content:
        new_content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

def run():
    lib_dir = r"d:\Projects\dumpring\dumpring-platform-backend\dumpring_app\lib"
    old_url = "https://dumpring-api.onrender.com"
    new_url = "http://localhost:8000"
    
    for root, dirs, files in os.walk(lib_dir):
        for file in files:
            if file.endswith(".dart"):
                filepath = os.path.join(root, file)
                replace_in_file(filepath, old_url, new_url)

if __name__ == '__main__':
    run()
