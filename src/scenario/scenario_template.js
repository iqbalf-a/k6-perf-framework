// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Scenario baru
// Salin file ini, rename sesuai project (contoh: scenario_myproject.js)
// Edit bagian "Daftar BP" dan "Konfigurasi ramp-up" sesuai kebutuhan.
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList } from '../../lib/core/config.js';

// ── 1. Import fungsi utama tiap BP ───────────────────────────────────────────
// Setiap BP adalah satu fungsi yang berisi urutan transaksi untuk 1 flow.
// Contoh:
import { BP001_NamaFungsi } from '../script/NamaChannel/BP001_NamaBP/BP001_NamaBP.js';
import { BP002_NamaFungsi } from '../script/NamaChannel/BP002_NamaBP/BP002_NamaBP.js';
// Tambah import BP lain di sini...

// ── 2. Daftar BP ──────────────────────────────────────────────────────────────
// name     : label BP (untuk log & identifikasi)
// users    : jumlah VU yang dialokasikan ke BP ini pada mode loadtest/stress
// fn       : fungsi utama BP (dari import di atas)
// thinkTime: (opsional) jeda detik antar BP pada mode testhit/spike
const bpList = [
    { name: 'BP001', users: 5, fn: BP001_NamaFungsi, thinkTime: 1 },
    { name: 'BP002', users: 3, fn: BP002_NamaFungsi },
];
// totalUsers = 8 — dihitung otomatis dari bpList

// ── 3. Konfigurasi ramp-up (loadtest & stress) ────────────────────────────────
// Pola: spawn rampStep VU serentak → hold rampInterval menit → ulangi →
//       setelah totalUsers tercapai, hold holdDuration menit
const loadConfig = {
    rampStep    : 10,   // user  — jumlah VU di-spawn serentak per langkah
    rampInterval: 1,    // menit — hold antar langkah
    holdDuration: 60,   // menit — hold di puncak setelah semua VU aktif
};

setBpList(bpList);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
