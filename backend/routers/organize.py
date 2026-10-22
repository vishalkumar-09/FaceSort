"""
Organize router — copy photos into person-named folders and ZIP them.
"""

from __future__ import annotations

import io
import shutil
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import numpy as np

from config import settings
from database import db, save
from face_utils import find_best_match

router = APIRouter()


def _safe_dirname(name: str) -> str:
    """Convert a person name to a safe directory name."""
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip() or "Unnamed"


def _rematch_unassigned_faces():
    """Ensure any unassigned faces in photos are matched against current people."""
    photos = db.get("photos", [])
    people = db.get("people", {})
    if not people or not photos:
        return

    updated = False
    for photo in photos:
        for face in photo.get("faces", []):
            if not face.get("person_id") and "encoding" in face:
                matched_id, conf = find_best_match(np.array(face["encoding"], dtype=np.float32), people)
                if matched_id:
                    face["person_id"] = matched_id
                    face["person_name"] = people[matched_id]["name"]
                    face["confidence"] = conf
                    if photo["filename"] not in people[matched_id].setdefault("photo_ids", []):
                        people[matched_id]["photo_ids"].append(photo["filename"])
                    # Mark any unknown face entry as assigned
                    for u in db.get("unknown_faces", []):
                        if u.get("face_id") == face.get("face_id"):
                            u["assigned"] = True
                            u["assigned_to"] = matched_id
                    updated = True

    if updated:
        save()


# ─────────────────────────────────────────────
# POST /api/organize/run
# ─────────────────────────────────────────────
@router.post("/run")
async def run_organization():
    """
    Copy photos into organized_photos/<PersonName>/ folders.
    A photo with multiple recognized faces is copied into each person's folder.
    Unknown faces go into Unknown/.
    """
    _rematch_unassigned_faces()

    photos = db.get("photos", [])
    people = db.get("people", {})

    if not photos:
        raise HTTPException(400, "No photos uploaded yet. Please import photos first.")

    organized_root = settings.ORGANIZED_DIR
    organized_root.mkdir(parents=True, exist_ok=True)

    # Clean out previous organized structure
    for item in organized_root.iterdir():
        try:
            if item.is_dir():
                shutil.rmtree(item)
            elif item.is_file():
                item.unlink()
        except Exception:
            pass

    folder_map: dict[str, list[str]] = {}

    for photo in photos:
        src = settings.UPLOADS_DIR / photo["filename"]
        if not src.exists():
            continue

        faces = photo.get("faces", [])
        assigned_persons: set[str] = set()
        has_unknown = False

        for face in faces:
            pid = face.get("person_id")
            if pid and pid in people:
                assigned_persons.add(pid)
            else:
                has_unknown = True

        # Copy to each recognized person's folder
        for pid in assigned_persons:
            person_name = people[pid]["name"]
            folder_name = _safe_dirname(person_name)
            dest_dir = organized_root / folder_name
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / photo["filename"]
            if not dest.exists():
                shutil.copy2(src, dest)
            folder_map.setdefault(folder_name, []).append(photo["filename"])

        # Unknown (if no recognized person, or has unidentified face)
        if has_unknown or not assigned_persons:
            dest_dir = organized_root / "Unknown"
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / photo["filename"]
            if not dest.exists():
                shutil.copy2(src, dest)
            folder_map.setdefault("Unknown", []).append(photo["filename"])

    return {
        "message": f"Organized {len(photos)} photos into {len(folder_map)} folders.",
        "folders": [
            {"name": k, "count": len(v), "photos": v}
            for k, v in folder_map.items()
        ],
        "total_photos": len(photos),
    }


# ─────────────────────────────────────────────
# GET /api/organize/preview
# ─────────────────────────────────────────────
@router.get("/preview")
async def preview_organization():
    """Return what the organization would look like without actually copying files."""
    _rematch_unassigned_faces()

    photos = db.get("photos", [])
    people = db.get("people", {})

    folder_map: dict[str, list[str]] = {}

    for photo in photos:
        faces = photo.get("faces", [])
        assigned: set[str] = set()
        has_unknown = False

        for face in faces:
            pid = face.get("person_id")
            if pid and pid in people:
                assigned.add(pid)
            else:
                has_unknown = True

        for pid in assigned:
            name = _safe_dirname(people[pid]["name"])
            folder_map.setdefault(name, []).append(photo["filename"])

        if has_unknown or not assigned:
            folder_map.setdefault("Unknown", []).append(photo["filename"])

    return {
        "total_photos": len(photos),
        "total_people": len(people),
        "folders": [
            {"name": k, "count": len(v), "photos": v[:8]}
            for k, v in folder_map.items()
        ],
    }


# ─────────────────────────────────────────────
# GET /api/organize/download
# ─────────────────────────────────────────────
@router.get("/download")
async def download_zip():
    """
    Stream a ZIP of organized_photos/ to the client.
    Runs organize first if folders are empty.
    """
    organized_root = settings.ORGANIZED_DIR

    # Check if anything is organized
    all_files = [f for f in organized_root.rglob("*.*") if f.is_file()]
    if not all_files:
        # Auto-organize
        await run_organization()
        all_files = [f for f in organized_root.rglob("*.*") if f.is_file()]

    if not all_files:
        raise HTTPException(400, "No organized photos to download.")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in all_files:
            arcname = file_path.relative_to(settings.ORGANIZED_DIR)
            zf.write(file_path, arcname)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="FaceSort_organized.zip"'},
    )
