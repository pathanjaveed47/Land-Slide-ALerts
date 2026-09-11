@echo off
title GeoSentinel AI - Global Host Launcher
echo ======================================================================
echo 🌐 Launching Global Host Tunnel for GeoSentinel & LandSlide Sentinel
echo ======================================================================
echo.
echo Forwarding local port 8000 to a global public HTTPS Cloudflare Tunnel...
echo Anyone worldwide will be able to access the Early Warning Dashboard.
echo.

"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000
pause
