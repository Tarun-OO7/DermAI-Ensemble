"""
DermAI — Visual Inspection Script for Grad-CAM Activation Overlays
Generates and saves:
1. Individual high-res overlays for Melanoma, BCC, and Vascular Lesion
2. Combined side-by-side comparison grid (Original Scan | Pure Heatmap | Blended Overlay)
"""

import os
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import timm

base_dir = os.path.dirname(__file__)
weights_path = os.path.join(base_dir, "models_weights", "ham10000_effnet.pth")
art_dir = r"C:\Users\nagar\.gemini\antigravity\brain\36325a29-27fa-4dd1-b072-493a1c2ede4e\gradcam_inspection"
os.makedirs(art_dir, exist_ok=True)

# Load fine-tuned model
model = timm.create_model("efficientnet_b0", num_classes=7, pretrained=False)
model.load_state_dict(torch.load(weights_path, map_location="cpu", weights_only=True))
model.eval()

samples = [
    {
        "code": "mel",
        "title": "Melanoma (MEL)",
        "desc": "High-risk pigmented lesion with asymmetrical atypical network",
        "path": r"C:\Users\nagar\.gemini\antigravity\brain\36325a29-27fa-4dd1-b072-493a1c2ede4e\sample_classes\sample_mel_ISIC_0031900.jpg",
        "class_idx": 4
    },
    {
        "code": "bcc",
        "title": "Basal Cell Carcinoma (BCC)",
        "desc": "Pearly translucent nodule with telangiectatic vessels and peripheral border",
        "path": r"C:\Users\nagar\.gemini\antigravity\brain\36325a29-27fa-4dd1-b072-493a1c2ede4e\sample_classes\sample_bcc_ISIC_0026154.jpg",
        "class_idx": 1
    },
    {
        "code": "vasc",
        "title": "Vascular Lesion (VASC)",
        "desc": "Focal angioma with red/purple blood-filled vascular lacunae",
        "path": r"C:\Users\nagar\.gemini\antigravity\brain\36325a29-27fa-4dd1-b072-493a1c2ede4e\sample_classes\sample_vasc_ISIC_0033450.jpg",
        "class_idx": 6
    }
]


def generate_cam_mask(tensor, target_idx):
    target_layer = model.conv_head
    features, gradients = [], []

    def f_hook(m, i, o):
        features.append(o)

    def b_hook(m, gi, go):
        gradients.append(go[0])

    h1 = target_layer.register_forward_hook(f_hook)
    h2 = target_layer.register_full_backward_hook(b_hook)

    x = tensor.clone().detach().requires_grad_(True)
    model.zero_grad()
    logits = model(x)
    logits[0, target_idx].backward()

    h1.remove()
    h2.remove()

    act = features[0][0].detach().numpy()
    grad = gradients[0][0].detach().numpy()
    weights = np.mean(grad, axis=(1, 2))
    cam = np.zeros(act.shape[1:], dtype=np.float32)
    for i, w in enumerate(weights):
        cam += w * act[i]

    cam = np.maximum(cam, 0)
    max_val = np.max(cam)
    if max_val > 1e-8:
        cam = cam / max_val
    return cam


def apply_jet(cam_2d):
    cam_clamped = np.clip(cam_2d, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * cam_clamped - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * cam_clamped - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * cam_clamped - 1.0), 0.0, 1.0)
    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255.0).astype(np.uint8)


mean = np.array([0.485, 0.456, 0.406])
std = np.array([0.229, 0.224, 0.225])

panel_rows = []

for s in samples:
    orig_pil = Image.open(s["path"]).convert("RGB").resize((400, 400))
    arr = np.array(orig_pil, dtype=np.float32) / 255.0
    norm = (arr - mean) / std
    tensor = torch.tensor(norm.transpose(2, 0, 1), dtype=torch.float32).unsqueeze(0)

    cam_mask = generate_cam_mask(tensor, s["class_idx"])
    cam_img = Image.fromarray(cam_mask).resize((400, 400), resample=Image.BICUBIC)
    cam_resized = np.array(cam_img, dtype=np.float32)

    heatmap_rgb = apply_jet(cam_resized)
    heatmap_pil = Image.fromarray(heatmap_rgb)

    # Blended overlay
    blended_pil = Image.blend(orig_pil, heatmap_pil, alpha=0.55)

    # Save individual overlay
    single_out = os.path.join(art_dir, f"gradcam_overlay_{s['code']}.png")
    blended_pil.save(single_out)

    # Create labeled 3-panel row: [Original Scan | Attention Heatmap | Blended Overlay]
    row_img = Image.new("RGB", (1200, 440), color=(15, 23, 42))
    row_img.paste(orig_pil, (0, 40))
    row_img.paste(heatmap_pil, (400, 40))
    row_img.paste(blended_pil, (800, 40))

    # Add text banner
    draw = ImageDraw.Draw(row_img)
    draw.text((15, 12), f"{s['title']} — {s['desc']}", fill=(255, 255, 255))
    draw.text((320, 12), "[Original Scan]", fill=(148, 163, 184))
    draw.text((700, 12), "[AI Attention Map]", fill=(244, 63, 94))
    draw.text((1050, 12), "[Blended Overlay]", fill=(56, 189, 248))

    panel_rows.append(row_img)

# Combine all 3 rows into a master side-by-side inspection grid (1200 x 1320)
master_grid = Image.new("RGB", (1200, 1320), color=(15, 23, 42))
for idx, r_img in enumerate(panel_rows):
    master_grid.paste(r_img, (0, idx * 440))

master_out = os.path.join(art_dir, "gradcam_side_by_side_comparison.png")
master_grid.save(master_out)

print("Saved inspection PNGs:")
print(f"  - Master Grid: {master_out}")
for s in samples:
    out_name = "gradcam_overlay_" + s['code'] + ".png"
    print(f"  - {s['title']}: {os.path.join(art_dir, out_name)}")
