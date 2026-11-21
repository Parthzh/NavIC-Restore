#!/usr/bin/env bash
echo "=============================================================================="
echo "                NAVIC RESTORE - ASTRA 2026 LIVE DEMO"
echo "     Space-Based Disaster Management & NavIC Constellation Augmentation"
echo "=============================================================================="

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    .venv/bin/pip install -r backend/requirements.txt
fi

echo "Starting FastAPI Backend on http://127.0.0.1:8000 ..."
.venv/bin/uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting React Frontend on http://localhost:5173 ..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo "Demo running! Press Ctrl+C to stop."
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
