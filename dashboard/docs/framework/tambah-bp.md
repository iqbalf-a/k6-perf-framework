# Tambah BP Baru

## 1. Buat Folder BP

Salin template ke folder project:

```
workspace/scripts/NamaProject/BPxxx_NamaBP/
├── BPxxx_NamaBP.js    ← salin dari workspace/scripts/_template/BPxxx_NamaBP/
└── BPxxx_data.csv
```

## 2. Isi Script BP

```js
import { sleep } from 'k6';
import {
    runScript, loadCSV, transaction, api,
} from '../../../../framework/index.js';
import { parameter } from '../parameter.config.js';

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
                body       : JSON.stringify({ key: data.someField }),
                transaction: tx,
            });
        });
        sleep(1);
    }});
}
```

## 3. Daftarkan di Scenario

```js
// workspace/scenarios/scenario_myproject.js
import { BPxxx_NamaBP } from '../scripts/NamaProject/BPxxx_NamaBP/BPxxx_NamaBP.js';

const bpList = [
    { name: 'BPxxx', users: 5, fn: BPxxx_NamaBP, thinkTime: 1 },
];
```

Selesai. Tidak perlu ubah file lain.

## Distribusi VU

```
bpList = [{ BP001, users: 5 }, { BP002, users: 3 }]

VU 1–5  → BP001  (user index 0–4 → baris CSV 1–5)
VU 6–8  → BP002  (user index 0–2 → baris CSV 1–3)
```

::: tip
Setiap VU selalu mendapat baris CSV yang sama di setiap iterasi (index deterministik). Data tidak berubah antar iterasi kecuali di-extract dari response.
:::
