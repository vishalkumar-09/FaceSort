"""
Application configuration using environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

class Settings:
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
    UPLOADS_DIR: Path = STORAGE_DIR / "uploads"
    ORGANIZED_DIR: Path = STORAGE_DIR / "organized"
    FACES_DIR: Path = STORAGE_DIR / "faces"
    DB_FILE: Path = STORAGE_DIR / "db.json"

    MODELS_DIR: Path = BASE_DIR / "models"
    YUNET_MODEL: Path = MODELS_DIR / "face_detection_yunet.onnx"
    SFACE_MODEL: Path = MODELS_DIR / "face_recognition_sface.onnx"

    # Face recognition cosine similarity threshold (SFace default ~0.363)
    MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.363"))

    # Max upload size in bytes (50 MB)
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024)))

    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png"}


settings = Settings()
