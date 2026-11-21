@echo off
echo ==============================================================================
echo                 NAVIC RESTORE - ASTRA 2026 LIVE DEMO
echo      Space-Based Disaster Management & NavIC Constellation Augmentation
echo ==============================================================================

echo [1/3] Checking Python virtual environment...
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\pip install -r backend\requirements.txt
)

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "NavIC-Restore FastAPI Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting React + Vite Frontend on http://localhost:5173 ...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
start "NavIC-Restore Frontend (Vite)" cmd /k "npm run dev"

echo ==============================================================================
echo Live Mission Control: http://localhost:5173
echo FastAPI API Docs:    http://127.0.0.1:8000/docs
echo ==============================================================================
pause
