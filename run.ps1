# run.ps1
param(
    [string]$mode       = "testhit",
    [string]$scenario   = "scenario_1bp",
    [int]   $vus        = 1,
    [int]   $iterations = 1,
    [switch]$debug
)

# $env:K6_PROMETHEUS_RW_SERVER_URL                = "http://<prometheus-host>:9090/api/v1/write"
# $env:K6_PROMETHEUS_RW_TREND_STATS               = "p(90),p(95),p(99),min,max,avg"
# $env:K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM = "false"

$testid = "${scenario}_${mode}_$((Get-Date).ToString('dd/MM/yy_HHmm'))"

$scenarioPath = "src\scenario\$scenario.js"

if (-not (Test-Path $scenarioPath)) {
    Write-Error "[ERROR] Scenario file tidak ditemukan: $scenarioPath"
    Write-Host "Scenario yang tersedia:"
    Get-ChildItem "src\scenario\*.js" | ForEach-Object { Write-Host "  - $($_.BaseName)" }
    exit 1
}

$k6Args = @(
    "run",
    # "-o", "experimental-prometheus-rw",
    "-e", "MODE=$mode",
    "-e", "VUS=$vus",
    "-e", "ITERATIONS=$iterations",
    "--tag", "testid=$testid"
    # Override channel config via env (opsional):
    # "-e", "BASE_URL=https://10.x.x.x"
    # "-e", "BASE_URL_SUB=https://10.x.x.x:443"
)

if ($debug) {
    $k6Args += "--http-debug=full"
}

# ✅ Selalu run dari config.js
$k6Args += $scenarioPath

Write-Host "`n`n`n========================================"
Write-Host " k6 Test Runner"
Write-Host "========================================"
Write-Host " Scenario : $scenario"
Write-Host " Mode     : $mode"
Write-Host " VUs      : $vus"
Write-Host " Iterations: $iterations"
Write-Host " Test ID  : $testid"
Write-Host " Debug    : $($debug.IsPresent)"
Write-Host "========================================`n`n`n"


# [Console]::Out.Flush()
# Start-Sleep -Milliseconds 200

$k6Exe = Join-Path $PSScriptRoot "..\k6.exe"
if (-not (Test-Path $k6Exe)) {
    Write-Error "[ERROR] k6.exe tidak ditemukan di: $k6Exe"
    exit 1
}

& $k6Exe @k6Args