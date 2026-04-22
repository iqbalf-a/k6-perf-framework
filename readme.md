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

| Parameter     | Default        | Keterangan                              |
|---------------|----------------|-----------------------------------------|
| `-mode`       | `testhit`           | testhit / loadtest / stress / spike     |
| `-scenario`   | `scenario_template` | nama file di `src/scenario/`            |
| `-vus`        | `1`                 | jumlah VU (mode testhit/spike)          |
| `-iterations` | `1`                 | jumlah iterasi (mode testhit)           |
| `-debug`      | off                 | aktifkan http-debug=full                       |
| `-dashboard`  | off                 | aktifkan k6 web dashboard (localhost:5665)      |
| `-csv`        | off                 | export hasil ke CSV (`<testid>.csv`)            |

---

## Struktur Folder

```
k6-perf-framework/
│
├── run.ps1                        # Entry point
│
├── lib/                           # Framework — jangan ubah kecuali perlu
│   ├── core/
│   │   ├── config.js              # createOptions(), dispatchVu(), generateStages()
│   │   ├── session.js             # Per-VU key-value store
│   │   ├── vuContext.js           # Mapping VU → user index
│   │   └── metrics.js             # Custom k6 trend metrics
│   │
│   ├── http/
│   │   ├── api.js                 # Request wrapper (+ extract, debug, metrics)
│   │   ├── batch.js               # Batch request wrapper
│   │   ├── headers.js             # Generic default headers builder
│   │   ├── extract.js             # Ekstrak nilai dari response (json/header/regex)
│   │   └── transaction.js         # Grouping request dalam 1 transaksi
│   │
│   ├── auth/                      # Helper auth — pilih sesuai kebutuhan
│   │   └── basicAuth.js           # buildBasicAuthHeader(username, password)
│   │
│   ├── data/
│   │   ├── csvLoader.js           # Load CSV → SharedArray (cached)
│   │   └── userProvider.js        # getUser() — ambil user sesuai VU
│   │
│   ├── utils/
│   │   └── dateHelper.js          # today(), daysAgo(), year, dll
│   │
│   └── observability/
│       └── loki.js                # Push log ke Loki
│
└── src/                           # ★ Edit di sini
    ├── scenario/                  # Scenario files — titik masuk per project
    │   ├── scenario_myproject.js
    │   └── scenario_template.js   # Template untuk scenario baru
    │
    └── script/                    # BP scripts per project
        └── _template/             # Template untuk project & BP baru
            ├── channel.config.js
            └── BPxxx_NamaBP/
                ├── BPxxx_NamaBP.js
                └── BPxxx_data.csv
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
import { BPxxx_NamaFungsi } from '../script/NamaProject/BPxxx_NamaBP/BPxxx_NamaBP.js';

const bpList = [
    // ... BP lain
    { name: 'BPxxx', users: N, fn: BPxxx_NamaFungsi, thinkTime: 1 },
];
```

Selesai — tidak perlu ubah file lain.

---

## Cara Tambah Project Baru

**1. Buat folder di `src/script/`:**
```
src/script/NamaProject/
└── channel.config.js   ← salin dari src/script/_template/channel.config.js
```

**2. Buat BP script di folder project tersebut.**

**3. Buat scenario file di `src/scenario/`** (salin dari `scenario_template.js`).

Edit nilai di `channel.config.js` sesuai environment target, lalu jalankan:
```powershell
.\run.ps1 -mode loadtest -scenario scenario_myproject
```

---

## Auth — Pilih Sesuai Kebutuhan

Tidak semua aplikasi menggunakan mekanisme auth yang sama. Pilih helper yang sesuai:

| Metode | Helper | Contoh penggunaan |
|--------|--------|-------------------|
| Basic Auth | `lib/auth/basicAuth.js` | `buildBasicAuthHeader(user, pass)` |
| Form / JSON body | — | Kirim via `body` parameter di `api()` |
| Bearer Token | Otomatis | Extract token → `session.token` → auto-inject |
| API Key | — | Tambahkan via `headers: { 'X-Api-Key': key }` |

Token apapun yang di-extract dengan nama mengandung "token" akan otomatis di-inject sebagai `Authorization: Bearer ...` ke semua request berikutnya.

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
