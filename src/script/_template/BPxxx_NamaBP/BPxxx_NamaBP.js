// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Script BP baru
// Salin folder ini, rename BPxxx_NamaBP, lalu isi bagian transaksi.
// ─────────────────────────────────────────────────────────────────────────────
import { sleep } from 'k6';
import { getSession } from '../../../../lib/core/session.js';
import { transaction, IterationAbortError } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { batch } from '../../../../lib/http/batch.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { getData } from '../../../../lib/data/userProvider.js';
import { year, today, daysAgo } from '../../../../lib/utils/dateHelper.js';
import { BASE_URL, BASE_URL_SUB /*, CHANNEL */ } from '../channel.config.js';
import { addAutoHeader, deleteAutoHeader, clearAutoHeaders } from '../../../../lib/http/headers.js';
// import { basicAuth } from '../../../../lib/auth/basicAuth.js';
// import { Login }     from '../TransactionGeneral/Login.js';
// import { Logout }    from '../TransactionGeneral/Logout.js';

const dataset = loadCSV(import.meta.resolve('./BPxxx_data.csv'));

export function BPxxx_NamaBP() {
    const data = getData(dataset, 'BPxxx');
    const session = getSession();
    // [opsional] Set channel untuk tag group di Grafana (::NamaChannel).
    // Uncomment CHANNEL di channel.config.js dan baris berikut jika dipakai.
    // session.channel = CHANNEL;
    let tx = '';

    // ── Header global — berlaku untuk SEMUA request setelah baris ini ────────────
    // addAutoHeader('Authorization', `Basic ${basicAuth(data.userName, data.password)}`);
    // addAutoHeader('X-Company-Id', data.companyId);
    //
    // ── Per-request: headers menambah/override, excludeHeaders menghapus ─────────
    // api({ ..., headers: { 'X-Custom': 'value' } });           // tambah/override untuk 1 request ini
    // api({ ..., excludeHeaders: ['Authorization'] });           // hapus dari global untuk 1 request ini

    try {
        // ── Transaksi umum (uncomment jika dipakai) ───────────────────────────────
        // tx = 'BPxxx_01_Login';   Login(tx, data);   sleep(1);

        // ── Contoh: single API (JSON body) ────────────────────────────────────────
        // tx = 'BPxxx_01_NamaTransaksi';
        // transaction(tx, () => {
        //     api({
        //         name          : '01_01_nama-endpoint',
        //         url           : `${BASE_URL}/path/to/endpoint`,
        //         method        : 'POST',               // GET | POST | PUT | PATCH | DELETE | OPTIONS
        //         body          : JSON.stringify({
        //                             key  : 'value',
        //                             date : today('YYYY-MM-DD'),
        //                         }),
        //         transaction   : tx,
        //         headers       : { 'X-Username': data.userName },
        //         // excludeHeaders: ['Authorization'],  // hapus header auto-inject untuk request ini saja
        //     });
        // });
        // sleep(1);

        // ── Contoh: single API (form-urlencoded body) ─────────────────────────────
        // tx = 'BPxxx_02_NamaTransaksi';
        // transaction(tx, () => {
        //     api({
        //         name       : '02_01_nama-endpoint',
        //         url        : `${BASE_URL}/path/to/endpoint`,
        //         method     : 'POST',
        //         body       : `grant_type=password&username=${data.userName}&password=${data.password}`,
        //         transaction: tx,
        //         headers    : { 'Content-Type': 'application/x-www-form-urlencoded' },
        //     });
        // });
        // sleep(1);

        // ── Contoh: extract dari response ─────────────────────────────────────────
        // tx = 'BPxxx_03_NamaTransaksi';
        // transaction(tx, () => {
        //     api({
        //         name       : '03_01_nama-endpoint',
        //         url        : `${BASE_URL}/path/to/endpoint`,
        //         method     : 'POST',
        //         body       : JSON.stringify({ key: 'value' }),
        //         transaction: tx,
        //         headers    : { 'X-Username': data.userName },
        //         extract    : [
        //             { name: 'accessToken', type: 'json',   path: 'data.accessToken'  }, // simpan ke session.accessToken
        //             { name: 'sessionId',   type: 'header', header: 'X-Session-Id'    }, // dari response header
        //             { name: 'csrfToken',   type: 'regex',  pattern: '"csrf":"(.*?)"' }, // dari body pakai regex
        //         ],
        //         // debug   : true,    // log req + res + hasil extract untuk request ini
        //     });
        // });
        // sleep(1);

        // ── Contoh: batch (beberapa request paralel) ──────────────────────────────
        // tx = 'BPxxx_04_NamaBatch';
        // transaction(tx, () => {
        //     batch([
        //         { name: '04_01_endpoint-a', url: `${BASE_URL}/path/a` },
        //         { name: '04_02_endpoint-b', url: `${BASE_URL}/path/b` },
        //     ], tx);
        // });
        // sleep(1);

        // ── Contoh: loop dari hasil extract sebelumnya ────────────────────────────
        // const items = session.namaVariabel || [];
        // tx = 'BPxxx_05_LoopItems';
        // transaction(tx, () => {
        //     items.forEach((item, i) => {
        //         api({
        //             name       : `05_0${i + 1}_item`,
        //             url        : `${BASE_URL}/path/${item.id}`,
        //             method     : 'GET',
        //             transaction: tx,
        //             headers    : { 'X-Username': data.userName },
        //         });
        //     });
        // });

        // tx = 'BPxxx_99_Logout';  Logout(tx, data);

        sleep(5);
    } catch (e) {
        if (!(e instanceof IterationAbortError)) throw e;
    } finally {
        clearAutoHeaders();   // reset ke base header — iterasi berikutnya mulai bersih
    }
}
