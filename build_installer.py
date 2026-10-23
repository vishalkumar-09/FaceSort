"""
FaceSort Master Installer Build Script
Compiles the static frontend, PyInstaller binary distribution, and Inno Setup installer.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def find_inno_compiler() -> Path | None:
    """Find the Inno Setup compiler executable (ISCC.exe)."""
    # 1. Check PATH
    iscc_on_path = shutil.which("ISCC.exe") or shutil.which("iscc")
    if iscc_on_path:
        return Path(iscc_on_path)

    # 2. Check standard Windows locations
    candidates = [
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe")),
        Path(r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"),
        Path(r"C:\Program Files\Inno Setup 6\ISCC.exe"),
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Inno Setup 7\ISCC.exe")),
        Path(r"C:\Program Files (x86)\Inno Setup 7\ISCC.exe"),
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def run_command(cmd, cwd=None, description=""):
    print(f"\n==================================================")
    print(f"[*] {description}...")
    print(f"    Command: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    print(f"==================================================")
    result = subprocess.run(cmd, cwd=cwd or BASE_DIR, shell=True)
    if result.returncode != 0:
        print(f"[!] Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)


def main():
    print("=" * 60)
    print("      FaceSort Windows Standalone Installer Builder      ")
    print("=" * 60)

    # 1. Build Frontend Static Export if missing or requested
    frontend_out = BASE_DIR / "frontend" / "out"
    if not frontend_out.exists() or not (frontend_out / "index.html").exists():
        os.environ["NEXT_EXPORT"] = "true"
        run_command("npm run build", cwd=BASE_DIR / "frontend", description="Building Next.js Static Export")
    else:
        print("[*] Found existing static frontend export in frontend/out.")

    dist_exe = BASE_DIR / "dist" / "FaceSort" / "FaceSort.exe"
    
    # Run PyInstaller if binary is missing or forced
    if not dist_exe.exists() or "--rebuild" in sys.argv:
        run_command(
            f'"{sys.executable}" -m PyInstaller FaceSort.spec --noconfirm',
            cwd=BASE_DIR,
            description="Compiling Standalone Python App with PyInstaller"
        )
    else:
        print("[*] Found existing compiled binary at dist/FaceSort/FaceSort.exe (Use --rebuild to recompile).")

    if not dist_exe.exists():
        print(f"[!] Failed to find compiled binary at: {dist_exe}")
        sys.exit(1)
    print(f"[+] Successfully verified FaceSort binary: {dist_exe}")

    # 3. Compile Inno Setup Installer
    iscc = find_inno_compiler()
    if not iscc:
        print("\n[!] Inno Setup compiler (ISCC.exe) not found.")
        print("    You can still run the standalone folder at: dist/FaceSort/FaceSort.exe")
        print("    To build the installer, install Inno Setup 6 from https://jrsoftware.org/isdl.php")
        sys.exit(1)

    print(f"[*] Using Inno Setup Compiler: {iscc}")
    run_command(
        f'"{iscc}" FaceSort_Installer.iss',
        cwd=BASE_DIR,
        description="Compiling Windows Setup Wizard (.exe) with Inno Setup"
    )

    # 4. Success summary
    installer_dir = BASE_DIR / "installer_output"
    installers = list(installer_dir.glob("FaceSort-Setup*.exe")) if installer_dir.exists() else []

    print("\n" + "=" * 60)
    print("               BUILD SUCCESSFUL!                  ")
    print("=" * 60)
    if installers:
        for inst in installers:
            size_mb = inst.stat().st_size / (1024 * 1024)
            print(f"\n[+] Installer Created: {inst.resolve()}")
            print(f"    Size: {size_mb:.2f} MB")
            print(f"    Double-click this file to install FaceSort on any Windows PC!")
    else:
        print(f"[+] Distribution ready at: {dist_exe.parent.resolve()}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
