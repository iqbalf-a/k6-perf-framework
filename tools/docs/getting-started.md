# Getting Started

## Prerequisites

| Kebutuhan | Keterangan |
|-----------|------------|
| **k6 binary** | Download dari [github.com/grafana/k6/releases](https://github.com/grafana/k6/releases). Letakkan `k6.exe` satu level di atas folder repo. |
| **Node.js** | Untuk IDE autocomplete (`@types/k6`) dan menjalankan k6 Dashboard. |
| **PowerShell** | Sudah tersedia di Windows. |

Struktur folder yang diharapkan:

```
k6-portable/
├── k6.exe                  ← di sini
└── k6-perf-framework/      ← repo ini
```

## Instalasi

```powershell
# 1. Clone repo
git clone https://github.com/iqbalf-a/k6-perf-framework.git
cd k6-perf-framework

# 2. Install type definitions (IDE autocomplete)
npm install

# 3. Verifikasi k6 binary
..\k6.exe version
```

## First Run

```powershell
# Jalankan scenario template (1 VU, 1 iterasi)
.\run.ps1
```

Output yang diharapkan:

```
========================================
 k6 Test Runner
========================================
 Scenario  : scenario_template
 Mode      : testhit
 VUs       : 1
 Iterations: 1
 Test ID   : scenario_template_testhit_...
========================================
```

Jika muncul error `k6.exe tidak ditemukan`, pastikan `k6.exe` berada di folder `k6-portable/` (satu level di atas repo).

## Langkah Berikutnya

- [Cara Run](./cara-run) — mode, parameter, dan contoh command
- [Tambah BP Baru](./framework/tambah-bp) — buat script Business Process pertama
- [k6 Dashboard](./observability/k6-dashboard) — visualisasi hasil test tanpa Grafana
