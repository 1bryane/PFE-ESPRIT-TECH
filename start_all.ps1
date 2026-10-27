param()

$Base   = "C:\Users\USER\Desktop\ESPRIT\PFE\Stage"
$LogDir = Join-Path $Base "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-Url {
    param([string]$Url, [int]$TimeoutSec = 3)
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return $r.StatusCode -lt 500
    } catch {
        if ($_.Exception.Response) { return $_.Exception.Response.StatusCode.value__ -lt 500 }
        return $false
    }
}

$colors = @{
    Ollama   = "DarkYellow"
    MLEngine = "Green"
    ARIA     = "Cyan"
    Backend  = "Magenta"
    Frontend = "White"
}

# Ordre de demarrage important : Ollama -> ML -> ARIA -> Backend -> Frontend
$services = [ordered]@{
    Ollama = @{
        Port = 11434; Health = "http://localhost:11434"
        SkipIfUp = $true
        Exe = "ollama"; Args = @("serve"); WorkDir = $Base
        HealthTimeout = 3
    }
    MLEngine = @{
        Port = 8000; Health = "http://localhost:8000/health"
        Exe = "$Base\SCRIPT_PYTHON_ML\env\Scripts\uvicorn.exe"
        Args = @("skills_engine:app","--host","0.0.0.0","--port","8000","--reload")
        WorkDir = "$Base\SCRIPT_PYTHON_ML"
        HealthTimeout = 5
    }
    ARIA = @{
        Port = 8001; Health = "http://localhost:8001/health"
        Exe = "$Base\esprit-aria\env\Scripts\uvicorn.exe"
        Args = @("agent_ia:app","--host","0.0.0.0","--port","8001","--reload")
        WorkDir = "$Base\esprit-aria"
        HealthTimeout = 5
    }
    Backend = @{
        Port = 8002; Health = "http://localhost:8002/health"
        Exe = "cmd.exe"
        Args = @("/c","venv\Scripts\python.exe bootstrap_db.py && venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8002 --reload")
        WorkDir = "$Base\esprit-talents\backend"
        HealthTimeout = 10
    }
    Frontend = @{
        Port = 5173; Health = "http://localhost:5173"
        Exe = "cmd.exe"
        Args = @("/c","npm run dev")
        WorkDir = "$Base\esprit-talents\frontend"
        HealthTimeout = 5
    }
}

$procs       = @{}
$logPos      = @{}
$status      = @{}
$startedByUs = @{}

function Start-ServiceByName {
    param([string]$Name)
    $svc = $services[$Name]

    if ($svc.SkipIfUp -and (Test-Url $svc.Health $svc.HealthTimeout)) {
        Write-Host "[$Name] deja actif sur le port $($svc.Port) - reutilise tel quel" -ForegroundColor $colors[$Name]
        $status[$Name] = "OK"
        $startedByUs[$Name] = $false
        return
    }

    $outLog = Join-Path $LogDir "$Name.out.log"
    $errLog = Join-Path $LogDir "$Name.err.log"
    if (Test-Path $outLog) { Remove-Item $outLog -Force -ErrorAction SilentlyContinue }
    if (Test-Path $errLog) { Remove-Item $errLog -Force -ErrorAction SilentlyContinue }

    try {
        $p = Start-Process -FilePath $svc.Exe -ArgumentList $svc.Args -WorkingDirectory $svc.WorkDir `
                -RedirectStandardOutput $outLog -RedirectStandardError $errLog `
                -WindowStyle Hidden -PassThru
        $procs[$Name]       = $p
        $logPos[$Name]      = @{ Out = 0; Err = 0 }
        $startedByUs[$Name] = $true
        $status[$Name]      = "DEMARRAGE"
        Write-Host "[$Name] demarre (PID $($p.Id))" -ForegroundColor $colors[$Name]
    } catch {
        Write-Host "[$Name] ECHEC du lancement : $_" -ForegroundColor Red
        $status[$Name] = "ECHEC"
    }
}

Write-Host "============================================================" -ForegroundColor Gray
Write-Host "  ESPRIT Talents - Lancement unifie (fenetre unique)" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Gray
Write-Host ""

foreach ($name in $services.Keys) {
    Start-ServiceByName $name
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Tous les services sont lances. Surveillance active (auto-redemarrage)." -ForegroundColor Gray
Write-Host "Logs de chaque service prefixes par [Nom]. Ctrl+C pour tout arreter." -ForegroundColor Gray
Write-Host ""

$lastHealthCheck = (Get-Date).AddSeconds(-100)
$browserOpened   = $false

try {
    while ($true) {

        # Tail des logs (stdout + stderr) de chaque service vers la console unique
        foreach ($name in $services.Keys) {
            if (-not $procs.ContainsKey($name)) { continue }
            foreach ($kind in @("Out","Err")) {
                $suffix  = if ($kind -eq "Out") { "out.log" } else { "err.log" }
                $logFile = Join-Path $LogDir "$name.$suffix"
                if (-not (Test-Path $logFile)) { continue }
                try {
                    $stream = [System.IO.File]::Open($logFile, 'Open', 'Read', 'ReadWrite')
                    $stream.Seek($logPos[$name][$kind], 'Begin') | Out-Null
                    $reader  = New-Object System.IO.StreamReader($stream)
                    $newText = $reader.ReadToEnd()
                    $logPos[$name][$kind] = $stream.Position
                    $reader.Close()
                    $stream.Close()
                    if ($newText) {
                        ($newText -split "`r?`n") | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                            Write-Host "[$name] $_" -ForegroundColor $colors[$name]
                        }
                    }
                } catch { }
            }
        }

        # Health-check + auto-redemarrage toutes les 8 secondes
        if (((Get-Date) - $lastHealthCheck).TotalSeconds -gt 8) {
            $lastHealthCheck = Get-Date
            foreach ($name in $services.Keys) {
                $svc = $services[$name]
                $up  = Test-Url $svc.Health $svc.HealthTimeout
                $procDead = $procs.ContainsKey($name) -and $procs[$name].HasExited

                if ($up) {
                    if ($status[$name] -ne "OK") {
                        Write-Host "[$name] OK - operationnel sur le port $($svc.Port)" -ForegroundColor Green
                    }
                    $status[$name] = "OK"
                }
                elseif ($procDead -and $startedByUs[$name]) {
                    Write-Host "[$name] ARRET INATTENDU - redemarrage automatique..." -ForegroundColor Red
                    Start-ServiceByName $name
                }
                elseif ($status[$name] -eq "OK") {
                    Write-Host "[$name] ne repond plus - verification en cours..." -ForegroundColor Yellow
                    $status[$name] = "INSTABLE"
                }
            }

            $statusValues = $services.Keys | ForEach-Object { $status[$_] }
            $allOk = ($statusValues -notcontains "DEMARRAGE") -and ($statusValues -notcontains "ECHEC")
            if ($allOk -and -not $browserOpened) {
                $browserOpened = $true
                Write-Host ""
                Write-Host "Tous les services sont operationnels - ouverture du navigateur." -ForegroundColor Gray
                Start-Process "http://localhost:5173"
            }
        }

        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "Arret de tous les services lances par ce script..." -ForegroundColor Yellow
    foreach ($name in $procs.Keys) {
        $p = $procs[$name]
        if ($startedByUs[$name] -and -not $p.HasExited) {
            try { Start-Process -FilePath "taskkill" -ArgumentList "/PID",$p.Id,"/T","/F" -WindowStyle Hidden -Wait } catch {}
        }
    }
    Write-Host "Termine." -ForegroundColor Yellow
}
