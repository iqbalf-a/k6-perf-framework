# k6 Dashboard

Dashboard visualizer hasil k6 berbasis CSV. Tidak butuh Prometheus atau Grafana — cukup Node.js dan file CSV dari `results/`.

Parser menggunakan **DuckDB** (embedded). File 1.8 GB / 5 juta baris selesai diparse ~20–30 detik. UI sepenuhnya **offline** — tidak ada request ke CDN.

## Setup

```powershell
cd tools\k6-dashboard
npm install
node server.js
```

Server berjalan di `http://localhost:3000`. Bisa diakses dari jaringan lokal via IP mesin.

## Cara Pakai

**1. Generate file CSV:**

```powershell
.\run.ps1 -mode loadtest -scenario scenario_myproject -csv
```

File tersimpan di `results/<testid>.csv`.

**2. Buka `http://localhost:3000`.**

**3. Load data — dua cara:**

| Cara | Cocok untuk | Keterangan |
|------|-------------|------------|
| **Drop/Upload** | File kecil-sedang | File dicopy ke temp dir, lalu diparse |
| **Load via Path** | File besar | Masukkan path absolut — file tidak dicopy, langsung dibaca dari disk |

Path contoh: `D:\k6-portable\k6-perf-framework\results\testid.csv`

## Fitur

- **Time range filter** — slider histogram atau input manual `HH:MM:SS`. Semua panel ter-recompute di browser tanpa re-parse server.
- **Group filter** — jika script pakai `CHANNEL`, muncul dropdown filter per group/project.
- **Dark / Light theme** — toggle di top bar, preferensi disimpan di localStorage.
- **Fullscreen chart** — klik ⛶ pada panel untuk membuka fullscreen, lalu download PNG.
- **Export CSV** — tabel summary bisa diekspor ke CSV.

## Panel

### Performance Overview

| Panel | Keterangan |
|-------|------------|
| Stat cards | Total request, error rate, peak RPS/TPS, avg/p90/p95/p99 duration |
| Overview chart | VUs, HTTP duration, RPS, error rate over time |
| VU Progression | Jumlah VU aktif selama test |

### Overall TPS · RPS · Response Time

| Panel | Keterangan |
|-------|------------|
| TPS Overall | Total transaksi/detik (semua transaksi) |
| RPS Overall | Request sukses/detik (semua API) |
| TPS by Transaction | TPS breakdown per transaksi (max 12 series) |
| RPS by API | RPS breakdown per API (max 12 series) |
| TPS/RPS Summary table | Min/avg/max per transaksi dan API |
| Transaction Response Time | Avg response time per transaksi over time |
| API Response Time | Avg response time per API over time |

### HTTP Latency

| Panel | Keterangan |
|-------|------------|
| Latency Breakdown | Avg waiting/sending/receiving/blocked/TLS |
| HTTP Latency Stats | All/success/error latency over time |
| HTTP Request Rate | req/s total/success/error |
| HTTP Latency Timings | Multi-metric latency over time |
| Transfer Rate | bytes sent/received per detik |

### Checks

| Panel | Keterangan |
|-------|------------|
| Checks table | Pass/fail count dan success rate per check |
| Checks chart | Aggregate check success rate (%) over time |

### Run Result

| Panel | Keterangan |
|-------|------------|
| Execution by Transaction | Min/avg/max/p90, success/error/sample/rate |
| Execution by API | Min/avg/max/p90, success/error/sample/rate |
