$ErrorActionPreference = "SilentlyContinue"

function Test-Endpoint {
    param($Name, $Url)
    Write-Host -NoNewline "Checking $Name ($Url)... "
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Host "OK (200)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "FAIL ($($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "FAIL ($($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

Write-Host "`n=== Final System Verification ===`n" -ForegroundColor Cyan

$allPassed = $true

# Phase 1: API
$allPassed = (Test-Endpoint "API" "http://localhost:3000/health") -and $allPassed

# Phase 2: Web
$allPassed = (Test-Endpoint "Web" "http://localhost:5173") -and $allPassed

# Phase 3: Local Worker
$allPassed = (Test-Endpoint "Local Worker" "http://localhost:3001/health") -and $allPassed

# Phase 3: Docker Workers
$allPassed = (Test-Endpoint "Docker Worker 1" "http://localhost:3011/health") -and $allPassed
$allPassed = (Test-Endpoint "Docker Worker 2" "http://localhost:3012/health") -and $allPassed
$allPassed = (Test-Endpoint "Docker Worker 3" "http://localhost:3013/health") -and $allPassed

Write-Host "`n=== Verification Result ===`n" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ ALL SYSTEMS GO! Ready for Phase 4." -ForegroundColor Green
} else {
    Write-Host "⚠️ SOME CHECKS FAILED. Please investigate." -ForegroundColor Yellow
}
