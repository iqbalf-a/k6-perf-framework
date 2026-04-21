import { getSession } from '../core/session.js';

export function buildHeaders(method = 'GET', customHeaders = {}) {
    const session = getSession();

    const base = {
        'Accept':          'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };

    if (method !== 'GET' && !customHeaders['Content-Type']) {
        base['Content-Type'] = 'application/json';
    }

    // Auto-inject Authorization jika session memiliki token
    // Token disimpan ke session.token oleh extract (atau bisa di-set manual dari BP script)
    const token = session.token || session.Access_token;
    if (token && !customHeaders['Authorization']) {
        base['Authorization'] = token.startsWith('Bearer') || token.startsWith('bearer')
            ? token
            : `Bearer ${token}`;
    }

    return { ...base, ...customHeaders };
}
