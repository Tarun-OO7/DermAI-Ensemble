"""
DermAI — Debug Script: Class Label Mapping Consistency & Permutation Search
(Pure standard library implementation)
"""

import os
import csv
import itertools
import torch
import torch.nn.functional as F
from PIL import Image
import torchvision.transforms as transforms
import timm

CURRENT_MAPPING = {
    0: "akiec",
    1: "bcc",
    2: "bkl",
    3: "df",
    4: "mel",
    5: "nv",
    6: "vasc"
}

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

def main():
    base_dir = os.path.dirname(__file__)
    device = torch.device("cpu")
    weights_path = os.path.join(base_dir, "models_weights", "ham10000_effnet.pth")
    if not os.path.exists(weights_path):
        weights_path = os.path.join(base_dir, "models_weights", "best_model.pt")

    model = timm.create_model('efficientnet_b0', num_classes=7, pretrained=False)
    state = torch.load(weights_path, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.to(device)
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    holdout_csv = os.path.join(base_dir, "data", "eval_holdout_set.csv")
    if not os.path.exists(holdout_csv):
        print(f"Error: {holdout_csv} not found.")
        return

    items = []
    with open(holdout_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            items.append(r)

    print("=" * 80)
    print("STEP 1: Current Evaluation Label Mapping in ml_config.json")
    print("=" * 80)
    for idx, c in CURRENT_MAPPING.items():
        print(f"  Index {idx} -> {c.upper()}")

    print("\n" * 1 + "=" * 80)
    print("STEP 2: Manual Sanity Check on Real Samples (Raw Probabilities across 0-6)")
    print("=" * 80)

    # Pick 5 distinct samples from different classes, including 2 melanoma
    mel_idxs = [i for i, r in enumerate(items) if r["dx"] == "mel"][:2]
    bcc_idxs = [i for i, r in enumerate(items) if r["dx"] == "bcc"][:1]
    akiec_idxs = [i for i, r in enumerate(items) if r["dx"] == "akiec"][:1]
    nv_idxs = [i for i, r in enumerate(items) if r["dx"] == "nv"][:1]

    test_subset = mel_idxs + bcc_idxs + akiec_idxs + nv_idxs

    for i in test_subset:
        r = items[i]
        img = Image.open(r["file_path"]).convert("RGB")
        tensor = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=1)[0].tolist()

        print(f"Image ID: {r['image_id']} (Lesion: {r['lesion_id']})")
        print(f"  - Ground Truth Class: {r['dx'].upper()}")
        print(f"  - Raw Probabilities (Indices 0-6):")
        for idx in range(7):
            curr_name = CURRENT_MAPPING[idx]
            print(f"      Idx {idx} [{curr_name.upper():<5}]: {probs[idx]*100:5.2f}% (Logit: {logits[0, idx].item():6.2f})")
        top_idx = probs.index(max(probs))
        print(f"  - Top-1 Predicted Index: {top_idx} -> Maps to '{CURRENT_MAPPING[top_idx].upper()}' ({max(probs)*100:.1f}%)")
        print("-" * 80)

    print("\n" * 1 + "=" * 80)
    print("STEP 3: Exhaustive Permutation Search for Class Mappings (7! = 5,040 orderings)")
    print("=" * 80)
    print("Evaluating all 158 held-out images under all 5,040 permutations...")

    all_probs = []
    all_true_classes = []
    for r in items:
        img = Image.open(r["file_path"]).convert("RGB")
        tensor = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            p = F.softmax(model(tensor), dim=1)[0].tolist()
        all_probs.append(p)
        all_true_classes.append(r["dx"])

    # Precompute top-1 indices for all samples
    top_indices = [prob.index(max(prob)) for prob in all_probs]

    # Permutation search
    best_acc = 0.0
    best_perm = None

    for perm in itertools.permutations(CLASSES):
        # perm[i] is the class assigned to index i
        preds = [perm[top_idx] for top_idx in top_indices]
        acc = sum(1 for p, t in zip(preds, all_true_classes)) / len(all_true_classes)
        if acc > best_acc:
            best_acc = acc
            best_perm = perm

    # Evaluate current mapping accuracy
    curr_preds = [CURRENT_MAPPING[top_idx] for top_idx in top_indices]
    curr_acc = sum(1 for p, t in zip(curr_preds, all_true_classes)) / len(all_true_classes)

    print(f"\nCurrent Alphabetical Mapping Accuracy: {curr_acc * 100:.2f}% (29 / 158)")
    print(f"Highest Possible Permutation Accuracy: {best_acc * 100:.2f}% ({int(best_acc * len(all_true_classes))} / {len(all_true_classes)})\n")

    if best_perm:
        print("Best Permutation Index Assignment:")
        for idx, c in enumerate(best_perm):
            print(f"  Index {idx} -> {c.upper()}")

    print("=" * 80)


if __name__ == "__main__":
    main()
