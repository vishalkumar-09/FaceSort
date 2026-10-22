"""
Photos router — upload and retrieve photos.
"""

from __future__ import annotations

import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from config import settings
from database import db, save
from face_utils import detect_and_encode, find_best_match, load_image_from_bytes, save_face_crop

router = APIRouter()


def _safe_filename(original: str) -> str:
    stem = Path(original).stem[:60]
    ext = Path(original).suffix.lower()
    return f"{stem}_{uuid.uuid4().hex[:8]}{ext}"


def is_valid_image(upload: UploadFile) -> bool:
    ct = (upload.content_type or "").lower()
    if any(valid in ct for valid in ["jpeg", "jpg", "png", "webp", "bmp", "image"]):
        return True
    ext = Path(upload.filename or "").suffix.lower()
    return ext in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ─────────────────────────────────────────────
# POST /api/photos/upload
# ─────────────────────────────────────────────
@router.post("/upload")
async def upload_photos(files: list[UploadFile] = File(...)):
    results = []
    for upload in files:
        if not is_valid_image(upload):
            continue
        data = await upload.read()
        if len(data) > settings.MAX_UPLOAD_SIZE:
            results.append({"filename": upload.filename, "error": "File too large"})
            continue

        filename = _safe_filename(upload.filename or "image.jpg")
        dest = settings.UPLOADS_DIR / filename
        dest.write_bytes(data)

        # Detect faces immediately on upload
        try:
            img = load_image_from_bytes(data)
            raw_faces = detect_and_encode(img)
        except Exception as e:
            results.append({"filename": upload.filename, "error": str(e)})
            continue

        people = db.get("people", {})

        faces_meta = []
        unknown_entries = []

        for raw in raw_faces:
            face_id = uuid.uuid4().hex
            face_filename = save_face_crop(img, raw["bbox"])
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
            "original_name": upload.filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "faces": faces_meta,
        }

        db["photos"].append(photo_record)

        # Update person photo lists
        seen_persons: set[str] = set()
        for face in faces_meta:
            pid = face.get("person_id")
            if pid and pid not in seen_persons:
                seen_persons.add(pid)
                if filename not in db["people"][pid].get("photo_ids", []):
                    db["people"][pid].setdefault("photo_ids", []).append(filename)

        db.setdefault("unknown_faces", []).extend(unknown_entries)
        save()

        results.append(
            {
                "filename": filename,
                "original_name": upload.filename,
                "faces_detected": len(faces_meta),
                "recognized": len([f for f in faces_meta if f["person_id"]]),
                "unknown": len(unknown_entries),
            }
        )

    return {"uploaded": len(results), "results": results}


# ─────────────────────────────────────────────
# GET /api/photos
# ─────────────────────────────────────────────
@router.get("")
async def list_photos(
    person_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
):
    photos = db.get("photos", [])

    if person_id:
        photos = [
            p
            for p in photos
            if any(f.get("person_id") == person_id for f in p.get("faces", []))
        ]

    total = len(photos)
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "photos": photos[start:end],
    }


# ─────────────────────────────────────────────
# GET /api/photos/{photo_id}
# ─────────────────────────────────────────────
@router.get("/{photo_id}")
async def get_photo(photo_id: str):
    photos = db.get("photos", [])
    photo = next((p for p in photos if p["id"] == photo_id), None)
    if not photo:
        raise HTTPException(404, "Photo not found.")
    return photo


# ─────────────────────────────────────────────
# DELETE /api/photos/{photo_id}
# ─────────────────────────────────────────────
@router.delete("/{photo_id}", status_code=204)
async def delete_photo(photo_id: str):
    photos = db.get("photos", [])
    photo = next((p for p in photos if p["id"] == photo_id), None)
    if not photo:
        raise HTTPException(404, "Photo not found.")

    # Remove file
    path = settings.UPLOADS_DIR / photo_id
    if path.exists():
        path.unlink()

    # Remove from people photo lists
    for person in db.get("people", {}).values():
        if photo_id in person.get("photo_ids", []):
            person["photo_ids"].remove(photo_id)

    # Remove photo record and unknown faces
    db["photos"] = [p for p in photos if p["id"] != photo_id]
    db["unknown_faces"] = [u for u in db.get("unknown_faces", []) if u.get("photo_id") != photo_id]
    save()
