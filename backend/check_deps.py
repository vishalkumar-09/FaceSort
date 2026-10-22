#!/usr/bin/env python3
"""
Quick sanity check — verifies that all required packages and models are available.
Run: python check_deps.py
"""
import sys

failures = []

packages = [
    "fastapi",
    "uvicorn",
    "multipart",
    "cv2",
    "numpy",
    "PIL",
    "sklearn",
    "aiofiles",
    "dotenv",
]

for pkg in packages:
    try:
        __import__(pkg)
        print(f"  [OK] {pkg}")
    except ImportError as e:
        print(f"  [FAIL] {pkg} - {e}")
        failures.append(pkg)

if failures:
    print(f"\nMissing package(s): {', '.join(failures)}")
    print("Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    from face_utils import ensure_models
    yunet, sface = ensure_models()
    print(f"  [OK] AI Detection Model: {yunet.name}")
    print(f"  [OK] AI Recognition Model: {sface.name}")
except Exception as e:
    print(f"  [FAIL] AI Models initialization error: {e}")
    sys.exit(1)

print("\nAll dependencies and AI models are ready!")
print("You can start the server:")
print("   uvicorn main:app --reload --port 8000")
