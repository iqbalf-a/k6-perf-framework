// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Script BP baru — salin folder ini, rename BPxxx_NamaBP
// ─────────────────────────────────────────────────────────────────────────────
import { sleep } from 'k6';
import { runScript } from '../../../../lib/core/runScript.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { parameter } from '../parameter.config.js';
// parameter.CHANNEL opsional — uncomment CHANNEL di parameter.config.js dan pass parameter ke runScript
// jika tidak di-set, tag group Grafana default: '::default'
// import { addAutoHeader } from '../../../../lib/http/headers.js';
// import { batch }         from '../../../../lib/http/batch.js';
// import { basicAuth }     from '../../../../lib/auth/basicAuth.js';
// import { year, today, daysAgo } from '../../../../lib/utils/dateHelper.js';
// import { Login, Logout } from '../TransactionGeneral/index.js';

const dataset = loadCSV(import.meta.resolve('./BPxxx_data.csv'));

export function BPxxx_NamaBP() {
    runScript({ dataset, name: 'BPxxx', parameter, fn: (data, session) => {
        // data    — row CSV sesuai VU (data.userName, data.password, dll)
        // session — nilai hasil extract tersimpan di sini (session.token, dll); opsional
        let tx = '';

        // ── Header global — berlaku untuk SEMUA request setelah baris ini ────────
        // addAutoHeader('Authorization', `Basic ${basicAuth(data.userName, data.password)}`);
        // addAutoHeader('X-Company-Id', data.companyId);

        // ── Transaksi umum (uncomment jika dipakai) ───────────────────────────────
        // tx = 'BPxxx_01_Login';
        // Login(tx, data);
        // sleep(1);

        // ── Single API (JSON body) ────────────────────────────────────────────────
        // tx = 'BPxxx_01_NamaTransaksi';
        // transaction(tx, () => {
        //     api({
        //         name       : '01_01_nama-endpoint',
        //         url        : `${parameter.BASE_URL}/path/to/endpoint`,
        //         method     : 'POST',
        //         body       : JSON.stringify({ key: 'value' }),
        //         transaction: tx,
        //         headers    : { 'X-Username': data.userName },
        //     });
        // });
        // sleep(1);

        // ── Single API (form-urlencoded) ──────────────────────────────────────────
        // tx = 'BPxxx_02_NamaTransaksi';
        // transaction(tx, () => {
        //     api({
        //         name       : '02_01_nama-endpoint',
        //         url        : `${parameter.BASE_URL}/path/to/endpoint`,
        //         method     : 'POST',
        //         body       : `grant_type=password&username=${data.userName}&password=${data.password}`,
        //         transaction: tx,
        //         headers    : { 'Content-Type': 'application/x-www-form-urlencoded' },
        //     });
        // });
        // sleep(1);

        // ── Extract dari response ─────────────────────────────────────────────────
        // tx = 'BPxxx_03_NamaTransaksi';
        // transaction(tx, () => {
        //     api({
        //         name       : '03_01_nama-endpoint',
        //         url        : `${parameter.BASE_URL}/path/to/endpoint`,
        //         method     : 'POST',
        //         body       : JSON.stringify({ key: 'value' }),
        //         transaction: tx,
        //         extract    : [
        //             { name: 'accessToken', type: 'json',   path: 'data.accessToken'  },
        //             { name: 'sessionId',   type: 'header', header: 'X-Session-Id'    },
        //             { name: 'csrfToken',   type: 'regex',  pattern: '"csrf":"(.*?)"' },
        //         ],
        //     });
        // });
        // addAutoHeader('Authorization', `Bearer ${session.accessToken}`);
        // sleep(1);

        // ── Batch (beberapa request paralel) ──────────────────────────────────────
        // tx = 'BPxxx_04_NamaBatch';
        // transaction(tx, () => {
        //     batch([
        //         { name: '04_01_endpoint-a', url: `${parameter.BASE_URL}/path/a` },
        //         { name: '04_02_endpoint-b', url: `${parameter.BASE_URL}/path/b` },
        //     ], tx);
        // });
        // sleep(1);

        // tx = 'BPxxx_99_Logout';
        // Logout(tx, data);

        sleep(5);
    }});
}
