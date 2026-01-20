# Test API Production ET64

$API_URL = "https://api.brsats.com"
$API_KEY = "bfs-api-key-secure-2025"

Write-Host "Testing API Production" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Diagnostic
Write-Host "1. Diagnostic aeroport FIH:" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/diagnostic/FIH" `
    -Headers @{
      "x-api-key" = $API_KEY
      "Content-Type" = "application/json"
    }
  
  Write-Host "OK - Vols today:" $response.diagnostic.stats.activeFlightsToday -ForegroundColor Green
  
  if ($response.diagnostic.todayFlights) {
    foreach ($flight in $response.diagnostic.todayFlights) {
      Write-Host "  - $($flight.flightNumber) : $($flight.departure)->$($flight.arrival)" -ForegroundColor Gray
    }
  }
} catch {
  Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Validate ET64
Write-Host "2. Validate ET64:" -ForegroundColor Yellow
try {
  $body = @{flightNumber="ET64"; airportCode="FIH"} | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/validate-boarding" `
    -Method POST `
    -Headers @{
      "x-api-key" = $API_KEY
      "Content-Type" = "application/json"
    } `
    -Body $body
  
  if ($response.isValid) {
    Write-Host "SUCCESS - Flight valid: $($response.flight.flightNumber)" -ForegroundColor Green
  } else {
    Write-Host "REJECTED: $($response.reason)" -ForegroundColor Red
  }
} catch {
  Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Validate ET064
Write-Host "3. Validate ET064 (with zero):" -ForegroundColor Yellow
try {
  $body = @{flightNumber="ET064"; airportCode="FIH"} | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/validate-boarding" `
    -Method POST `
    -Headers @{
      "x-api-key" = $API_KEY
      "Content-Type" = "application/json"
    } `
    -Body $body
  
  if ($response.isValid) {
    Write-Host "SUCCESS - Flight valid: $($response.flight.flightNumber)" -ForegroundColor Green
  } else {
    Write-Host "REJECTED: $($response.reason)" -ForegroundColor Red
  }
} catch {
  Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done" -ForegroundColor Cyan
