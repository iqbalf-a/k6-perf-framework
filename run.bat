@echo off
setlocal enabledelayedexpansion

:: ── Default parameter ─────────────────────────────────────────────────────────
set MODE=testhit
set SCENARIO=scenario_template
set VUS=1
set ITERATIONS=1
set FLAG_DEBUG=0
set FLAG_DASHBOARD=0
set FLAG_CSV=0

:: ── Parse argumen ─────────────────────────────────────────────────────────────
:parse
if "%~1"=="" goto done
if /i "%~1"=="-mode"       ( set MODE=%~2       & shift & shift & goto parse )
if /i "%~1"=="-scenario"   ( set SCENARIO=%~2   & shift & shift & goto parse )
if /i "%~1"=="-vus"        ( set VUS=%~2         & shift & shift & goto parse )
if /i "%~1"=="-iterations" ( set ITERATIONS=%~2  & shift & shift & goto parse )
if /i "%~1"=="-debug"      ( set FLAG_DEBUG=1    & shift & goto parse )
if /i "%~1"=="-dashboard"  ( set FLAG_DASHBOARD=1 & shift & goto parse )
if /i "%~1"=="-csv"        ( set FLAG_CSV=1      & shift & goto parse )
shift & goto parse
:done

:: ── Test ID ───────────────────────────────────────────────────────────────────
for /f "tokens=1-5 delims=/ " %%a in ("%date%") do (
    set DD=%%a& set MM=%%b& set YY=%%c
)
for /f "tokens=1-2 delims=:." %%a in ("%time: =0%") do (
    set HH=%%a& set MIN=%%b
)
set TESTID=%SCENARIO%_%MODE%_%DD%%MM%%YY%_%HH%%MIN%

:: ── Cek scenario file ─────────────────────────────────────────────────────────
set SCENARIO_PATH=src\scenario\%SCENARIO%.js
if not exist "%SCENARIO_PATH%" (
    echo [ERROR] Scenario file tidak ditemukan: %SCENARIO_PATH%
    echo Scenario yang tersedia:
    for %%f in (src\scenario\*.js) do echo   - %%~nf
    exit /b 1
)

:: ── Cek k6.exe ────────────────────────────────────────────────────────────────
set K6_EXE=%~dp0..\k6.exe
if not exist "%K6_EXE%" (
    echo [ERROR] k6.exe tidak ditemukan di: %K6_EXE%
    exit /b 1
)

:: ── Build argumen k6 ─────────────────────────────────────────────────────────
set K6_ARGS=run -e MODE=%MODE% -e VUS=%VUS% -e ITERATIONS=%ITERATIONS% --tag testid=%TESTID%

if %FLAG_DASHBOARD%==1 set K6_ARGS=%K6_ARGS% --out web-dashboard
if %FLAG_CSV%==1       set K6_ARGS=%K6_ARGS% --out csv=%TESTID%.csv
if %FLAG_DEBUG%==1     set K6_ARGS=%K6_ARGS% --http-debug=full

set K6_ARGS=%K6_ARGS% %SCENARIO_PATH%

:: ── Info ──────────────────────────────────────────────────────────────────────
echo.
echo.
echo ========================================
echo  k6 Test Runner
echo ========================================
echo  Scenario  : %SCENARIO%
echo  Mode      : %MODE%
echo  VUs       : %VUS%
echo  Iterations: %ITERATIONS%
echo  Test ID   : %TESTID%
echo  Debug     : %FLAG_DEBUG%
echo  Dashboard : %FLAG_DASHBOARD%
echo  CSV       : %FLAG_CSV%
echo ========================================
echo.
echo.

:: ── Jalankan k6 ──────────────────────────────────────────────────────────────
"%K6_EXE%" %K6_ARGS%
