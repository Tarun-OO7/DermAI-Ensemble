"""
Copies one representative image for each of the 7 HAM10000 classes into the artifact directory.
"""

import os
import csv
import json
import shutil

base_dir = os.path.dirname(__file__)
holdout_csv = os.path.join(base_dir, "data", "eval_holdout_set.csv")
art_dir = r"C:\Users\nagar\.gemini\antigravity\brain\36325a29-27fa-4dd1-b072-493a1c2ede4e\sample_classes"
os.makedirs(art_dir, exist_ok=True)

part1 = os.path.join(base_dir, "data", "HAM10000", "HAM10000_images_part_1")
part2 = os.path.join(base_dir, "data", "HAM10000", "HAM10000_images_part_2")
isic_bcc = os.path.join(base_dir, "data", "ISIC_expansion", "bcc")
isic_bkl = os.path.join(base_dir, "data", "ISIC_expansion", "bkl")
search_dirs = [part1, part2, isic_bcc, isic_bkl]

with open(holdout_csv, mode="r", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

classes = ["mel", "nv", "bcc", "akiec", "bkl", "df", "vasc"]
class_info = {
    "mel": {
        "title": "Melanoma (MEL)",
        "category": "Malignant Skin Cancer",
        "description": "A serious form of skin cancer originating from melanocytes. Typically exhibits asymmetrical borders, color variegation (black/brown/blue/red), and evolution."
    },
    "nv": {
        "title": "Melanocytic Nevus (NV)",
        "category": "Benign Common Mole",
        "description": "A standard, benign proliferation of pigment cells. Typically symmetrical, with sharp, regular borders and uniform coloration."
    },
    "bcc": {
        "title": "Basal Cell Carcinoma (BCC)",
        "category": "Malignant Non-Melanoma Skin Cancer",
        "description": "The most common form of skin cancer. Often presents as a translucent, pearly pink nodule with arborizing telangiectasia (tiny visible blood vessels)."
    },
    "akiec": {
        "title": "Actinic Keratosis / Intraepithelial Carcinoma (AKIEC)",
        "category": "Pre-Malignant Lesion",
        "description": "A rough, scaly patch on sun-exposed skin that has the potential to progress to invasive squamous cell carcinoma if left untreated."
    },
    "bkl": {
        "title": "Benign Keratosis (BKL / Seborrheic Keratosis)",
        "category": "Benign Keratinocyte Lesion",
        "description": "A common harmless skin growth with a 'stuck-on' waxy or verrucous appearance, often containing milia-like cysts or comedo-like openings under dermoscopy."
    },
    "df": {
        "title": "Dermatofibroma (DF)",
        "category": "Benign Fibrous Nodule",
        "description": "A firm, benign fibrous nodule often appearing on extremities, classically exhibiting a central white patch surrounded by a faint pigment network (the 'dimple sign')."
    },
    "vasc": {
        "title": "Vascular Lesion (VASC / Angioma)",
        "category": "Benign Vascular Growth",
        "description": "A benign proliferation of blood vessels (cherry angiomas, pyogenic granulomas). Characterized by distinct red/purple/blue vascular lacunae."
    }
}

selected = []
for c in classes:
    for r in rows:
        if r["dx"] == c:
            fpath = r["file_path"]
            if not os.path.exists(fpath):
                img_id = r["image_id"]
                for d in search_dirs:
                    cand = os.path.join(d, f"{img_id}.jpg")
                    if os.path.exists(cand):
                        fpath = cand
                        break
            if os.path.exists(fpath):
                dest_fname = f"sample_{c}_{r['image_id']}.jpg"
                dest_path = os.path.join(art_dir, dest_fname)
                shutil.copy(fpath, dest_path)
                selected.append({
                    "code": c,
                    "title": class_info[c]["title"],
                    "category": class_info[c]["category"],
                    "description": class_info[c]["description"],
                    "image_id": r["image_id"],
                    "lesion_id": r["lesion_id"],
                    "age": r.get("age", "N/A"),
                    "sex": r.get("sex", "N/A"),
                    "localization": r.get("localization", "N/A"),
                    "filename": dest_fname,
                    "artifact_path": dest_path
                })
                break

out_json = os.path.join(art_dir, "samples_metadata.json")
with open(out_json, "w") as f:
    json.dump(selected, f, indent=2)

print(f"Successfully extracted {len(selected)} / 7 representative class images to {art_dir}")
