from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..controllers.diagnostic_controller import diagnostic_controller
from ..core.security import verify_api_key

router = APIRouter()

@router.post("/{cancer_type}")
async def analyze_image(
    cancer_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Endpoint for uploading an image and receiving a diagnostic prediction.
    """
    return await diagnostic_controller.process_diagnostic(cancer_type, file, db)
