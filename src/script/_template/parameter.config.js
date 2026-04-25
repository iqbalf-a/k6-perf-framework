// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Konfigurasi parameter project baru
// Salin file ini ke folder project baru (src/script/NamaProject/parameter.config.js)
// lalu sesuaikan nilai sesuai kebutuhan.
// ─────────────────────────────────────────────────────────────────────────────

export const parameter = {
    // ── Server ─────────────────────────────────────────────────────────────────
    BASE_URL     : 'https://10.x.x.x',
    BASE_URL_SUB : 'https://10.x.x.x:443',

    // ── Channel/Group Grafana (opsional) ───────────────────────────────────────
    // Dipakai sebagai label group di Grafana (tag group: ::NamaProject).
    // Uncomment dan isi nilai, lalu pass parameter ke runScript.
    // CHANNEL : 'NamaProject',

    // ── Parameter bisnis (contoh, sesuaikan kebutuhan) ─────────────────────────
    SRC_ACCOUNT : '',
    COMPANY_ID  : '',
    // BRANCH_CODE : '',
    // CURRENCY    : 'IDR',
};
