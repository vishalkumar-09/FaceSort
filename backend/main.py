"""
FaceSort Backend — FastAPI main application.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db

# Ensure directories exist before mounting static files
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.ORGANIZED_DIR.mkdir(parents=True, exist_ok=True)
settings.FACES_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)

from routers import people, photos, organize, unknown, demo, share

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialise database and storage on startup."""
    init_db()
    yield


app = FastAPI(
    title="FaceSort API",
    description="Face recognition-based photo organizer API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Static file serving for uploaded images
app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")

# Routers
app.include_router(people.router, prefix="/api/people", tags=["People"])
app.include_router(photos.router, prefix="/api/photos", tags=["Photos"])
app.include_router(organize.router, prefix="/api/organize", tags=["Organize"])
app.include_router(unknown.router, prefix="/api/unknown", tags=["Unknown Faces"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])
app.include_router(share.router, prefix="/api/share", tags=["Share"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "FaceSort API"}


@app.get("/api/stats")
async def stats():
    from database import db
    people_count = len(db.get("people", {}))
    photos_count = len(db.get("photos", []))
    unknown_count = len([f for f in db.get("unknown_faces", []) if not f.get("assigned")])
    return {
        "people": people_count,
        "photos": photos_count,
        "unknown_faces": unknown_count,
    }


# ─────────────────────────────────────────────
# Static Frontend Serving (Standalone Desktop & Production)
# ─────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "out"

if FRONTEND_DIR.exists():
    from fastapi.responses import FileResponse, Response

    # Serve _next static bundles
    next_static = FRONTEND_DIR / "_next"
    if next_static.exists():
        app.mount("/_next", StaticFiles(directory=str(next_static)), name="next_static")

    @app.get("/")
    async def serve_root():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not intercept API or static media calls
        if (
            full_path.startswith("api")
            or full_path.startswith("static")
        ):
            return Response(status_code=404)

        # 1. Exact file match (e.g. favicon.ico, images)
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # 2. Direct HTML page match: /people -> people.html, /people/view -> people/view.html
        html_file = FRONTEND_DIR / f"{full_path}.html"
        if html_file.is_file():
            return FileResponse(html_file)

        # 3. Subfolder index: /people/ -> people/index.html
        sub_index = FRONTEND_DIR / full_path / "index.html"
        if sub_index.is_file():
            return FileResponse(sub_index)

        # 4. Fallback to root index.html
        return FileResponse(FRONTEND_DIR / "index.html")

