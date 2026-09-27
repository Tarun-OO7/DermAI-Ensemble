"""
DermAI — Systematic Hyperparameter Search for Balanced Performance with Hard MEL Recall >= 75% Constraint

Grid Configurations:
1. Run 1: Epochs=2, MEL Alpha Multiplier=1.0x (Baseline)
2. Run 2: Epochs=2, MEL Alpha Multiplier=1.5x
3. Run 3: Epochs=2, MEL Alpha Multiplier=2.0x
4. Run 4: Epochs=4, MEL Alpha Multiplier=1.0x
5. Run 5: Epochs=4, MEL Alpha Multiplier=1.5x
6. Run 6: Epochs=4, MEL Alpha Multiplier=2.0x

Guardrails:
- Current live model backed up as ham10000_effnet_pre_search.pth
- Each run saved to isolated checkpoint: ham10000_effnet_run_{id}.pth
- Evaluated on fixed 158-sample eval_holdout_set.csv
- Determinism enabled across all runs (seed=42)
"""

import os
import sys
import csv
import json
import time
import random
import shutil
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
        search_dirs = [part1_dir, part2_dir]

        valid_items = []
        for it in items:
            fpath = it.get("file_path", "")
            if os.path.exists(fpath):
                valid_items.append(it)
            else:
                img_id = it.get("image_id", "")
                for d in search_dirs:
                    cand = os.path.join(d, f"{img_id}.jpg")
                    if os.path.exists(cand):
                        it["file_path"] = cand
                        valid_items.append(it)
                        break

        self.items = valid_items
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        item = self.items[idx]
        try:
            image = Image.open(item["file_path"]).convert("RGB")
        except Exception:
            image = Image.new("RGB", (224, 224), (128, 128, 128))
        label = CLASS_TO_IDX[item["dx"]]
        if self.transform:
            image = self.transform(image)
        return image, label


def evaluate_on_dataset(model, items: list[dict], transform, device: torch.device):
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data", "HAM10000")
    part1_dir = os.path.join(data_dir, "HAM10000_images_part_1")
    part2_dir = os.path.join(data_dir, "HAM10000_images_part_2")
    search_dirs = [part1_dir, part2_dir]

    model.eval()
    y_true = []
    y_pred = []
    y_probs = []

    for row in items:
        img_path = row["file_path"]
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

        tensor = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=1)[0]

        pred_idx = probs.argmax().item()
        y_true.append(true_idx)
        y_pred.append(pred_idx)
        y_probs.append(probs.cpu().numpy().tolist())

    total = len(y_true)
    num_classes = len(CLASSES)
    cm = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    for t, p in zip(y_true, y_pred):
        cm[t][p] += 1

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    overall_accuracy = (correct / total) if total > 0 else 0.0

    per_class = {}
    f1_list = []
    for i, c in enumerate(CLASSES):
        tp = int(cm[i][i])
        fp = int(sum(cm[j][i] for j in range(num_classes) if j != i))
        fn = int(sum(cm[i][j] for j in range(num_classes) if j != i))
        support = int(sum(cm[i]))

        precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        per_class[c] = {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "support": support
        }
        if support > 0:
            f1_list.append(f1)

    macro_f1 = sum(f1_list) / len(f1_list) if f1_list else 0.0
    return overall_accuracy, macro_f1, per_class, cm


