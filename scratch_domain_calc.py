import cv2
import numpy as np

img = cv2.imread(r"test_user_cyclone.jpg")
print("Image shape:", img.shape)

h, w, c = img.shape
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
h_chan, s_chan, v_chan = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
b_chan, g_chan, r_chan = img[:, :, 0], img[:, :, 1], img[:, :, 2]

pure_white_mask = (gray >= 250) & (s_chan < 20)
pure_white_frac = float(np.mean(pure_white_mask))

cloud_mask = (gray > 145) & (gray <= 245) & (s_chan < 75)
cloud_frac = float(np.mean(cloud_mask))

ocean_mask = (b_chan > r_chan + 12) & (b_chan >= g_chan - 20) & (v_chan > 15) & (v_chan < 210)
ocean_frac = float(np.mean(ocean_mask))

green_mask = (g_chan > r_chan + 12) & (g_chan > b_chan + 10) & (v_chan > 25)
green_frac = float(np.mean(green_mask))

edges = cv2.Canny(gray, 40, 120)
min_len = int(min(h, w) * 0.12)
lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=45, minLineLength=min_len, maxLineGap=20)
line_count = len(lines) if lines is not None else 0

cloud_std = float(np.std(gray[cloud_mask])) if cloud_frac > 0.03 else 0.0

print(f"pure_white_frac: {pure_white_frac:.4f}")
print(f"cloud_frac: {cloud_frac:.4f}")
print(f"ocean_frac: {ocean_frac:.4f}")
print(f"green_frac: {green_frac:.4f}")
print(f"line_count: {line_count}")
print(f"cloud_std: {cloud_std:.4f}")
print(f"gray_std: {float(np.std(gray)):.4f}")

# Filter checks:
if pure_white_frac > 0.35:
    print("REJECTED: pure_white_frac > 0.35")

dark_bg_frac = float(np.mean(gray < 30))
print(f"dark_bg_frac: {dark_bg_frac:.4f}")
if dark_bg_frac > 0.50 and cloud_frac < 0.05 and ocean_frac < 0.04 and line_count > 6:
    print("REJECTED: dark_bg_frac")

if green_frac > 0.16 and cloud_frac < 0.08:
    print("REJECTED: green_frac")

# Whitelist checks:
if ocean_frac > 0.05 and cloud_frac > 0.05 and cloud_std > 12.0:
    print("PASSED WHITELIST A: Ocean & Cloud systems")
elif cloud_frac > 0.14 and cloud_std > 12.0 and (ocean_frac > 0.01 or float(np.std(gray)) > 26.0) and green_frac < 0.22:
    print("PASSED WHITELIST B: Cloud formation")
elif line_count >= 4 and (cloud_frac > 0.05 or ocean_frac > 0.05):
    print("PASSED WHITELIST C: Grid lines")
elif float(np.std(gray)) > 30.0 and cloud_frac > 0.08 and green_frac < 0.10:
    print("PASSED WHITELIST D: IR channel")
elif cloud_frac < 0.08 and ocean_frac < 0.05:
    print("REJECTED: General rejection")
else:
    print("PASSED Default True")
