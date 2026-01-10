@echo off
echo ============================================
echo GrowMore Backend Setup Script
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Upgrading pip...
python -m pip install --upgrade pip

echo [4/4] Installing dependencies...
pip install fastapi uvicorn[standard] pydantic[email] pydantic-settings python-multipart email-validator
pip install supabase postgrest
pip install firebase-admin
pip install groq
pip install httpx beautifulsoup4 lxml feedparser praw
pip install apscheduler
pip install python-jose[cryptography] passlib[bcrypt]
pip install pytest pytest-asyncio pytest-cov
pip install python-dotenv
pip install resend reportlab openpyxl user-agents slowapi

echo.
echo ============================================
echo Setup complete!
echo.
echo To start the server, run:
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload
echo ============================================
pause
