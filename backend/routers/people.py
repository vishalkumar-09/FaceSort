"""
People router — register, list, rename, and delete people.
"""

from __future__ import annotations

import re
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

import database as db_module
from database import db, save
from config import settings
from face_utils import detect_and_encode, load_image_from_bytes, save_face_crop

router = APIRouter()

SAFE_NAME_RE = re.compile(r"[^\w\s\-]")


def _sanitize(name: str) -> str:
    return SAFE_NAME_RE.sub("", name).strip()[:80]


# ─────────────────────────────────────────────
# GET /api/people
# ─────────────────────────────────────────────
@router.get("")
async def list_people():
    people = db.get("people", {})
    result = []
    for pid, p in people.items():
        result.append(
            {
                "id": pid,
                "name": p["name"],
                "photo_count": len(p.get("photo_ids", [])),
                "reference_count": len(p.get("reference_photos", [])),
                "thumbnail": p.get("reference_photos", [None])[0],
            }
        )
    return result


from pathlib import Path
from face_utils import compare_face

def is_valid_image(upload: UploadFile) -> bool:
    ct = (upload.content_type or "").lower()
    if any(valid in ct for valid in ["jpeg", "jpg", "png", "webp", "bmp", "image"]):
        return True
    ext = Path(upload.filename or "").suffix.lower()
    return ext in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ─────────────────────────────────────────────
# POST /api/people  — register a new person
# ─────────────────────────────────────────────
@router.post("", status_code=201)
async def register_person(
    name: str = Form(...),
    files: list[UploadFile] = File(...),
):
    name = _sanitize(name)
    if not name:
        raise HTTPException(400, "Name must not be empty.")

    person_id = uuid.uuid4().hex
    embeddings: list[list[float]] = []
    reference_photos: list[str] = []

    for upload in files:
        if not is_valid_image(upload):
            continue
        data = await upload.read()
        if len(data) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(413, f"File {upload.filename} exceeds 50 MB limit.")

        try:
            img = load_image_from_bytes(data)
            faces = detect_and_encode(img)
        except Exception:
            continue

        if not faces:
            continue

        # Use the largest (most prominent) face
        face = max(faces, key=lambda f: (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][1] - f["bbox"][3]))
        face_filename = save_face_crop(img, face["bbox"])
        reference_photos.append(face_filename)
        embeddings.append(face["encoding"].tolist())

    if not embeddings:
        raise HTTPException(422, "No faces detected in the provided images. Please upload clear photos.")

    db["people"][person_id] = {
        "id": person_id,
        "name": name,
        "embeddings": embeddings,
        "reference_photos": reference_photos,
        "photo_ids": [],
    }

    # Auto-match existing library photos to this newly registered person
    import numpy as np
    for photo in db.get("photos", []):
        for face in photo.get("faces", []):
            if not face.get("person_id") and "encoding" in face:
                matched, conf = compare_face(np.array(face["encoding"]), embeddings)
                if matched:
                    face["person_id"] = person_id
                    face["person_name"] = name
                    face["confidence"] = conf
                    if photo["filename"] not in db["people"][person_id]["photo_ids"]:
                        db["people"][person_id]["photo_ids"].append(photo["filename"])
                    for u in db.get("unknown_faces", []):
                        if u.get("face_id") == face.get("face_id"):
                            u["assigned"] = True
                            u["assigned_to"] = person_id

    save()

    return {
        "id": person_id,
        "name": name,
        "embeddings_count": len(embeddings),
        "reference_photos": reference_photos,
    }


# ─────────────────────────────────────────────
# GET /api/people/{person_id}
# ─────────────────────────────────────────────
@router.get("/{person_id}")
async def get_person(person_id: str):
    person = db["people"].get(person_id)
    if not person:
        raise HTTPException(404, "Person not found.")
    photos = [p for p in db.get("photos", []) if person_id in [f.get("person_id") for f in p.get("faces", [])]]
    return {**person, "photos": photos}


# ─────────────────────────────────────────────
# PATCH /api/people/{person_id} — rename
# ─────────────────────────────────────────────
class RenameBody(BaseModel):
    name: str


@router.patch("/{person_id}")
async def rename_person(person_id: str, body: RenameBody):
    person = db["people"].get(person_id)
    if not person:
        raise HTTPException(404, "Person not found.")
    new_name = _sanitize(body.name)
    if not new_name:
        raise HTTPException(400, "Name must not be empty.")
    db["people"][person_id]["name"] = new_name
    save()
    return {"id": person_id, "name": new_name}


# ─────────────────────────────────────────────
# DELETE /api/people/{person_id}
# ─────────────────────────────────────────────
@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: str):
    if person_id not in db.get("people", {}):
        raise HTTPException(404, "Person not found.")
    del db["people"][person_id]
    save()
