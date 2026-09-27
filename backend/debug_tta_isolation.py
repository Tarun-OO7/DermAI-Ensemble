"""
DermAI Debug Script: Inspecting Test-Time Augmentation (TTA) in Isolation
"""

import os
import time
import torch
import torch.nn.functional as F
from PIL import Image
import torchvision.transforms as transforms
import timm

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

def main():
    device = torch.device("cpu")
    weights_path = os.path.join(os.path.dirname(__file__), "models_weights", "ham10000_effnet.pth")
    model = timm.create_model('efficientnet_b0', num_classes=7, pretrained=False)
    model.load_state_dict(torch.load(weights_path, map_location=device, weights_only=True))
    model.eval()

    # Using clean baseline transform
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    sample_files = [f for f in os.listdir(uploads_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))][:10]

    print("Evaluating TTA in Isolation (Baseline Resize 224x224):")
    print("=" * 85)
    print(f"{'Filename':<35} | {'Single-Pass':<18} | {'Multi-View TTA':<18} | {'Lat. (Single/TTA)'}")
    print("-" * 85)

    single_times = []
    tta_times = []

    for fname in sample_files:
        fpath = os.path.join(uploads_dir, fname)
        img = Image.open(fpath).convert("RGB")
        tensor = transform(img).unsqueeze(0)

        # 1. Single-Pass
        t0 = time.perf_counter()
        with torch.no_grad():
            p_single = F.softmax(model(tensor), dim=1)[0]
        t1 = time.perf_counter()
        single_ms = (t1 - t0) * 1000.0
        single_times.append(single_ms)

        # 2. Multi-View TTA
        t0 = time.perf_counter()
        with torch.no_grad():
            x_orig = tensor
            x_h = torch.flip(tensor, dims=[3])
            x_v = torch.flip(tensor, dims=[2])
            batch = torch.cat([x_orig, x_h, x_v], dim=0)
            logits_tta = model(batch)
            p_tta = torch.mean(F.softmax(logits_tta, dim=1), dim=0)
        t1 = time.perf_counter()
        tta_ms = (t1 - t0) * 1000.0
        tta_times.append(tta_ms)

        pred_single = CLASSES[p_single.argmax().item()]
        conf_single = p_single.max().item()

        pred_tta = CLASSES[p_tta.argmax().item()]
        conf_tta = p_tta.max().item()

        print(f"{fname[:33]:<35} | {pred_single.upper()} ({conf_single*100:.1f}%) | {pred_tta.upper()} ({conf_tta*100:.1f}%) | {single_ms:.1f}ms / {tta_ms:.1f}ms")

    print("=" * 85)
    print(f"Average Latency: Single-Pass = {sum(single_times)/len(single_times):.1f}ms | TTA = {sum(tta_times)/len(tta_times):.1f}ms")

if __name__ == "__main__":
    main()
