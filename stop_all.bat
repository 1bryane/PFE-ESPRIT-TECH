@echo off
title ESPRIT Talents - Arret
powershell -NoExit -ExecutionPolicy Bypass -Command ^
  "$ports = 8000,8001,8002,5173;" ^
  "foreach ($p in $ports) {" ^
  "  $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue;" ^
  "  foreach ($conn in $c) {" ^
  "    Write-Host \"Arret du service sur le port $p (PID $($conn.OwningProcess))\" -ForegroundColor Yellow;" ^
  "    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue" ^
  "  }" ^
  "};" ^
  "Write-Host '';" ^
  "Write-Host 'Services ESPRIT (ML/ARIA/Backend/Frontend) arretes. Ollama non touche (service partage).' -ForegroundColor Green"
