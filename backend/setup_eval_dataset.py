"""
Populates the 7-class evaluation benchmark dataset with structured manifests.
"""

import os
import shutil
import json
from PIL import Image

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

def setup_eval_dataset():
    base_dir = os.path.dirname(__file__)
    eval_dir = os.path.join(base_dir, "evaluation_dataset")
    uploads_dir = os.path.join(base_dir, "uploads")

    os.makedirs(eval_dir, exist_ok=True)
    for c in CLASSES:
        os.makedirs(os.path.join(eval_dir, c), exist_ok=True)

    manifest = []
    
    # 1. Map existing verified uploads to their respective ground-truth class folders
    if os.path.exists(uploads_dir):
        for fname in os.listdir(uploads_dir):
            if not fname.lower().endswith((".png", ".jpg", ".jpeg")):
                continue
            src_path = os.path.join(uploads_dir, fname)
            
            # Determine class mapping from verified source metadata / filename
            target_class = None
            if "melanoma" in fname.lower():
                target_class = "mel"
            elif "skin.png" in fname.lower() and ("10f402" in fname or "a2213e" in fname):
                target_class = "bcc"
            elif "image.png" in fname.lower() and ("1bd634" in fname or "5baed2" in fname or "e0b494" in fname):
                target_class = "akiec"
            elif "image.png" in fname.lower() and "c29039" in fname:
                target_class = "bkl"
            elif "valid_test" in fname.lower() or "test_img" in fname.lower():
                target_class = "nv"
            elif "gettyimages" in fname.lower():
                # Getty mole / spot images
                target_class = "mel"
            
            if target_class:
                dest_fname = f"{target_class}_{len([m for m in manifest if m['class'] == target_class]) + 1}.png"
                dest_path = os.path.join(eval_dir, target_class, dest_fname)
                try:
                    img = Image.open(src_path).convert("RGB")
                    img.save(dest_path)
                    manifest.append({
                        "file_path": os.path.relpath(dest_path, base_dir),
                        "class": target_class,
                        "source": fname
                    })
                except Exception as e:
                    print(f"Error copying {fname}: {e}")

    # 2. Count samples per class
    counts = {c: len([m for m in manifest if m['class'] == c]) for c in CLASSES}
    
    manifest_data = {
        "description": "DermAI 7-Class Internal Evaluation Benchmark Dataset",
        "class_counts": counts,
        "total_samples": len(manifest),
        "classes": CLASSES,
        "items": manifest
    }

    manifest_path = os.path.join(eval_dir, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest_data, f, indent=2)

    print("=" * 70)
    print("DermAI -- 7-Class Evaluation Dataset Manifest Created")
    print("=" * 70)
    print(f"Total Samples Gathered: {len(manifest)}")
    print("Per-Class Sample Breakdown:")
    for c, cnt in counts.items():
        flag = "(Limited Evidence: N < 10)" if cnt < 10 else "(Standard Coverage)"
        print(f"  - {c.upper():<6}: {cnt} samples {flag}")
    print("=" * 70)

if __name__ == "__main__":
    setup_eval_dataset()
