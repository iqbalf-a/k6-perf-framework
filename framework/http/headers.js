// baseHeaders adalah state per-VU. addAutoHeader/deleteAutoHeader memanipulasinya
// selama test berjalan; buildHeaders membaca snapshot-nya tiap request.
const _defaults = {
    'Accept':          'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

const baseHeaders = { ..._defaults };

export function addAutoHeader(key, value) {
    baseHeaders[key] = value;
}

export function deleteAutoHeader(key) {
    delete baseHeaders[key];
}

// Hapus semua header yang ditambahkan via addAutoHeader; kembalikan ke state awal.
// Panggil di finally blok BP agar iterasi berikutnya mulai dari header bersih.
export function clearAutoHeaders() {
    for (const key of Object.keys(baseHeaders)) {
        if (!(key in _defaults)) delete baseHeaders[key];
    }
}

export function buildHeaders(method = 'GET', customHeaders = {}) {
    const headers = { ...baseHeaders };

    if (method !== 'GET' && !customHeaders['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return { ...headers, ...customHeaders };
}
