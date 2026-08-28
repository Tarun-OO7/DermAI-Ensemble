import pytest
import io
from PIL import Image

def create_test_image():
    # Create a simple valid 10x10 PNG image in memory
    img = Image.new('RGB', (10, 10), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr

def test_diagnostic_full_flow_valid(client, db_session):
    img_bytes = create_test_image()
    
    response = client.post(
        "/api/diagnostic/skin",
        headers={"X-API-Key": "test-secret-key"},
        files={"file": ("test_img.png", img_bytes, "image/png")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["cancer_type"] == "skin"
    assert "prediction" in data
    assert "confidence_score" in data
    assert "image_url" in data
    assert "created_at" in data
    # Real model should return a HAM10000 class
    valid_classes = {"akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"}
    assert data["prediction"] in valid_classes
    assert 0.0 <= data["confidence_score"] <= 1.0

    # Confirm it was saved in the test DB
    from app.models import DiagnosisResult
    record = db_session.query(DiagnosisResult).filter(DiagnosisResult.id == data["id"]).first()
    assert record is not None
    assert record.cancer_type == "skin"

def test_diagnostic_missing_api_key(client):
    img_bytes = create_test_image()
    
    response = client.post(
        "/api/diagnostic/lung",
        files={"file": ("test_img.png", img_bytes, "image/png")}
    )
    
    assert response.status_code == 401
    assert response.json() == {"detail": "API Key is missing"}

def test_diagnostic_invalid_api_key(client):
    img_bytes = create_test_image()
    
    response = client.post(
        "/api/diagnostic/lung",
        headers={"X-API-Key": "wrong-key"},
        files={"file": ("test_img.png", img_bytes, "image/png")}
    )
    
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid API Key"}

def test_diagnostic_corrupted_image(client):
    # Pass a simple text string as file
    response = client.post(
        "/api/diagnostic/lung",
        headers={"X-API-Key": "test-secret-key"},
        files={"file": ("test.txt", b"this is not an image", "text/plain")}
    )
    
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid file type. Only JPEG and PNG are allowed."}

def test_diagnostic_oversized_file(client):
    # 11MB file of zeros to trigger the oversized file limit
    oversized_data = b"0" * (11 * 1024 * 1024)
    response = client.post(
        "/api/diagnostic/lung",
        headers={"X-API-Key": "test-secret-key"},
        files={"file": ("big_file.png", oversized_data, "image/png")}
    )
    
    assert response.status_code == 400
    assert response.json() == {"detail": "File too large. Max size is 10MB."}
