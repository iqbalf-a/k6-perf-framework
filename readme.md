# k6-perf-framework

Framework k6 untuk load testing multi-BP (Business Process).

> Dibuat oleh **Moh. Iqbal Firman Ardiansyah**

---

## Setup

### Prerequisites

- **k6 binary** — download dari [grafana.com/docs/k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) atau [github.com/grafana/k6/releases](https://github.com/grafana/k6/releases), letakkan `k6.exe` satu level di atas folder repo:
  ```
  k6-portable/
  ├── k6.exe              ← di sini
  └── k6-perf-framework/  ← repo ini
  ```
- **Node.js** — hanya untuk IDE autocomplete (`@types/k6`), tidak dibutuhkan saat runtime k6.
- **PowerShell** — sudah tersedia di Windows.

### Instalasi

```powershell
# 1. Clone repo
git clone https://github.com/iqbalf-a/k6-perf-framework.git
cd k6-perf-framework

# 2. Install type definitions (untuk autocomplete di VS Code / IDE lain)
npm install

# 3. Verifikasi k6 binary
..\k6.exe version
```

### First Run

```powershell
# Salin template scenario dan buat script BP pertama (lihat bagian "Cara Tambah BP")
# Lalu jalankan:
.\run.ps1
```

---

## Cara Run

```powershell
# testhit default (1 VU, 1 iterasi, semua BP berurutan)
.\run.ps1

# testhit custom VU & iterasi
.\run.ps1 -vus 3 -iterations 5

# loadtest (ramp-up bertahap, hold di puncak)
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

Parameter `run.ps1`:

| Parameter     | Default             | Keterangan                                        |
|---------------|---------------------|---------------------------------------------------|
| `-mode`       | `testhit`           | testhit / loadtest / stress / spike               |
| `-scenario`   | `scenario_template` | nama file di `src/scenario/`                      |
| `-vus`        | `1`                 | jumlah VU (mode testhit/spike)                    |
| `-iterations` | `1`                 | jumlah iterasi (mode testhit)                     |
| `-debug`      | off                 | aktifkan http-debug=full                          |
| `-dashboard`  | off                 | aktifkan k6 web dashboard (localhost:5665)         |
| `-csv`        | off                 | export hasil ke CSV (`results/<testid>.csv`)      |

---

## Struktur Folder

```
k6-perf-framework/
│
├── run.ps1                        # Entry point (PowerShell)
├── run.bat                        # Entry point (CMD)
│
├── lib/                           # Framework — jangan ubah kecuali perlu
│   ├── core/
│   │   ├── config.js              # createOptions(), dispatchVu(), generateStages()
│   │   ├── session.js             # Per-VU key-value store
│   │   ├── vuContext.js           # Mapping VU → user index
│   │   └── metrics.js             # Custom metrics: api_duration, trx_duration
│   │
│   ├── http/
│   │   ├── api.js                 # Request wrapper (extract, debug, metrics, fail callback)
│   │   ├── batch.js               # Batch request wrapper
│   │   ├── headers.js             # Auto-header per-VU (addAutoHeader/deleteAutoHeader/clearAutoHeaders)
│   │   ├── extract.js             # Ekstrak nilai dari response (json/header/regex)
│   │   └── transaction.js         # Grouping + TPS metrics (pass/fail) + IterationAbortError
│   │
│   ├── auth/
│   │   └── basicAuth.js           # basicAuth(username, password) → string b64
│   │
│   ├── data/
│   │   ├── csvLoader.js           # Load CSV → SharedArray (cached)
│   │   └── userProvider.js        # getData() — ambil data sesuai VU
│   │
│   ├── utils/
│   │   └── dateHelper.js          # today(), daysAgo(), year, dll
│   │
│   └── observability/
│       ├── loki.js                        # Push log ke Loki
│       ├── k6-perf-framework_grafana.json # Grafana dashboard (import manual)
│       ├── k6-perf-framework_loki.yml     # Konfigurasi Loki
│       └── k6-perf-framework_prometheus.yml # Konfigurasi Prometheus
│
└── src/                           # ★ Edit di sini
    ├── scenario/                  # Scenario files — titik masuk per project
    │   ├── scenario_template.js   # Template untuk scenario baru
    │   └── scenario_example.js    # Contoh lengkap (QuickPizza API publik)
    │
    └── script/                    # BP scripts per project/channel
        ├── _template/             # Template untuk project & BP baru
        │   ├── channel.config.js
        │   ├── TransactionGeneral/
        │   └── BPxxx_NamaBP/
        │       ├── BPxxx_NamaBP.js
        │       └── BPxxx_data.csv
        └── _exampleChannel/       # Contoh siap pakai (QuickPizza)
            ├── channel.config.js  # BASE_URL, CHANNEL = 'GrafanaPizza'
            └── PizzaOrder/
                ├── PizzaOrder.js
                └── PizzaOrder_data.csv
```

---

## Cara Tambah BP Baru

**1. Salin template ke folder project:**
```
src/script/NamaProject/BPxxx_NamaBP/
├── BPxxx_NamaBP.js    ← salin dari src/script/_template/BPxxx_NamaBP/
└── BPxxx_data.csv
```

**2. Daftarkan di scenario file (`src/scenario/scenario_myproject.js`):**
```js
import { BPxxx_NamaBP } from '../script/NamaProject/BPxxx_NamaBP/BPxxx_NamaBP.js';

const bpList = [
    // ... BP lain
    { name: 'BPxxx', users: N, fn: BPxxx_NamaBP, thinkTime: 1 },
];
```

Selesai — tidak perlu ubah file lain.

---

## Cara Tambah Project Baru

**1. Buat folder channel di `src/script/`:**
```
src/script/NamaProject/
└── channel.config.js   ← salin dari src/script/_template/channel.config.js
```

**2. Set `CHANNEL` di `channel.config.js`:**
```js
export const BASE_URL = 'https://your-server.com';
export const CHANNEL  = 'NamaProject';   // ← label group di Grafana
```

**3. (Opsional) Set `session.channel` di awal fungsi BP:**
```js
import { CHANNEL } from '../channel.config.js';

export function BPxxx_NamaBP() {
    const session = getSession();
    session.channel = CHANNEL;   // jika tidak di-set, default: 'default'
    // ...
}
```

**4. Buat scenario file di `src/scenario/`** (salin dari `scenario_template.js`), lalu jalankan:
```powershell
.\run.ps1 -mode loadtest -scenario scenario_myproject
```

---

## Auth — Pilih Sesuai Kebutuhan

| Metode | Helper | Contoh penggunaan |
|--------|--------|-------------------|
| Basic Auth | `lib/auth/basicAuth.js` | `addAutoHeader('Authorization', \`Basic ${basicAuth(user, pass)}\`)` |
| Form / JSON body | — | Kirim via `body` parameter di `api()` |
| Bearer / Token | `addAutoHeader` | `addAutoHeader('Authorization', \`Bearer ${session.token}\`)` |
| API Key | `addAutoHeader` | `addAutoHeader('X-Api-Key', key)` |

`addAutoHeader(key, value)` menyuntikkan header ke semua request setelah baris tersebut dipanggil. Gunakan `deleteAutoHeader(key)` untuk menghapus satu header, atau `clearAutoHeaders()` untuk menghapus semua header yang ditambahkan dan kembali ke header default.

`clearAutoHeaders()` dipanggil di blok `finally` setiap fungsi BP — memastikan iterasi berikutnya selalu mulai dari kondisi header yang bersih, baik saat flow sukses maupun saat ada transaksi gagal.

---

## VU Distribution (loadtest/stress)

```
bpList = [{ BP001, users: 5 }, { BP002, users: 3 }]

VU 1–5  → BP001  (idx 0–4 → user1–user5)
VU 6–8  → BP002  (idx 0–2 → user1–user3)
```

Ramp-up pola step: spawn `rampStep` VU serentak → hold `rampInterval` menit → ulangi hingga total → hold `holdDuration` menit.

---

## Mode

| Mode       | Executor    | Behavior                                       |
|------------|-------------|------------------------------------------------|
| `testhit`  | —           | Semua BP berurutan, 1 VU, N iterasi            |
| `loadtest` | ramping-vus | Ramp step per `loadConfig`, hold di puncak     |
| `stress`   | ramping-vus | Ramp lebih agresif, hold lebih lama            |
| `spike`    | —           | Langsung N VU sekaligus, hold 1 menit          |

---

## Behavior Transaksi Gagal

Bila ada API yang merespons non-200, framework secara otomatis:

1. **Stop** — API-API berikutnya dalam transaksi yang sama tidak dieksekusi.
2. **Catat fail** — `trx_count_fail`, `trx_duration_fail` direkam dengan tag transaksi tersebut.
3. **Exit iterasi** — `IterationAbortError` dilempar; iterasi VU langsung selesai, lanjut ke iterasi berikutnya.
4. **Reset header** — blok `finally` memanggil `clearAutoHeaders()`, sehingga iterasi berikutnya mulai dari header default tanpa sisa token/session dari iterasi sebelumnya.

Pola ini setara dengan `lr_exit(LR_EXIT_ITERATION_AND_CONTINUE, ...)` di LoadRunner.

```js
try {
    tx = 'BP001_01_Login';
    transaction(tx, () => { api({ ... }); });
    sleep(1);

    // transaksi berikutnya hanya dieksekusi jika Login sukses
    tx = 'BP001_02_GetData';
    transaction(tx, () => { api({ ... }); });
} catch (e) {
    if (!(e instanceof IterationAbortError)) throw e;
} finally {
    clearAutoHeaders();   // selalu dijalankan — bersihkan header
}
```

---

## Metrics

Framework menggunakan custom metrics untuk mengukur performa di level **API** dan **Transaksi** secara terpisah.

### Custom Metrics

| Metric              | Type    | Keterangan                                      |
|---------------------|---------|-------------------------------------------------|
| `api_duration`      | Trend   | Response time per API call                      |
| `trx_duration`      | Trend   | Response time per transaksi (semua)             |
| `trx_duration_pass` | Trend   | Response time transaksi yang sukses             |
| `trx_duration_fail` | Trend   | Response time transaksi yang gagal              |
| `trx_count`         | Counter | Jumlah transaksi dieksekusi                     |
| `trx_count_pass`    | Counter | Jumlah transaksi sukses                         |
| `trx_count_fail`    | Counter | Jumlah transaksi gagal                          |

### Tag

Semua custom metric dikirim dengan tag berikut agar bisa di-filter di Grafana:

| Tag           | Contoh nilai         | Keterangan                                     |
|---------------|----------------------|------------------------------------------------|
| `transaction` | `BP001_01_Login`     | Nama transaksi dari script                     |
| `group`       | `::GrafanaPizza`     | Channel (mirror format group k6 `::X`)         |
| `api`         | `001_01_01_/api/...` | Nama API (khusus `api_duration`)               |

Format `::X` pada tag `group` sengaja mengikuti konvensi k6 agar Grafana variable `Group` dengan regex `::(.*?)` bisa memfilter built-in metrics dan custom metrics sekaligus.

### Contoh penggunaan

```js
import { CHANNEL } from '../channel.config.js';   // CHANNEL = 'GrafanaPizza'
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';

export function PizzaOrder() {
    const session = getSession();
    session.channel = CHANNEL;   // tag group: ::GrafanaPizza

    const tx = 'BP001_01_Login';
    transaction(tx, () => {
        api({
            name       : '001_01_01_/api/users/token/login',
            url        : `${BASE_URL}/api/users/token/login`,
            method     : 'POST',
            transaction: tx,
        });
    });
}
```

Transaksi dianggap **gagal** jika ada API di dalamnya yang merespons dengan status non-200. TPS di Grafana dihitung dari `trx_count_pass` saja.

---

## Observability

Stack: **k6 → Prometheus (remote write) → Grafana** + **k6 → Loki** untuk error log.

### Setup

1. **Prometheus** — jalankan dengan flag `--web.enable-remote-write-receiver`, gunakan config dari `lib/observability/k6-perf-framework_prometheus.yml`.

2. **Loki** — jalankan dengan config dari `lib/observability/k6-perf-framework_loki.yml`. Update host di `lib/observability/loki.js`:
   ```js
   http.post("http://<loki-host>:3100/loki/api/v1/push", ...)
   ```

3. **Grafana** — import dashboard dari `lib/observability/k6-perf-framework_grafana.json` (Menu → Dashboards → Import).

4. **Aktifkan remote write di `run.ps1`** — uncomment baris berikut:
   ```powershell
   # Di run.ps1, uncomment:
   $env:K6_PROMETHEUS_RW_SERVER_URL  = "http://<prometheus-host>:9090/api/v1/write"
   $env:K6_PROMETHEUS_RW_TREND_STATS = "p(90),p(95),p(99),min,max,avg"
   # Dan:
   "-o", "experimental-prometheus-rw",
   ```
   Lalu jalankan seperti biasa:
   ```powershell
   .\run.ps1 -mode loadtest -scenario scenario_myproject
   ```

### Dashboard Grafana

| Panel                          | Sumber metric          | Keterangan                                    |
|--------------------------------|------------------------|-----------------------------------------------|
| Performance Overview           | `http_reqs`, `vus`     | VU, RPS, error rate overview                  |
| TPS over all                   | `trx_count_total`      | Total TPS semua transaksi                     |
| TPS (pass only)                | `trx_count_pass_total` | TPS per transaksi — hanya sukses              |
| RPS                            | `http_reqs_total`      | Request per second level API                  |
| Execution detail (Transaction) | `trx_duration_pass`, `trx_count` | Min/Avg/p90/Max/Error per transaksi |
| Execution detail (Api)         | `http_req_duration`    | Min/Avg/p90/Max/Error per API                 |
| Error log                      | Loki                   | Log error API (json, filter per transaksi)    |
