# Cara Run

Semua perintah dijalankan dari **CMD** (Command Prompt) di folder repo.

## Contoh Command

```bat
:: testhit default (1 VU, 1 iterasi)
k6perf run -Scenario scenario_example

:: testhit custom
k6perf run -Scenario scenario_example -Vus 3 -Iterations 5

:: loadtest
k6perf run -Mode loadtest -Scenario scenario_myproject

:: stress
k6perf run -Mode stress -Scenario scenario_myproject

:: dengan k6 web dashboard (buka http://localhost:5665)
k6perf run -Mode loadtest -Scenario scenario_myproject -Dashboard

:: export hasil ke CSV (untuk dianalisa di k6 Dashboard)
k6perf run -Mode loadtest -Scenario scenario_myproject -Csv

:: kombinasi dashboard + CSV
k6perf run -Mode loadtest -Scenario scenario_myproject -Dashboard -Csv
```

> Ketik `k6perf` (tanpa ekstensi) — CMD otomatis memakai `k6perf.cmd`. Nama parameter tidak case-sensitive (`-Scenario` = `-scenario`).

## Parameter

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| `-Mode` | `testhit` | `testhit` / `loadtest` / `stress` / `spike` |
| `-Scenario` | `scenario_template` | Nama file di `workspace\scenarios\` (tanpa `.js`) |
| `-Vus` | `1` | Jumlah VU (berlaku pada mode `testhit` dan `spike`) |
| `-Iterations` | `1` | Jumlah iterasi (berlaku pada mode `testhit`) |
| `-Debug` | off | Aktifkan `--http-debug=full` |
| `-Dashboard` | off | Aktifkan k6 web dashboard di `localhost:5665` |
| `-Csv` | off | Export hasil ke `results\<testid>.csv` |

## Mode

| Mode | Executor | Behavior |
|------|----------|----------|
| `testhit` | per-vu iterations | Semua BP berurutan, VU dan iterasi sesuai parameter |
| `loadtest` | ramping-vus | Ramp-up bertahap per `loadConfig`, hold di puncak |
| `stress` | ramping-vus | Ramp lebih agresif, hold lebih lama dari loadtest |
| `spike` | constant-vus | Langsung N VU sekaligus, hold 1 menit |

## Distribusi Beban VU (per BP)

Pada mode `loadtest` & `stress`, tiap BP mendapat sebagian VU. Ada 2 cara di file scenario:

**(A) Absolut** — set `users` = jumlah VU tetap per BP:

```js
const bpList = [
    { name: 'BP001', users: 60, fn: BP001 },
    { name: 'BP002', users: 40, fn: BP002 },
];
// total VU = 100 (dijumlah otomatis)
```

**(B) Persentase (gaya JMeter)** — set `percent`, dan **total VU ditentukan di scenario** (`loadConfig.totalVus`, bukan flag). `distributeVus()` membaginya ke tiap BP:

```js
import { distributeVus } from '../../framework/index.js';

const bpList = [
    { name: 'BP001', percent: 60, fn: BP001 },
    { name: 'BP002', percent: 40, fn: BP002 },
];

const loadConfig = {
    totalVus    : 100,   // ← total VU DI SINI (bukan flag -Vus)
    rampStep    : 10,
    rampInterval: 1,
    holdDuration: 10,
};
distributeVus(bpList, loadConfig.totalVus);  // panggil SEBELUM setBpList()
```

Jalankan biasa: `k6perf run -Mode loadtest -Scenario scenario_x` → BP001 = 60 VU, BP002 = 40 VU (total dari `loadConfig.totalVus`).

| Hal | Keterangan |
|-----|------------|
| Total VU | **Ditentukan di scenario** via `loadConfig.totalVus` (bukan flag `-Vus`). |
| Total persen | **Tidak wajib 100%.** Persen = rasio & dibagi proporsional — total VU **selalu = `totalVus`**. Kalau ≠ 100%, muncul warning. |
| Pembulatan | Metode *largest-remainder* — jumlah VU **persis** sama dengan `totalVus` (tidak ada VU hilang/berlebih). |
| Jumlah data CSV | Tiap BP butuh baris CSV ≥ jumlah VU-nya, jika tidak test di-abort dengan pesan jelas. |

Jadi kalau totalnya meleset (lupa hitung), tetap aman — semua dengan `totalVus: 100`:

| Input `percent` | Total | Hasil VU |
|-----------------|-------|----------|
| `60` + `40`   | 100% | 60 + 40 |
| `120` + `80`  | 200% | 60 + 40 |
| `60` + `41`   | 101% | 59 + 41 |
| `70` + `20`   | 90%  | 78 + 22 |

Setiap run mencetak ringkasan, mis. `[distributeVus] total 100 VU → BP001=60, BP002=40`.

**Persen desimal** (mis. `percent: 0.5`) didukung — diterapkan ke `totalVus` lalu dibulatkan ke VU utuh (k6 tidak bisa 0,5 VU). Jadi `0.5%` baru jadi 1 VU kalau total cukup besar: `0.5% × 1000 = 5 VU`, tapi `0.5% × 100 = 0.5` → membulat ke 1/0. Kalau membulat jadi 0, ada warning — naikkan `totalVus`.

## Prometheus Remote Write (Grafana)

Cukup tambahkan flag `-Prometheus` (alias `-Prom`) saat run — tidak perlu mengedit `k6perf.cmd`:

```bat
k6perf run -Scenario scenario_myproject -Mode loadtest -Prometheus
```

Config (host tujuan & trend stats) ada di **`framework/observability/prometheus.env`** — dibaca oleh CLI maupun dashboard. Default `http://localhost:9090/api/v1/write`; ganti host di file itu bila Prometheus bukan di localhost:

```
# framework/observability/prometheus.env
K6_PROMETHEUS_RW_SERVER_URL=http://<prometheus-host>:9090/api/v1/write
K6_PROMETHEUS_RW_TREND_STATS=p(90),p(95),p(99),min,max,avg
```

> Env yang di-`set` manual sebelum run tetap diprioritaskan di atas file ini.
> Prometheus harus dijalankan dengan `--web.enable-remote-write-receiver`. Config server contoh: `framework/observability/k6-perf-framework_prometheus.yml`.
