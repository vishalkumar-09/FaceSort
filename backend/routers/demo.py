"""
Demo & Testing router — provides seed sample dataset and database reset endpoints.
"""

from __future__ import annotations

import io
import shutil
import urllib.request
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import cv2
import numpy as np
from PIL import Image

from config import settings
from database import db, save
from face_utils import (
    detect_and_encode,
    find_best_match,
    load_image_from_bytes,
    save_face_crop,
)

router = APIRouter()

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FaceSort/1.0"}

SOPHIA_URL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"
LUCAS_URL = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
UNKNOWN_URL = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80"


def _get_samples_dir() -> Path:
    """Find samples directory in dev or bundled desktop mode."""
    import sys
    if getattr(sys, "frozen", False):
        bundle_dir = getattr(sys, "_MEIPASS", Path(sys.executable).parent)
        candidates = [
            Path(bundle_dir) / "backend" / "samples",
            Path(bundle_dir) / "samples",
            Path(sys.executable).parent / "_internal" / "backend" / "samples",
            Path(sys.executable).parent / "_internal" / "samples",
        ]
        for c in candidates:
            if c.exists():
                return c
    return settings.BASE_DIR / "samples"


def _load_or_download(sample_name: str, url: str) -> bytes:
    """Load sample image from local bundled samples first, or download as fallback."""
    samples_dir = _get_samples_dir()
    local_path = samples_dir / f"{sample_name}.jpg"
    if local_path.is_file():
        try:
            return local_path.read_bytes()
        except Exception:
            pass

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.read()
    except Exception as e:
        print(f"[FaceSort] Could not download {sample_name} from {url}: {e}")
        # Generate an ultra-simple fallback portrait if all else fails
        img = Image.new("RGB", (400, 400), color=(70, 80, 120))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()


