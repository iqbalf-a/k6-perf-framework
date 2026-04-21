import { getSession } from '../core/session.js';

function saveToSession(name, value) {
    if (value === null || value === undefined) return;
    const session = getSession();
    session[name] = value;
    // Convention: nama extract yang mengandung "token" → disimpan juga ke session.token
    // agar buildHeaders bisa auto-inject Authorization tanpa konfigurasi tambahan
    if (name.toLowerCase().includes('token')) {
        session.token = value;
    }
}

export function extractHeader(res, name) {
    const value = res.headers[name] || res.headers[name?.toLowerCase()];
    saveToSession(name, value);
    return value;
}

export function extractJson(res, path, name) {
    let value = null;
    try {
        const body = JSON.parse(res.body);
        value = path.split('.').reduce((obj, key) => obj && obj[key] !== undefined ? obj[key] : null, body);
    } catch (e) {
        console.error(`[extract] Gagal parse JSON untuk path "${path}": ${e.message}`);
    }
    saveToSession(name, value);
    return value;
}

export function extractRegex(res, pattern, name) {
    const value = res.body?.match(pattern)?.[1];
    saveToSession(name, value);
    return value;
}
