@echo off
title Document Conversion Studio (Localhost)
echo ========================================================
echo   Starting Document Conversion Studio on Localhost...
echo   PDF to Excel (.xlsx) ^| PDF to Word (.docx) ^| Word to PDF ^| Excel to PDF
echo ========================================================
echo.

REM Kill any stale server process on port 5000 to ensure fresh code is always loaded
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

python server.py
pause
