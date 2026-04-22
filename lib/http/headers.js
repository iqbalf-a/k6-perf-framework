// baseHeaders adalah state per-VU. addAutoHeader/deleteAutoHeader memanipulasinya
// selama test berjalan; buildHeaders membaca snapshot-nya tiap request.
const baseHeaders = {
    'Accept':          'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

export function addAutoHeader(key, value) {
    baseHeaders[key] = value;
}

export function deleteAutoHeader(key) {
    delete baseHeaders[key];
}

export function buildHeaders(method = 'GET', customHeaders = {}) {
    const headers = { ...baseHeaders };

    if (method !== 'GET' && !customHeaders['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return { ...headers, ...customHeaders };
}
