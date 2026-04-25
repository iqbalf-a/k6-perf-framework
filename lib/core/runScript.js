import { getData } from '../data/userProvider.js';
import { getSession } from './session.js';
import { IterationAbortError } from '../http/transaction.js';
import { clearAutoHeaders } from '../http/headers.js';
import { pushLoki } from '../observability/loki.js';

// Entry point standar untuk setiap fungsi BP — setara "Action" di LoadRunner VuGen.
// Menangani: load data VU, set session.channel, try/catch IterationAbortError,
// dan clearAutoHeaders di finally — sehingga BP author hanya fokus ke flow bisnis.
//
// Parameter:
//   dataset   — hasil loadCSV(), di-share antar VU via SharedArray
//   name      — nama BP untuk pesan error (biasanya nama fungsi BP)
//   parameter — [opsional] object dari parameter.config.js; parameter.CHANNEL dipakai
//               sebagai label group Grafana (tag: ::CHANNEL); default: 'default'
//   fn        — flow bisnis: fn(data, session)
//
// Untuk stop iterasi dengan pesan custom, lempar IterationAbortError dari dalam fn:
//   import { IterationAbortError } from '../../../../lib/http/transaction.js';
//   throw new IterationAbortError('alasan custom');
//   → output: [NamaBP] iterasi dibatalkan — transaksi gagal: alasan custom
export function runScript({ dataset, name, parameter, fn }) {
    const data = getData(dataset, name);
    const session = getSession();
    if (parameter?.CHANNEL) session.channel = parameter.CHANNEL;   // jika tidak di-set → transaction() pakai 'default'

    try {
        fn(data, session);
    } catch (e) {
        if (e instanceof IterationAbortError) {
            const msg = `[${name}] iterasi dibatalkan — transaksi gagal: ${e.message}`;
            console.error(msg);
            pushLoki('error', msg);
        } else {
            throw e;
        }
    } finally {
        clearAutoHeaders();
    }
}