def train_single_run(
    run_id: int,
    epochs: int,
    mel_alpha_multiplier: float,
    train_items: list[dict],
    val_items: list[dict],
    holdout_items: list[dict],
    base_dir: str,
    device: torch.device,
    seed: int = 42
):
    print("\n" + "=" * 80, flush=True)
    print(f"Executing Grid Config #{run_id}: Epochs={epochs} | MEL Alpha Multiplier={mel_alpha_multiplier}x | Seed={seed}", flush=True)
    print("=" * 80, flush=True)

    set_seed(seed)

    # Class Counts and Alpha Weights
    class_counts = [0] * len(CLASSES)
    for r in train_items:
        class_counts[CLASS_TO_IDX[r["dx"]]] += 1

    total_samples = len(train_items)
    alpha_weights = []
    for i, c in enumerate(CLASSES):
        cnt = max(1, class_counts[i])
        w = total_samples / (len(CLASSES) * cnt)
        if c == "mel":
            w = w * mel_alpha_multiplier
        alpha_weights.append(w)

    alpha_tensor = torch.tensor(alpha_weights, dtype=torch.float32, device=device)
    criterion = FocalLoss(alpha=alpha_tensor, gamma=2.0)

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
        batch_size=64,
        shuffle=True,
        drop_last=False,
        worker_init_fn=seed_worker,
        generator=g
    )

    model = timm.create_model('efficientnet_b0', pretrained=True, num_classes=7)
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_f1 = 0.0
    best_weights_path = os.path.join(base_dir, "models_weights", f"ham10000_effnet_run{run_id}_e{epochs}_w{mel_alpha_multiplier}.pth")

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        t0 = time.time()
        for b_idx, (images, targets) in enumerate(train_loader, 1):
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

            if b_idx % 25 == 0 or b_idx == len(train_loader):
                pct = (b_idx / len(train_loader)) * 100.0
                print(f"  [Run {run_id}] Epoch [{epoch}/{epochs}] Batch [{b_idx:>3}/{len(train_loader)}] ({pct:>5.1f}%) | Loss: {loss.item():.4f}", flush=True)

        scheduler.step()
        epoch_time = time.time() - t0
        avg_train_loss = running_loss / len(train_loader)

        # Validation Check
        val_acc, val_f1, val_per_class, _ = evaluate_on_dataset(model, val_items, eval_transform, device)
        print(f"  --> Epoch [{epoch}/{epochs}] Complete ({epoch_time:.1f}s) | Train Loss: {avg_train_loss:.4f} | Val Acc: {val_acc*100:.2f}% | Val Macro-F1: {val_f1*100:.2f}%", flush=True)
        print(f"      Val Recall: MEL={val_per_class['mel']['recall']*100:.1f}% | BCC={val_per_class['bcc']['recall']*100:.1f}% | AKIEC={val_per_class['akiec']['recall']*100:.1f}%", flush=True)

        if val_f1 >= best_val_f1 or epoch == 1:
            best_val_f1 = val_f1
            torch.save(model.state_dict(), best_weights_path)
            print(f"      [*] Best Checkpoint Saved: {best_weights_path}", flush=True)

    # Evaluate on Held-Out Test Set (eval_holdout_set.csv)
    best_model = timm.create_model('efficientnet_b0', num_classes=7, pretrained=False)
    best_model.load_state_dict(torch.load(best_weights_path, map_location=device, weights_only=True))
    best_model.to(device)

    test_acc, test_f1, test_per_class, test_cm = evaluate_on_dataset(best_model, holdout_items, eval_transform, device)

    mel_rec = test_per_class["mel"]["recall"]
    meets_constraint = mel_rec >= 0.75

    print("\n" + "-" * 80, flush=True)
    print(f"Run #{run_id} Final Results on Held-Out Test Set (158 samples):", flush=True)
    print(f"  Overall Accuracy: {test_acc*100:.2f}%", flush=True)
    print(f"  Macro-F1 Score:   {test_f1*100:.2f}%", flush=True)
    print(f"  MEL Recall:       {mel_rec*100:.1f}% (Constraint >= 75%: {'PASSED' if meets_constraint else 'FAILED'})", flush=True)
    print(f"  MEL Precision:    {test_per_class['mel']['precision']*100:.1f}%", flush=True)
    print(f"  BCC Recall:       {test_per_class['bcc']['recall']*100:.1f}% | Precision: {test_per_class['bcc']['precision']*100:.1f}%", flush=True)
    print(f"  AKIEC Recall:     {test_per_class['akiec']['recall']*100:.1f}% | Precision: {test_per_class['akiec']['precision']*100:.1f}%", flush=True)
    print("-" * 80, flush=True)

    return {
        "run_id": run_id,
        "epochs": epochs,
        "mel_alpha_multiplier": mel_alpha_multiplier,
        "checkpoint_path": best_weights_path,
        "overall_accuracy": round(float(test_acc), 4),
        "macro_f1": round(float(test_f1), 4),
        "mel_recall": round(float(mel_rec), 4),
        "meets_constraint": meets_constraint,
        "per_class": test_per_class,
        "confusion_matrix": test_cm
    }


def main():
    base_dir = os.path.dirname(__file__)
    device = torch.device("cpu")

    # Step 1: Backup current live checkpoint
    live_weights = os.path.join(base_dir, "models_weights", "ham10000_effnet.pth")
    pre_search_backup = os.path.join(base_dir, "models_weights", "ham10000_effnet_pre_search.pth")
    if os.path.exists(live_weights):
        shutil.copy(live_weights, pre_search_backup)
        print(f"Successfully backed up current live weights to: {pre_search_backup}")

    # Step 2: Load pure HAM10000 train split, val split, and holdout test set
    train_csv = os.path.join(base_dir, "data", "train_split.csv")
    val_csv = os.path.join(base_dir, "data", "val_split.csv")
    holdout_csv = os.path.join(base_dir, "data", "eval_holdout_set.csv")

    with open(train_csv, mode="r", encoding="utf-8") as f:
        train_items = list(csv.DictReader(f))
    with open(val_csv, mode="r", encoding="utf-8") as f:
        val_items = list(csv.DictReader(f))
    with open(holdout_csv, mode="r", encoding="utf-8") as f:
        holdout_items = list(csv.DictReader(f))

    print(f"Loaded Datasets: Train={len(train_items)} | Val={len(val_items)} | Held-Out Test={len(holdout_items)}")

    # 6 Grid Configurations
    configs = [
        {"run_id": 1, "epochs": 2, "mel_alpha": 1.0},
        {"run_id": 2, "epochs": 2, "mel_alpha": 1.5},
        {"run_id": 3, "epochs": 2, "mel_alpha": 2.0},
        {"run_id": 4, "epochs": 4, "mel_alpha": 1.0},
        {"run_id": 5, "epochs": 4, "mel_alpha": 1.5},
        {"run_id": 6, "epochs": 4, "mel_alpha": 2.0},
    ]

    all_results = []
    for cfg in configs:
        res = train_single_run(
            run_id=cfg["run_id"],
            epochs=cfg["epochs"],
            mel_alpha_multiplier=cfg["mel_alpha"],
            train_items=train_items,
            val_items=val_items,
            holdout_items=holdout_items,
            base_dir=base_dir,
            device=device,
            seed=42
        )
        all_results.append(res)

        # Save incremental results
        out_json = os.path.join(base_dir, "systematic_search_results.json")
        with open(out_json, "w") as f:
            json.dump(all_results, f, indent=2)

    print("\n" + "=" * 80)
    print("DermAI -- Systematic Search Completed Across All 6 Configurations!")
    print("=" * 80)


if __name__ == "__main__":
    main()
