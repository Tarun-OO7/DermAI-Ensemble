# Main application entry point for the Medical Diagnostic API
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

from .database import engine, Base
from .routes import health, diagnostic
from .services.ml_service import ml_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Medical Diagnostic API...")
    # Load the real machine learning model weights
    ml_service.load_model()
    app.state.model = ml_service.model
    app.state.ensemble_mode = ml_service.ensemble_mode
    yield
    logger.info("Shutting down Medical Diagnostic API...")

app = FastAPI(title="Medical Diagnostic API", lifespan=lifespan)

from .config import settings

# Setup CORS
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for uploaded images
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(diagnostic.router, prefix="/api/diagnostic", tags=["diagnostic"])
