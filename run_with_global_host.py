"""
VS Code One-Click Runner: Unified Early Warning Server + Global Host Tunnel
Launches the FastAPI + React application and exposes it to the worldwide web via Cloudflare Tunnel.
"""

import sys
import os
import time
import re
import subprocess
import threading
import urllib.request

CLOUDFLARED_PATH = r"C:\Program Files (x86)\cloudflared\cloudflared.exe"
LOCAL_URL = "http://127.0.0.1:8000"


def is_server_running():
    try:
        with urllib.request.urlopen(f"{LOCAL_URL}/api/health", timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def start_server_in_background():
    import uvicorn
    print("Starting Unified Early Warning System backend on port 8000...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, log_level="info")


def main():
    print("=" * 70)
    print("🏔️  GEOSENTINEL AI & LANDSLIDE SENTINEL - GLOBAL HOST LAUNCHER")
    print("=" * 70)

    # 1. Ensure server is running or start it
    if is_server_running():
        print(f"[OK] Local server is already running on {LOCAL_URL}")
    else:
        print(f"[INFO] Launching local server on {LOCAL_URL}...")
        server_thread = threading.Thread(target=start_server_in_background, daemon=True)
        server_thread.start()

        # Wait for server to become ready
        attempts = 0
        while not is_server_running() and attempts < 20:
            time.sleep(0.5)
            attempts += 1

        if is_server_running():
            print(f"[OK] Local server is healthy on {LOCAL_URL}")
        else:
            print("[WARN] Server initialization in progress...")

    # 2. Check Cloudflared binary
    if not os.path.exists(CLOUDFLARED_PATH):
        print(f"[ERROR] Could not find cloudflared at: {CLOUDFLARED_PATH}")
        sys.exit(1)

    # 3. Spawn Cloudflare tunnel
    print("[INFO] Initializing secure global HTTPS tunnel via Cloudflare...")
    cmd = [CLOUDFLARED_PATH, "tunnel", "--url", LOCAL_URL]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    try:
        for line in process.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()

            match = url_pattern.search(line)
            if match and not tunnel_url:
                tunnel_url = match.group(0)
                print("\n" + "=" * 75)
                print("🌐  YOUR SYSTEM IS NOW LIVE GLOBALLY ON THE INTERNET!")
                print("=" * 75)
                print(f" • Public URL:    {tunnel_url}")
                print(f" • API Swagger:   {tunnel_url}/docs")
                print(f" • Local Access:  {LOCAL_URL}")
                print("=" * 75)
                print("Share the public URL with judges, team members, and citizens worldwide.\n")

    except KeyboardInterrupt:
        print("\nStopping global tunnel and server...")
        process.terminate()
        process.wait()
        print("Shutdown complete.")


if __name__ == "__main__":
    main()
