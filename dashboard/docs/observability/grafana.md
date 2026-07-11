# Grafana Stack

Stack: **k6 → Prometheus (remote write) → Grafana** + **k6 → Loki** untuk error log.

## Setup

### 1. Prometheus

Jalankan dengan flag `--web.enable-remote-write-receiver`. Gunakan config dari `lib/observability/k6-perf-framework_prometheus.yml` (ada di root repo).

### 2. Loki

Jalankan dengan config dari `lib/observability/k6-perf-framework_loki.yml`. Update host di `lib/observability/loki.js`:

```js
http.post("http://<loki-host>:3100/loki/api/v1/push", ...)
```

### 3. Grafana

Import dashboard dari `lib/observability/k6-perf-framework_grafana.json`:

```
Menu → Dashboards → Import → Upload JSON file
```

### 4. Aktifkan Remote Write

Set env berikut sebelum menjalankan `k6perf`:

```bat
set K6_PROMETHEUS_RW_SERVER_URL=http://<prometheus-host>:9090/api/v1/write
set K6_PROMETHEUS_RW_TREND_STATS=p(90),p(95),p(99),min,max,avg
```

Dan tambahkan output `--out experimental-prometheus-rw` pada variabel `EXTRA` di `k6perf.cmd` (bagian `:run_go`):

```bat
set "EXTRA=%EXTRA% --out experimental-prometheus-rw"
```

Lalu jalankan seperti biasa:

```bat
k6perf run -Mode loadtest -Scenario scenario_myproject
```

## Panel Grafana

| Panel | Sumber metric | Keterangan |
|-------|---------------|------------|
| Performance Overview | `http_reqs`, `vus` | VU, RPS, error rate |
| TPS overall | `trx_count_total` | Total TPS semua transaksi |
| TPS (pass only) | `trx_count_pass_total` | TPS per transaksi — sukses saja |
| RPS | `http_reqs_total` | Request per second per API |
| Execution detail (Transaksi) | `trx_duration_pass`, `trx_count` | Min/Avg/p90/Max/Error |
| Execution detail (API) | `http_req_duration` | Min/Avg/p90/Max/Error |
| Error log | Loki | Log error API, filter per transaksi |

## Perbandingan Grafana vs k6 Dashboard

| | Grafana Stack | k6 Dashboard |
|-|--------------|--------------|
| Setup | Prometheus + Loki + Grafana | Node.js saja |
| Real-time | ✓ saat test berjalan | ✗ (post-run) |
| File besar | ✓ streaming | ✓ ~20–30 detik (1.8 GB) |
| Tanpa server | ✗ | ✓ |
| Error log | ✓ via Loki | ✗ |
