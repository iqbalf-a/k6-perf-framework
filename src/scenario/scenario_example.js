// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: Scenario untuk QuickPizza API
// API publik: https://quickpizza.grafana.com
//
// Cara jalankan (dari root repo):
//   k6 run -e MODE=testhit  src/scenario/scenario_example.js   ← 1 hit per VU
//   k6 run -e MODE=loadtest src/scenario/scenario_example.js   ← ramp-up normal
//   k6 run -e MODE=stress   src/scenario/scenario_example.js   ← stress config
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList } from '../../lib/core/config.js';

// ── 1. Import fungsi BP ───────────────────────────────────────────────────────
import { PizzaOrder } from '../script/_example/PizzaOrder/PizzaOrder.js';

// ── 2. Daftar BP ──────────────────────────────────────────────────────────────
// Alur: Login → Get Pizza → Create Order → Get Order Detail
const bpList = [
    { name: 'BP001_PizzaOrder', users: 1, fn: PizzaOrder, thinkTime: 1 },
];
// totalUsers = 1

// ── 3. Konfigurasi ramp-up (loadtest & stress) ────────────────────────────────
const loadConfig = {
    rampStep    : 1,   // user  — naikkan 1 VU per langkah (contoh ringan)
    rampInterval: 1,   // menit — hold 1 menit sebelum naikkan langkah berikutnya
    holdDuration: 5,   // menit — hold 5 menit di puncak
};

setBpList(bpList);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
