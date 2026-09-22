@echo off
chcp 65001 >nul
title Always - Auto Deploy System
color 0B
echo ========================================================
echo       Always Session - Github Auto Deploy Program
echo ========================================================
echo.
echo [1] Merging local code and updating version...
echo [2] Uploading code to Github...
echo.

node deploy.js

echo.
echo ========================================================
echo Deploy process completed. You can close this window.
pause
