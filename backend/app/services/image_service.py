# Handles image validation, processing, and saving
import os
import uuid
import io
import logging
from fastapi import UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError
import torchvision.transforms as transforms
from ..config import settings

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ImageService:
    def __init__(self):
        # Define the PyTorch transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                                 std=[0.229, 0.224, 0.225])
        ])
        
    async def process_and_save_image(self, file: UploadFile) -> tuple[str, str, object]:
        """
        Validates, saves, and transforms an uploaded image.
        Returns (filename, filepath, tensor).
        """
        # 1. Validate Extension and MIME
        content_type = file.content_type
        if content_type not in ["image/jpeg", "image/png"]:
            logger.warning(f"Rejected upload due to invalid MIME type: {content_type}")
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG are allowed.")
            
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in settings.allowed_types_list:
            logger.warning(f"Rejected upload due to invalid extension: {ext}")
            raise HTTPException(status_code=400, detail=f"Invalid file extension. Allowed: {settings.ALLOWED_IMAGE_TYPES}")
            
        # 2. Read and Validate Size
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > settings.MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=400, detail=f"File too large. Max size is {settings.MAX_IMAGE_SIZE_MB}MB.")
            
        # 3. Process with PIL and PyTorch
        try:
            image = Image.open(io.BytesIO(contents))
            image.verify() # Verify it's an image without decoding entirely
            
            # Re-open after verify to actually decode
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            tensor = self.transform(image).unsqueeze(0) # Shape: (1, 3, 224, 224)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
            logger.error(f"Failed to identify image: {e}")
            raise HTTPException(status_code=400, detail="Corrupted or invalid image file.")
        except Exception as e:
            logger.error(f"Error processing image: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to process image.")
            
        # 4. Save to Disk
        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, unique_filename)
        
        try:
            # We save the original uploaded contents
            with open(filepath, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to save image to disk.")
            
        return unique_filename, filepath, tensor

image_service = ImageService()
