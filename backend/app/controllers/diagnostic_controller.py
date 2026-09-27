from typing import List, Union
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
from ..services.image_service import image_service
from ..services.ml_service import ml_service
from ..models import DiagnosisResult


class DiagnosticController:
    async def process_diagnostic(
        self,
        cancer_type: str,
        files: Union[List[UploadFile], UploadFile],
        db: Session
    ):
        valid_cancer_types = ['skin', 'breast', 'lung']
        if cancer_type not in valid_cancer_types:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid cancer type. Must be one of {valid_cancer_types}"
            )

        # Normalize to list of UploadFiles
        upload_list: List[UploadFile] = []
        if isinstance(files, list):
            upload_list = [f for f in files if f is not None and getattr(f, 'filename', '')]
        elif files is not None and getattr(files, 'filename', ''):
            upload_list = [files]

        if not upload_list:
            raise HTTPException(status_code=400, detail="No valid image files provided for analysis.")

        angle_results = []
        any_non_skin = False

        for idx, file_obj in enumerate(upload_list):
            # Process image and get tensor
            filename, filepath, tensor = await image_service.process_and_save_image(file_obj)

            # Load raw PIL image for Grad-CAM overlay
            raw_pil_image = None
            try:
                raw_pil_image = Image.open(filepath).convert("RGB")
            except Exception:
                pass

            # Run ML model with real Grad-CAM generation
            try:
                pred = ml_service.predict(tensor, cancer_type, raw_pil_image=raw_pil_image)
            except Exception:
                raise HTTPException(status_code=500, detail=f"Error during ML inference on angle {idx + 1}")

            # Check skin-tone heuristic
            is_potential_non_skin = False
            if raw_pil_image is not None:
                _, is_potential_non_skin = image_service.check_skin_tone_ratio(raw_pil_image)
                if is_potential_non_skin:
                    any_non_skin = True

            angle_results.append({
                "angle_index": idx,
                "image_url": f"/uploads/{filename}",
                "filename": filename,
                "filepath": filepath,
                "prediction": pred["prediction"],
                "confidence_score": pred["confidence_score"],
                "probabilities": pred.get("probabilities", {}),
                "heatmap_image": pred.get("heatmap_image", ""),
                "is_potential_non_skin": is_potential_non_skin,
            })

        # Multi-Angle Consensus & Safety Aggregation
        consensus = ml_service.fuse_multi_angle_predictions(angle_results)

        primary_pred = consensus.get("primary_prediction", angle_results[0]["prediction"])
        primary_conf = consensus.get("primary_confidence", angle_results[0]["confidence_score"])
        primary_probs = consensus.get("average_probabilities", angle_results[0]["probabilities"])
        primary_heatmap = angle_results[0]["heatmap_image"]

        # If a specific angle triggered a melanoma safety override, pick that angle's heatmap as primary
        if consensus.get("melanoma_safety_override", False):
            for a in angle_results:
                if a["prediction"] == "mel" and a["heatmap_image"]:
                    primary_heatmap = a["heatmap_image"]
                    break

        # Save primary result to database
        db_result = DiagnosisResult(
            cancer_type=cancer_type,
            image_filename=angle_results[0]["filename"],
            image_path=angle_results[0]["filepath"],
            confidence_score=primary_conf,
            prediction=primary_pred
        )
        db.add(db_result)
        db.commit()
        db.refresh(db_result)

        return {
            "id": db_result.id,
            "cancer_type": db_result.cancer_type,
            "prediction": primary_pred,
            "confidence_score": primary_conf,
            "probabilities": primary_probs,
            "heatmap_image": primary_heatmap,
            "is_potential_non_skin": any_non_skin,
            "image_url": angle_results[0]["image_url"],
            "image_urls": [a["image_url"] for a in angle_results],
            "multi_angle": consensus,
            "created_at": db_result.created_at
        }


diagnostic_controller = DiagnosticController()
