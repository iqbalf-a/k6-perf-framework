# Tambah Project Baru

## 1. Buat Folder Project

```
src/script/NamaProject/
└── parameter.config.js   ← salin dari src/script/_template/parameter.config.js
```

## 2. Isi parameter.config.js

```js
export const parameter = {
    BASE_URL : 'https://your-server.com',
    CHANNEL  : 'NamaProject',   // label group di Grafana / k6 Dashboard
};
```

`CHANNEL` bersifat opsional. Jika tidak di-set, tag group otomatis menggunakan `'default'`.

## 3. Buat Scenario File

Salin `src/scenario/scenario_template.js` → `src/scenario/scenario_namaproject.js`, lalu daftarkan BP:

```js
import { BPxxx_NamaBP } from '../script/NamaProject/BPxxx_NamaBP/BPxxx_NamaBP.js';

const bpList = [
    { name: 'BPxxx', users: 5, fn: BPxxx_NamaBP, thinkTime: 1 },
];
```

## 4. Jalankan

```powershell
.\run.ps1 -mode loadtest -scenario scenario_namaproject
```

## Menggunakan CHANNEL

`CHANNEL` menjadi tag `group` di semua metric — format `::NamaProject`. Di k6 Dashboard, tombol **Group** muncul di filter bar sehingga bisa melihat metric per project secara terpisah.

```js
// parameter.config.js dengan CHANNEL
export const parameter = {
    BASE_URL : 'https://server-a.com',
    CHANNEL  : 'ProjectA',
};

// Tag yang dikirim: group = "::ProjectA"
```
