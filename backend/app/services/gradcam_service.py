"""
DermAI — Real Grad-CAM Explainability Service
Computes gradient-weighted class activation maps for the predicted lesion class on EfficientNet-B0.
"""

import io
import base64
import logging
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

logger = logging.getLogger(__name__)


def jet_colormap(cam: np.ndarray) -> np.ndarray:
    """
    Pure NumPy JET colormap generator (Zero-external-dependency fallback).
    Input: cam (H, W) in [0.0, 1.0]
    Output: RGB image (H, W, 3) in [0, 255] uint8
    """
    cam_clamped = np.clip(cam, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * cam_clamped - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * cam_clamped - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * cam_clamped - 1.0), 0.0, 1.0)
    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255.0).astype(np.uint8)


class GradCAMService:
    def __init__(self):
        pass

    def generate_heatmap(
        self,
        model: torch.nn.Module,
        tensor_image: torch.Tensor,
        target_class_idx: int,
        original_pil_image: Image.Image,
        alpha: float = 0.55
    ) -> str:
        """
        Computes real Grad-CAM on model.conv_head, blends with original image, and returns base64 data URI.
        """
        try:
            # Target the final convolutional layer of EfficientNet
            target_layer = None
            if hasattr(model, 'conv_head') and model.conv_head is not None:
                target_layer = model.conv_head
            elif hasattr(model, 'blocks') and len(model.blocks) > 0:
                target_layer = model.blocks[-1]
            else:
                # Fallback to finding the last Conv2d layer
                for module in reversed(list(model.modules())):
                    if isinstance(module, torch.nn.Conv2d):
                        target_layer = module
                        break

            if target_layer is None:
                logger.warning("Could not identify target conv layer for Grad-CAM.")
                return ""

            features = []
            gradients = []

            def forward_hook(module, inp, out):
                features.append(out)

            def backward_hook(module, grad_in, grad_out):
                gradients.append(grad_out[0])

            f_handle = target_layer.register_forward_hook(forward_hook)
            b_handle = target_layer.register_full_backward_hook(backward_hook)

            # Ensure gradients can be computed on single input
            x = tensor_image.clone().detach().requires_grad_(True)
            if x.dim() == 3:
                x = x.unsqueeze(0)

            model.zero_grad()
            logits = model(x)

            if target_class_idx is None or target_class_idx < 0 or target_class_idx >= logits.shape[1]:
                target_class_idx = logits.argmax(dim=1).item()

            score = logits[0, target_class_idx]
            score.backward()

            f_handle.remove()
            b_handle.remove()

            if not features or not gradients:
                logger.warning("Grad-CAM hooks failed to capture activation or gradients.")
                return ""

            act = features[0][0].detach().cpu().numpy()  # [C, H, W]
            grad = gradients[0][0].detach().cpu().numpy()  # [C, H, W]

            weights = np.mean(grad, axis=(1, 2))  # [C]
            cam = np.zeros(act.shape[1:], dtype=np.float32)
            for i, w in enumerate(weights):
                cam += w * act[i]

            # ReLU on activation map
            cam = np.maximum(cam, 0)
            max_val = np.max(cam)
            if max_val > 1e-8:
                cam = cam / max_val
            else:
                cam = np.zeros_like(cam)

            # Resize CAM to match original image dimensions
            orig_w, orig_h = original_pil_image.size
            cam_img = Image.fromarray(cam).resize((orig_w, orig_h), resample=Image.BICUBIC)
            cam_resized = np.array(cam_img, dtype=np.float32)

            # Apply JET colormap
            try:
                import cv2
                cam_uint8 = (np.clip(cam_resized, 0, 1) * 255).astype(np.uint8)
                heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
                heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)
            except Exception:
                heatmap_rgb = jet_colormap(cam_resized)

            heatmap_pil = Image.fromarray(heatmap_rgb).convert("RGBA")
            orig_rgba = original_pil_image.convert("RGBA")

            # Blend original and heatmap
            blended = Image.blend(orig_rgba.convert("RGB"), heatmap_pil.convert("RGB"), alpha=alpha)

            # Encode as Base64 PNG
            buffer = io.BytesIO()
            blended.save(buffer, format="PNG", optimize=True)
            b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{b64_str}"

        except Exception as e:
            logger.error(f"Grad-CAM generation error: {e}", exc_info=True)
            return ""


gradcam_service = GradCAMService()
