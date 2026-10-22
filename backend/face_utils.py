"""
Face detection and embedding utilities using OpenCV YuNet + SFace.
Fully self-contained: works out of the box on all operating systems without dlib or C++ build tools.
"""

from __future__ import annotations

import io
import os
import uuid
import urllib.request
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image

from config import settings

YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
SFACE_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_recognition_sface/face_recognition_sface_2021dec.onnx"
)


def ensure_models() -> tuple[Path, Path]:
    """Ensure ONNX models for YuNet and SFace are present on disk."""
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)

    yunet_path = settings.YUNET_MODEL
    if not yunet_path.exists():
        print(f"[FaceSort] Downloading YuNet detector to {yunet_path}...")
        urllib.request.urlretrieve(YUNET_URL, str(yunet_path))

    sface_path = settings.SFACE_MODEL
    if not sface_path.exists():
        print(f"[FaceSort] Downloading SFace recognizer to {sface_path}...")
        urllib.request.urlretrieve(SFACE_URL, str(sface_path))

    return yunet_path, sface_path


# Initialize models
_yunet_path, _sface_path = ensure_models()
_recognizer = cv2.FaceRecognizerSF.create(str(_sface_path), "")


def load_image_from_bytes(data: bytes) -> np.ndarray:
    """Load raw bytes into an RGB numpy array (H, W, 3)."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


def detect_and_encode(image_array: np.ndarray) -> list[dict]:
    """
    Detect faces in an image and return encodings + bounding boxes.

    Returns a list of dicts:
      {
        "encoding": np.ndarray (128-d, float32),
        "bbox": (top, right, bottom, left)
      }
    """
    h, w = image_array.shape[:2]
    if h == 0 or w == 0:
        return []

    # OpenCV models expect BGR
    img_bgr = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)

    # Initialize YuNet with input size matching image
    detector = cv2.FaceDetectorYN.create(str(_yunet_path), "", (w, h), 0.6, 0.3, 5000)
    detector.setInputSize((w, h))
    _, faces = detector.detect(img_bgr)

    results = []

    if faces is not None and len(faces) > 0:
        for face in faces:
            # face format: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
            x, y, fw, fh = face[:4]
            top = max(0, int(round(y)))
            left = max(0, int(round(x)))
            bottom = min(h, int(round(y + fh)))
            right = min(w, int(round(x + fw)))

            if bottom <= top or right <= left:
                continue

            # Align face using 5-point landmarks and extract SFace embedding
            aligned = _recognizer.alignCrop(img_bgr, face)
            feat = _recognizer.feature(aligned)  # shape (1, 128)
            feat = feat.flatten().astype(np.float32)

            # L2 normalize
            norm = np.linalg.norm(feat)
            if norm > 0:
                feat = feat / norm

            bbox = (top, right, bottom, left)
            results.append({"encoding": feat, "bbox": bbox})

    return results


def crop_face(image_array: np.ndarray, bbox: tuple, padding: int = 20) -> np.ndarray:
    """Crop a face region with optional padding."""
    top, right, bottom, left = bbox
    h, w = image_array.shape[:2]
    top = max(0, top - padding)
    left = max(0, left - padding)
    bottom = min(h, bottom + padding)
    right = min(w, right + padding)
    return image_array[top:bottom, left:right]


def save_face_crop(image_array: np.ndarray, bbox: tuple) -> str:
    """Crop face, save to storage/faces/, return filename."""
    face = crop_face(image_array, bbox)
    face_img = Image.fromarray(face)
    filename = f"face_{uuid.uuid4().hex}.jpg"
    path = settings.FACES_DIR / filename
    settings.FACES_DIR.mkdir(parents=True, exist_ok=True)
    face_img.save(path, "JPEG", quality=88)
    return filename


def compare_face(
    unknown_encoding: np.ndarray,
    known_encodings: list[list[float]],
    threshold: float | None = None,
) -> tuple[bool, float]:
    """
    Compare an unknown encoding against a list of known encodings using cosine similarity.

    Returns (matched: bool, confidence: float).
    confidence = max cosine similarity among known reference embeddings.
    """
    if not known_encodings:
        return False, 0.0

    threshold = threshold if threshold is not None else settings.MATCH_THRESHOLD

    u = np.array(unknown_encoding, dtype=np.float32).flatten()
    u_norm = np.linalg.norm(u)
    if u_norm > 0:
        u = u / u_norm

    k_np = np.array(known_encodings, dtype=np.float32)
    k_norm = np.linalg.norm(k_np, axis=1, keepdims=True)
    k_norm[k_norm == 0] = 1.0
    k_normed = k_np / k_norm

    sims = np.dot(k_normed, u)
    max_sim = float(np.max(sims))
    confidence = round(max(0.0, max_sim), 4)
    matched = max_sim >= threshold
    return matched, confidence


def find_best_match(
    unknown_encoding: np.ndarray,
    people: dict,
    threshold: float | None = None,
) -> tuple[Optional[str], float]:
    """
    Find the best-matching person from the people registry.

    Returns (person_id or None, confidence).
    """
    threshold = threshold if threshold is not None else settings.MATCH_THRESHOLD
    best_id: Optional[str] = None
    best_conf = 0.0

    for person_id, person in people.items():
        embs = person.get("embeddings", [])
        if not embs:
            continue
        matched, conf = compare_face(unknown_encoding, embs, threshold)
        if matched and conf > best_conf:
            best_conf = conf
            best_id = person_id

    return best_id, best_conf
