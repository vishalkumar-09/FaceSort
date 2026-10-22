"""
Unknown Faces router — review and assign unmatched faces.
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db, save
from face_utils import find_best_match
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

    if body.person_id:
        # Assign to existing person
        person = db["people"].get(body.person_id)
        if not person:
            raise HTTPException(404, "Person not found.")
        target_id = body.person_id

    elif body.new_name:
        # Create new person from this face
        name = _sanitize(body.new_name)
        if not name:
            raise HTTPException(400, "Name must not be empty.")
        target_id = uuid.uuid4().hex
        db["people"][target_id] = {
            "id": target_id,
            "name": name,
            "embeddings": [],
            "reference_photos": [unknown["face_image"]],
            "photo_ids": [],
        }
    else:
        raise HTTPException(400, "Provide either person_id or new_name.")

    # Mark unknown face as assigned
    unknown["assigned"] = True
    unknown["assigned_to"] = target_id

    # Update the face entry in the photo record
    photo_id = unknown.get("photo_id")
    for photo in db.get("photos", []):
        if photo["id"] == photo_id or photo["filename"] == photo_id:
            for face in photo.get("faces", []):
                if face["face_id"] == unknown["face_id"]:
                    face["person_id"] = target_id
                    face["person_name"] = db["people"][target_id]["name"]
                    # Add the face image as reference embedding if possible
                    break

    # Add photo to person's list
    if photo_id and photo_id not in db["people"][target_id].get("photo_ids", []):
        db["people"][target_id].setdefault("photo_ids", []).append(photo_id)

    save()
    return {
        "message": "Face assigned successfully.",
        "person_id": target_id,
        "person_name": db["people"][target_id]["name"],
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
