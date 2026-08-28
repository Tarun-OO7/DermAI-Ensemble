# Handles model loading and inference for the Medical Diagnostic Web Application
import torch
import torch.nn.functional as F
import os
import json
import logging
import time
import torchvision.models as models
from ..config import settings

logger = logging.getLogger(__name__)

NUM_CLASSES = 7


def _build_efficientnet_b0(num_classes: int) -> torch.nn.Module:
    """Build an EfficientNet-B0 with classifier[1] replaced for num_classes."""
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = torch.nn.Linear(in_features, num_classes)
    return model


def _build_resnet50(num_classes: int) -> torch.nn.Module:
    """Build a ResNet50 with fc replaced for num_classes."""
    model = models.resnet50(weights=None)
    in_features = model.fc.in_features
    model.fc = torch.nn.Linear(in_features, num_classes)
    return model


class MLService:
    def __init__(self):
        self.efficientnet = None
        self.resnet50 = None
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() and settings.USE_GPU else "cpu"
        )
        self.config = {}
        self.idx_to_class = {}
        self.ensemble_mode = settings.ENSEMBLE_MODE

    def load_model(self):
        """Loads real trained model weights and prepares for inference."""
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
        weights_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models_weights')

        # 2. Always load EfficientNet-B0
        efficientnet_path = os.path.join(weights_dir, 'best_model.pt')
        logger.info(f"Loading EfficientNet-B0 from {efficientnet_path}...")
        self.efficientnet = _build_efficientnet_b0(NUM_CLASSES)
        state_dict = torch.load(efficientnet_path, map_location=self.device, weights_only=True)
        self.efficientnet.load_state_dict(state_dict)
        self.efficientnet.to(self.device)
        self.efficientnet.eval()

        # 3. Conditionally load ResNet50 for ensemble
        if self.ensemble_mode:
            resnet_path = os.path.join(weights_dir, 'best_model_resnet50.pt')
            logger.info(f"Loading ResNet50 from {resnet_path}...")
            self.resnet50 = _build_resnet50(NUM_CLASSES)
            state_dict = torch.load(resnet_path, map_location=self.device, weights_only=True)
            self.resnet50.load_state_dict(state_dict)
            self.resnet50.to(self.device)
            self.resnet50.eval()

        end_time = time.time()
        load_duration = end_time - start_time
        version = self.config.get("version", "unknown")
        logger.info(
            f"Model loaded | device={self.device.type} | version={version} "
            f"| ensemble={self.ensemble_mode} | load_time={load_duration:.2f}s"
        )

        # Set a reference for app.state compatibility
        self.model = self.efficientnet

    def predict(self, tensor_image: torch.Tensor, cancer_type: str) -> dict:
        """
        Real inference engine for medical diagnosis.
        Returns a dictionary with prediction and confidence_score.
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
                # EfficientNet-B0 inference
                logits_eff = self.efficientnet(tensor_image)
                probs_eff = F.softmax(logits_eff, dim=1)

                if self.ensemble_mode and self.resnet50 is not None:
                    # ResNet50 inference
                    logits_res = self.resnet50(tensor_image)
                    probs_res = F.softmax(logits_res, dim=1)
                    # Average the softmax probabilities
                    avg_probs = (probs_eff + probs_res) / 2.0
                else:
                    avg_probs = probs_eff

                confidence, predicted_idx = torch.max(avg_probs, dim=1)
                predicted_class = self.idx_to_class.get(
                    str(predicted_idx.item()), "unknown"
                )

            return {
                "prediction": predicted_class,
                "confidence_score": round(confidence.item(), 4)
            }
        except Exception as e:
            logger.error(f"Error during ML inference: {e}", exc_info=True)
            raise


ml_service = MLService()
