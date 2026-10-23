"""
Share router — local Wi-Fi album sharing via QR code or 6-digit access code.
"""

from __future__ import annotations

import io
import random
import socket
import uuid
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

from config import settings
from database import db, save

router = APIRouter()


def get_lan_ip() -> str:
    """
    Detect the computer's active LAN IPv4 address (e.g. 192.168.x.x or 10.x.x.x).
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Does not actually send data over wire, but resolves routing interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


class CreateShareRequest(BaseModel):
    person_id: str
    allow_download: bool = True
    expires_in_hours: int = 24  # 0 for never


# ─────────────────────────────────────────────
# GET /api/share/network-info
# ─────────────────────────────────────────────
@router.get("/network-info")
async def get_network_info():
    """
    Return local Wi-Fi network address info to construct local share links.
    """
    lan_ip = get_lan_ip()
    return {
        "lan_ip": lan_ip,
        "frontend_port": 3000,
        "backend_port": 8000,
        "base_url": f"http://{lan_ip}:3000",
    }


# ─────────────────────────────────────────────
# POST /api/share/create
# ─────────────────────────────────────────────
@router.post("/create")
async def create_share_link(body: CreateShareRequest):
    """
    Create a secure local share session with a share ID and easy 6-digit code.
    """
    people = db.get("people", {})
    if body.person_id not in people:
        raise HTTPException(404, "Person not found.")

    person = people[body.person_id]
    photos = db.get("photos", [])

    # Count photos with this person
    matching_photos = [
        p for p in photos
        if any(f.get("person_id") == body.person_id for f in p.get("faces", []))
    ]

    shares = db.setdefault("shares", {})

    share_id = f"fs_{uuid.uuid4().hex[:8]}"
    # 6-digit code format: 123-456
    code = f"{random.randint(100, 999)}-{random.randint(100, 999)}"

    now = datetime.now(timezone.utc)
    expires_at = (
        (now + timedelta(hours=body.expires_in_hours)).isoformat()
        if body.expires_in_hours > 0
        else None
    )

    share_record = {
        "share_id": share_id,
        "code": code,
        "person_id": body.person_id,
        "person_name": person["name"],
        "person_thumbnail": (
            person.get("reference_photos", [None])[0]
            if person.get("reference_photos")
            else None
        ),
        "allow_download": body.allow_download,
        "created_at": now.isoformat(),
        "expires_at": expires_at,
        "photo_count": len(matching_photos),
    }

    shares[share_id] = share_record
    save()

    lan_ip = get_lan_ip()
    share_url = f"http://{lan_ip}:3000/share/view?token={share_id}"

    return {
        **share_record,
        "share_url": share_url,
        "lan_ip": lan_ip,
    }


# ─────────────────────────────────────────────
# Helper: Resolve Share
# ─────────────────────────────────────────────
def _resolve_share(token: str) -> tuple[dict, dict, list[dict]]:
    """
    Resolve share session by share_id, 6-digit code, or person_id.
    Returns (share_record, person, matching_photos).
    """
    shares = db.setdefault("shares", {})
    people = db.get("people", {})
    photos = db.get("photos", [])

    token_clean = token.strip().replace(" ", "").lower()
    share = None

    # Check direct share_id match
    if token_clean in shares:
        share = shares[token_clean]
    else:
        # Check code match (with or without hyphen)
        for s in shares.values():
            s_code = s.get("code", "").replace("-", "").lower()
            if token_clean == s.get("code", "").lower() or token_clean == s_code:
                share = s
                break

    # Fallback: if token is a direct person_id
    if not share and token_clean in people:
        person = people[token_clean]
        p_photos = [
            p for p in photos
            if any(f.get("person_id") == token_clean for f in p.get("faces", []))
        ]
        dummy_share = {
            "share_id": token_clean,
            "code": "DIRECT",
            "person_id": token_clean,
            "person_name": person["name"],
            "person_thumbnail": person.get("reference_photos", [None])[0] if person.get("reference_photos") else None,
            "allow_download": True,
            "expires_at": None,
            "photo_count": len(p_photos),
        }
        return dummy_share, person, p_photos

    if not share:
        raise HTTPException(404, "Invalid or expired share link/code.")

    # Check expiration
    if share.get("expires_at"):
        exp = datetime.fromisoformat(share["expires_at"])
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(410, "This share link has expired.")

    person_id = share["person_id"]
    if person_id not in people:
        raise HTTPException(404, "Associated person profile no longer exists.")

    person = people[person_id]
    matching_photos = [
        p for p in photos
        if any(f.get("person_id") == person_id for f in p.get("faces", []))
    ]

    return share, person, matching_photos


# ─────────────────────────────────────────────
# GET /api/share/{token}
# ─────────────────────────────────────────────
@router.get("/{token}")
async def get_shared_album(token: str):
    """
    Guest endpoint — retrieve shared photo album by share ID or code.
    """
    share, person, matching_photos = _resolve_share(token)

    # Filter minimal safe data for guest mobile device
    sanitized_photos = [
        {
            "id": p["id"],
            "filename": p["filename"],
            "original_name": p["original_name"],
            "uploaded_at": p["uploaded_at"],
            "face_count": len(p.get("faces", [])),
        }
        for p in matching_photos
    ]

    return {
        "share_id": share["share_id"],
        "code": share.get("code"),
        "person_id": share["person_id"],
        "person_name": person["name"],
        "person_thumbnail": share.get("person_thumbnail"),
        "allow_download": share.get("allow_download", True),
        "expires_at": share.get("expires_at"),
        "photo_count": len(sanitized_photos),
        "photos": sanitized_photos,
    }


# ─────────────────────────────────────────────
# GET /api/share/{token}/download
# ─────────────────────────────────────────────
@router.get("/{token}/download")
async def download_shared_album_zip(token: str):
    """
    Stream a personalized ZIP archive of all photos for this person to their mobile phone.
    """
    share, person, matching_photos = _resolve_share(token)

    if not share.get("allow_download", True):
        raise HTTPException(403, "Downloads are disabled for this shared album.")

    if not matching_photos:
        raise HTTPException(404, "No photos found in this shared album.")

    safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in person["name"]).strip() or "Photos"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for photo in matching_photos:
            file_path = settings.UPLOADS_DIR / photo["filename"]
            if file_path.exists():
                zf.write(file_path, arcname=f"{safe_name}/{photo['filename']}")

    content = buf.getvalue()
    buf.close()

    filename = f"FaceSort_{safe_name}_Photos.zip"

    return Response(
        content=content,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(content)),
        },
    )
