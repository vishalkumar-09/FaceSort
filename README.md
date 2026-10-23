# FaceSort 🎞️

<div align="center">

![FaceSort Banner](https://img.shields.io/badge/FaceSort-Intelligent%20Photo%20Organizer-indigo?style=for-the-badge&logo=camera&logoColor=white)

**An intelligent, offline, face-recognition photo organizer and local Wi-Fi sharing suite.**  
*Every face finds its place — completely private, 100% on-device, zero cloud dependency.*

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?logo=windows&logoColor=white)](https://github.com/vishalkumar-09/FaceSort)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![OpenCV](https://img.shields.io/badge/OpenCV-ONNX%20YuNet%20%2B%20SFace-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Download Installer](#-windows-installer-quick-start) • [Features](#-key-features) • [Local Wi-Fi Sharing](#-local-wi-fi-qr--pin-share) • [Developer Setup](#-developer-setup) • [Build Installer](#-building-the-installer)

</div>

---

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| 🧠 **Offline Neural Face Recognition** | Powered by OpenCV's **YuNet** (deep neural face detection) and **SFace** (128-dimensional embedding model). Zero cloud calls, zero external API costs. |
| 📱 **Local Wi-Fi QR & PIN Sharing** | Share personalized photo albums with guests on the same Wi-Fi router via a dynamic **QR Code** or memorable **6-digit PIN** (e.g. `529-293`). No internet connection needed! |
| 🖥️ **Native Desktop Application** | Runs as a sleek, standalone desktop app using **Microsoft Edge WebView2** (`desktop.py`). Zero browser URL bar, minimal memory footprint. |
| 📦 **Windows `.exe` Setup Wizard** | Download and install via a standard Windows installer (`FaceSort-Setup-v1.0.0.exe`) with desktop shortcuts, Start Menu entry, and full uninstaller. |
| 🔍 **Smart Search & Filters** | Search across your entire photo library by person name, face similarity, upload dates, tags, and cluster groups. |
| 📁 **Automated Folder Organization** | One-click physical sorting into clean person-named folders (`/storage/organized/Name/`) with instant single or bulk ZIP export. |
| ❓ **Unknown Face Identification** | Unrecognized faces are grouped into an intuitive review queue so you can label or assign them in seconds. |
| 🌙 **Modern Glassmorphic Dark UI** | Tailored dark & light modes built with **Next.js 16**, **Tailwind CSS v4**, **Framer Motion**, and **Lucide React**. |

---

## 🚀 Windows Installer (Quick Start)

You don't need Python, Node.js, or Git installed to use FaceSort on Windows.

1. **Download the Installer**:
   Grab `FaceSort-Setup-v1.0.0.exe` from the [`installer_output/`](installer_output/) folder or GitHub Releases.
2. **Run Setup**:
   Double-click the installer and follow the wizard (install to `%LOCALAPPDATA%\Programs\FaceSort` or `Program Files`).
3. **Launch**:
   Double-click the **FaceSort** icon on your Desktop!

---

## 💻 1-Click Portable Desktop Launch (From Source)

If you have cloned the repository and want to run it directly as a native desktop application:

- **Option 1 (Silent)**: Double-click **`FaceSort.vbs`** (launches directly without a background console window).
- **Option 2 (Terminal)**: Double-click **`FaceSort.bat`** (launches with console logs).

Both methods start the unified FastAPI backend, serve the pre-built Next.js frontend, and open a native **1280×820** desktop window with Microsoft Edge WebView2.

---

## 📲 Local Wi-Fi QR & PIN Share

FaceSort includes an **AirDrop-style, local-first sharing system** that lets friends and family download their own photos directly to their smartphones:

```mermaid
flowchart LR
    A["Host PC (FaceSort)<br/>10.25.154.234:8000"] -->|Generates Session| B["Share Modal<br/>QR Code + 6-Digit PIN"]
    B -->|Camera Scan / PIN Entry| C["Guest Mobile Phone<br/>(Same Wi-Fi)"]
    C -->|Direct LAN Stream| D["Mobile Guest Album<br/>/share/view?token=..."]
    D -->|1-Tap Single Photo Save| C
    D -->|Download All ZIP| E["FaceSort_Person_Photos.zip"]
```

1. Open any person's album on the host computer.
2. Click **"Share Album (Local Wi-Fi)"**.
3. Have your friend **scan the QR code** with their phone camera, or go to `http://<your-ip>:8000/share` and type the **6-digit PIN**.
4. The guest phone opens a lightweight, mobile-optimized gallery where they can view photos, tap into a swipeable full-screen lightbox, save individual pictures, or tap **"Download All (.ZIP)"**.

---

## 🛠️ Tech Stack & Architecture

```
FaceSort Architecture
├── Frontend (Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion)
│   └── Pre-rendered Static Export (HTML/CSS/JS) in `frontend/out/`
├── Backend (FastAPI, Uvicorn, Python 3.11+)
│   ├── YuNet ONNX (Face Detection: 5 facial landmarks, scale invariant)
│   ├── SFace ONNX (Face Recognition: 128-d cosine feature matching)
│   ├── JSON Database Persistence (`backend/storage/db.json`)
│   └── LAN IP Discovery & P2P ZIP Streaming
└── Desktop Packaging
    ├── PyWebView (Microsoft Edge WebView2 Desktop Framework)
    ├── PyInstaller (Single executable bundle)
    └── Inno Setup 6 (Windows Setup Wizard generator)
```

---

## 🧑‍💻 Developer Setup

### 1. Clone the repository
```bash
git clone https://github.com/vishalkumar-09/FaceSort.git
cd FaceSort
```

### 2. Set up Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

> **Note**: ONNX models (`face_detection_yunet.onnx` and `face_recognition_sface.onnx`) download automatically on the first run into `backend/models/`.

Run the backend server:
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Set up Frontend
```powershell
cd ../frontend
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔨 Building the Installer (.exe)

FaceSort includes an automated master build pipeline that turns the entire project into a redistributable Windows setup wizard:

```powershell
# From the project root:
python build_installer.py
```

### What this script does automatically:
1. Runs `npm run build` in `frontend/` to generate the latest static web assets.
2. Runs `PyInstaller FaceSort.spec` to assemble the Python engine, AI models, and Edge WebView2 into `dist/FaceSort/`.
3. Runs **Inno Setup Compiler** (`ISCC.exe`) to create the ultra-compressed `FaceSort-Setup-v1.0.0.exe` in `installer_output/`.

---

## 📂 Project Structure

```
FaceSort/
├── FaceSort.bat              # 1-Click Windows Batch Launcher
├── FaceSort.vbs              # 1-Click Silent Windows Launcher (no console window)
├── FaceSort.spec             # PyInstaller compilation specification
├── FaceSort_Installer.iss    # Inno Setup 6 installer script
├── build_installer.py        # Automated master installer build script
├── desktop.py                # PyWebView Edge WebView2 desktop entry point
│
├── backend/
│   ├── main.py               # FastAPI server (serves API & static frontend)
│   ├── config.py             # App configuration (frozen bundle aware)
│   ├── database.py           # JSON database store & schema init
│   ├── face_utils.py         # YuNet & SFace face recognition pipeline
│   ├── check_deps.py         # Runtime dependency checker
│   ├── models/               # ONNX model storage
│   ├── routers/
│   │   ├── people.py         # Person registration, avatars & management
│   │   ├── photos.py         # Batch photo upload & face detection
│   │   ├── organize.py       # Organize photos into person folders & ZIP
│   │   ├── unknown.py        # Unrecognized face review & assignment
│   │   ├── share.py          # Local Wi-Fi P2P sharing & PIN tokens
│   │   └── demo.py           # Sample seed dataset for quick demo testing
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router (Static Export compatible)
│   │   │   ├── page.tsx      # Main Dashboard
│   │   │   ├── people/       # People gallery & person detail viewer
│   │   │   ├── photos/       # All photos grid & multi-select
│   │   │   ├── organize/     # Folder sorting & archive creator
│   │   │   ├── unknown/      # Unknown face clustering & assignment
│   │   │   └── share/        # Mobile guest album & PIN entry
│   │   ├── components/       # UI components (ShareModal, SearchModal, etc.)
│   │   └── lib/              # Dynamic API client & host resolution
│   ├── package.json
│   └── next.config.ts        # Static export & remote image patterns
│
└── installer_output/
    └── FaceSort-Setup-v1.0.0.exe   # Standalone Windows Installer
```

---

## 🔒 Privacy & Local-First Guarantee

- **0 Bytes to the Cloud**: All face detection, face vector extraction, clustering, and photo storage execute strictly on your local device.
- **AirDrop Security**: Local Wi-Fi share sessions stream directly peer-to-peer over your local area network (LAN) and expire automatically.
- **Biometric Safety**: Facial embeddings are stored in your own local `db.json` and are never transmitted over the internet.

---

## 👤 Author

**Vishal Kumar Gaud**  
- Email: [iamvishalkumar09@gmail.com](mailto:iamvishalkumar09@gmail.com)  
- GitHub: [@vishalkumar-09](https://github.com/vishalkumar-09)  
- Repository: [https://github.com/vishalkumar-09/FaceSort](https://github.com/vishalkumar-09/FaceSort)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
