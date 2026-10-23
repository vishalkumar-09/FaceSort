"""
Lightweight JSON-file database for FaceSort.

Schema
------
{
  "people": {
    "<person_id>": {
      "id": str,
      "name": str,
      "embeddings": [[float, ...], ...],   # list of 128-d face encodings
      "reference_photos": [str, ...],       # filenames under storage/faces/
      "photo_ids": [str, ...]               # photos this person appears in
    }
  },
  "photos": [
    {
      "id": str,
      "filename": str,
      "original_name": str,
      "uploaded_at": str,
      "faces": [
        {
          "face_id": str,
          "person_id": str | null,
          "person_name": str | null,
          "confidence": float | null,
          "bbox": [top, right, bottom, left],
          "face_image": str   # filename under storage/faces/
        }
      ]
    }
  ],
  "unknown_faces": [
    {
      "id": str,
      "photo_id": str,
      "face_id": str,
      "face_image": str,
      "bbox": [top, right, bottom, left],
      "assigned": bool,
      "assigned_to": str | null
    }
  ]
}
"""

import json
import threading
from pathlib import Path
from config import settings

_lock = threading.Lock()

_default: dict = {"people": {}, "photos": [], "unknown_faces": [], "shares": {}}

db: dict = {}


def init_db() -> None:
    """Load DB from disk, creating it with defaults if absent."""
    global db
    settings.DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    if settings.DB_FILE.exists():
        with open(settings.DB_FILE, "r", encoding="utf-8") as fh:
            db.update(json.load(fh))
    else:
        db.update(_default)
        _flush()
    db.setdefault("shares", {})


def _flush() -> None:
    """Write current in-memory db to disk (must hold _lock)."""
    with open(settings.DB_FILE, "w", encoding="utf-8") as fh:
        json.dump(db, fh, indent=2, default=str)


def save() -> None:
    """Thread-safe write to disk."""
    with _lock:
        _flush()


def get(key: str, default=None):
    return db.get(key, default)
