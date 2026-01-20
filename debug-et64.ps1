# Test rapide de l'API pour déboguer ET64

$API_URL = "https://api.brsats.com"
$API_KEY = "bfs-api-key-secure-2025"
$AIRPORT = "FIH"
$FLIGHT = "ET64"

Write-Host "🔍 Test API Production" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Diagnostic
Write-Host "1️⃣ Diagnostic aéroport FIH:" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/diagnostic/$AIRPORT" `
    -Headers @{
      "x-api-key" = $API_KEY
      "Content-Type" = "application/json"
    }
  
  Write-Host "✅ Réponse reçue" -ForegroundColor Green
  Write-Host "   Vols programmés aujourd'hui: $($response.diagnostic.stats.activeFlightsToday)" -ForegroundColor White
  
  if ($response.diagnostic.todayFlights) {
    foreach ($flight in $response.diagnostic.todayFlights) {
      if ($flight.flightNumber -like "*ET*" -or $flight.flightNumber -like "*64*") {
        Write-Host "   🎯 Vol trouvé: $($flight.flightNumber) - $($flight.departure)->$($flight.arrival) [$($flight.status)]" -ForegroundColor Green
      }
    }
  }
} catch {
  Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Validation ET64
Write-Host "2️⃣ Validation vol ET64:" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/validate-boarding" `
    -Method POST `
    -Headers @{
      "x-api-key" = $API_KEY
      "Content-Type" = "application/json"
    } `
    -Body (@{flightNumber="ET64";airportCode="FIH"} | ConvertTo-Json)
  
  if ($response.isValid) {
    Write-Host "✅ Vol validé: $($response.flight.flightNumber)" -ForegroundColor Green
  } else {
    Write-Host "❌ Vol rejeté: $($response.reason)" -ForegroundColor Red
  }
} catch {
  Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Validation ET064 (variante)
Write-Host "3️⃣ Validation vol ET064 (avec zéro):" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/validate-boarding" `
    -Method POST `
    -Headers @{
      "x-api-key" = $API_KEY
      "Content-Type" = "application/json"
    } `
    -Body (@{flightNumber="ET064";airportCode="FIH"} | ConvertTo-Json)
  
  if ($response.isValid) {
    Write-Host "✅ Vol validé: $($response.flight.flightNumber)" -ForegroundColor Green
  } else {
    Write-Host "❌ Vol rejeté: $($response.reason)" -ForegroundColor Red
  }
} catch {
  Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================" -ForegroundColor Cyan
