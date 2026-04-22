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
