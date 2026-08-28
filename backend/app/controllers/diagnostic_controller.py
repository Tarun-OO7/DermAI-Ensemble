from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from ..services.image_service import image_service
from ..services.ml_service import ml_service
from ..models import DiagnosisResult

class DiagnosticController:
    async def process_diagnostic(self, cancer_type: str, file: UploadFile, db: Session):
        valid_cancer_types = ['skin', 'breast', 'lung']
        if cancer_type not in valid_cancer_types:
            raise HTTPException(status_code=422, detail=f"Invalid cancer type. Must be one of {valid_cancer_types}")

        # Process image and get tensor
        filename, filepath, tensor = await image_service.process_and_save_image(file)

        # Run ML model
        try:
            prediction_result = ml_service.predict(tensor, cancer_type)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Error during ML inference")

        # Save to database
        db_result = DiagnosisResult(
            cancer_type=cancer_type,
            image_filename=filename,
            image_path=filepath,
            confidence_score=prediction_result["confidence_score"],
            prediction=prediction_result["prediction"]
        )
        db.add(db_result)
        db.commit()
        db.refresh(db_result)

        return {
            "id": db_result.id,
            "cancer_type": db_result.cancer_type,
            "prediction": db_result.prediction,
            "confidence_score": db_result.confidence_score,
            "image_url": f"/uploads/{filename}",
            "created_at": db_result.created_at
        }

diagnostic_controller = DiagnosticController()
