$API_URL = "https://api.brsats.com/api/v1/boarding/sync-hash"
$PASSENGER_ID = "c32faa89-355d-4eca-bcee-62a41b37807a"
$BOARDED_BY = "4b060b1c-cce1-4f3f-aacc-6ee97b6295ac"
$API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydHdrcGVndWJmanVjdHJlbnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDMyMjEwMDAsImV4cCI6MTg2MDk4ODgwMH0.zxQzWJM7H-mGiOcsVF8H0K1WKPzIl2Jq2cC9P2y_dAI"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST REEL: Boarding Sync Endpoint" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appel POST $API_URL" -ForegroundColor Yellow

$body = @{
    passenger_id = $PASSENGER_ID
    boarded_at = (Get-Date -AsUTC -Format "yyyy-MM-ddTHH:mm:ssZ")
    boarded_by = $BOARDED_BY
    airport_code = "FIH"
    pnr = "YCECFQ"
    full_name = "TEST USER"
    flight_number = "KQ0555"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = $API_KEY
}

try {
    $response = Invoke-WebRequest -Uri $API_URL `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction SilentlyContinue

    $httpCode = $response.StatusCode
    $responseBody = $response.Content | ConvertFrom-Json

    Write-Host ""
    Write-Host "HTTP Status: $httpCode" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($responseBody | ConvertTo-Json) -ForegroundColor Green

    if ($httpCode -eq 200) {
        Write-Host ""
        Write-Host "SUCCESS! Endpoint fonctionne correctement" -ForegroundColor Green
        exit 0
    }
} catch {
    $errorMessage = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message

    Write-Host ""
    Write-Host "HTTP Status: $errorMessage" -ForegroundColor Red
    Write-Host "Response:" -ForegroundColor Red
    Write-Host $errorBody -ForegroundColor Red

    if ($errorBody -match "uuid") {
        Write-Host ""
        Write-Host "Probleme UUID detecte" -ForegroundColor Yellow
    }
    if ($errorBody -match "column") {
        Write-Host "Probleme colonne detecte" -ForegroundColor Yellow
    }

    exit 1
}
