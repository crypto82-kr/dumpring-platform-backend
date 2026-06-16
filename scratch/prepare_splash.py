import os
from PIL import Image

src_img_path = r"C:\Users\Crypto\.gemini\antigravity-ide\brain\90e87333-3e96-410a-9755-7f10b52a7e98\dumpring_logo_c2_squircle_white.png"
res_base_dir = r"d:\Projects\dumpring\dumpring-platform-backend\dumpring_app\android\app\src\main\res"

# We save high-resolution launch images
drawables = {
    "drawable-hdpi": (192, 192),
    "drawable-xhdpi": (256, 256),
    "drawable-xxhdpi": (384, 384),
    "drawable-xxxhdpi": (512, 512),
}

if not os.path.exists(src_img_path):
    print(f"Error: Source image not found at {src_img_path}")
    exit(1)

img = Image.open(src_img_path)

for folder, size in drawables.items():
    dest_path = os.path.join(res_base_dir, folder, "launch_image.png")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    resized_img = img.resize(size, Image.Resampling.LANCZOS)
    resized_img.save(dest_path, "PNG")
    print(f"Created high-res splash drawable: {dest_path} with size {size}")

print("High-res launch images prepared successfully!")
