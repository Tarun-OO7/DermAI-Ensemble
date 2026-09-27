"""
DermAI — Temperature Scaling Calibration Optimization

1. Uses val_split.csv (1,437 validation images) to find the optimal Temperature T* via NLL minimization.
2. Evaluates optimal T* on eval_holdout_set.csv (158 held-out test images) to verify ECE reduction and argmax invariance.
3. Updates ml_config.json ONLY if ECE demonstrably decreases.
"""

import os
import csv
import random
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
import torchvision.transforms as transforms
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


def compute_ece_and_nll(logits_tensor: torch.Tensor, targets_tensor: torch.Tensor, temperature: float = 1.0, n_bins: int = 10):
    scaled_logits = logits_tensor / temperature
    probs = F.softmax(scaled_logits, dim=1)
    
    # NLL
    nll = F.cross_entropy(scaled_logits, targets_tensor).item()
    
    # ECE
    confidences, predictions = torch.max(probs, dim=1)
    accuracies = predictions.eq(targets_tensor)
    
    total = len(targets_tensor)
    ece = 0.0
    bins = np.linspace(0, 1, n_bins + 1)
    
    for i in range(n_bins):
        bin_mask = (confidences > bins[i]) & (confidences <= bins[i + 1])
        bin_size = bin_mask.sum().item()
        if bin_size > 0:
            bin_acc = accuracies[bin_mask].float().mean().item()
            bin_conf = confidences[bin_mask].mean().item()
            ece += (bin_size / total) * abs(bin_acc - bin_conf)
            
    return ece, nll


def extract_logits_and_targets(model, items: list[dict], transform, device: torch.device):
    model.eval()
    all_logits = []
    all_targets = []
    
    for row in items:
        img_path = row["file_path"]
        target = CLASS_TO_IDX[row["dx"]]
        img = Image.open(img_path).convert("RGB")
        tensor = transform(img).unsqueeze(0).to(device)
        
        with torch.no_grad():
            logit = model(tensor)
            all_logits.append(logit[0].cpu())
            all_targets.append(target)
            
    logits_tensor = torch.stack(all_logits)
    targets_tensor = torch.tensor(all_targets, dtype=torch.long)
    return logits_tensor, targets_tensor


def main():
    base_dir = os.path.dirname(__file__)
    set_seed(42)

    device = torch.device("cpu")
    weights_path = os.path.join(base_dir, "models_weights", "ham10000_effnet.pth")
    val_csv = os.path.join(base_dir, "data", "val_split.csv")
    test_csv = os.path.join(base_dir, "data", "eval_holdout_set.csv")
    
    print("=" * 80)
    print("DermAI -- Temperature Scaling Calibration on Retrained Model")
    print("=" * 80)
    print(f"Model Weights: {weights_path}")
    print(f"Validation Split: {val_csv}")
    print(f"Held-Out Test Set: {test_csv}")
    print("-" * 80)
    
    model = timm.create_model('efficientnet_b0', num_classes=7, pretrained=False)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.to(device)
    model.eval()
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # 1. Load Validation Set (1,437 samples)
    val_items = []
    with open(val_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            val_items.append(r)
            
    print(f"Extracting validation logits for {len(val_items)} samples...")
    val_logits, val_targets = extract_logits_and_targets(model, val_items, transform, device)
    
    # 2. Optimize Temperature T on Validation Set (Grid Search + Fine Optimization)
    best_t = 1.0
    best_val_nll = float("inf")
    
    val_ece_uncal, val_nll_uncal = compute_ece_and_nll(val_logits, val_targets, temperature=1.0)
    print(f"Validation (Uncalibrated T=1.00): NLL = {val_nll_uncal:.4f} | ECE = {val_ece_uncal:.4f}")
    
    # Fine Grid Search over T in [0.5, 3.0]
    for t_cand in np.linspace(0.5, 3.0, 251):
        ece_cand, nll_cand = compute_ece_and_nll(val_logits, val_targets, temperature=t_cand)
        if nll_cand < best_val_nll:
            best_val_nll = nll_cand
            best_t = t_cand
            
    val_ece_cal, val_nll_cal = compute_ece_and_nll(val_logits, val_targets, temperature=best_t)
    print(f"Validation (Optimal T={best_t:.2f}):    NLL = {val_nll_cal:.4f} | ECE = {val_ece_cal:.4f}")
    
    # 3. Test on Held-Out Test Set (158 samples)
    print("\n" + "=" * 80)
    print("Evaluating Optimal Temperature on Held-Out Test Set (158 samples):")
    print("=" * 80)
    
    test_items = []
    with open(test_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            test_items.append(r)
            
    test_logits, test_targets = extract_logits_and_targets(model, test_items, transform, device)
    
    test_ece_uncal, test_nll_uncal = compute_ece_and_nll(test_logits, test_targets, temperature=1.0)
    test_ece_cal, test_nll_cal = compute_ece_and_nll(test_logits, test_targets, temperature=best_t)
    
    # Verify Argmax Invariance
    raw_preds = torch.argmax(test_logits, dim=1)
    cal_preds = torch.argmax(test_logits / best_t, dim=1)
    argmax_identical = torch.equal(raw_preds, cal_preds)
    
    print(f"Held-Out Test Baseline (T=1.00): ECE = {test_ece_uncal:.4f} | NLL = {test_nll_uncal:.4f}")
    print(f"Held-Out Test Calibrated (T={best_t:.2f}): ECE = {test_ece_cal:.4f} | NLL = {test_nll_cal:.4f}")
    print(f"Argmax Predictions Unchanged:    {argmax_identical} (100% Invariant)")
    
    # 4. Check if ECE improved
    ece_improved = test_ece_cal < test_ece_uncal
    print(f"\nDid ECE decrease on held-out test set?: {ece_improved}")
    
    config_path = os.path.join(base_dir, "app", "ml_config.json")
    with open(config_path, "r") as f:
        config = json.load(f)
        
    if ece_improved:
        config["temperature"] = round(float(best_t), 2)
        print(f"-> Applied optimal temperature T={config['temperature']} to {config_path}")
    else:
        config["temperature"] = 1.0
        print(f"-> Leaving temperature = 1.0 in {config_path}")
        
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
        
    # Save calibration report
    cal_report = {
        "timestamp": json.dumps(str(np.datetime64('now'))),
        "optimal_temperature_from_val": round(float(best_t), 2),
        "validation_set": {
            "samples": len(val_items),
            "uncalibrated_ece": round(float(val_ece_uncal), 4),
            "calibrated_ece": round(float(val_ece_cal), 4),
            "uncalibrated_nll": round(float(val_nll_uncal), 4),
            "calibrated_nll": round(float(val_nll_cal), 4)
        },
        "held_out_test_set": {
            "samples": len(test_items),
            "uncalibrated_ece": round(float(test_ece_uncal), 4),
            "calibrated_ece": round(float(test_ece_cal), 4),
            "uncalibrated_nll": round(float(test_nll_uncal), 4),
            "calibrated_nll": round(float(test_nll_cal), 4),
            "argmax_invariant": argmax_identical,
            "ece_improved": ece_improved
        }
    }
    
    report_path = os.path.join(base_dir, "calibration_report.json")
    with open(report_path, "w") as f:
        json.dump(cal_report, f, indent=2)
        
    print(f"Full calibration report saved to: {report_path}")
    print("=" * 80)


if __name__ == "__main__":
    main()
