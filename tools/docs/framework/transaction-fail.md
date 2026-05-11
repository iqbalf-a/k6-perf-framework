# Transaksi Gagal

## Behavior Otomatis

Bila ada API yang merespons non-200, framework secara otomatis:

1. **Stop** — API-API berikutnya dalam transaksi yang sama tidak dieksekusi.
2. **Catat fail** — `trx_count_fail` dan `trx_duration_fail` direkam dengan tag transaksi.
3. **Exit iterasi** — `IterationAbortError` dilempar; iterasi VU langsung selesai.
4. **Log error** — pesan dicetak ke console dan dikirim ke Loki.
5. **Reset header** — `clearAutoHeaders()` dipanggil di `finally`.

Pola ini setara dengan `lr_exit(LR_EXIT_ITERATION_AND_CONTINUE, ...)` di LoadRunner.

```js
export function BPxxx_NamaBP() {
    runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {

        tx = 'BPxxx_01_Login';
        transaction(tx, () => {
            api({ ... });
        });
        sleep(1);

        // Baris ini hanya dieksekusi jika Login sukses
        // Jika Login gagal → iterasi sudah selesai di atas
        tx = 'BPxxx_02_GetData';
        transaction(tx, () => {
            api({ ... });
        });

    }});
}
```

## Stop Manual dengan IterationAbortError

Hentikan iterasi secara eksplisit dengan melempar `IterationAbortError` — berguna untuk validasi kondisi bisnis sebelum flow dimulai.

```js
import { IterationAbortError } from '../../../../lib/http/transaction.js';

export function BPxxx_NamaBP() {
    runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {

        if (!data.companyId) {
            throw new IterationAbortError('companyId kosong — skip iterasi');
        }

        tx = 'BPxxx_01_Login';
        transaction(tx, () => { api({ ... }); });

    }});
}
```

Output di console dan Loki:

```
[BPxxx_NamaBP] iterasi dibatalkan — transaksi gagal: companyId kosong — skip iterasi
```

`clearAutoHeaders()` tetap dipanggil otomatis di `finally`, iterasi berikutnya mulai dari header bersih.
