import pytest
import torch
from app.services.ml_service import MLService


def test_real_model_output_shape_and_bounds():
    """
    Loads the real EfficientNet-B0 (+ ResNet50 if ensemble) and verifies:
    - Output contains 'prediction' (str) and 'confidence_score' (float).
    - confidence_score is within [0.0, 1.0].
    - prediction is one of the 7 HAM10000 classes.
    """
    ml_service = MLService()
    ml_service.load_model()

    valid_classes = {"akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"}

    # Create a dummy tensor of the expected shape (1, 3, 224, 224)
    dummy_tensor = torch.rand(1, 3, 224, 224)

    # Test for 'skin' cancer type
    result_skin = ml_service.predict(dummy_tensor, 'skin')
    assert "prediction" in result_skin
    assert "confidence_score" in result_skin
    assert isinstance(result_skin["prediction"], str)
    assert isinstance(result_skin["confidence_score"], float)
    assert 0.0 <= result_skin["confidence_score"] <= 1.0
    assert result_skin["prediction"] in valid_classes, (
        f"Prediction '{result_skin['prediction']}' not in valid HAM10000 classes"
    )


def test_real_model_deterministic_same_input():
    """
    Verifies that the same input tensor produces the same output twice,
    confirming model.eval() mode is active (no dropout randomness).
    """
    ml_service = MLService()
    ml_service.load_model()

    # Fixed tensor for reproducibility
    torch.manual_seed(42)
    dummy_tensor = torch.rand(1, 3, 224, 224)

    result_a = ml_service.predict(dummy_tensor, 'skin')
    result_b = ml_service.predict(dummy_tensor, 'skin')

    assert result_a["prediction"] == result_b["prediction"]
    assert result_a["confidence_score"] == result_b["confidence_score"]
