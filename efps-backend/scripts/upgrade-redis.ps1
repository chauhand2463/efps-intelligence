param([string]$SourceDir = "$env:TEMP\Redis5")
net stop Redis 2>$null
Start-Sleep -Seconds 3
taskkill /F /IM redis-server.exe 2>$null
Start-Sleep -Seconds 2
Copy-Item "$SourceDir\*" "C:\Program Files\Redis\" -Force
Start-Sleep -Seconds 1
& "C:\Program Files\Redis\redis-server.exe" --service-uninstall --service-name Redis 2>$null
Start-Sleep -Seconds 2
& "C:\Program Files\Redis\redis-server.exe" --service-install "C:\Program Files\Redis\redis.windows-service.conf" --service-name Redis
Start-Sleep -Seconds 2
net start Redis
Write-Output "Redis upgrade complete"
