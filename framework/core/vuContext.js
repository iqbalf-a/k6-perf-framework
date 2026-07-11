import exec from 'k6/execution';

// Registry bpList per-VU (module-level, di-set oleh scenario file di init phase)
let _bpList = null;

export function setBpList(list) {
    _bpList = list;
}

export function getVuUserIndex(dataLength) {
    if (_bpList === null) {
        // Single-BP / testhit: VU IDs mulai dari 1, sequential
        return (__VU - 1) % dataLength;
    }

    let offset = 0;
    for (const bp of _bpList) {
        if (__VU <= offset + bp.users) {
            const raw = __VU - offset - 1;
            if (raw >= dataLength) {
                exec.test.abort(`[${bp.name}] jumlah VU di bpList (${bp.users}) melebihi jumlah data di CSV (${dataLength}). Tambah data di CSV atau kurangi users di bpList.`);
            }
            return raw;
        }
        offset += bp.users;
    }

    // Fallback jika VU di luar range (tidak seharusnya terjadi)
    return (__VU - 1) % dataLength;
}
