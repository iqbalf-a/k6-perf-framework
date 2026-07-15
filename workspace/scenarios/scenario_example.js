// ─────────────────────────────────────────────────────────────────────────────
// Scenario di-generate via dashboard (Run Test -> Setting Scenario).
// Boleh diedit manual, tapi simpan ulang dari dashboard akan menimpa file ini.
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList, distributeVus } from '../../framework/index.js';

import { PizzaOrder } from '../scripts/_exampleChannel/PizzaOrder/PizzaOrder.js';
import { BPxxx_NamaBP } from '../scripts/_template/BPxxx_NamaBP/BPxxx_NamaBP.js';

const bpList = [
    { name: 'PizzaOrder', percent: 60, fn: PizzaOrder, thinkTime: 1 },
    { name: 'BPxxx_NamaBP', percent: 50, fn: BPxxx_NamaBP, thinkTime: 1 },
];

const loadConfig = {
    rampStep: 5,
    rampInterval: 10,
    holdDuration: 120,
    totalVus: 100,
};

setBpList(bpList);
// Ubah percent -> users absolut. Total dari -Vus (jika di-set) atau totalVus di atas.
distributeVus(bpList, parseInt(__ENV.VUS) || loadConfig.totalVus);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
