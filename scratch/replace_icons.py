import os
from PIL import Image

src_img_path = r"C:\Users\Crypto\.gemini\antigravity-ide\brain\90e87333-3e96-410a-9755-7f10b52a7e98\dumpring_logo_c2_squircle_white.png"
res_base_dir = r"d:\Projects\dumpring\dumpring-platform-backend\dumpring_app\android\app\src\main\res"

sizes = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192),
}

if not os.path.exists(src_img_path):
    print(f"Error: Source image not found at {src_img_path}")
    exit(1)

img = Image.open(src_img_path)

for folder, size in sizes.items():
    # Save standard launcher icon
    dest_path = os.path.join(res_base_dir, folder, "ic_launcher.png")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    resized_img = img.resize(size, Image.Resampling.LANCZOS)
    resized_img.save(dest_path, "PNG")
    print(f"Successfully replaced standard: {dest_path} with size {size}")

    # Save round launcher icon (override with squircle to force squircle design)
    dest_round_path = os.path.join(res_base_dir, folder, "ic_launcher_round.png")
    resized_img.save(dest_round_path, "PNG")
    print(f"Successfully replaced round: {dest_round_path} with size {size}")

print("All icons replaced successfully!")
