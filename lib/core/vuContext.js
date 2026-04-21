// Registry bpList per-VU (module-level, di-set oleh scenario file di init phase)
let _bpList = null;

export function setBpList(list) {
    _bpList = list;
}

/**
 * Hitung user index (0-based) untuk VU saat ini berdasarkan range BP.
 * Dengan combined single-scenario, VU IDs sequential: 1..totalUsers.
 * Contoh bpList = [{BP314, users:5}, {BP315, users:3}]:
 *   VU 1-5 → BP314, index 0-4
 *   VU 6-8 → BP315, index 0-2
 */
export function getVuUserIndex(usersLength) {
    if (_bpList === null) {
        // Single-BP / testhit: VU IDs mulai dari 1, sequential
        return (__VU - 1) % usersLength;
    }

    let offset = 0;
    for (const bp of _bpList) {
        if (__VU <= offset + bp.users) {
            return __VU - offset - 1;
        }
        offset += bp.users;
    }

    // Fallback jika VU di luar range (tidak seharusnya terjadi)
    return (__VU - 1) % usersLength;
}
