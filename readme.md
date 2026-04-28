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
│   │   ├── runScript.js           # Entry point BP — setara "Action" di LoadRunner VuGen
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
├── results/                       # Output CSV test (dibuat otomatis saat -csv)
│
└── src/                           # ★ Edit di sini
    ├── scenario/                  # Scenario files — titik masuk per project
    │   ├── scenario_template.js   # Template untuk scenario baru
    │   └── scenario_example.js    # Contoh lengkap (QuickPizza API publik)
    │
    └── script/                    # BP scripts per project/channel
        ├── _template/             # Template untuk project & BP baru
        │   ├── parameter.config.js
        │   ├── TransactionGeneral/
        │   │   ├── index.js       # Bundle export — import semua trx dari 1 baris
        │   │   ├── Login.js
        │   │   └── Logout.js
        │   └── BPxxx_NamaBP/
        │       ├── BPxxx_NamaBP.js
        │       └── BPxxx_data.csv
        └── _exampleChannel/       # Contoh siap pakai (QuickPizza)
            ├── parameter.config.js  # parameter.BASE_URL, parameter.CHANNEL = 'GrafanaPizza'
            └── PizzaOrder/
                ├── PizzaOrder.js
                └── PizzaOrder_data.csv
```

> **Penting:** folder `lib/` adalah inti framework — **jangan diubah**. Semua kustomisasi dilakukan di `src/`.

---

## Cara Tambah BP Baru

**1. Salin template ke folder project:**
```
src/script/NamaProject/BPxxx_NamaBP/
├── BPxxx_NamaBP.js    ← salin dari src/script/_template/BPxxx_NamaBP/
└── BPxxx_data.csv
```

**2. Isi `BPxxx_NamaBP.js` dengan flow bisnis:**
```js
import { sleep } from 'k6';
import { runScript } from '../../../../lib/core/runScript.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { parameter } from '../parameter.config.js';
// import { Login, Logout } from '../TransactionGeneral/index.js';

const dataset = loadCSV(import.meta.resolve('./BPxxx_data.csv'));

export function BPxxx_NamaBP() {
    runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {
        let tx = '';

        tx = 'BPxxx_01_NamaTransaksi';
        transaction(tx, () => {
            api({
                name       : '01_01_nama-endpoint',
                url        : `${parameter.BASE_URL}/path/to/endpoint`,
                method     : 'POST',
                body       : JSON.stringify({ key: 'value' }),
                transaction: tx,
            });
        });
        sleep(1);
    }});
}
```

**3. Daftarkan di scenario file (`src/scenario/scenario_myproject.js`):**
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

**1. Buat folder project di `src/script/`:**
```
src/script/NamaProject/
└── parameter.config.js   ← salin dari src/script/_template/parameter.config.js
```

**2. (Opsional) Set `CHANNEL` di `parameter.config.js`:**
```js
export const parameter = {
    BASE_URL : 'https://your-server.com',
    CHANNEL  : 'NamaProject',   // label group di Grafana (tag: ::NamaProject)
};
```

Jika `CHANNEL` tidak di-set, tag group Grafana otomatis menggunakan `'default'` — tidak perlu konfigurasi tambahan.

**3. Pass `parameter` ke `runScript`:**
```js
import { parameter } from '../parameter.config.js';

runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {
    // parameter.BASE_URL, parameter.CHANNEL, dll tersedia di sini
}});

