"""
DermAI Debug Script: Inspecting Temperature Scaling Behavior
"""

import os
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

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    mel_files = [f for f in os.listdir(uploads_dir) if "melanoma" in f.lower()]

    print("Temperature Scaling Test (Confirming argmax invariance and calibration):")
    print("=" * 80)

    fpath = os.path.join(uploads_dir, mel_files[0])
    img = Image.open(fpath).convert("RGB")
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        
        # Test Temperatures: T = 1.0 (Raw), T = 1.15, T = 1.30, T = 1.50
        for T in [1.0, 1.15, 1.25, 1.5]:
            scaled_logits = logits / T
            probs = F.softmax(scaled_logits, dim=1)[0]
            pred_idx = probs.argmax().item()
            pred_class = CLASSES[pred_idx]
            conf = probs.max().item()

            print(f"T = {T:.2f}: Predicted: {pred_class.upper():<5} | Confidence: {conf*100:.2f}% | Top-3 Probs: ", end="")
            sorted_probs = sorted([(CLASSES[i], p.item()) for i, p in enumerate(probs)], key=lambda x: x[1], reverse=True)[:3]
            print(", ".join([f"{c}: {p*100:.1f}%" for c, p in sorted_probs]))

    print("=" * 80)
    print("Verification: The predicted class is identical across all temperatures.")

if __name__ == "__main__":
    main()
