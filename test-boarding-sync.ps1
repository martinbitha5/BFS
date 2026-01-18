$body = @{
    scan_checksum = "450_1705600123_42f7e8c9"
    boarding_id = "YCECFQ_RAZIOU_KQ0555"
    passenger_id = "4b060b1c-cce1-4f3f-aacc-6ee97b6295ac"
    boarded_at = "2026-01-18T21:52:00Z"
    boarded_by = "4b060b1c-cce1-4f3f-aacc-6ee97b6295ac"
    airport_code = "FIH"
    pnr = "YCECFQ"
    full_name = "RAZIOU MOUSTAPHA"
    flight_number = "KQ0555"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydHdrcGVndWJmanVjdHJlbnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDMyMjEwMDAsImV4cCI6MTg2MDk4ODgwMH0.zxQzWJM7H-mGiOcsVF8H0K1WKPzIl2Jq2cC9P2y_dAI"
}

Write-Host "Test du boarding sync..." -ForegroundColor Cyan

$response = Invoke-WebRequest -Uri "https://api.brsats.com/api/v1/boarding/sync-hash" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json" `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200) {
    Write-Host "Succes!" -ForegroundColor Green
    Write-Host $response.Content
} else {
    Write-Host "Erreur: $($response.StatusCode)" -ForegroundColor Red
    Write-Host $response.Content
}
