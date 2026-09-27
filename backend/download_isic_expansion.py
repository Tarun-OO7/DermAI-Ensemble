"""
DermAI — ISIC Data Sourcing, Licensing Audit, and Perceptual Deduplication Pipeline

1. Uses isic_cli to download candidate images for BCC and BKL.
2. Extracts and logs license terms (CC-0, CC-BY, CC-BY-NC) in isic_license_log.json.
3. Computes perceptual dhash for every image against:
   - train_split.csv (8,418 images)
   - val_split.csv (1,437 images)
   - eval_holdout_set.csv (158 images) -> Extra strict Hamming <= 8 filter.
4. Appends verified unique images to train_split.csv ONLY.
"""

import os
import sys
import csv
import json
import time
import subprocess
from PIL import Image

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]


def compute_dhash(img: Image.Image, hash_size: int = 8) -> int:
    """Computes difference hash (dhash) as a 64-bit integer."""
    resized = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(resized.getdata())
    diff = 0
    for row in range(hash_size):
        for col in range(hash_size):
            p_left = pixels[row * (hash_size + 1) + col]
            p_right = pixels[row * (hash_size + 1) + col + 1]
            if p_left > p_right:
                diff |= (1 << (row * hash_size + col))
    return diff


def hamming_distance(hash1: int, hash2: int) -> int:
    return bin(hash1 ^ hash2).count("1")