@router.post("/seed")
async def seed_sample_data():
    """Seed sample people and photos into FaceSort."""
    settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    settings.FACES_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load sample base images (offline first!)
    sophia_bytes = _load_or_download("sophia", SOPHIA_URL)
    lucas_bytes = _load_or_download("lucas", LUCAS_URL)
    unknown_bytes = _load_or_download("group", UNKNOWN_URL)

    sophia_img = load_image_from_bytes(sophia_bytes)
    lucas_img = load_image_from_bytes(lucas_bytes)
    unknown_img = load_image_from_bytes(unknown_bytes)

    # 2. Register Sophia if not existing
    people = db.setdefault("people", {})
    sophia_person = next((p for p in people.values() if p["name"] == "Sophia"), None)
    if not sophia_person:
        faces = detect_and_encode(sophia_img)
        if faces:
            face = max(faces, key=lambda f: (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][1] - f["bbox"][3]))
            face_filename = save_face_crop(sophia_img, face["bbox"])
            pid = uuid.uuid4().hex
            people[pid] = {
                "id": pid,
                "name": "Sophia",
                "embeddings": [face["encoding"].tolist()],
                "reference_photos": [face_filename],
                "photo_ids": [],
            }
            sophia_person = people[pid]

    # 3. Register Lucas if not existing
    lucas_person = next((p for p in people.values() if p["name"] == "Lucas"), None)
    if not lucas_person:
        faces = detect_and_encode(lucas_img)
        if faces:
            face = max(faces, key=lambda f: (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][1] - f["bbox"][3]))
            face_filename = save_face_crop(lucas_img, face["bbox"])
            pid = uuid.uuid4().hex
            people[pid] = {
                "id": pid,
                "name": "Lucas",
                "embeddings": [face["encoding"].tolist()],
                "reference_photos": [face_filename],
                "photo_ids": [],
            }
            lucas_person = people[pid]

    # 4. Generate & save sample photos
    # Photo A: Sophia solo photo
    sh, sw = sophia_img.shape[:2]
    sophia_photo_np = cv2.resize(sophia_img, (int(sw * 0.9), int(sh * 0.9)))
    sophia_buf = io.BytesIO()
    Image.fromarray(sophia_photo_np).save(sophia_buf, format="JPEG", quality=90)
    sophia_photo_bytes = sophia_buf.getvalue()

    # Photo B: Lucas solo photo
    lh, lw = lucas_img.shape[:2]
    lucas_photo_np = cv2.resize(lucas_img, (int(lw * 0.9), int(lh * 0.9)))
    lucas_buf = io.BytesIO()
    Image.fromarray(lucas_photo_np).save(lucas_buf, format="JPEG", quality=90)
    lucas_photo_bytes = lucas_buf.getvalue()

    # Photo C: Duo photo (Sophia + Lucas together!)
    # Resize both to common height 600
    target_h = 600
    s_duo = cv2.resize(sophia_img, (int(sw * (target_h / sh)), target_h))
    l_duo = cv2.resize(lucas_img, (int(lw * (target_h / lh)), target_h))
    duo_np = np.hstack([s_duo, l_duo])
    duo_buf = io.BytesIO()
    Image.fromarray(duo_np).save(duo_buf, format="JPEG", quality=90)
    duo_photo_bytes = duo_buf.getvalue()

    # Photo D: Unknown person photo
    unknown_buf = io.BytesIO()
    Image.fromarray(unknown_img).save(unknown_buf, format="JPEG", quality=90)
    unknown_photo_bytes = unknown_buf.getvalue()

    sample_photos_list = [
        ("Sophia at Sunset.jpg", sophia_photo_bytes, sophia_photo_np),
        ("Lucas in the City.jpg", lucas_photo_bytes, lucas_photo_np),
        ("Sophia and Lucas Together.jpg", duo_photo_bytes, duo_np),
        ("Unknown Guest at Event.jpg", unknown_photo_bytes, unknown_img),
    ]

    added_photos = 0
    photos_db = db.setdefault("photos", [])

    for title, raw_bytes, img_array in sample_photos_list:
        if any(p.get("original_name") == title for p in photos_db):
            continue

        filename = f"sample_{uuid.uuid4().hex[:8]}.jpg"
        dest = settings.UPLOADS_DIR / filename
        dest.write_bytes(raw_bytes)

        raw_faces = detect_and_encode(img_array)
        faces_meta = []
        unknown_entries = []

        for raw in raw_faces:
            face_id = uuid.uuid4().hex
            face_filename = save_face_crop(img_array, raw["bbox"])
            person_id, confidence = find_best_match(raw["encoding"], people)
            person_name = people[person_id]["name"] if person_id else None

            faces_meta.append(
                {
                    "face_id": face_id,
                    "person_id": person_id,
                    "person_name": person_name,
                    "confidence": confidence,
                    "bbox": list(raw["bbox"]),
                    "face_image": face_filename,
                    "encoding": raw["encoding"].tolist(),
                }
            )

            if not person_id:
                unknown_entries.append(
                    {
                        "id": uuid.uuid4().hex,
                        "photo_id": filename,
                        "face_id": face_id,
                        "face_image": face_filename,
                        "bbox": list(raw["bbox"]),
                        "assigned": False,
                        "assigned_to": None,
                    }
                )

        photo_record = {
            "id": filename,
            "filename": filename,
            "original_name": title,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "faces": faces_meta,
        }

        photos_db.append(photo_record)

        # Update person photo mappings
        for face in faces_meta:
            pid = face.get("person_id")
            if pid and pid in people:
                if filename not in people[pid].setdefault("photo_ids", []):
                    people[pid]["photo_ids"].append(filename)

        db.setdefault("unknown_faces", []).extend(unknown_entries)
        added_photos += 1

    save()
    return {
        "status": "ok",
        "message": f"Successfully loaded sample dataset ({len(people)} people, {added_photos} photos).",
        "people_count": len(people),
        "photos_count": len(photos_db),
        "unknown_faces_count": len([u for u in db.get("unknown_faces", []) if not u.get("assigned")]),
    }


@router.post("/reset")
async def reset_database():
    """Clear all data and storage files (clean slate)."""
    db["people"] = {}
    db["photos"] = []
    db["unknown_faces"] = []
    save()

    # Clean directories
    for dir_path in [settings.UPLOADS_DIR, settings.FACES_DIR, settings.ORGANIZED_DIR]:
        if dir_path.exists():
            for item in dir_path.iterdir():
                try:
                    if item.is_file():
                        item.unlink()
                    elif item.is_dir():
                        shutil.rmtree(item)
                except Exception:
                    pass

    return {"status": "ok", "message": "Database and storage reset to empty state."}
