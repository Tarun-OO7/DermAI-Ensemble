from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json
import os

def get_max_image_size():
    paths = ["../frontend/constants.json", "./constants.json", "/app/constants.json"]
    for path in paths:
        if os.path.exists(path):
            with open(path, 'r') as f:
                return json.load(f).get("MAX_IMAGE_SIZE_MB", 10)
    return 10

class Settings(BaseSettings):
    # Database configuration
    # Default to sqlite if not provided
    DATABASE_URL: str = "sqlite:///./medical_diagnostic.db"
    API_KEY: str = "dev-secret-key"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # Image Upload configuration
    MAX_IMAGE_SIZE_MB: int = get_max_image_size()
    ALLOWED_IMAGE_TYPES: str = "jpg,jpeg,png"
    
    # Model configurations
    USE_GPU: bool = False
    ENSEMBLE_MODE: bool = True
    HF_REPO_ID: str = "username/medical-diagnostic-model"
    HF_FILENAME: str = "model.pt"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_types_list(self) -> List[str]:
        return [t.strip().lower() for t in self.ALLOWED_IMAGE_TYPES.split(",")]

settings = Settings()
