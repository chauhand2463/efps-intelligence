param(
  [switch]$Prod,
  [switch]$Rebuild
)

$root = "E:\efps\efps-backend"
$port = 3000
$pidFile = "$root\.server.pid"

# Kill existing server by tracked PID (fastest)
if (Test-Path $pidFile) {
  $oldPid = Get-Content $pidFile
  if ($oldPid -match '^\d+$') { taskkill /F /PID $oldPid 2>$null }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
# Also kill anything still on port (belt-and-suspenders)
netstat -ano | Select-String ":$port\s" | ForEach-Object {
  $p = [regex]::Match($_, '(\d+)$').Groups[1].Value
  if ($p) { taskkill /F /PID $p 2>$null }
}

if ($Rebuild) { &"$root\node_modules\.bin\tsc.cmd" --project "$root" }

if ($Prod) {
  $exe = "node"; $arguments = "dist/src/server.js"
} else {
  $exe = "$root\node_modules\.bin\tsx.cmd"; $arguments = "src/server.ts"
}

$proc = Start-Process -PassThru -WindowStyle Hidden -FilePath $exe -ArgumentList $arguments -WorkingDirectory $root
$proc.Id | Out-File -FilePath $pidFile -Encoding ASCII

# Poll every 300ms for ready
$start = Get-Date
for ($i = 0; $i -lt 30; $i++) {
  try {
    Invoke-RestMethod -Uri "http://localhost:$port/health" -Method Get -ErrorAction Stop | Out-Null
    $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
    Write-Output "Server ready in ${elapsed}s at http://localhost:$port"
    if (!$Prod) { Write-Output "Hot-reload active: edit src/ files and see instant updates" }
    return
  } catch { Start-Sleep -Milliseconds 300 }
}
Write-Error "Server failed to start within 9s"
