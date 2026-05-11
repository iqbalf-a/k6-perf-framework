# Cara Run

## Contoh Command

```powershell
# testhit default (1 VU, 1 iterasi)
.\run.ps1

# testhit custom
.\run.ps1 -vus 3 -iterations 5

# loadtest
.\run.ps1 -mode loadtest -scenario scenario_myproject

# stress
.\run.ps1 -mode stress -scenario scenario_myproject

# dengan k6 web dashboard (buka http://localhost:5665)
.\run.ps1 -mode loadtest -scenario scenario_myproject -dashboard

# export hasil ke CSV
.\run.ps1 -mode loadtest -scenario scenario_myproject -csv

# kombinasi dashboard + CSV
.\run.ps1 -mode loadtest -scenario scenario_myproject -dashboard -csv
```

CMD (`run.bat`) mendukung parameter yang sama:

```cmd
run.bat -mode loadtest -scenario scenario_myproject -csv
```

## Parameter

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| `-mode` | `testhit` | `testhit` / `loadtest` / `stress` / `spike` |
| `-scenario` | `scenario_template` | Nama file di `src/scenario/` (tanpa `.js`) |
| `-vus` | `1` | Jumlah VU (berlaku pada mode `testhit` dan `spike`) |
| `-iterations` | `1` | Jumlah iterasi (berlaku pada mode `testhit`) |
| `-debug` | off | Aktifkan `--http-debug=full` |
| `-dashboard` | off | Aktifkan k6 web dashboard di `localhost:5665` |
| `-csv` | off | Export hasil ke `results/<testid>.csv` |

## Mode

| Mode | Executor | Behavior |
|------|----------|----------|
| `testhit` | shared-iterations | Semua BP berurutan, VU dan iterasi sesuai parameter |
| `loadtest` | ramping-vus | Ramp-up bertahap per `loadConfig`, hold di puncak |
| `stress` | ramping-vus | Ramp lebih agresif, hold lebih lama dari loadtest |
| `spike` | constant-vus | Langsung N VU sekaligus, hold 1 menit |

## Prometheus Remote Write (Grafana)

Uncomment baris berikut di `run.ps1` untuk mengirim metric ke Prometheus:

```powershell
$env:K6_PROMETHEUS_RW_SERVER_URL  = "http://<prometheus-host>:9090/api/v1/write"
$env:K6_PROMETHEUS_RW_TREND_STATS = "p(90),p(95),p(99),min,max,avg"
```

Dan uncomment argumen `-o experimental-prometheus-rw` di array `$k6Args`.
