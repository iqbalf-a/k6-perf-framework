// ─────────────────────────────────────────────────────────────────────────────
// Scenario di-generate via dashboard (Run Test -> Setting Scenario).
// Boleh diedit manual, tapi simpan ulang dari dashboard akan menimpa file ini.
// ─────────────────────────────────────────────────────────────────────────────
import { MODE, createOptions, dispatchVu, setBpList } from '../../framework/index.js';

import { BP000_Dashboard } from '../scripts/MCM/BP000_Dashboard/BP000_Dashboard.js';

const bpList = [
    { name: 'BP000_Dashboard', users: 50, fn: BP000_Dashboard, thinkTime: 1 },
];

const loadConfig = {
    rampStep: 25,
    rampInterval: 1,
    holdDuration: 1,
    totalVus: 100,
};

setBpList(bpList);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
