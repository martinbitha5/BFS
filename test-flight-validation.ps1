# Script PowerShell pour tester la validation de vol en production
# À adapter avec tes vraies valeurs

$API_URL = "https://api.brsats.com"
$API_KEY = "bfs-api-key-secure-2025"
$AIRPORT = "FIH"  # À remplacer par ton aéroport
$FLIGHT_NUMBER = "ET64"  # À remplacer par le vol scanné

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 Test Validation Vol (Production)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $API_URL" -ForegroundColor Gray
Write-Host "  API Key: $API_KEY" -ForegroundColor Gray
Write-Host "  Aéroport: $AIRPORT" -ForegroundColor Gray
Write-Host "  Vol à tester: $FLIGHT_NUMBER" -ForegroundColor Gray
Write-Host ""

# Test 1: Diagnostic
Write-Host "1️⃣ Test diagnostic pour l'aéroport $AIRPORT..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/diagnostic/$AIRPORT" `
  -Headers @{
    "x-api-key" = $API_KEY
    "Content-Type" = "application/json"
  } -ErrorAction SilentlyContinue

if ($response) {
  Write-Host "✅ Réponse diagnostic:" -ForegroundColor Green
  Write-Host "   Aéroport: $($response.diagnostic.airport)" -ForegroundColor Gray
  Write-Host "   Date: $($response.diagnostic.today)" -ForegroundColor Gray
  Write-Host "   Vols programmés aujourd'hui: $($response.diagnostic.stats.activeFlightsToday)" -ForegroundColor Gray
  
  if ($response.diagnostic.todayFlights) {
    Write-Host "   Vols détails:" -ForegroundColor Gray
    foreach ($flight in $response.diagnostic.todayFlights) {
      Write-Host "     - $($flight.flightNumber) ($($flight.departure)->$($flight.arrival)) [$($flight.status)]" -ForegroundColor Gray
    }
  }
} else {
  Write-Host "❌ Erreur lors du diagnostic" -ForegroundColor Red
}

Write-Host ""

# Test 2: Valider le vol
Write-Host "2️⃣ Valider le vol $FLIGHT_NUMBER..." -ForegroundColor Yellow
$body = @{
  "flightNumber" = $FLIGHT_NUMBER
  "airportCode" = $AIRPORT
} | ConvertTo-Json

Write-Host "   Requête:" -ForegroundColor Gray
Write-Host "   $body" -ForegroundColor Gray
Write-Host ""

$response2 = Invoke-RestMethod -Uri "$API_URL/api/v1/flights/validate-boarding" `
  -Method POST `
  -Headers @{
    "x-api-key" = $API_KEY
    "Content-Type" = "application/json"
  } `
  -Body $body `
  -ErrorAction SilentlyContinue

if ($response2) {
  Write-Host "✅ Réponse validation:" -ForegroundColor Green
  Write-Host "   Validité: $($response2.isValid)" -ForegroundColor $($response2.isValid ? "Green" : "Red")
  if ($response2.isValid) {
    Write-Host "   Vol trouvé: $($response2.flight.flightNumber)" -ForegroundColor Green
    Write-Host "   Route: $($response2.flight.departure) -> $($response2.flight.arrival)" -ForegroundColor Gray
    Write-Host "   Statut: $($response2.flight.status)" -ForegroundColor Gray
  } else {
    Write-Host "   Raison: $($response2.reason)" -ForegroundColor Red
  }
} else {
  Write-Host "❌ Erreur lors de la validation" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Tests terminés" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