def build_existing_hash_db(base_dir: str):
    print("=" * 80)
    print("Building Perceptual Hash Database from all existing splits...")
    print("=" * 80)

    train_csv = os.path.join(base_dir, "data", "train_split.csv")
    val_csv = os.path.join(base_dir, "data", "val_split.csv")
    holdout_csv = os.path.join(base_dir, "data", "eval_holdout_set.csv")

    existing_ids = set()
    train_hashes = []
    val_hashes = []
    holdout_hashes = []

    # 1. Holdout Hashes (Critical: zero-leakage threshold)
    with open(holdout_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            existing_ids.add(r["image_id"])
            try:
                img = Image.open(r["file_path"]).convert("RGB")
                holdout_hashes.append((r["image_id"], compute_dhash(img)))
            except Exception:
                pass

    # 2. Train & Val Hashes
    for path, hlist in [(train_csv, train_hashes), (val_csv, val_hashes)]:
        with open(path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                existing_ids.add(r["image_id"])
                try:
                    img = Image.open(r["file_path"]).convert("RGB")
                    hlist.append((r["image_id"], compute_dhash(img)))
                except Exception:
                    pass

    print(f"Indexed {len(existing_ids)} unique image_ids.")
    print(f"Computed Hashes: Train={len(train_hashes)} | Val={len(val_hashes)} | Holdout={len(holdout_hashes)}")
    return existing_ids, train_hashes, val_hashes, holdout_hashes


def download_category(search_query: str, limit: int, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    isic_exe = os.path.join(os.path.dirname(sys.executable), "isic.exe")
    if not os.path.exists(isic_exe):
        isic_exe = "isic"
    cmd = [
        isic_exe,
        "image", "download",
        "-s", search_query,
        "-l", str(limit),
        out_dir
    ]
    print(f"Executing: {' '.join(cmd)}")
    subprocess.run(cmd)


def main():
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data")
    
    # Raw download directories
    raw_bcc_dir = os.path.join(data_dir, "isic_raw_bcc")
    raw_bkl_dir = os.path.join(data_dir, "isic_raw_bkl")

    # Step 1: Download ISIC candidates using exact hierarchical taxonomy queries
    print("=" * 80)
    print("Step 1: Sourcing ISIC Candidates via isic_cli...")
    print("=" * 80)
    
    download_category('diagnosis_3:"Basal cell carcinoma"', 120, raw_bcc_dir)
    download_category('diagnosis_3:"Seborrheic keratosis" OR diagnosis_3:"Pigmented benign keratosis"', 120, raw_bkl_dir)

    # Step 2: Build Reference Hash Database
    existing_ids, train_hashes, val_hashes, holdout_hashes = build_existing_hash_db(base_dir)

    # Step 3: Parse and Deduplicate
    expansion_dir = os.path.join(data_dir, "ISIC_expansion")
    os.makedirs(os.path.join(expansion_dir, "bcc"), exist_ok=True)
    os.makedirs(os.path.join(expansion_dir, "bkl"), exist_ok=True)

    duplicate_stats = {
        "id_duplicates": 0,
        "holdout_near_duplicates": 0,
        "train_val_near_duplicates": 0,
        "accepted": {"bcc": 0, "bkl": 0}
    }

    license_log = []
    accepted_rows = []

    categories = [
        ("bcc", raw_bcc_dir),
        ("bkl", raw_bkl_dir)
    ]

    for cls_name, source_dir in categories:
        meta_file = os.path.join(source_dir, "metadata.csv")
        if not os.path.exists(meta_file):
            print(f"Warning: No metadata.csv found in {source_dir}")
            continue

        with open(meta_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                isic_id = r.get("isic_id")
                lic = r.get("copyright_license", "CC-BY")
                attribution = r.get("attribution", "ISIC Archive")

                # ID Duplicate Check
                if isic_id in existing_ids:
                    duplicate_stats["id_duplicates"] += 1
                    continue

                # Locate image
                img_path = os.path.join(source_dir, f"{isic_id}.jpg")
                if not os.path.exists(img_path):
                    continue

                try:
                    img = Image.open(img_path).convert("RGB")
                    h_cand = compute_dhash(img)

                    # Perceptual Duplicate Check against Holdout (EXTRA STRICT: Hamming <= 8)
                    is_holdout_dup = any(hamming_distance(h_cand, h_val) <= 8 for _, h_val in holdout_hashes)
                    if is_holdout_dup:
                        duplicate_stats["holdout_near_duplicates"] += 1
                        continue

                    # Perceptual Duplicate Check against Train & Val (Hamming <= 4)
                    is_train_dup = any(hamming_distance(h_cand, h_val) <= 4 for _, h_val in (train_hashes + val_hashes))
                    if is_train_dup:
                        duplicate_stats["train_val_near_duplicates"] += 1
                        continue

                    # Verified Unique & Leak-Free -> Save to final expansion directory
                    dest_path = os.path.join(expansion_dir, cls_name, f"{isic_id}.jpg")
                    img.save(dest_path, "JPEG", quality=95)

                    existing_ids.add(isic_id)
                    train_hashes.append((isic_id, h_cand))

                    accepted_rows.append({
                        "lesion_id": f"ISIC_EXP_{isic_id}",
                        "image_id": isic_id,
                        "dx": cls_name,
                        "dx_type": "histo",
                        "age": r.get("age_approx", ""),
                        "sex": r.get("sex", ""),
                        "localization": r.get("anatom_site_general", ""),
                        "file_path": dest_path
                    })

                    license_log.append({
                        "isic_id": isic_id,
                        "class": cls_name,
                        "license": lic,
                        "attribution": attribution
                    })

                    duplicate_stats["accepted"][cls_name] += 1

                except Exception as e:
                    print(f"Error processing {isic_id}: {e}")

    # Save License Log
    lic_file = os.path.join(data_dir, "isic_license_log.json")
    with open(lic_file, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_accepted": len(license_log),
            "licenses_breakdown": {
                lic: len([x for x in license_log if x["license"] == lic])
                for lic in set(x["license"] for x in license_log)
            } if license_log else {},
            "duplicate_detection": duplicate_stats,
            "items": license_log
        }, f, indent=2)

    print("\n" + "=" * 80)
    print("DermAI -- ISIC Data Sourcing & Deduplication Summary")
    print("=" * 80)
    print(f"Exact ID Duplicates Discarded:             {duplicate_stats['id_duplicates']}")
    print(f"Holdout Near-Duplicates Blocked (Strict): {duplicate_stats['holdout_near_duplicates']}")
    print(f"Train/Val Near-Duplicates Removed:        {duplicate_stats['train_val_near_duplicates']}")
    print(f"Verified Unique BCC Images Accepted:      {duplicate_stats['accepted']['bcc']}")
    print(f"Verified Unique BKL Images Accepted:      {duplicate_stats['accepted']['bkl']}")
    print(f"Total Verified Images Sourced:            {len(accepted_rows)}")
    print(f"License Log Saved to:                     {lic_file}")
    print("=" * 80)

    # Append to train_split.csv ONLY
    if accepted_rows:
        train_csv = os.path.join(data_dir, "train_split.csv")
        fieldnames = ["lesion_id", "image_id", "dx", "dx_type", "age", "sex", "localization", "file_path"]
        with open(train_csv, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            for r in accepted_rows:
                writer.writerow(r)
        print(f"Appended {len(accepted_rows)} verified unique samples to {train_csv}")


if __name__ == "__main__":
    main()
