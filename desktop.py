"""
FaceSort Desktop Application Launcher
Runs FastAPI backend + Static Frontend + Native Edge WebView2 desktop window.
Zero browser address bar, 100% offline, native Windows desktop experience.
"""

import os
import sys
import time
import socket
import threading
import urllib.request
from pathlib import Path

# Resolve root workspace and backend directories
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import uvicorn
import webview
from main import app


def is_port_in_use(port: int) -> bool:
    """Check if the given port is already bound."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def wait_for_server(port: int, timeout: float = 20.0) -> bool:
    """Poll the backend health endpoint until it responds or times out."""
    health_url = f"http://127.0.0.1:{port}/api/health"
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(health_url, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.25)
    return False


def start_backend_server(port: int):
    """Run uvicorn in a daemon thread."""
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.run()


def main():
    port = 8000

    # Start backend server in a background thread if not already running
    if not is_port_in_use(port):
        print(f"[FaceSort] Starting backend engine on port {port}...")
        server_thread = threading.Thread(
            target=start_backend_server,
            args=(port,),
            daemon=True,
        )
        server_thread.start()

        # Wait until the backend is fully initialized
        if not wait_for_server(port, timeout=20.0):
            print("[FaceSort] Error: Backend server failed to start in time.")
            sys.exit(1)
        print("[FaceSort] Backend engine is ready!")
    else:
        print(f"[FaceSort] Server already active on port {port}. Attaching desktop window...")

    # Configure and open native Windows desktop window using Edge WebView2
    window = webview.create_window(
        title="FaceSort — AI Face Photo Organizer",
        url=f"http://127.0.0.1:{port}/",
        width=1280,
        height=820,
        min_size=(960, 640),
        background_color="#0c0e18",
        text_select=True,
    )

    print("[FaceSort] Launching native desktop window...")
    # webview.start() blocks until the user closes the window
    webview.start(gui="edgechromium", debug=False)
    print("[FaceSort] Desktop window closed. Exiting.")


if __name__ == "__main__":
    main()
