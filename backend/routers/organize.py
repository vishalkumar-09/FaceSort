"""
Organize router — copy photos into person-named folders and ZIP them.
"""

from __future__ import annotations

import io
import shutil
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import numpy as np

from config import settings
from database import db, save
from face_utils import find_best_match, cluster_faces
import numpy as np

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


def _build_organization_plan(photos: list[dict], people: dict) -> dict[str, list[str]]:
    """
    Build folder assignment map for all photos:
    1. Assigned to registered people -> folder named after the person.
    2. Remaining unassigned faces -> clustered by similarity (Person 1, Person 2, ...).
    3. Lone unassigned faces -> 'Unknown'.
    4. Photos with no detected faces -> 'No Faces'.
    """
    folder_map: dict[str, list[str]] = {}
    unassigned_items: list[dict] = []
    handled_photos: set[str] = set()

    for photo in photos:
        filename = photo["filename"]
        faces = photo.get("faces", [])

        if not faces:
            folder_map.setdefault("No Faces", []).append(filename)
            handled_photos.add(filename)
            continue

        assigned_to_any = False
        for face in faces:
            pid = face.get("person_id")
            if pid and pid in people:
                person_name = _safe_dirname(people[pid]["name"])
                if filename not in folder_map.setdefault(person_name, []):
                    folder_map[person_name].append(filename)
                assigned_to_any = True
            elif "encoding" in face:
                unassigned_items.append({
                    "photo_filename": filename,
                    "face_id": face.get("face_id"),
                    "encoding": face["encoding"],
                })

        if assigned_to_any:
            handled_photos.add(filename)

    # Auto-cluster unassigned faces that have not been assigned to a known person
    if unassigned_items:
        clusters = cluster_faces(unassigned_items)
        for c in clusters:
            items = c["items"]
            # Cluster with 2+ occurrences gets its own group folder
            if len(items) >= 2 or not people:
                cluster_folder = f"Person {c['cluster_id']}"
                for it in items:
                    fn = it["photo_filename"]
                    if fn not in folder_map.setdefault(cluster_folder, []):
                        folder_map[cluster_folder].append(fn)
                    handled_photos.add(fn)
            else:
                for it in items:
                    fn = it["photo_filename"]
                    if fn not in handled_photos:
                        if fn not in folder_map.setdefault("Unknown", []):
                            folder_map["Unknown"].append(fn)
                        handled_photos.add(fn)

    # Any leftover photos not in any folder
    for photo in photos:
        fn = photo["filename"]
        if fn not in handled_photos:
            if fn not in folder_map.setdefault("Unknown", []):
                folder_map["Unknown"].append(fn)

    return folder_map


# ─────────────────────────────────────────────
# POST /api/organize/run
# ─────────────────────────────────────────────
@router.post("/run")
async def run_organization():
    """
    Copy photos into organized folders.
    Recognized people get person-named folders.
    Unassigned recurring faces get auto-clustered (Person 1, Person 2, ...).
    Outliers go into Unknown/.
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

    folder_map = _build_organization_plan(photos, people)

    # Copy files into target folders on disk
    for folder_name, filenames in folder_map.items():
        dest_dir = organized_root / folder_name
        dest_dir.mkdir(parents=True, exist_ok=True)
        for fn in filenames:
            src = settings.UPLOADS_DIR / fn
            if src.exists():
                dest = dest_dir / fn
                if not dest.exists():
                    shutil.copy2(src, dest)

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

    folder_map = _build_organization_plan(photos, people)

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

    # Check if anything is organized (exclude .gitkeep and hidden files)
    all_files = [
        f for f in organized_root.rglob("*")
        if f.is_file() and not f.name.startswith(".")
    ]
    if not all_files:
        # Auto-organize
        await run_organization()
        all_files = [
            f for f in organized_root.rglob("*")
            if f.is_file() and not f.name.startswith(".")
        ]

    if not all_files:
        raise HTTPException(400, "No organized photos to download.")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in all_files:
            arcname = file_path.relative_to(settings.ORGANIZED_DIR)
            zf.write(file_path, arcname)

    content = buf.getvalue()
    buf.close()

    return Response(
        content=content,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="FaceSort_organized.zip"',
            "Content-Length": str(len(content)),
        },
    )


# ─────────────────────────────────────────────
# POST /api/organize/open-folder
# ─────────────────────────────────────────────
@router.post("/open-folder")
async def open_organized_folder():
    """
    Open the organized_photos folder directly in Windows File Explorer / OS file manager.
    """
    import os
    import sys
    import subprocess

    organized_root = settings.ORGANIZED_DIR
    organized_root.mkdir(parents=True, exist_ok=True)
    folder_str = str(organized_root.resolve())

    try:
        if os.name == "nt":
            os.startfile(folder_str)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", folder_str])
        else:
            subprocess.Popen(["xdg-open", folder_str])
        return {"success": True, "path": folder_str}
    except Exception as e:
        raise HTTPException(500, f"Could not open folder in File Explorer: {e}")

