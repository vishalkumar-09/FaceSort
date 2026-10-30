"""
Application configuration using environment variables.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

def _get_storage_dir() -> Path:
    env_dir = os.getenv("STORAGE_DIR")
    if env_dir:
        return Path(env_dir)
    # When installed as a frozen Windows .exe, store user data in %LOCALAPPDATA%\FaceSort
    if getattr(sys, "frozen", False):
        local_app = os.getenv("LOCALAPPDATA") or str(Path.home())
        return Path(local_app) / "FaceSort" / "storage"
    return BASE_DIR / "storage"

def _get_models_dir() -> Path:
    # 1. Environment variable override
    env_models = os.getenv("MODELS_DIR")
    if env_models and Path(env_models).exists():
        return Path(env_models)

    # 2. Check bundled models in frozen PyInstaller
    if getattr(sys, "frozen", False):
        bundle_dir = getattr(sys, "_MEIPASS", Path(sys.executable).parent)
        candidates = [
            Path(bundle_dir) / "backend" / "models",
            Path(bundle_dir) / "models",
            Path(sys.executable).parent / "_internal" / "backend" / "models",
            Path(sys.executable).parent / "_internal" / "models",
            Path(sys.executable).parent / "backend" / "models",
            Path(sys.executable).parent / "models",
        ]
        for c in candidates:
            if c.exists() and (c / "face_detection_yunet.onnx").exists():
                return c

    # 3. Development models directory
    dev_models = BASE_DIR / "models"
    if dev_models.exists() and (dev_models / "face_detection_yunet.onnx").exists():
        return dev_models

    # 4. Fallback to storage directory models (always writable by user)
    storage_models = _get_storage_dir() / "models"
    storage_models.mkdir(parents=True, exist_ok=True)
    return storage_models

class Settings:
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = _get_storage_dir()
    UPLOADS_DIR: Path = STORAGE_DIR / "uploads"
    ORGANIZED_DIR: Path = STORAGE_DIR / "organized"
    FACES_DIR: Path = STORAGE_DIR / "faces"
    DB_FILE: Path = STORAGE_DIR / "db.json"

    MODELS_DIR: Path = _get_models_dir()
    YUNET_MODEL: Path = MODELS_DIR / "face_detection_yunet.onnx"
    SFACE_MODEL: Path = MODELS_DIR / "face_recognition_sface.onnx"

    # Face recognition cosine similarity threshold (SFace default ~0.363)
    MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.363"))

    # Max upload size in bytes (50 MB)
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024)))

    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png"}


settings = Settings()
