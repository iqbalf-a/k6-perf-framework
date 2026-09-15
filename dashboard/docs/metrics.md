# Custom Metrics

## Metric yang Direkam

| Metric | Type | Keterangan |
|--------|------|------------|
| `api_duration` | Trend | Response time per API call |
| `trx_duration` | Trend | Response time per transaksi (semua) |
| `trx_duration_pass` | Trend | Response time transaksi sukses |
| `trx_duration_fail` | Trend | Response time transaksi gagal |
| `trx_count` | Counter | Jumlah transaksi dieksekusi |
| `trx_count_pass` | Counter | Jumlah transaksi sukses |
| `trx_count_fail` | Counter | Jumlah transaksi gagal |

Semua metric direkam otomatis oleh `transaction()` dan `api()` — tidak perlu kode tambahan di script BP.

## Tag

| Tag | Contoh | Keterangan |
|-----|--------|------------|
| `transaction` | `BP001_01_Login` | Nama transaksi |
| `group` | `::GrafanaPizza` | Channel (format k6 `::X`) |
| `api` | `001_01_01_/api/token` | Nama API (khusus `api_duration`) |

Format `::X` pada tag `group` mengikuti konvensi k6 — Grafana variable `Group` dengan regex `::(.*?)` bisa memfilter built-in metrics dan custom metrics sekaligus.

## Contoh di Grafana

TPS (transaksi per detik, sukses saja):

```promql
sum by (transaction) (
  rate(trx_count_pass_total{testid="$testid"}[$__rate_interval])
)
```

Avg response time per transaksi:

```promql
avg by (transaction) (
  rate(trx_duration_pass_sum{testid="$testid"}[$__rate_interval])
  /
  rate(trx_duration_pass_count{testid="$testid"}[$__rate_interval])
)
```
