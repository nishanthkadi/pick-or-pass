# Stop Next.js dev server on port 3000 (Windows)
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "No process listening on port 3000."
  exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  Write-Host "Stopping PID $procId on port 3000..."
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1
$remaining = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($remaining) {
  Write-Host "Warning: port 3000 may still be in use."
  exit 1
}

Write-Host "Port 3000 is free."
