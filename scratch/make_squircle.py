import os
from PIL import Image, ImageDraw

src_path = r"C:\Users\Crypto\.gemini\antigravity-ide\brain\90e87333-3e96-410a-9755-7f10b52a7e98\dumpring_logo_c2_fullbleed_white_1781608822956.png"
dest_path = r"C:\Users\Crypto\.gemini\antigravity-ide\brain\90e87333-3e96-410a-9755-7f10b52a7e98\dumpring_logo_c2_squircle_white.png"

if not os.path.exists(src_path):
    print("Error: Source image not found!")
    exit(1)

# Open image and ensure it has an alpha channel (RGBA)
img = Image.open(src_path).convert("RGBA")
width, height = img.size

# Create a transparent mask image
mask = Image.new("L", (width, height), 0)
draw = ImageDraw.Draw(mask)

# Standard iOS/Modern squircle corner radius is ~22% of the size
radius = int(width * 0.22)

# Draw a rounded rectangle on the mask
draw.rounded_rectangle([0, 0, width, height], radius=radius, fill=255)

# Put the mask into the alpha channel of our image
img.putalpha(mask)

# Save the squircle image
img.save(dest_path, "PNG")
print(f"Successfully created squircle logo at: {dest_path}")
