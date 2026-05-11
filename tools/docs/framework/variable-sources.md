# Sumber Variabel

Ada tiga sumber variabel dalam script BP, masing-masing punya lifecycle berbeda:

| # | Sumber | Cara akses | Lifecycle |
|---|--------|------------|-----------|
| 1 | **Parameter** | `parameter.BASE_URL`, `parameter.CHANNEL` | Konstan — sama untuk semua VU sepanjang test |
| 2 | **CSV data** | `data.userName`, `data.companyId` | Statis per-VU — VU 1 selalu baris 1, VU 2 baris 2 |
| 3 | **Session** | `session.token`, `session.userId` | Dinamis — berubah tiap iterasi (hasil extract) |

```js
import { parameter } from '../parameter.config.js';

runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {
    // parameter → config    — konstan, dari parameter.config.js
    // data      → CSV data  — 1 baris sesuai VU, disiapkan runScript
    // session   → runtime   — diisi saat extract response

    addAutoHeader('X-Company-Id',  data.companyId)                      // dari CSV
    addAutoHeader('Authorization', `Bearer ${session.token}`)           // dari session
    api({ url: `${parameter.BASE_URL}/path` })                          // dari parameter
}});
```

::: tip
Cara bedain sekilas: `parameter.xxx` = config statis, `data.xxx` = CSV, `session.xxx` = hasil extract runtime.
:::
