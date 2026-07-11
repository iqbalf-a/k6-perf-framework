import { SharedArray } from 'k6/data';

const cache = {};

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const result  = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',');
        const obj    = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] ? values[idx].trim() : ''; });
        result.push(obj);
    }
    return result;
}

export function loadCSV(filePath) {
    if (!cache[filePath]) {
        cache[filePath] = new SharedArray(filePath, function () {
            const parsed = parseCSV(open(filePath));
            if (!parsed.length) console.warn(`[CSV] File kosong atau invalid: ${filePath}`);
            return parsed;
        });
    }
    return cache[filePath];
}
