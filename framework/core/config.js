import { sleep } from 'k6';
export { setBpList } from './vuContext.js';

export const MODE = __ENV.MODE || 'testhit';

const SUMMARY_STATS = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];

// loadConfig = { rampStep (user), rampInterval (menit), holdDuration (menit) }
// totalUsers dihitung otomatis dari bpList
export function createOptions(bpList, mode, loadConfig = {}, thresholds = {}) {
    const hasThresholds = Object.keys(thresholds).length > 0;
    const base = {
        insecureSkipTLSVerify: true,
        summaryTrendStats    : SUMMARY_STATS,
        ...(hasThresholds && { thresholds }),
    };

    switch (mode) {
        case 'loadtest': {
            const { rampStep = 10, rampInterval = 1, holdDuration = 60 } = loadConfig;
            return { ...base, scenarios: generateStages(rampStep, rampInterval, holdDuration, bpList) };
        }
        case 'stress': {
            const { rampStep = 5, rampInterval = 1, holdDuration = 10 } = loadConfig;
            return { ...base, scenarios: generateStages(rampStep, rampInterval, holdDuration, bpList) };
        }
        case 'spike':
            return { ...base, vus: parseInt(__ENV.VUS) || 50, duration: __ENV.DURATION || '1m' };
        default:
            return { ...base, vus: parseInt(__ENV.VUS) || 1, iterations: parseInt(__ENV.ITERATIONS) || 1 };
    }
}

// testhit/spike : semua BP dijalankan berurutan oleh tiap VU
// loadtest/stress: tiap VU hanya menjalankan 1 BP sesuai range __VU
export function dispatchVu(bpList, mode) {
    if (mode === 'testhit' || mode === 'spike') {
        bpList.forEach(bp => { bp.fn(); if (bp.thinkTime) sleep(bp.thinkTime); });
        return;
    }
    let offset = 0;
    for (const bp of bpList) {
        if (__VU <= offset + bp.users) { bp.fn(); return; }
        offset += bp.users;
    }
}

// ── Distribusi VU berbasis PERSENTASE (gaya JMeter) ───────────────────────────
// Ubah bpList berbasis `percent` menjadi `users` absolut yang totalnya = totalVus.
// Memakai metode largest-remainder agar penjumlahan users PERSIS = totalVus
// (tidak ada VU yang hilang/berlebih karena pembulatan).
//
//   const bpList = [
//     { name: 'BP001', percent: 60, fn: BP001 },
//     { name: 'BP002', percent: 40, fn: BP002 },
//   ];
//   distributeVus(bpList, parseInt(__ENV.VUS) || 100);
//   // → BP001.users = 60, BP002.users = 40  (saat -Vus 100)
//
// Panggil SEBELUM setBpList()/createOptions(). Kalau bpList sudah pakai `users`
// absolut (tanpa `percent`), fungsi ini tidak mengubah apa-apa.
export function distributeVus(bpList, totalVus) {
    totalVus = Math.max(0, Math.floor(Number(totalVus) || 0));
    if (!bpList.some(bp => bp.percent != null)) return bpList; // sudah absolut

    // Batasi log agar tidak spam (init context jalan sekali per-VU di k6).
    const once = (typeof __VU === 'undefined') || __VU <= 1;

    const totalPct = bpList.reduce((s, bp) => s + (Number(bp.percent) || 0), 0);
    if (totalPct <= 0) {
        if (once) console.warn('[distributeVus] total percent = 0 — semua BP mendapat 0 VU.');
        bpList.forEach(bp => { bp.users = 0; });
        return bpList;
    }

    // Total persen TIDAK harus 100. Persen diperlakukan sebagai rasio dan dibagi
    // proporsional, jadi jumlah VU SELALU = totalVus (dari -Vus). Contoh:
    //   [60, 40]   (100%) dari 100 → 60, 40
    //   [120, 80]  (200%) dari 100 → 60, 40   (rasio sama)
    //   [60, 41]   (101%) dari 100 → 59, 41
    //   [70, 20]   (90%)  dari 100 → 78, 22
    if (once && Math.abs(totalPct - 100) > 0.01) {
        console.warn(`[distributeVus] total percent = ${totalPct}% (bukan 100%) — dibagi proporsional, total tetap ${totalVus} VU.`);
    }

    const raw   = bpList.map(bp => (Number(bp.percent) || 0) / totalPct * totalVus);
    const users = raw.map(Math.floor);
    const remainder = totalVus - users.reduce((a, b) => a + b, 0);

    // sisa pembulatan diberikan ke BP dengan fraksi terbesar (largest remainder)
    const order = raw
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remainder; k++) users[order[k % order.length].i] += 1;

    bpList.forEach((bp, i) => {
        bp.users = users[i];
        if (once && Number(bp.percent) > 0 && bp.users === 0) {
            console.warn(`[distributeVus] ${bp.name || 'BP'} mendapat 0 VU (percent ${bp.percent}% dari total ${totalVus} terlalu kecil).`);
        }
    });

    // Ringkasan hasil supaya selalu terlihat berapa VU tiap BP.
    if (once) {
        const summary = bpList.map(bp => `${bp.name || 'BP'}=${bp.users}`).join(', ');
        console.log(`[distributeVus] total ${totalVus} VU → ${summary}`);
    }
    return bpList;
}

// Pola step: spawn rampStep VU serentak → hold rampInterval menit → ulangi
// → setelah totalUsers tercapai, hold holdDuration menit
function generateStages(rampStep, rampIntervalMin, holdDurationMin, bpList) {
    const totalUsers = bpList.reduce((sum, bp) => sum + bp.users, 0);

    if (rampStep === 0) {
        return { combined: { executor: 'constant-vus', vus: totalUsers, duration: `${holdDurationMin}m` } };
    }

    const stages = [{ duration: '0s', target: 0 }];
    let current = 0;
    while (current < totalUsers) {
        const next = Math.min(current + rampStep, totalUsers);
        stages.push({ duration: '0s', target: next });
        if (next < totalUsers) {
            stages.push({ duration: `${rampIntervalMin}m`, target: next });
        }
        current = next;
    }
    stages.push({ duration: `${holdDurationMin}m`, target: totalUsers });

    return { combined: { executor: 'ramping-vus', stages, startVUs: 0, gracefulRampDown: '30s' } };
}
