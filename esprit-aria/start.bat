@echo off
echo ============================================================
echo   ESPRIT ARIA - Demarrage de l'agent IA
echo ============================================================

REM Activer le venv
call env\Scripts\activate.bat

REM Lancer l'API FastAPI
echo [ARIA] Demarrage API sur http://localhost:8001 ...
uvicorn agent_ia:app --host 0.0.0.0 --port 8001 --reload

pause
