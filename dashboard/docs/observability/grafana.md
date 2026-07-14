# Grafana Stack

Stack: **k6 → Prometheus (remote write) → Grafana** + **k6 → Loki** untuk error log.

## Setup

### 1. Prometheus

Jalankan dengan flag `--web.enable-remote-write-receiver`. Gunakan config dari `framework/observability/k6-perf-framework_prometheus.yml`.

### 2. Loki

Jalankan dengan config dari `framework/observability/k6-perf-framework_loki.yml`. Update host di `framework/observability/loki.js`:

```js
http.post("http://<loki-host>:3100/loki/api/v1/push", ...)
```

### 3. Grafana

Import dashboard dari `framework/observability/k6-perf-framework_grafana.json`:

```
Menu → Dashboards → Import → Upload JSON file
```

### 4. Aktifkan Remote Write

Cukup pakai flag `-Prometheus` (alias `-Prom`) — tidak perlu mengedit `k6perf.cmd`:

```bat
k6perf run -Mode loadtest -Scenario scenario_myproject -Prometheus
```

Host tujuan & trend stats diatur di **`framework/observability/prometheus.env`** (satu sumber untuk CLI & dashboard). Default `http://localhost:9090/api/v1/write` — ubah host di file itu bila Prometheus bukan di localhost:

```
# framework/observability/prometheus.env
K6_PROMETHEUS_RW_SERVER_URL=http://<prometheus-host>:9090/api/v1/write
K6_PROMETHEUS_RW_TREND_STATS=p(90),p(95),p(99),min,max,avg
```

Env yang di-`set` manual sebelum run tetap menang di atas file ini.

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
