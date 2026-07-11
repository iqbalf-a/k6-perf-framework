// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: Scenario untuk QuickPizza API
// API publik: https://quickpizza.grafana.com
//
// Cara jalankan (dari root repo):
//   k6perf run -Scenario scenario_example -Mode testhit    ← 1 hit per VU
//   k6perf run -Scenario scenario_example -Mode loadtest   ← ramp-up normal
//   k6perf run -Scenario scenario_example -Mode stress     ← stress config
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList } from '../../framework/index.js';

// ── 1. Import fungsi BP ───────────────────────────────────────────────────────
import { PizzaOrder } from '../scripts/_exampleChannel/PizzaOrder/PizzaOrder.js';

// ── 2. Daftar BP ──────────────────────────────────────────────────────────────
// Alur: Login → Recommend Pizza → Get Detail → Submit Rating → List Ratings
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
