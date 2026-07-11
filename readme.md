# k6-perf-framework

Framework k6 untuk **load testing multi-BP (Business Process)** — reusable, multi-channel, gaya VuGen/LoadRunner (transaction, extract, batch, data CSV per-VU).

> oleh **ian**

---

## Struktur

```
k6-perf-framework/
├── bin/k6.exe          # runtime k6 (portable, tidak di-commit)
├── k6perf.cmd          # ★ ENTRY POINT (run / list / dashboard) — jalankan dari CMD
├── run.bat             # shim nama lama (deprecated) → k6perf
│
├── framework/          # inti framework — jarang diubah
│   └── index.js        # barrel: satu titik import semua API
│
├── workspace/          # ★ AREA KERJA — edit di sini
│   ├── scenarios/      # definisi skenario test
│   └── scripts/        # script BP per channel
│
├── results/            # output CSV (dibuat otomatis)
│
└── dashboard/          # web dashboard: analisa hasil, docs, generator
    └── docs/
```

## Quickstart

Jalankan semua perintah dari **CMD** (Command Prompt), di folder repo ini.

```bat
:: 1. Pastikan k6.exe ada di bin\  (download: https://github.com/grafana/k6/releases)
bin\k6.exe version

:: 2. Install type definitions (IDE autocomplete)
npm install

:: 3. Jalankan contoh scenario (QuickPizza API publik)
k6perf run -Scenario scenario_example -Mode testhit
```

## Command

```bat
k6perf run  -Scenario <nama> -Mode <mode> [-Vus N] [-Iterations N] [-Debug] [-Dashboard] [-Csv]
k6perf list                 :: daftar scenario & channel
k6perf dashboard            :: web dashboard di http://localhost:3000
k6perf help
```

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| `-Mode` | `testhit` | `testhit` / `loadtest` / `stress` / `spike` |
| `-Scenario` | `scenario_template` | Nama file di `workspace\scenarios\` (tanpa `.js`) |
| `-Vus` | `1` | Jumlah VU |
| `-Iterations` | `1` | Jumlah iterasi (mode `testhit`) |
| `-Debug` | off | `--http-debug=full` |
| `-Dashboard` | off | k6 web dashboard (`localhost:5665`) |
| `-Csv` | off | Export hasil ke `results\<testid>.csv` |

> Nama parameter tidak case-sensitive — `-Scenario` sama dengan `-scenario`.

### Contoh

```bat
:: Smoke test cepat — 1 hit ke contoh QuickPizza (validasi script jalan)
k6perf run -Scenario scenario_example -Mode testhit

:: testhit custom — 3 VU, 5 iterasi
k6perf run -Scenario scenario_example -Mode testhit -Vus 3 -Iterations 5

:: Load test + export CSV (untuk dianalisa di dashboard)
k6perf run -Scenario scenario_myproject -Mode loadtest -Csv

:: Stress test
k6perf run -Scenario scenario_myproject -Mode stress -Csv

:: Spike — langsung banyak VU sekaligus
k6perf run -Scenario scenario_myproject -Mode spike -Vus 100

:: Debug — tampilkan HTTP request/response penuh
k6perf run -Scenario scenario_example -Mode testhit -Debug

:: k6 web dashboard live (buka http://localhost:5665) + CSV
k6perf run -Scenario scenario_myproject -Mode loadtest -Dashboard -Csv

:: Lihat scenario & channel yang tersedia
k6perf list

:: Jalankan web dashboard (analisa CSV + docs) di http://localhost:3000
k6perf dashboard
```

## File Runner

| File | Untuk apa |
|------|-----------|
| **`k6perf.cmd`** | ★ Runner utama (batch). Semua perintah (`run`, `list`, `dashboard`, `help`) ada di sini. Memanggil `node` & `k6.exe` langsung. |
| **`run.bat`** | Nama entry point **lama** (deprecated). Hanya meneruskan ke `k6perf run`. |

Ketik **`k6perf`** (tanpa ekstensi) — CMD otomatis memakai `k6perf.cmd`. Untuk pemakaian baru cukup `k6perf`; `run.bat` hanya untuk kompatibilitas dan akan dihapus di masa depan.

## Dashboard & Dokumentasi

```bat
k6perf dashboard
```

Buka **http://localhost:3000** — untuk analisa hasil CSV, dokumentasi (tab Documentation), dan generator script/scenario. Baca Markdown-nya langsung di [`dashboard/docs/`](dashboard/docs/).

**Mode dev vs produksi:**
- `k6perf dashboard` otomatis jalan **mode dev (Vite HMR)** selama app belum di-build — setara `npm run dev`. Langsung jalan, tak perlu build.
- Untuk **mode produksi** (lebih cepat): build sekali → `cd dashboard && npm run build`, lalu `k6perf dashboard` akan otomatis serve hasil build dari `dist\`.
- Paksa mode dev kapan pun dengan `k6perf dashboard -Dev`.
