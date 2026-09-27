"""
DermAI Debug Script: Inspecting Image Preprocessing & Melanoma Sample Predictions
Compares:
- Baseline: Resize((224, 224))
- Center Crop: Resize(256) + CenterCrop(224)
- Letterbox Padding: Resize shortest side, pad to square (no crop)
"""

import os
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
import torchvision.transforms as transforms
import timm

CLASSES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

def letterbox_transform(img: Image.Image, target_size: int = 224) -> torch.Tensor:
    """Scales image preserving aspect ratio and pads to target square (no lesion cutoff)."""
    w, h = img.size
    scale = target_size / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    # Pad to square
    pad_w = target_size - new_w
    pad_h = target_size - new_h
    padding = (pad_w // 2, pad_h // 2, pad_w - (pad_w // 2), pad_h - (pad_h // 2))
    padded = ImageOps.expand(resized, padding, fill=(128, 128, 128))

    norm = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return norm(padded), padded

def main():
    device = torch.device("cpu")
    weights_path = os.path.join(os.path.dirname(__file__), "models_weights", "ham10000_effnet.pth")
    model = timm.create_model('efficientnet_b0', num_classes=7, pretrained=False)
    model.load_state_dict(torch.load(weights_path, map_location=device, weights_only=True))
    model.eval()

    baseline_t = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    centercrop_t = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    out_debug_dir = os.path.join(os.path.dirname(__file__), "debug_crops")
    os.makedirs(out_debug_dir, exist_ok=True)

    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    mel_files = [f for f in os.listdir(uploads_dir) if "melanoma" in f.lower()]

    print(f"Found {len(mel_files)} melanoma files in uploads:")
    print("=" * 80)

    for i, fname in enumerate(mel_files):
        fpath = os.path.join(uploads_dir, fname)
        img = Image.open(fpath).convert("RGB")
        w, h = img.size

        # Method 1: Baseline
        t_base = baseline_t(img).unsqueeze(0)
        with torch.no_grad():
            p_base = F.softmax(model(t_base), dim=1)[0]
            pred_base = CLASSES[p_base.argmax().item()]
            conf_base = p_base.max().item()

        # Method 2: Center Crop
        t_crop = centercrop_t(img).unsqueeze(0)
        with torch.no_grad():
            p_crop = F.softmax(model(t_crop), dim=1)[0]
            pred_crop = CLASSES[p_crop.argmax().item()]
            conf_crop = p_crop.max().item()

        # Method 3: Letterbox (No crop)
        t_pad, padded_img = letterbox_transform(img)
        with torch.no_grad():
            p_pad = F.softmax(model(t_pad.unsqueeze(0)), dim=1)[0]
            pred_pad = CLASSES[p_pad.argmax().item()]
            conf_pad = p_pad.max().item()

        # Save crops for visual confirmation
        padded_img.save(os.path.join(out_debug_dir, f"mel_{i}_padded.png"))
        img.resize((224, 224)).save(os.path.join(out_debug_dir, f"mel_{i}_baseline.png"))

        # Save center crop
        cc_img = img.resize((256, int(256 * h / w)) if w > h else (int(256 * w / h), 256))
        cw, ch = cc_img.size
        left = (cw - 224) // 2
        top = (ch - 224) // 2
        cc_img.crop((left, top, left + 224, top + 224)).save(os.path.join(out_debug_dir, f"mel_{i}_centercrop.png"))

        print(f"Sample {i+1} ({w}x{h}): {fname[:35]}...")
        print(f"  - Baseline:    {pred_base.upper():<6} ({conf_base*100:.2f}%)")
        print(f"  - CenterCrop:  {pred_crop.upper():<6} ({conf_crop*100:.2f}%)")
        print(f"  - Letterbox:   {pred_pad.upper():<6} ({conf_pad*100:.2f}%)")
        print("-" * 80)

if __name__ == "__main__":
    main()
