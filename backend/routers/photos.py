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
        raw_faces = []
        scan_error = None
        img = None
        try:
            img = load_image_from_bytes(data)
            raw_faces = detect_and_encode(img)
        except Exception as e:
            scan_error = str(e)
            print(f"[FaceSort] Face detection error on {upload.filename}: {e}")

        people = db.get("people", {})

        faces_meta = []
        unknown_entries = []

        for raw in raw_faces:
            face_id = uuid.uuid4().hex
            face_filename = save_face_crop(img, raw["bbox"]) if img is not None else None
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

        res_item = {
            "filename": filename,
            "original_name": upload.filename,
            "faces_detected": len(faces_meta),
            "recognized": len([f for f in faces_meta if f["person_id"]]),
            "unknown": len(unknown_entries),
        }
        if scan_error:
            res_item["error"] = scan_error
        results.append(res_item)

    return {"uploaded": len(results), "results": results}


# ─────────────────────────────────────────────
# GET /api/photos/smart-suggest
# ─────────────────────────────────────────────
@router.get("/smart-suggest")
async def smart_suggest(q: str = Query("", min_length=0)):
    """
    Provide instant suggestions for people, smart presets, and photo matches.
    """
    people = db.get("people", {})
    photos = db.get("photos", [])
    q_lower = q.strip().lower()

    # 1. Matching people
    matched_people = [
        {
            "id": pid,
            "name": p["name"],
            "count": len(p.get("photo_ids", [])),
            "face_image": p.get("reference_photos", [None])[0] if p.get("reference_photos") else None,
        }
        for pid, p in people.items()
        if not q_lower or q_lower in p["name"].lower()
    ]

    # 2. Preset suggestions
    presets = []
    people_list = [p for p in people.values() if len(p.get("photo_ids", [])) > 0]
    for i in range(len(people_list)):
        for j in range(i + 1, min(len(people_list), i + 3)):
            p1, p2 = people_list[i], people_list[j]
            together_count = len([
                p
                for p in photos
                if any(f.get("person_id") == p1["id"] for f in p.get("faces", []))
                and any(f.get("person_id") == p2["id"] for f in p.get("faces", []))
            ])
            if together_count > 0:
                presets.append({
                    "title": f"{p1['name']} & {p2['name']} together",
                    "person_ids": [p1["id"], p2["id"]],
                    "match_mode": "and",
                    "count": together_count,
                })

    # Solo portraits count
    solo_count = len([p for p in photos if len(p.get("faces", [])) == 1])
    if solo_count > 0:
        presets.append({
            "title": "Solo Portraits",
            "face_count_type": "solo",
            "count": solo_count,
        })

    # Duo / Couples count
    duo_count = len([p for p in photos if len(p.get("faces", [])) == 2])
    if duo_count > 0:
        presets.append({
            "title": "Duo / Couples (2 faces)",
            "face_count_type": "duo",
            "count": duo_count,
        })

    # Group photos count
    group_count = len([p for p in photos if len(p.get("faces", [])) >= 3])
    if group_count > 0:
        presets.append({
            "title": "Group Photos (3+ faces)",
            "face_count_type": "group",
            "count": group_count,
        })

    # Unknown faces needing tagging
    unknown_count = len([p for p in photos if any(not f.get("person_id") for f in p.get("faces", []))])
    if unknown_count > 0:
        presets.append({
            "title": "Needs Tagging (Unknown faces)",
            "tag_status": "has_unknown",
            "count": unknown_count,
        })

    return {
        "people": matched_people[:6],
        "presets": presets,
        "total_photos": len(photos),
    }


# ─────────────────────────────────────────────
# GET /api/photos
# ─────────────────────────────────────────────
@router.get("")
async def list_photos(
    person_id: str | None = Query(None),
    person_ids: list[str] | None = Query(None),
    match_mode: str = Query("and"),
    q: str | None = Query(None),
    face_count_type: str | None = Query(None),
    tag_status: str | None = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
):
    photos = db.get("photos", [])

    # Consolidate target person IDs
    target_pids: list[str] = []
    if person_ids:
        target_pids.extend([pid for pid in person_ids if pid])
    if person_id and person_id not in target_pids:
        target_pids.append(person_id)

    # 1. Multi-Person filter with AND / OR
    if target_pids:
        if match_mode == "and":
            photos = [
                p
                for p in photos
                if all(
                    any(f.get("person_id") == pid for f in p.get("faces", []))
                    for pid in target_pids
                )
            ]
        else:
            photos = [
                p
                for p in photos
                if any(
                    any(f.get("person_id") == pid for f in p.get("faces", []))
                    for pid in target_pids
                )
            ]

    # 2. Face count filter
    if face_count_type == "solo":
        photos = [p for p in photos if len(p.get("faces", [])) == 1]
    elif face_count_type == "duo":
        photos = [p for p in photos if len(p.get("faces", [])) == 2]
    elif face_count_type == "group":
        photos = [p for p in photos if len(p.get("faces", [])) >= 3]

    # 3. Tag status filter
    if tag_status == "identified":
        photos = [p for p in photos if any(f.get("person_id") for f in p.get("faces", []))]
    elif tag_status == "has_unknown":
        photos = [p for p in photos if any(not f.get("person_id") for f in p.get("faces", []))]
    elif tag_status == "pure_unknown":
        photos = [p for p in photos if all(not f.get("person_id") for f in p.get("faces", []))]

    # 4. Text search query
    if q and q.strip():
        tokens = q.strip().lower().split()
        matched = []
        for p in photos:
            name_text = p.get("original_name", "").lower()
            faces_text = " ".join([f.get("person_name") or "" for f in p.get("faces", [])]).lower()
            combined = f"{name_text} {faces_text}"
            if all(t in combined for t in tokens):
                matched.append(p)
        photos = matched

    # 5. Sorting
    if sort == "oldest":
        photos = sorted(photos, key=lambda p: p.get("uploaded_at", ""))
    elif sort == "most_faces":
        photos = sorted(photos, key=lambda p: len(p.get("faces", [])), reverse=True)
    else:  # newest
        photos = sorted(photos, key=lambda p: p.get("uploaded_at", ""), reverse=True)

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
