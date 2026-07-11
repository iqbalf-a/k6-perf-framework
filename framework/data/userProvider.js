import { getVuUserIndex } from '../core/vuContext.js';

export function getData(dataset, bp) {
    if (!dataset || dataset.length === 0) throw new Error(`[${bp}] dataset kosong / belum load`);

    const index = getVuUserIndex(dataset.length);
    const data  = dataset[index];

    if (!data) throw new Error(`[${bp}] data tidak ditemukan! VU=${__VU} idx=${index} total=${dataset.length}`);

    return data;
}
