import { getSession } from '../core/session.js';
import { jsonpath }   from '../utils/jsonpath.js';

function saveToSession(name, value) {
    if (value === null || value === undefined) return;
    const session = getSession();
    session[name] = value;
    if (name.toLowerCase().includes('token')) {
        session.token = value;
    }
}

function saveAllToSession(name, values) {
    const session = getSession();
    session[`${name}_count`] = values.length;
    values.forEach((v, i) => { session[`${name}_${i + 1}`] = v; });
}

export function extractHeader(res, header, name) {
    const value = res.headers[header] || res.headers[header?.toLowerCase()];
    saveToSession(name, value);
    return value;
}

// all: false (default) → session[name] = nilai (single atau array apa adanya)
// all: true            → session[name_1..n] + session[name_count]  (ordinal, setara Select Ordinal: All VuGen)
export function extractJsonpath(res, path, name, all = false) {
    let body;
    try {
        body = JSON.parse(res.body);
    } catch (e) {
        console.error(`[extract] Gagal parse JSON untuk path "${path}": ${e.message}`);
        return null;
    }
    const result = jsonpath(body, path);

    if (all) {
        const values = Array.isArray(result) ? result : (result != null ? [result] : []);
        saveAllToSession(name, values);
        saveToSession(name, values);
        return values;
    }
    saveToSession(name, result);
    return result;
}

// all: false → capture group pertama, match pertama saja
// all: true  → semua match (ordinal: name_1..n, name_count)
export function extractRegex(res, pattern, name, all = false) {
    if (!all) {
        const value = res.body?.match(pattern)?.[1];
        saveToSession(name, value);
        return value;
    }
    const regex   = new RegExp(pattern, 'g');
    const matches = [...(res.body?.matchAll(regex) ?? [])].map(m => m[1]);
    saveAllToSession(name, matches);
    saveToSession(name, matches);
    return matches;
}
