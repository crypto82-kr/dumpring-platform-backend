import os
from PIL import Image

src_img_path = r"C:\Users\Crypto\.gemini\antigravity-ide\brain\90e87333-3e96-410a-9755-7f10b52a7e98\dumpring_logo_line_bold_1781608131528.png"
res_base_dir = r"d:\Projects\dumpring\dumpring-platform-backend\dumpring_app\android\app\src\main\res"

if not os.path.exists(src_img_path):
    print(f"Error: Source image not found at {src_img_path}")
    exit(1)

# Open image and convert to RGBA
img = Image.open(src_img_path).convert("RGBA")
datas = img.getdata()

new_data = []
for item in datas:
    r, g, b, a = item
    # Yellow/orange has high R and G, and lower B
    # Let's check if the pixel is yellow: R > 150 and G > 100 and B < 100
    if r > 180 and g > 120 and b < 100:
        # Keep the yellow pixel as is
        new_data.append(item)
    else:
        # Make the dark background transparent
        new_data.append((0, 0, 0, 0))

img.putdata(new_data)

# Save high-res versions to drawables
drawables = {
    "drawable-hdpi": (192, 192),
    "drawable-xhdpi": (256, 256),
    "drawable-xxhdpi": (384, 384),
    "drawable-xxxhdpi": (512, 512),
}

for folder, size in drawables.items():
    dest_path = os.path.join(res_base_dir, folder, "launch_image.png")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    resized_img = img.resize(size, Image.Resampling.LANCZOS)
    resized_img.save(dest_path, "PNG")
    print(f"Created high-res transparent splash drawable: {dest_path} with size {size}")

print("Transparent splash images prepared successfully!")
