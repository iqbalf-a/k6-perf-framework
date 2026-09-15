@echo off
setlocal enabledelayedexpansion
:: ============================================================================
::  k6perf.cmd - Entry point BATCH MURNI (tidak butuh PowerShell)
::  Aman di mesin yang memblokir powershell.exe via group policy.
::
::  k6perf run [-Scenario <nama>] [-Mode <mode>] [-Vus N] [-Iterations N]
::             [-Debug] [-Dashboard] [-Csv] [-Prometheus]
::  k6perf list
::  k6perf dashboard [-Dev]
::  k6perf help
:: ============================================================================

set "ROOT=%~dp0"
set "K6=%ROOT%bin\k6.exe"
set "SCEN_DIR=%ROOT%workspace\scenarios"
set "SCRIPTS_DIR=%ROOT%workspace\scripts"
set "DASH_DIR=%ROOT%dashboard"
set "RESULTS=%ROOT%results"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=help"
shift

if /i "%CMD%"=="run"       goto :run
if /i "%CMD%"=="list"      goto :list
if /i "%CMD%"=="dashboard" goto :dashboard
if /i "%CMD%"=="help"      goto :help
echo [!] Command tidak dikenal: %CMD%
goto :help

:: ---------------------------------------------------------------------------
:run
set "MODE=testhit"
set "SCENARIO=scenario_template"
set "VUS=1"
set "ITER=1"
set "FDEBUG=0"
set "FDASH=0"
set "FCSV=0"
set "FPROM=0"

:run_parse
if "%~1"=="" goto :run_go
if /i "%~1"=="-scenario"   ( set "SCENARIO=%~2" & shift & shift & goto :run_parse )
if /i "%~1"=="-mode"       ( set "MODE=%~2"     & shift & shift & goto :run_parse )
if /i "%~1"=="-vus"        ( set "VUS=%~2"      & shift & shift & goto :run_parse )
if /i "%~1"=="-iterations" ( set "ITER=%~2"     & shift & shift & goto :run_parse )
if /i "%~1"=="-debug"      ( set "FDEBUG=1"     & shift & goto :run_parse )
if /i "%~1"=="-dashboard"  ( set "FDASH=1"      & shift & goto :run_parse )
if /i "%~1"=="-csv"        ( set "FCSV=1"       & shift & goto :run_parse )
if /i "%~1"=="-prometheus" ( set "FPROM=1"      & shift & goto :run_parse )
if /i "%~1"=="-prom"       ( set "FPROM=1"      & shift & goto :run_parse )
shift & goto :run_parse

:run_go
set "SCEN_PATH=%SCEN_DIR%\%SCENARIO%.js"
if not exist "%SCEN_PATH%" (
    echo [ERROR] Scenario tidak ditemukan: %SCEN_PATH%
    echo Scenario tersedia:
    for %%f in ("%SCEN_DIR%\*.js") do echo    - %%~nf
    exit /b 1
)
if not exist "%K6%" (
    echo [ERROR] k6 tidak ditemukan: %K6%
    echo Letakkan k6.exe di folder bin\.
    exit /b 1
)

:: Test ID (tanggal+jam disanitasi dari spasi/slash/titik dua/titik)
set "TS=%DATE%_%TIME%"
set "TS=%TS: =0%"
set "TS=%TS:/=-%"
set "TS=%TS::=%"
set "TS=%TS:.=%"
set "TS=%TS:,=%"
set "TESTID=%SCENARIO%_%MODE%_%TS%"

set "EXTRA="
if "%FDASH%"=="1"  set "EXTRA=%EXTRA% --out web-dashboard"
if not exist "%RESULTS%" mkdir "%RESULTS%"
if "%FCSV%"=="1"   set "EXTRA=%EXTRA% --out csv=%RESULTS%\%TESTID%.csv"
if "%FDEBUG%"=="1" set "EXTRA=%EXTRA% --http-debug=full"

:: Prometheus remote write (-Prometheus / -Prom). Config dibaca dari
:: framework\observability\prometheus.env (KEY=VALUE). Env yang sudah di-set
:: user tetap diprioritaskan (if not defined). Ganti host di file itu.
if "%FPROM%"=="1" if exist "%ROOT%framework\observability\prometheus.env" for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ROOT%framework\observability\prometheus.env") do if not defined %%a set "%%a=%%b"
if "%FPROM%"=="1" set "EXTRA=%EXTRA% --out experimental-prometheus-rw"

echo.
echo ========================================
echo  k6 Test Runner
echo ========================================
echo  Scenario  : %SCENARIO%
echo  Mode      : %MODE%
echo  VUs       : %VUS%
echo  Iterations: %ITER%
echo  Test ID   : %TESTID%
echo  Debug     : %FDEBUG%   CSV: %FCSV%   Dashboard: %FDASH%   Prometheus: %FPROM%
if "%FPROM%"=="1" echo  Prom RW   : %K6_PROMETHEUS_RW_SERVER_URL%
echo ========================================
echo.

"%K6%" run -e "MODE=%MODE%" -e "VUS=%VUS%" -e "ITERATIONS=%ITER%" --tag "testid=%TESTID%"%EXTRA% "%SCEN_PATH%"
exit /b %ERRORLEVEL%

:: ---------------------------------------------------------------------------
:list
echo.
echo === Scenario (workspace\scenarios) ===
for %%f in ("%SCEN_DIR%\*.js") do echo    - %%~nf
echo.
echo === Channel (workspace\scripts) ===
for /d %%d in ("%SCRIPTS_DIR%\*") do echo    - %%~nxd
echo.
exit /b 0

:: ---------------------------------------------------------------------------
:dashboard
set "USEDEV=0"
if not exist "%DASH_DIR%\dist" set "USEDEV=1"
if /i "%~1"=="-dev" set "USEDEV=1"

if not exist "%DASH_DIR%\node_modules" (
    echo [info] Dependency dashboard belum ada. Menjalankan npm install...
    pushd "%DASH_DIR%"
    call npm install
    popd
)

pushd "%DASH_DIR%"
if "%USEDEV%"=="1" (
    echo [info] Dashboard mode DEV ^(Vite HMR^) - setara 'npm run dev'.
    echo [info] Buka http://localhost:3000
    call node server.js --dev
) else (
    echo [info] Dashboard mode PRODUKSI ^(serve build dari dist/^).
    echo [info] Buka http://localhost:3000
    call node server.js
)
popd
exit /b %ERRORLEVEL%

:: ---------------------------------------------------------------------------
:help
echo.
echo k6perf - k6 performance testing framework (batch, tanpa PowerShell)
echo.
echo   k6perf run [-Scenario ^<nama^>] [-Mode ^<mode^>] [-Vus N] [-Iterations N]
echo              [-Debug] [-Dashboard] [-Csv] [-Prometheus]
echo   k6perf list                 Daftar scenario ^& channel
echo   k6perf dashboard [-Dev]     Web dashboard di http://localhost:3000
echo   k6perf help
echo.
echo   Mode   : testhit (default) ^| loadtest ^| stress ^| spike
echo   -Csv         simpan hasil CSV ke results\ (dipakai dashboard)
echo   -Prometheus  kirim metric via remote write ke Grafana/Prometheus
echo                (default host localhost:9090; override: set K6_PROMETHEUS_RW_SERVER_URL=...)
echo   Contoh : k6perf run -Scenario scenario_example -Mode loadtest -Csv
echo            k6perf run -Scenario scenario_example -Mode stress -Prometheus
echo.
exit /b 0
