# Struktur Folder

```
k6-perf-framework/
│
├── run.ps1                        # Entry point (PowerShell)
├── run.bat                        # Entry point (CMD)
│
├── lib/                           # Framework inti — jangan ubah kecuali perlu
│   ├── core/
│   │   ├── config.js              # createOptions(), dispatchVu(), generateStages()
│   │   ├── runScript.js           # Entry point BP
│   │   ├── session.js             # Per-VU key-value store
│   │   ├── vuContext.js           # Mapping VU → user index
│   │   └── metrics.js             # Custom metrics: api_duration, trx_duration
│   │
│   ├── http/
│   │   ├── api.js                 # Request wrapper (extract, debug, metrics, fail callback)
│   │   ├── batch.js               # Paralel request — batch(tx, () => { api(); api(); })
│   │   ├── _batchState.js         # Queue per-VU untuk batch (internal)
│   │   ├── headers.js             # Auto-header per VU
│   │   ├── extract.js             # Ekstrak nilai dari response (jsonpath/header/regex)
│   │   └── transaction.js         # Grouping + TPS metrics (pass/fail) + IterationAbortError
│   │
│   ├── auth/
│   │   └── basicAuth.js           # basicAuth(username, password) → string base64
│   │
│   ├── data/
│   │   ├── csvLoader.js           # Load CSV → SharedArray (cached)
│   │   └── userProvider.js        # getData() — ambil data sesuai index VU
│   │
│   ├── utils/
│   │   └── dateHelper.js          # today(), daysAgo(), year, dll
│   │
│   └── observability/
│       ├── loki.js                        # Push log ke Loki
│       ├── k6-perf-framework_grafana.json # Grafana dashboard (import manual)
│       ├── k6-perf-framework_loki.yml     # Konfigurasi Loki
│       └── k6-perf-framework_prometheus.yml
│
├── tools/
│   ├── docs/                      # Source dokumentasi (VitePress)
│   │   ├── .vitepress/config.mjs
│   │   └── *.md
│   └── k6-dashboard/              # Dashboard visualizer CSV
│       ├── server.js
│       ├── package.json
│       └── public/
│           ├── index.html
│           ├── css/dashboard.css
│           ├── js/dashboard.js
│           └── vendor/chart.umd.min.js
│
├── results/                       # Output CSV test (dibuat otomatis)
│
└── src/                           # ★ Edit di sini
    ├── scenario/
    │   ├── scenario_template.js
    │   └── scenario_example.js
    └── script/
        ├── _template/
        │   ├── parameter.config.js
        │   ├── TransactionGeneral/
        │   │   ├── index.js
        │   │   ├── Login.js
        │   │   └── Logout.js
        │   └── BPxxx_NamaBP/
        │       ├── BPxxx_NamaBP.js
        │       └── BPxxx_data.csv
        └── _exampleChannel/
            ├── parameter.config.js
            └── PizzaOrder/
                ├── PizzaOrder.js
                └── PizzaOrder_data.csv
```

::: tip
Folder `lib/` adalah inti framework. Semua kustomisasi dilakukan di `src/`. Folder `tools/` berisi tooling standalone yang tidak dieksekusi oleh k6.
:::
