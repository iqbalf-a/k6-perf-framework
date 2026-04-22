// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Script BP baru
// Salin folder ini, rename BPxxx_NamaBP, lalu isi bagian transaksi.
// ─────────────────────────────────────────────────────────────────────────────
import { sleep } from 'k6';
import { getSession } from '../../../../lib/core/session.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { batch } from '../../../../lib/http/batch.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { getUser } from '../../../../lib/data/userProvider.js';
import { year, today, daysAgo } from '../../../../lib/utils/dateHelper.js';
import { BASE_URL, BASE_URL_SUB } from '../channel.config.js';
import { addAutoHeader, deleteAutoHeader } from '../../../../lib/http/headers.js';
// import { basicAuth } from '../../../../lib/auth/basicAuth.js';
// import { Login }     from '../TransactionGeneral/Login.js';
// import { Logout }    from '../TransactionGeneral/Logout.js';

const users = loadCSV(import.meta.resolve('./BPxxx_data.csv'));

export function BPxxx_NamaBP() {
    const user = getUser(users, 'BPxxx');
    // const session = getSession();
    let tx = '';

    // ── Header global — berlaku untuk SEMUA request setelah baris ini ────────────
    // addAutoHeader('Authorization', `Basic ${basicAuth(user.userName, user.password)}`);
    // addAutoHeader('X-Company-Id', user.companyId);
    // deleteAutoHeader('Authorization');   // hapus dari global setelah tidak dibutuhkan
    //
    // ── Per-request: headers menambah/override, excludeHeaders menghapus ─────────
    // api({ ..., headers: { 'X-Custom': 'value' } });           // tambah/override untuk 1 request ini
    // api({ ..., excludeHeaders: ['Authorization'] });           // hapus dari global untuk 1 request ini

    // ── Transaksi umum (uncomment jika dipakai) ───────────────────────────────
    // tx = 'BPxxx_01_Login';   Login(tx, user);   sleep(1);
    // tx = 'BPxxx_02_Logout';  Logout(tx, user);

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
    //         headers       : { 'X-Username': user.userName },
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
    //         body       : `grant_type=password&username=${user.userName}&password=${user.password}`,
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
    //         headers    : { 'X-Username': user.userName },
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
    // const session = getSession();
    // const items   = session.namaVariabel || [];
    // tx = 'BPxxx_05_LoopItems';
    // transaction(tx, () => {
    //     items.forEach((item, i) => {
    //         api({
    //             name       : `05_0${i + 1}_item`,
    //             url        : `${BASE_URL}/path/${item.id}`,
    //             method     : 'GET',
    //             transaction: tx,
    //             headers    : { 'X-Username': user.userName },
    //         });
    //     });
    // });

    sleep(5);
}
