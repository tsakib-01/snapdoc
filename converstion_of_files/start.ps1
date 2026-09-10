# Document Conversion Studio Launcher for PowerShell
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Document Conversion Studio on Localhost..." -ForegroundColor Yellow
Write-Host "  PDF to Excel (.xlsx) | PDF to Word (.docx) | Word to PDF | Excel to PDF" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Clean up stale process on port 5000 if any
$connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections.OwningProcess | Select-Object -Unique
    foreach ($p in $pids) {
        if ($p -gt 0) {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
}

python server.py
