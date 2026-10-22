# FaceSort 🎞️

> An intelligent, face-based photo organizer. Every face finds its place.

FaceSort uses **offline face recognition** to automatically group your photos into person-specific folders. Built with Next.js + FastAPI + OpenCV.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| UI / Icons | Framer Motion, Lucide React |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Face Recognition | `face_recognition` (dlib HOG + 128-d embeddings) |
| Image Processing | OpenCV, Pillow, NumPy |
| Storage | Local filesystem + JSON database |

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10–3.11 (recommended; dlib may not yet support 3.12)
- **CMake** (required to compile dlib)
  - Windows: Install from https://cmake.org/download/ and tick "Add to PATH"
- **Visual Studio Build Tools** (C++ compiler for dlib on Windows)
  - Install "Desktop development with C++" workload from https://visualstudio.microsoft.com/downloads/

---

## Installation (Windows)

### 1. Clone / open the project folder

```powershell
cd "C:\Users\Akash Vishal\OneDrive\Desktop\FaceSort"
```

### 2. Set up the Python backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip wheel setuptools
pip install cmake
pip install dlib
pip install -r requirements.txt
```

> **Note**: `dlib` compilation takes a few minutes. If it fails, try installing a pre-built wheel:
> ```powershell
> pip install dlib --find-links https://github.com/z-mahmud22/Dlib_Windows_Python3.x/releases/tag/v19.24.1
> ```

Copy the example env file:

```powershell
copy .env.example .env
```

### 3. Set up the Next.js frontend

```powershell
cd ..\frontend
npm install
```

---

## Running the Application

You need **two terminals** running simultaneously.

### Terminal 1 — Backend

```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API is now available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Usage Workflow

1. **Register people** → Navigate to *People* → click *Add person* → enter a name and upload reference photos.
2. **Upload photos** → Navigate to *Organize Photos* → drag & drop your collection → click *Upload & detect faces*.
3. **Review results** → See face detection stats; go to *Unknown Faces* to identify unrecognized faces.
4. **Organize & download** → Click *Organize into folders* → download the ZIP.

Output structure:

```
storage/organized/
├── Akash/
│   ├── photo1.jpg
│   └── photo3.jpg
├── Rahul/
│   └── photo2.jpg
└── Unknown/
    └── photo4.jpg
```

---

## Configuration

Edit `backend/.env` to customize:

| Variable | Default | Description |
|---|---|---|
| `STORAGE_DIR` | `./storage` | Base directory for all stored files |
| `MATCH_THRESHOLD` | `0.5` | Face match distance threshold (0.3–0.7) |
| `MAX_UPLOAD_SIZE` | `52428800` | Max file size in bytes (50 MB) |

---

## Project Structure

```
FaceSort/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── config.py         # Settings
│   ├── database.py       # JSON file persistence
│   ├── face_utils.py     # Face detection & matching
│   ├── routers/
│   │   ├── people.py     # Register / manage people
│   │   ├── photos.py     # Upload & list photos
│   │   ├── organize.py   # Organize & ZIP download
│   │   └── unknown.py    # Unknown face assignment
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # Shared UI components
│   │   └── lib/          # API client & utilities
│   ├── package.json
│   └── .env.local
└── README.md
```

---

## Privacy

All processing happens locally. No images or biometric data are sent to any external server or API.
