from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..controllers.diagnostic_controller import diagnostic_controller
from ..core.security import verify_api_key

router = APIRouter()


@router.post("/{cancer_type}")
async def analyze_image(
    cancer_type: str,
    files: Optional[List[UploadFile]] = File(default=None),
    file: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Endpoint for uploading one or multiple images of a skin lesion for single or multi-angle consensus analysis.
    """
    target_files = []
    if files:
        target_files.extend(files)
    if file:
        target_files.append(file)

    if not target_files:
        raise HTTPException(status_code=400, detail="No image file provided.")

    return await diagnostic_controller.process_diagnostic(cancer_type, target_files, db)
