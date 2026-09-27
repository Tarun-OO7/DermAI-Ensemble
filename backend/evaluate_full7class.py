"""
DermAI — Full 7-Class Internal Baseline Evaluation Suite

Evaluates the production model under the safe baseline configuration ONLY:
- Full-frame Resize((224, 224))
- Temperature T = 1.0 (No scaling)
- Test-Time Augmentation (TTA) = False (Single pass)
- Prior Logit Rebalancing = False (tau = 0.0)

Saves results to evaluation_report_full7class.json.
"""

import os
import json
import time
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
import timm

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}


def load_model(weights_path: str, device: torch.device):
    model = timm.create_model('efficientnet_b0', num_classes=7, pretrained=False)
    state = torch.load(weights_path, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.to(device)
    model.eval()
    return model


def main():
    base_dir = os.path.dirname(__file__)
    device = torch.device("cpu")
    weights_path = os.path.join(base_dir, "models_weights", "ham10000_effnet.pth")
    if not os.path.exists(weights_path):
        weights_path = os.path.join(base_dir, "models_weights", "best_model.pt")

    manifest_path = os.path.join(base_dir, "evaluation_dataset", "manifest.json")
    if not os.path.exists(manifest_path):
        print(f"Error: Manifest not found at {manifest_path}. Run setup_eval_dataset.py first.")
        return

    with open(manifest_path, "r") as f:
        manifest_data = json.load(f)

    items = manifest_data.get("items", [])
    print("=" * 80)
    print("DermAI -- Full 7-Class Baseline Internal Evaluation")
    print("=" * 80)
    print(f"Model Weights: {weights_path}")
    print(f"Configuration: Baseline (Resize 224x224, T=1.0, TTA=False, Prior_tau=0.0)")
    print(f"Total Available Samples: {len(items)}")
    print("-" * 80)

    model = load_model(weights_path, device)

    # Safe Baseline Transform (Full-frame Resize)
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    y_true = []
    y_pred = []
    y_probs = []
    latencies = []

    for item in items:
        img_path = os.path.join(base_dir, item["file_path"])
        true_class = item["class"]
        true_idx = CLASS_TO_IDX[true_class]

        try:
            img = Image.open(img_path).convert("RGB")
        except Exception as e:
            print(f"Could not load {img_path}: {e}")
            continue

        t0 = time.perf_counter()
        tensor = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=1)[0]
        t1 = time.perf_counter()

        latencies.append((t1 - t0) * 1000.0)
        pred_idx = probs.argmax().item()

        y_true.append(true_idx)
        y_pred.append(pred_idx)
        y_probs.append(probs.cpu().numpy().tolist())

    total = len(y_true)
    num_classes = len(CLASSES)
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    overall_accuracy = (correct / total) if total > 0 else 0.0

    # Per-Class Metrics
    per_class = {}
    for i, c in enumerate(CLASSES):
        tp = int(cm[i, i])
        fp = int(sum(cm[j, i] for j in range(num_classes) if j != i))
        fn = int(sum(cm[i, j] for j in range(num_classes) if j != i))
        support = int(sum(cm[i, :]))

        precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        per_class[c] = {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "support": support,
            "evidence_status": "Standard Coverage" if support >= 10 else "Limited Evidence (N < 10)"
        }

    # ECE Calculation
    ece = 0.0
    if len(y_probs) > 0:
        confidences = np.max(y_probs, axis=1)
        predictions = np.argmax(y_probs, axis=1)
        accuracies = (predictions == np.array(y_true))
        bins = np.linspace(0, 1, 11)
        for b in range(10):
            bin_mask = (confidences > bins[b]) & (confidences <= bins[b + 1])
            bin_size = np.sum(bin_mask)
            if bin_size > 0:
                bin_acc = np.mean(accuracies[bin_mask])
                bin_conf = np.mean(confidences[bin_mask])
                ece += (bin_size / total) * abs(bin_acc - bin_conf)

    avg_latency = float(np.mean(latencies))

    # Print Summary Table
    print(f"Overall Internal Accuracy: {overall_accuracy * 100:.2f}% ({correct} / {total} samples)")
    print(f"Average Inference Latency: {avg_latency:.2f} ms / image")
    print(f"Calibration Error (ECE):  {ece:.4f}")
    print("-" * 80)
    print(f"{'Class':<8} | {'Support':<8} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Evidence Status'}")
    print("-" * 80)

    for c in CLASSES:
        stats = per_class[c]
        print(f"{c.upper():<8} | {stats['support']:<8} | {stats['precision']*100:<9.1f}% | {stats['recall']*100:<9.1f}% | {stats['f1_score']:<10.4f} | {stats['evidence_status']}")

    print("=" * 80)
    print("\nHigh-Risk & Pre-Malignant Sensitivity Summary:")
    print(f"  - Melanoma (MEL) Recall:                   {per_class['mel']['recall']*100:.1f}% (N={per_class['mel']['support']})")
    print(f"  - Basal Cell Carcinoma (BCC) Recall:       {per_class['bcc']['recall']*100:.1f}% (N={per_class['bcc']['support']}) [Limited Evidence]")
    print(f"  - Actinic Keratosis (AKIEC) Recall:        {per_class['akiec']['recall']*100:.1f}% (N={per_class['akiec']['support']}) [Limited Evidence]")
    print("=" * 80)

    # Save to evaluation_report_full7class.json
    report_data = {
        "evaluation_title": "DermAI 7-Class Internal Baseline Evaluation",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "preconditions": {
            "training_split_record": "Unconfirmed (no historical train_split.csv found in repo)",
            "configuration": "Baseline (Resize 224x224, T=1.0, TTA=False, Prior_tau=0.0)",
            "data_policy": "Genuine internal sample evaluation only"
        },
        "metrics": {
            "total_samples": total,
            "overall_accuracy": round(float(overall_accuracy), 4),
            "expected_calibration_error": round(float(ece), 4),
            "average_latency_ms": round(avg_latency, 2),
            "per_class": per_class,
            "confusion_matrix": cm.tolist()
        }
    }

    out_file = os.path.join(base_dir, "evaluation_report_full7class.json")
    with open(out_file, "w") as f:
        json.dump(report_data, f, indent=2)

    print(f"Full 7-class report saved to: {out_file}")


if __name__ == "__main__":
    main()
