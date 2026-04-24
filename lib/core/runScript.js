import { getData } from '../data/userProvider.js';
import { getSession } from './session.js';
import { IterationAbortError } from '../http/transaction.js';
import { clearAutoHeaders } from '../http/headers.js';

// Entry point standar untuk setiap fungsi BP — setara "Action" di LoadRunner VuGen.
// Menangani: load data VU, set session.channel, try/catch IterationAbortError,
// dan clearAutoHeaders di finally — sehingga BP author hanya fokus ke flow bisnis.
//
// Parameter:
//   dataset  — hasil loadCSV(), di-share antar VU via SharedArray
//   name     — nama BP untuk pesan error (biasanya nama fungsi BP)
//   channel  — [opsional] label group di Grafana (tag: ::channel); default: 'default'
//   fn       — flow bisnis: fn(data, session)
export function runScript({ dataset, name, channel, fn }) {
    const data    = getData(dataset, name);
    const session = getSession();
    if (channel) session.channel = channel;   // jika tidak di-set → transaction() pakai 'default'

    try {
        fn(data, session);
    } catch (e) {
        if (!(e instanceof IterationAbortError)) throw e;
    } finally {
        clearAutoHeaders();
    }
}
