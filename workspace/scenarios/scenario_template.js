// ─────────────────────────────────────────────────────────────────────────────
// Scenario di-generate via dashboard (Run Test -> Setting Scenario).
// Boleh diedit manual, tapi simpan ulang dari dashboard akan menimpa file ini.
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList } from '../../framework/index.js';

import { PizzaOrder } from '../scripts/_exampleChannel/PizzaOrder/PizzaOrder.js';
import { BPxxx_NamaBP } from '../scripts/_template/BPxxx_NamaBP/BPxxx_NamaBP.js';

const bpList = [
    { name: 'BPxxx', users: 0, fn: PizzaOrder, thinkTime: 1 },
    { name: 'PizzaOrder', users: 0, fn: BPxxx_NamaBP, thinkTime: 1 },
];

const loadConfig = {
    rampStep: 5,
    rampInterval: 1,
    holdDuration: 10,
    totalVus: 100,
};

setBpList(bpList);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
