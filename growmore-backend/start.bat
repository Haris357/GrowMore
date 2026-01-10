@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
echo Starting GrowMore Backend on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
