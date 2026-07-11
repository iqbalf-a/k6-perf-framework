# Getting Started

## Prerequisites

| Kebutuhan | Keterangan |
|-----------|------------|
| **k6 binary** | Download dari [github.com/grafana/k6/releases](https://github.com/grafana/k6/releases). Letakkan `k6.exe` di folder `bin\`. |
| **Node.js** | Untuk IDE autocomplete (`@types/k6`) dan menjalankan k6 Dashboard. |
| **CMD** | Command Prompt bawaan Windows. Semua perintah dijalankan dari sini. |

Struktur folder yang diharapkan (self-contained):

```
k6-perf-framework/
├── bin\k6.exe          ← runtime di sini
├── k6perf.cmd          ← entry point (CMD)
├── framework\
├── workspace\
└── dashboard\
```

## Instalasi

```bat
:: 1. Clone repo
git clone https://github.com/iqbalf-a/k6-perf-framework.git
cd k6-perf-framework

:: 2. Letakkan k6.exe di bin\, lalu verifikasi
bin\k6.exe version

:: 3. Install type definitions (IDE autocomplete)
npm install
```

## First Run

```bat
:: Jalankan contoh scenario (QuickPizza API publik, 1 VU, 1 iterasi)
k6perf run -Scenario scenario_example -Mode testhit
```

Output yang diharapkan:

```
========================================
 k6 Test Runner
========================================
 Scenario  : scenario_example
 Mode      : testhit
 VUs       : 1
 Iterations: 1
 Test ID   : scenario_example_testhit_...
========================================
```

Jika muncul error `k6 tidak ditemukan`, pastikan `k6.exe` berada di folder `bin\`.

Lihat daftar scenario & channel yang tersedia:

```bat
k6perf list
```

## Langkah Berikutnya

- [Cara Run](./cara-run) — mode, parameter, dan contoh command
- [Tambah BP Baru](./framework/tambah-bp) — buat script Business Process pertama
- [k6 Dashboard](./observability/k6-dashboard) — visualisasi hasil test tanpa Grafana
