"""
Unknown Faces router — review and assign unmatched faces.
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db, save
from face_utils import compare_face, find_best_match
import numpy as np

router = APIRouter()

SAFE_NAME_RE = re.compile(r"[^\w\s\-]")


def _sanitize(name: str) -> str:
    return SAFE_NAME_RE.sub("", name).strip()[:80]


# ─────────────────────────────────────────────
# GET /api/unknown
# ─────────────────────────────────────────────
@router.get("")
async def list_unknown():
    unknowns = [u for u in db.get("unknown_faces", []) if not u.get("assigned")]
    return {"count": len(unknowns), "faces": unknowns}


# ─────────────────────────────────────────────
# POST /api/unknown/{face_id}/assign
# ─────────────────────────────────────────────
class AssignBody(BaseModel):
    person_id: str | None = None  # existing person
    new_name: str | None = None   # create new person


@router.post("/{face_id}/assign")
async def assign_unknown(face_id: str, body: AssignBody):
    unknown = next(
        (u for u in db.get("unknown_faces", []) if u["id"] == face_id), None
    )
    if not unknown:
        raise HTTPException(404, "Unknown face not found.")
    if unknown.get("assigned"):
        raise HTTPException(409, "This face has already been assigned.")

    # 1. Locate the source face in photos to extract its 128-d embedding
    photo_id = unknown.get("photo_id")
    face_encoding = None
    target_face_record = None

    for photo in db.get("photos", []):
        if photo["id"] == photo_id or photo["filename"] == photo_id:
            for face in photo.get("faces", []):
                if face.get("face_id") == unknown.get("face_id"):
                    target_face_record = face
                    face_encoding = face.get("encoding")
                    break
            if target_face_record:
                break

    # 2. Determine target person (existing or new)
    if body.person_id:
        person = db["people"].get(body.person_id)
        if not person:
            raise HTTPException(404, "Person not found.")
        target_id = body.person_id
        # Add embedding and reference image to existing person profile
        if face_encoding and face_encoding not in person.get("embeddings", []):
            person.setdefault("embeddings", []).append(face_encoding)
        if unknown.get("face_image") and unknown["face_image"] not in person.get("reference_photos", []):
            person.setdefault("reference_photos", []).append(unknown["face_image"])

    elif body.new_name:
        name = _sanitize(body.new_name)
        if not name:
            raise HTTPException(400, "Name must not be empty.")
        target_id = uuid.uuid4().hex
        db["people"][target_id] = {
            "id": target_id,
            "name": name,
            "embeddings": [face_encoding] if face_encoding else [],
            "reference_photos": [unknown["face_image"]] if unknown.get("face_image") else [],
            "photo_ids": [],
        }
    else:
        raise HTTPException(400, "Provide either person_id or new_name.")

    target_person_name = db["people"][target_id]["name"]

    # 3. Mark unknown face entry as assigned
    unknown["assigned"] = True
    unknown["assigned_to"] = target_id

    # 4. Update the face in the source photo
    if target_face_record:
        target_face_record["person_id"] = target_id
        target_face_record["person_name"] = target_person_name
        target_face_record["confidence"] = 1.0

    if photo_id and photo_id not in db["people"][target_id].get("photo_ids", []):
        db["people"][target_id].setdefault("photo_ids", []).append(photo_id)

    # 5. Automatically rematch all other unassigned faces in the library!
    person_embeddings = db["people"][target_id].get("embeddings", [])
    if person_embeddings:
        for photo in db.get("photos", []):
            for face in photo.get("faces", []):
                if not face.get("person_id") and "encoding" in face:
                    matched, conf = compare_face(np.array(face["encoding"]), person_embeddings)
                    if matched:
                        face["person_id"] = target_id
                        face["person_name"] = target_person_name
                        face["confidence"] = conf
                        if photo["filename"] not in db["people"][target_id].get("photo_ids", []):
                            db["people"][target_id]["photo_ids"].append(photo["filename"])
                        # Also mark corresponding unknown_face queue item as assigned
                        for u in db.get("unknown_faces", []):
                            if u.get("face_id") == face.get("face_id"):
                                u["assigned"] = True
                                u["assigned_to"] = target_id

    save()
    return {
        "message": f"Face successfully assigned to {target_person_name}.",
        "person_id": target_id,
        "person_name": target_person_name,
    }


# ─────────────────────────────────────────────
# DELETE /api/unknown/{face_id} — dismiss
# ─────────────────────────────────────────────
@router.delete("/{face_id}", status_code=204)
async def dismiss_unknown(face_id: str):
    unknowns = db.get("unknown_faces", [])
    entry = next((u for u in unknowns if u["id"] == face_id), None)
    if not entry:
        raise HTTPException(404, "Unknown face not found.")
    entry["assigned"] = True  # mark dismissed
    save()
