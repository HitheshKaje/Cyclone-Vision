import cv2
import numpy as np
import os
import random
import time

OUTPUT_DIR = "Synthetic_Hard_Negatives"
TOTAL_IMAGES = 10000
IMG_SIZE = 224

def generate_synthetic_vortex():
    # Random ocean/sky background color (blues, dark blues, blacks)
    bg_b = random.randint(100, 255)
    bg_g = random.randint(50, 150)
    bg_r = random.randint(0, 50)
    
    img = np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
    img[:] = (bg_b, bg_g, bg_r)
    
    # Add random noise to background
    noise = np.random.normal(0, 25, (IMG_SIZE, IMG_SIZE, 3)).astype(np.uint8)
    img = cv2.add(img, noise)
    
    # Center of vortex
    center = (IMG_SIZE // 2 + random.randint(-20, 20), IMG_SIZE // 2 + random.randint(-20, 20))
    
    # Draw spiral arms (clouds)
    num_arms = random.randint(2, 6)
    for arm in range(num_arms):
        angle_offset = arm * (360 / num_arms)
        for r in range(5, IMG_SIZE // 2, 2):
            # Logarithmic spiral formula
            theta = angle_offset + r * random.uniform(2.0, 4.0)
            x = int(center[0] + r * np.cos(np.radians(theta)))
            y = int(center[1] + r * np.sin(np.radians(theta)))
            
            if 0 <= x < IMG_SIZE and 0 <= y < IMG_SIZE:
                # Cloud thickness and color (whites, grays)
                thickness = random.randint(1, 4)
                color_val = random.randint(200, 255)
                cv2.circle(img, (x, y), thickness, (color_val, color_val, color_val), -1)

    # Draw the "eye" (dark center)
    eye_radius = random.randint(5, 25)
    eye_color = (max(bg_b-50, 0), max(bg_g-50, 0), max(bg_r-50, 0))
    cv2.circle(img, center, eye_radius, eye_color, -1)
    
    # Add heavy blur to make it look like atmospheric clouds
    blur_amount = random.choice([3, 5, 7, 9])
    img = cv2.GaussianBlur(img, (blur_amount, blur_amount), 0)
    
    return img

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating {TOTAL_IMAGES} synthetic vortex/whirlpool images...")
    
    t0 = time.time()
    for i in range(TOTAL_IMAGES):
        img = generate_synthetic_vortex()
        save_path = os.path.join(OUTPUT_DIR, f"synthetic_vortex_{i}.jpg")
        cv2.imwrite(save_path, img)
        
        if (i + 1) % 1000 == 0:
            print(f"Generated {i + 1}/{TOTAL_IMAGES} images...")
            
    t1 = time.time()
    print(f"\n[SUCCESS] Generated {TOTAL_IMAGES} images in {t1 - t0:.2f} seconds.")
    print(f"Images saved to: {os.path.abspath(OUTPUT_DIR)}")

if __name__ == "__main__":
    main()
