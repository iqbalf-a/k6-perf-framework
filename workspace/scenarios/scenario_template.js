// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Scenario baru
// Salin file ini, rename sesuai project (contoh: scenario_myproject.js)
// Edit bagian "Daftar BP" dan "Konfigurasi ramp-up" sesuai kebutuhan.
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList, distributeVus } from '../../framework/index.js';

// ── 1. Import fungsi utama tiap BP ───────────────────────────────────────────
// Setiap BP adalah satu fungsi yang berisi urutan transaksi untuk 1 flow.
import { BPxxx_NamaBP } from '../scripts/_template/BPxxx_NamaBP/BPxxx_NamaBP.js';
// import { BP002_NamaFungsi } from '../scripts/NamaProject/BP002_NamaBP/BP002_NamaBP.js';
// Tambah import BP lain di sini...

// ── 2. Daftar BP ──────────────────────────────────────────────────────────────
// Dua cara mengatur beban VU (mode loadtest & stress):
//   (A) ABSOLUT     — set `users` = jumlah VU tetap per BP. Total = jumlah users.
//   (B) PERSENTASE  — set `percent` (gaya JMeter), lalu distributeVus() membagi
//                     total VU dari -Vus. Total percent sebaiknya = 100.
//
// name     : label BP (untuk log & identifikasi)
// fn       : fungsi utama BP (dari import di atas)
// thinkTime: (opsional) jeda detik antar BP pada mode testhit/spike
const bpList = [
    // (A) Mode ABSOLUT:
    { name: 'BPxxx', users: 3, fn: BPxxx_NamaBP, thinkTime: 1 },
    // { name: 'BP002', users: 2, fn: BP002_NamaFungsi },

    // (B) Mode PERSENTASE — hapus `users`, pakai `percent`, lalu aktifkan
    //     distributeVus() di bawah. Contoh (total 100 VU → 60 & 40):
    // { name: 'BPxxx', percent: 60, fn: BPxxx_NamaBP, thinkTime: 1 },
    // { name: 'BP002', percent: 40, fn: BP002_NamaFungsi },
];

// ── 3. Konfigurasi ramp-up (loadtest & stress) ────────────────────────────────
// Pola: spawn rampStep VU serentak → hold rampInterval menit → ulangi →
//       setelah total VU tercapai, hold holdDuration menit
const loadConfig = {
    totalVus    : 100,  // total VU untuk mode PERSENTASE (dibagi ke tiap BP via distributeVus)
    rampStep    : 5,    // user  — jumlah VU di-spawn serentak per langkah
    rampInterval: 1,    // menit — hold antar langkah
    holdDuration: 10,   // menit — hold di puncak setelah semua VU aktif
};

// Aktifkan HANYA untuk mode PERSENTASE — total VU dari loadConfig.totalVus (bukan flag -Vus).
// distributeVus(bpList, loadConfig.totalVus);

setBpList(bpList);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