// Tanpa CHANNEL di parameter.config.js — tag group Grafana: '::default'
```

**4. Buat scenario file di `src/scenario/`** (salin dari `scenario_template.js`), lalu jalankan:
```powershell
.\run.ps1 -mode loadtest -scenario scenario_myproject
```

---

## Extract & Batch

### Extract — Ambil Nilai dari Response

Tambahkan `extract` di dalam `api()` untuk menyimpan nilai ke `session`:

```js
api({
    name       : '01_01_/api/login',
    url        : `${parameter.BASE_URL}/api/login`,
    method     : 'POST',
    transaction: tx,
    extract    : [
        { name: 'accessToken', type: 'jsonpath', path: '$.data.accessToken' },  // JSON path
        { name: 'sessionId',   type: 'header',   header: 'X-Session-Id'     },  // response header
        { name: 'csrf',        type: 'regex',     pattern: '"csrf":"(.*?)"'  },  // regex capture group 1
    ],
});
// session.accessToken, session.sessionId, session.csrf tersedia setelah baris ini
```

| `type`     | Field wajib | Keterangan                                             |
|------------|-------------|--------------------------------------------------------|
| `jsonpath` | `path`      | JSONPath Plus syntax: `$.data.accessToken`             |
| `header`   | `header`    | Nama response header: `Content-Type`                   |
| `regex`    | `pattern`   | Regex — capture group pertama yang diambil             |

### `type: 'jsonpath'` — Syntax & Contoh

Gunakan JSONPath Plus syntax untuk extract nilai dari JSON response. Tidak butuh library tambahan.

```js
extract: [
    // single value
    { name: 'token',     type: 'jsonpath', path: '$.data.token'        },
    { name: 'userId',    type: 'jsonpath', path: '$.data.user.id'      },
    { name: 'lastItem',  type: 'jsonpath', path: '$.data.items[-1].name' },

    // semua id dari array — all: true → format ordinal (setara Select Ordinal: All VuGen)
    { name: 'itemId',    type: 'jsonpath', path: '$.data.items[*].id',  all: true },
    // → session.itemId_1, session.itemId_2, ..., session.itemId_count
    // → session.itemId = [full array]

    // filter kondisi — semua id dengan status active
    { name: 'activeId',  type: 'jsonpath', path: '$.data.items[?(@.status=="active")].id',  all: true },

    // filter angka — semua name dengan price < 10
    { name: 'cheapItem', type: 'jsonpath', path: '$.data.items[?(@.price<10)].name',         all: true },

    // recursive search — cari 'token' di mana pun dalam response
    { name: 'token',     type: 'jsonpath', path: '$..token'             },
]
```

| Syntax              | Contoh                                            | Keterangan                     |
|---------------------|---------------------------------------------------|--------------------------------|
| `$.field`           | `$.data.token`                                    | Field dari root                |
| `$.a.b.c`           | `$.data.user.id`                                  | Path bersarang                 |
| `[*]`               | `$.data.items[*].id`                              | Semua item array               |
| `[n]`               | `$.data.items[0].id`                              | Index ke-n (mulai 0)           |
| `[-n]`              | `$.data.items[-1].id`                             | Dari belakang (-1 = terakhir)  |
| `[start:end]`       | `$.data.items[0:3].id`                            | Slice                          |
| `[?(@.field==val)]` | `$.data.items[?(@.status=="active")].id`          | Filter kondisi                 |
| `$..field`          | `$..token`                                        | Recursive — cari di semua level |

Operator filter: `==` `!=` `<` `>` `<=` `>=`

**`all: true`** — aktifkan format ordinal: `name_1`, `name_2`, `name_count` (setara Select Ordinal: All di VuGen). Tanpa `all: true`, array tersimpan langsung sebagai `session[name] = [...]`.

Regex juga mendukung `all: true`:
```js
{ name: 'ref', type: 'regex', pattern: '"ref":"(.*?)"', all: true }
// → session.ref_1, session.ref_2, ..., session.ref_count
```

### Batch — Beberapa Request Paralel

Gunakan `batch()` di dalam `transaction()` untuk mengirim beberapa request serentak, seperti browser yang load aset paralel:

```js
import { batch } from '../../../../lib/http/batch.js';

tx = 'BPxxx_03_LoadAssets';
transaction(tx, () => {
    batch([
        { name: '03_01_/api/config',  url: `${parameter.BASE_URL}/api/config`          },
        { name: '03_02_/api/profile', url: `${parameter.BASE_URL}/api/profile`         },
        { name: '03_03_/api/menu',    url: `${parameter.BASE_URL}/api/menu`,
          method: 'POST', body: JSON.stringify({ type: 'main' })                        },
    ], tx);
});
sleep(1);
```

Setiap request dalam batch dicatat secara individual di `api_duration` dan `check` — hasilnya terlihat terpisah di Grafana.

---

## Sumber Variabel dalam BP Script

Ada tiga sumber variabel yang digunakan dalam script BP, masing-masing punya lifecycle berbeda:

| # | Sumber | Cara akses | Isi | Lifecycle |
|---|--------|------------|-----|-----------|
| 1 | **Parameter** | `parameter.BASE_URL`, `parameter.CHANNEL` | Konstanta statis — URL server, nama group Grafana, dll | Konstan sepanjang test, sama untuk semua VU |
| 2 | **CSV data** | `data.userName`, `data.companyId` | Data per-user dari file CSV | Statis per-VU — VU 1 selalu dapat baris 1, VU 2 baris 2, dst |
| 3 | **Session** | `session.token`, `session.kopraId` | Nilai hasil extract dari response API | Dinamis — berubah tiap iterasi (login ulang, token baru) |

```js
import { parameter } from '../parameter.config.js';

runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {
    // parameter → config    — konstan, dari parameter.config.js (BASE_URL, CHANNEL, dll)
    // data      → CSV data  — 1 baris sesuai VU, disiapkan runScript
    // session   → session   — diisi saat extract response API

    addAutoHeader('X-Company-Id', data.companyId)                      // dari CSV
    addAutoHeader('Authorization', `Bearer ${session.token}`)          // dari session (hasil extract login)
    api({ url: `${parameter.BASE_URL}/path` })                         // dari parameter.config.js
}});
```

Cara bedain sekilas: `parameter.xxx` = config, `data.xxx` = CSV, `session.xxx` = hasil extract runtime.

---

## Auth — Pilih Sesuai Kebutuhan

| Metode | Helper | Contoh penggunaan |
|--------|--------|-------------------|
| Basic Auth | `lib/auth/basicAuth.js` | `addAutoHeader('Authorization', \`Basic ${basicAuth(user, pass)}\`)` |
| Form / JSON body | — | Kirim via `body` parameter di `api()` |
| Bearer / Token | `addAutoHeader` | `addAutoHeader('Authorization', \`Bearer ${session.token}\`)` |
| API Key | `addAutoHeader` | `addAutoHeader('X-Api-Key', key)` |

`addAutoHeader(key, value)` menyuntikkan header ke semua request setelah baris tersebut dipanggil. Gunakan `deleteAutoHeader(key)` untuk menghapus satu header, atau `clearAutoHeaders()` untuk menghapus semua header yang ditambahkan dan kembali ke header default.

`clearAutoHeaders()` dipanggil otomatis oleh `runScript` di akhir setiap iterasi — memastikan iterasi berikutnya selalu mulai dari kondisi header yang bersih, baik saat flow sukses maupun saat ada transaksi gagal.

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
4. **Log error** — pesan error dicetak ke console dan dikirim ke Loki secara otomatis.
5. **Reset header** — `clearAutoHeaders()` dipanggil di `finally`, iterasi berikutnya mulai dari header default.

Pola ini setara dengan `lr_exit(LR_EXIT_ITERATION_AND_CONTINUE, ...)` di LoadRunner.
`runScript` menangani semua ini secara otomatis — BP author tidak perlu menulis try/catch/finally.

```js
export function BPxxx_NamaBP() {
    runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {
        let tx = '';

        tx = 'BPxxx_01_Login';
        transaction(tx, () => {
            api({ ... });
        });
        sleep(1);

        // hanya dieksekusi jika Login sukses — jika gagal, iterasi sudah selesai
        tx = 'BPxxx_02_GetData';
        transaction(tx, () => {
            api({ ... });
        });

        sleep(5);
    }});
}
```

### Stop Iterasi dengan Pesan Custom

Selain dari kegagalan API, iterasi bisa dihentikan manual dengan melempar `IterationAbortError` langsung dari dalam `fn`. Berguna untuk validasi kondisi bisnis sebelum melanjutkan flow.

```js
import { IterationAbortError } from '../../../../lib/http/transaction.js';

export function BPxxx_NamaBP() {
    runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {

        if (!data.companyId) {
            throw new IterationAbortError('companyId kosong — skip iterasi');
        }

        tx = 'BPxxx_01_Login';
        transaction(tx, () => { api({ ... }); });
        sleep(1);

    }});
}
```

Output console dan Loki saat iterasi dihentikan:
```
[BPxxx_NamaBP] iterasi dibatalkan — transaksi gagal: companyId kosong — skip iterasi
```

`clearAutoHeaders()` tetap dipanggil otomatis di `finally`, sehingga header bersih untuk iterasi berikutnya.

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
import { sleep } from 'k6';
import { runScript } from '../../../../lib/core/runScript.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { parameter } from '../parameter.config.js';   // parameter.CHANNEL = 'GrafanaPizza'

const dataset = loadCSV(import.meta.resolve('./PizzaOrder_data.csv'));

export function PizzaOrder() {
    runScript({ dataset, name: 'PizzaOrder', parameter, fn: (data, session) => {
        // tag group otomatis: ::GrafanaPizza

        const tx = 'BP001_01_Login';
        transaction(tx, () => {
            api({
                name       : '001_01_01_/api/users/token/login',
                url        : `${parameter.BASE_URL}/api/users/token/login`,
                method     : 'POST',
                body       : JSON.stringify({ username: data.username, password: data.password }),
                transaction: tx,
                extract    : [
                    { name: 'token', type: 'jsonpath', path: '$.token' },
                ],
            });
        });
        sleep(1);
    }});
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
