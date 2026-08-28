from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from .database import Base

class DiagnosisResult(Base):
    __tablename__ = "diagnosis_results"

    id = Column(Integer, primary_key=True, index=True)
    cancer_type = Column(String, index=True, nullable=False)
    image_filename = Column(String, nullable=False)
    image_path = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    prediction = Column(String, nullable=False)  # 'benign' or 'malignant'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
