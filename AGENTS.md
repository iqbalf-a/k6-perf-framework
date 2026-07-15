# k6-perf-framework — Project Instructions

## Project Overview
Framework performance/load testing berbasis k6 (Grafana), terinspirasi LoadRunner/VuGen.
Dibuat oleh "ian", semua komentar/docs dalam Bahasa Indonesia.

## Tech Stack
- **Runtime**: k6 (portable binary di `bin/k6.exe`)
- **Backend**: Node.js + Express + DuckDB (CSV parsing)
- **Frontend**: React + Vite + Tailwind CSS + Chart.js
- **Entry Point**: `k6perf.cmd` (batch murni, tanpa PowerShell)

## Commands
```cmd
k6perf run -Scenario <nama> -Mode <mode> -Csv    # Jalankan test
k6perf dashboard -dev                             # Dashboard mode development
k6perf dashboard                                  # Dashboard mode production (perlu build dulu)
k6perf list                                       # List scenario & channel
```

## Build & Run
- **Dashboard dev**: `k6perf dashboard -dev` (Vite HMR, langsung dari source)
- **Dashboard prod**: `cd dashboard && npm run build` dulu, baru `k6perf dashboard`
- **Framework**: Zero npm dependency, semua custom (JSONPath, CSV parser)

## Code Conventions
- ES Modules (`import/export`) di seluruh project
- 4-space indent di framework, Tailwind CSS di dashboard
- Naming: `camelCase.js` modul, `PascalCase.js` script BP, `BPxxx_NamaBP` pola nama
- Error handling: `IterationAbortError`, `TransactionAbortError` (mirip `lr_abort` LoadRunner)

## Structure
- `framework/` — Core framework (jarang diubah)
- `workspace/scenarios/` — Definisi skenario
- `workspace/scripts/` — BP scripts per channel
- `dashboard/` — Web UI (React SPA + Express)
- `results/` — Output CSV hasil test

## Key API Endpoints
- `GET /api/scenarios` — List scenario files
- `GET /api/scenarios/detail` — List scenario + BP breakdown
- `GET /api/scripts` — List channel & BP
- `GET /api/results` — List CSV hasil test
- `GET /api/run` — Jalankan scenario via SSE
- `POST /api/run/stop` — Stop proses k6

## User Preferences
- Bahasa Indonesia untuk komunikasi
- Dashboard selalu pakai mode `-dev` (tidak perlu build)
- Admin access terbatas, tidak bisa install .exe atau buka PowerShell
