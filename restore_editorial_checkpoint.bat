@echo off
echo ==============================================================================
echo        RESTORING NAVIC-RESTORE EDITORIAL BASELINE CHECKPOINT (v1.0)
echo ==============================================================================
echo Restoring frontend/index.html and design rules from .backups\checkpoint_editorial_ui ...
copy /Y ".backups\checkpoint_editorial_ui\index.html" "frontend\index.html"
copy /Y ".backups\checkpoint_editorial_ui\DESIGN_SYSTEM_RULES.md" "DESIGN_SYSTEM_RULES.md"
copy /Y ".backups\checkpoint_editorial_ui\FRONTEND_OVERHAUL_CONTEXT.md" "FRONTEND_OVERHAUL_CONTEXT.md"
echo.
echo Checkpoint restored successfully!
echo Switch to your browser (http://localhost:5173) and press Refresh (Ctrl+R / F5).
echo ==============================================================================
pause
