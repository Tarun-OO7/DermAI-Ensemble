# Handles model loading, calibrated inference, and TTA for DermAI
import torch
import torch.nn.functional as F
import os
import json
import logging
import time
import math
import timm
from ..config import settings
from .gradcam_service import gradcam_service
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)

NUM_CLASSES = 7


class MLService:
    def __init__(self):
        self.efficientnet = None
        self.resnet50 = None
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() and settings.USE_GPU else "cpu"
        )
        self.config = {}
        self.idx_to_class = {}
        self.class_priors_tensor = None
        self.temperature = 1.0
        self.prior_tau = 0.0
        self.use_tta = False
        self.ensemble_mode = False

    def load_model(self):
        """Loads real trained model weights and prepares for calibrated inference."""
        start_time = time.time()

        # 1. Load ml_config.json
        config_path = os.path.join(os.path.dirname(__file__), '..', 'ml_config.json')
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load ml_config.json: {e}")
            raise

        self.idx_to_class = self.config.get("idx_to_class", {})
        self.temperature = float(self.config.get("temperature", 1.25))
        self.prior_tau = float(self.config.get("prior_tau", 0.12))
        self.use_tta = bool(self.config.get("use_tta", True))

        # Build class priors tensor for Bayesian logit calibration
        class_priors = self.config.get("class_priors", {})
        if class_priors:
            priors_list = [
                class_priors.get(self.idx_to_class.get(str(i), ""), 1.0 / NUM_CLASSES)
                for i in range(NUM_CLASSES)
            ]
            self.class_priors_tensor = torch.tensor(
                [math.log(max(p, 1e-6)) for p in priors_list],
                dtype=torch.float32,
                device=self.device
            )

        # 2. Load PyTorch model weights
        weights_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 'models_weights', 'ham10000_effnet.pth'
        )
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Model weights not found at: {weights_path}")

        try:
            self.efficientnet = timm.create_model(
                'efficientnet_b0', num_classes=NUM_CLASSES, pretrained=False
            )
            state_dict = torch.load(
                weights_path, map_location=self.device, weights_only=True
            )
            self.efficientnet.load_state_dict(state_dict)
            self.efficientnet.to(self.device)
            self.efficientnet.eval()
            self.model = self.efficientnet

            elapsed = (time.time() - start_time) * 1000
            logger.info(
                f"HAM10000 EfficientNet loaded successfully on {self.device} in {elapsed:.1f}ms. "
                f"T={self.temperature}, tau={self.prior_tau}, TTA={self.use_tta}"
            )
        except Exception as e:
            logger.error(f"Failed to instantiate or load EfficientNet weights: {e}")
            raise

    def _forward_calibrated(self, x: torch.Tensor) -> torch.Tensor:
        """Computes raw logits, applies prior rebalancing and temperature scaling."""
        logits = self.efficientnet(x)

        # 1. Bayesian Prior Logit Adjustment (Boosts sensitivity on rare high-risk lesions)
        if self.prior_tau > 0 and self.class_priors_tensor is not None:
            logits = logits - (self.prior_tau * self.class_priors_tensor)

        # 2. Temperature Scaling Calibration
        if self.temperature > 0 and self.temperature != 1.0:
            logits = logits / self.temperature

        return logits

    def predict(
        self,
        tensor_image: torch.Tensor,
        cancer_type: str,
        raw_pil_image: Optional[Image.Image] = None
    ) -> dict:
        """
        Calibrated inference engine with Test-Time Augmentation (TTA) and real Grad-CAM explainability.
        Returns prediction, confidence_score, calibrated probabilities, and base64 heatmap_image.
        """
        if self.efficientnet is None:
            raise RuntimeError("Model is not loaded. Call load_model() first.")

        # Validate tensor shape
        input_size = self.config.get("input_size", 224)
        if isinstance(input_size, int):
            input_size = [input_size, input_size]
        expected_shape = (1, 3, *input_size)
        if tuple(tensor_image.shape) != expected_shape:
            logger.error(
                f"Invalid tensor shape. Expected {expected_shape}, got {tuple(tensor_image.shape)}"
            )
            raise ValueError(f"Invalid tensor shape. Expected {expected_shape}.")

        try:
            tensor_image = tensor_image.to(self.device)

            with torch.no_grad():
                if self.use_tta:
                    # Multi-View Test-Time Augmentation (Original, Horizontal Flip, Vertical Flip)
                    x_orig = tensor_image
                    x_hflip = torch.flip(tensor_image, dims=[3])
                    x_vflip = torch.flip(tensor_image, dims=[2])

                    batch_views = torch.cat([x_orig, x_hflip, x_vflip], dim=0)
                    logits_views = self._forward_calibrated(batch_views)
                    probs_views = F.softmax(logits_views, dim=1)
                    probs = torch.mean(probs_views, dim=0, keepdim=True)
                else:
                    logits = self._forward_calibrated(tensor_image)
                    probs = F.softmax(logits, dim=1)

                confidence, predicted_idx = torch.max(probs, dim=1)
                predicted_class = self.idx_to_class.get(
                    str(predicted_idx.item()), "unknown"
                )

                probs_dict = {}
                for idx_str, class_name in self.idx_to_class.items():
                    idx_int = int(idx_str)
                    probs_dict[class_name] = round(probs[0, idx_int].item(), 4)

            # Generate real Grad-CAM heatmap for the predicted class
            heatmap_data_uri = ""
            if raw_pil_image is not None:
                try:
                    heatmap_data_uri = gradcam_service.generate_heatmap(
                        model=self.efficientnet,
                        tensor_image=tensor_image,
                        target_class_idx=predicted_idx.item(),
                        original_pil_image=raw_pil_image
                    )
                except Exception as cam_err:
                    logger.warning(f"Failed to generate Grad-CAM heatmap: {cam_err}")

            return {
                "prediction": predicted_class,
                "confidence_score": round(confidence.item(), 4),
                "probabilities": probs_dict,
                "heatmap_image": heatmap_data_uri
            }
        except Exception as e:
            logger.error(f"Error during ML inference: {e}", exc_info=True)
            raise

    def fuse_multi_angle_predictions(self, angle_results: list) -> dict:
        """
        Fuses multiple angle predictions using evidence-quality aggregation and safety-first Melanoma protection.
        """
        if not angle_results:
            return {}

        num_angles = len(angle_results)
        if num_angles == 1:
            single = angle_results[0]
            return {
                "total_angles": 1,
                "agreement_rate": 1.0,
                "agreement_count": 1,
                "primary_prediction": single["prediction"],
                "primary_confidence": single["confidence_score"],
                "average_probabilities": single.get("probabilities", {}),
                "has_high_risk_conflict": False,
                "melanoma_safety_override": False,
                "consensus_message": "Single perspective analyzed",
                "angle_breakdown": angle_results
            }

        # 1. Compute average probability distribution across angles
        all_classes = list(self.idx_to_class.values())
        avg_probs = {c: 0.0 for c in all_classes}

        for res in angle_results:
            probs = res.get("probabilities", {})
            for c in all_classes:
                avg_probs[c] += probs.get(c, 0.0) / num_angles

        avg_probs = {c: round(p, 4) for c, p in avg_probs.items()}

        # 2. Find standard argmax consensus
        sorted_classes = sorted(avg_probs.items(), key=lambda x: x[1], reverse=True)
        top_consensus_class, top_consensus_prob = sorted_classes[0]

        # 3. Check angle vote agreement
        vote_counts = {}
        for res in angle_results:
            pred = res["prediction"]
            vote_counts[pred] = vote_counts.get(pred, 0) + 1

        top_voted_class = max(vote_counts.items(), key=lambda x: x[1])[0]
        agreement_count = vote_counts.get(top_voted_class, 1)
        agreement_rate = round(agreement_count / num_angles, 2)

        # 4. Safety-First Melanoma Protection Rule:
        # If ANY individual angle detects Melanoma (prediction=='mel' or p(mel) >= 0.40) and average consensus is benign,
        # prioritize patient safety by elevating the high-risk alert in the consensus synthesis.
        melanoma_detected_angles = [
            res for res in angle_results
            if res["prediction"] == "mel" or res.get("probabilities", {}).get("mel", 0.0) >= 0.40
        ]

        melanoma_safety_override = False
        has_high_risk_conflict = False
        final_prediction = top_consensus_class
        final_confidence = top_consensus_prob

        if melanoma_detected_angles and top_consensus_class not in ["mel", "bcc"]:
            melanoma_safety_override = True
            has_high_risk_conflict = True
            final_prediction = "mel"
            max_mel_prob = max(res.get("probabilities", {}).get("mel", 0.0) for res in melanoma_detected_angles)
            final_confidence = round(max_mel_prob, 4)
            consensus_message = f"High-risk pattern detected on {len(melanoma_detected_angles)} of {num_angles} perspectives (Safety Priority Applied)"
        else:
            if agreement_count == num_angles:
                consensus_message = f"{agreement_count} of {num_angles} perspectives show a consistent pattern"
            else:
                consensus_message = f"{agreement_count} of {num_angles} perspectives show consistent features"

        return {
            "total_angles": num_angles,
            "agreement_rate": agreement_rate,
            "agreement_count": agreement_count,
            "primary_prediction": final_prediction,
            "primary_confidence": final_confidence,
            "average_probabilities": avg_probs,
            "has_high_risk_conflict": has_high_risk_conflict,
            "melanoma_safety_override": melanoma_safety_override,
            "consensus_message": consensus_message,
            "angle_breakdown": angle_results
        }


ml_service = MLService()

