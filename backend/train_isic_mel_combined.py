"""
DermAI — ISIC-Expanded Data + 1.5x MEL-Protected Loss Training Pipeline (4 Epochs)

Combines:
1. 8,637 ISIC-Expanded Dataset (219 license-verified BCC/BKL samples + HAM10000 train split).
2. 1.5x MEL Alpha Multiplier in Focal Loss (gamma=2.0).
3. 4 Full Training Epochs with Cosine Annealing Learning Rate.
4. Evaluation against the fixed 158-sample eval_holdout_set.csv.
5. Saves results to backend/data/evaluation_report_isic_mel_combined.json.
"""

import os
import sys
import csv
import json
import time
import random
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import timm

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}


def set_seed(seed: int = 42):
    """Configures full PyTorch, NumPy, Python, and CUDA determinism."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    os.environ["PYTHONHASHSEED"] = str(seed)
    os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"
    try:
        torch.use_deterministic_algorithms(True, warn_only=True)
    except Exception:
        pass


def seed_worker(worker_id):
    worker_seed = torch.initial_seed() % (2**32)
    np.random.seed(worker_seed)
    random.seed(worker_seed)


class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.0, reduction='mean'):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, reduction='none', weight=self.alpha)
        pt = torch.exp(-ce_loss)
        focal_loss = ((1.0 - pt) ** self.gamma) * ce_loss
        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        else:
            return focal_loss


class SkinLesionDataset(Dataset):
    def __init__(self, items: list[dict], transform=None):
        base_dir = os.path.dirname(__file__)
        data_dir = os.path.join(base_dir, "data", "HAM10000")
        part1_dir = os.path.join(data_dir, "HAM10000_images_part_1")
        part2_dir = os.path.join(data_dir, "HAM10000_images_part_2")
        isic_bcc = os.path.join(base_dir, "data", "ISIC_expansion", "bcc")
        isic_bkl = os.path.join(base_dir, "data", "ISIC_expansion", "bkl")
        search_dirs = [part1_dir, part2_dir, isic_bcc, isic_bkl]

        self.items = []
        for it in items:
            fpath = it.get("file_path", "")
            if os.path.exists(fpath):
                self.items.append(it)
            else:
                img_id = it.get("image_id", "")
                for d in search_dirs:
                    cand = os.path.join(d, f"{img_id}.jpg")
                    if os.path.exists(cand):
                        it["file_path"] = cand
                        self.items.append(it)
                        break
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        item = self.items[idx]
        img_path = item["file_path"]
        img = Image.open(img_path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        label = CLASS_TO_IDX[item["dx"]]
        return img, label


def evaluate_on_dataset(model, items: list[dict], transform, device: torch.device):
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data", "HAM10000")
    part1_dir = os.path.join(data_dir, "HAM10000_images_part_1")
    part2_dir = os.path.join(data_dir, "HAM10000_images_part_2")
    isic_bcc = os.path.join(base_dir, "data", "ISIC_expansion", "bcc")
    isic_bkl = os.path.join(base_dir, "data", "ISIC_expansion", "bkl")
    search_dirs = [part1_dir, part2_dir, isic_bcc, isic_bkl]

    model.eval()
    y_true = []
    y_pred = []
    latencies = []

    for row in items:
        img_path = row.get("file_path", "")
        if not os.path.exists(img_path):
            img_id = row.get("image_id", "")
            for d in search_dirs:
                cand = os.path.join(d, f"{img_id}.jpg")
                if os.path.exists(cand):
                    img_path = cand
                    break

        true_class = row["dx"]
        true_idx = CLASS_TO_IDX[true_class]

        try:
            img = Image.open(img_path).convert("RGB")
        except Exception:
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

    num_classes = len(CLASSES)
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1

    total_samples = len(y_true)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    accuracy = (correct / total_samples) if total_samples > 0 else 0.0

    metrics_per_class = {}
    f1_list = []
    for i, c in enumerate(CLASSES):
        tp = int(cm[i, i])
        fp = int(sum(cm[j, i] for j in range(num_classes) if j != i))
        fn = int(sum(cm[i, j] for j in range(num_classes) if j != i))
        support = int(sum(cm[i, :]))

        precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        f1_list.append(f1)

        metrics_per_class[c] = {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "support": support
        }

    macro_f1 = sum(f1_list) / len(f1_list) if len(f1_list) > 0 else 0.0
    avg_latency = float(np.mean(latencies)) if latencies else 0.0

    return accuracy, macro_f1, metrics_per_class, cm.tolist(), avg_latency


def run_training_and_eval(epochs: int = 4, mel_alpha_multiplier: float = 1.5, batch_size: int = 32, lr: float = 3e-4, seed: int = 42):
    set_seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training Platform: {device.type.upper()}")
    if device.type == "cuda":
        print(f"[*] GPU Device: {torch.cuda.get_device_name(0)}")

    base_dir = os.path.dirname(__file__)

    # 1. Load Training and Validation Sets
    train_csv = os.path.join(base_dir, "data", "train_split.csv")
    val_csv = os.path.join(base_dir, "data", "val_split.csv")
    holdout_csv = os.path.join(base_dir, "data", "eval_holdout_set.csv")

    train_items = []
    with open(train_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            train_items.append(row)

    val_items = []
    with open(val_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            val_items.append(row)

    holdout_items = []
    with open(holdout_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            holdout_items.append(row)

    print(f"[*] Training Set Size:   {len(train_items)} images (ISIC-Expanded)")
    print(f"[*] Validation Set Size: {len(val_items)} images")
    print(f"[*] Held-Out Test Size:  {len(holdout_items)} images (Fixed 158)")

    # 2. Compute Class Weights with 1.5x MEL Alpha
    class_counts = {c: 0 for c in CLASSES}
    for item in train_items:
        class_counts[item["dx"]] += 1

    total_samples = len(train_items)
    alpha_weights = []
    print("\nClass Distribution and Focal Loss Alpha Weights:")
    for c in CLASSES:
        cnt = class_counts[c]
        base_w = (total_samples / max(cnt, 1)) ** 0.5
        if c == "mel":
            w = base_w * mel_alpha_multiplier
            print(f"  - {c.upper():<6}: {cnt:>5} samples (Base Alpha: {base_w:.3f} * {mel_alpha_multiplier}x -> Final: {w:.3f}) [MEL-PROTECTED]")
        else:
            w = base_w
            print(f"  - {c.upper():<6}: {cnt:>5} samples (Alpha: {w:.3f})")
        alpha_weights.append(w)

    alpha_tensor = torch.tensor(alpha_weights, dtype=torch.float32, device=device)
    criterion = FocalLoss(alpha=alpha_tensor, gamma=2.0)

    # 3. Augmentations & DataLoaders
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    g = torch.Generator()
    g.manual_seed(seed)

    train_dataset = SkinLesionDataset(train_items, transform=train_transform)
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        drop_last=False,
        worker_init_fn=seed_worker,
        generator=g
    )

    # 4. Model Setup
    print("\n[*] Initializing Pretrained EfficientNet-B0 backbone...")
    model = timm.create_model('efficientnet_b0', pretrained=True, num_classes=7)
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    weights_out = os.path.join(base_dir, "models_weights", "ham10000_effnet_isic_mel_combined.pth")
    best_val_f1 = 0.0

    print(f"\n" + "=" * 80)
    print(f"Beginning 4-Epoch Training with Combined ISIC Data + 1.5x MEL Alpha...")
    print("=" * 80)

    total_batches = len(train_loader)
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        t_epoch_start = time.time()

        for b_idx, (images, targets) in enumerate(train_loader, 1):
            images = images.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

            if b_idx % 25 == 0 or b_idx == total_batches:
                elapsed = time.time() - t_epoch_start
                pct = (b_idx / total_batches) * 100
                rate = b_idx / max(elapsed, 0.001)
                eta_s = (total_batches - b_idx) / max(rate, 0.001)
                print(f"  Epoch [{epoch}/{epochs}] Batch [{b_idx:>3}/{total_batches}] ({pct:5.1f}%) | Loss: {running_loss / b_idx:.4f} | ETA: {int(eta_s)}s", flush=True)

        scheduler.step()
        epoch_time = time.time() - t_epoch_start
        avg_train_loss = running_loss / total_batches

        # Validation evaluation
        val_acc, val_f1, val_per_class, _, _ = evaluate_on_dataset(model, val_items, eval_transform, device)
        print(f"\nEpoch [{epoch}/{epochs}] Complete ({epoch_time:.1f}s) - Train Loss: {avg_train_loss:.4f} | Val Acc: {val_acc*100:.2f}% | Val Macro-F1: {val_f1*100:.2f}%")
        print(f"  MEL Recall: {val_per_class['mel']['recall']*100:.1f}% | BCC Recall: {val_per_class['bcc']['recall']*100:.1f}% | BKL Recall: {val_per_class['bkl']['recall']*100:.1f}% | AKIEC Recall: {val_per_class['akiec']['recall']*100:.1f}%")

        if val_f1 > best_val_f1 or epoch == 1:
            best_val_f1 = val_f1
            torch.save(model.state_dict(), weights_out)
            print(f"  [*] Saved Best Checkpoint (Val Macro-F1: {val_f1*100:.2f}%) to {weights_out}")

    print("\n" + "=" * 80)
    print("Training Complete! Evaluating Checkpoint Against Fixed eval_holdout_set.csv (158 samples)...")
    print("=" * 80)

    # 5. Evaluate Best Checkpoint on Fixed Hold-Out Set
    model.load_state_dict(torch.load(weights_out, map_location=device, weights_only=True))
    test_acc, test_f1, test_per_class, cm, avg_lat = evaluate_on_dataset(model, holdout_items, eval_transform, device)

    print(f"\nFinal Held-Out Accuracy: {test_acc*100:.2f}% ({int(round(test_acc*len(holdout_items)))} / {len(holdout_items)} correct)")
    print(f"Final Held-Out Macro-F1: {test_f1*100:.2f}%")
    print(f"Average Inference Latency: {avg_lat:.2f} ms / image")
    print("-" * 80)
    print(f"{'Class':<8} | {'Support':<8} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("-" * 80)

    for c in CLASSES:
        s = test_per_class[c]
        print(f"{c.upper():<8} | {s['support']:<8} | {s['precision']*100:<9.1f}% | {s['recall']*100:<9.1f}% | {s['f1_score']:<10.4f}")

    print("=" * 80)
    print("\nKey Target Comparison Metrics:")
    print(f"  - Melanoma (MEL) Recall:             {test_per_class['mel']['recall']*100:.1f}% (N={test_per_class['mel']['support']}) [Gate >= 85.0%]")
    print(f"  - Basal Cell Carcinoma (BCC) Recall: {test_per_class['bcc']['recall']*100:.1f}% (N={test_per_class['bcc']['support']}) [Run 5 was 56.0%]")
    print(f"  - Benign Keratosis (BKL) Precision:  {test_per_class['bkl']['precision']*100:.1f}% (N={test_per_class['bkl']['support']}) [Run 5 was 51.5%]")
    print(f"  - Actinic Keratoses (AKIEC) Recall:  {test_per_class['akiec']['recall']*100:.1f}% (N={test_per_class['akiec']['support']}) [Run 5 was 64.0%]")
    print("=" * 80)

    # 6. Save Report
    report_data = {
        "evaluation_title": "DermAI ISIC-Expanded + 1.5x MEL Weighting Combined Model Evaluation",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "training_details": {
            "model": "efficientnet_b0",
            "loss_function": "Focal Loss (gamma=2.0, 1.5x MEL Alpha weight)",
            "epochs": epochs,
            "mel_alpha_multiplier": mel_alpha_multiplier,
            "train_dataset": "ISIC-Expanded (219 license-verified images + HAM10000)",
            "train_samples": len(train_items),
            "val_samples": len(val_items),
            "test_samples": len(holdout_items)
        },
        "metrics": {
            "overall_accuracy": round(float(test_acc), 4),
            "macro_f1": round(float(test_f1), 4),
            "average_latency_ms": round(float(avg_lat), 2),
            "per_class": test_per_class,
            "confusion_matrix": cm
        }
    }

    report_file = os.path.join(base_dir, "data", "evaluation_report_isic_mel_combined.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    print(f"\n[*] Evaluation report saved to: {report_file}")
    return report_data


if __name__ == "__main__":
    run_training_and_eval(epochs=4, mel_alpha_multiplier=1.5)
