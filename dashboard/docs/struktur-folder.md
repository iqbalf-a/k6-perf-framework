# Struktur Folder

```
k6-perf-framework/
│
├── bin/
│   └── k6.exe                    # runtime k6 (portable, tidak di-commit)
│
├── k6perf.cmd                    # ★ Entry point (CMD): run / list / dashboard
├── run.bat                       # Shim nama lama (deprecated) → k6perf
│
├── framework/                    # Inti framework — jangan ubah kecuali perlu
│   ├── index.js                  # ★ BARREL — satu titik import semua API
│   ├── core/
│   │   ├── config.js             # createOptions(), dispatchVu(), generateStages()
│   │   ├── runScript.js          # Entry point BP
│   │   ├── session.js            # Per-VU key-value store
│   │   ├── vuContext.js          # Mapping VU → user index
│   │   └── metrics.js            # Custom metrics: api_duration, trx_duration
│   │
│   ├── http/
│   │   ├── api.js                # Request wrapper (extract, debug, metrics, fail callback)
│   │   ├── batch.js              # Paralel request — batch(tx, () => { api(); api(); })
│   │   ├── _batchState.js        # Queue per-VU untuk batch (internal)
│   │   ├── headers.js            # Auto-header per VU
│   │   ├── extract.js            # Ekstrak nilai dari response (jsonpath/header/regex)
│   │   └── transaction.js        # Grouping + TPS metrics (pass/fail) + IterationAbortError
│   │
│   ├── auth/basicAuth.js         # basicAuth(username, password) → base64
│   ├── data/
│   │   ├── csvLoader.js          # Load CSV → SharedArray (cached)
│   │   └── userProvider.js       # getData() — ambil data sesuai index VU
│   ├── utils/
│   │   ├── dateHelper.js         # today(), daysAgo(), year, dll
│   │   └── jsonpath.js           # helper jsonpath
│   └── observability/
│       ├── loki.js                  # pushLoki() — kirim log error ke Loki
│       ├── prometheus.env           # config remote write (host & trend stats)
│       ├── k6-perf-framework_grafana.json
│       ├── k6-perf-framework_loki.yml
│       └── k6-perf-framework_prometheus.yml
│
├── workspace/                    # ★ Edit di sini
│   ├── scenarios/
│   │   ├── scenario_template.js
│   │   └── scenario_example.js
│   └── scripts/
│       ├── _template/
│       │   ├── parameter.config.js
│       │   ├── TransactionGeneral/
│       │   │   ├── index.js
│       │   │   ├── Login.js
│       │   │   └── Logout.js
│       │   └── BPxxx_NamaBP/
│       │       ├── BPxxx_NamaBP.js
│       │       └── BPxxx_data.csv
│       └── _exampleChannel/
│           ├── parameter.config.js
│           └── PizzaOrder/
│               ├── PizzaOrder.js
│               └── PizzaOrder_data.csv
│
├── results/                      # Output CSV test (dibuat otomatis)
│
└── dashboard/                    # Web dashboard: analisa CSV, docs, generator
    ├── server.js
    ├── package.json
    ├── docs/                     # Source dokumentasi (Markdown)
    ├── src/                      # React app
    └── public/
```

::: tip
Folder `framework/` adalah inti — cukup import lewat `framework/index.js`.
Semua kustomisasi dilakukan di `workspace/`. Folder `dashboard/` adalah tooling
standalone (Node.js) yang tidak dieksekusi oleh k6.
:::

## Import dari framework

Semua API tersedia dari satu barrel:

```js
import {
    runScript, transaction, api, batch, addAutoHeader, loadCSV,
} from '../../../../framework/index.js';   // dari file BP
```

Untuk scenario:

```js
import { MODE, createOptions, dispatchVu, setBpList } from '../../framework/index.js';
```
