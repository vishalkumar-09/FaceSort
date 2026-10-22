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

from routers import people, photos, organize, unknown, demo

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
)

# Static file serving for uploaded images
app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")

# Routers
app.include_router(people.router, prefix="/api/people", tags=["People"])
app.include_router(photos.router, prefix="/api/photos", tags=["Photos"])
app.include_router(organize.router, prefix="/api/organize", tags=["Organize"])
app.include_router(unknown.router, prefix="/api/unknown", tags=["Unknown Faces"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])


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
