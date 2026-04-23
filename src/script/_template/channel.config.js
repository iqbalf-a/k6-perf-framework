// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Konfigurasi channel baru
// Salin file ini ke folder channel baru (src/script/NamaChannel/channel.config.js)
// lalu sesuaikan nilai sesuai kebutuhan.
// ─────────────────────────────────────────────────────────────────────────────

// ── Server ────────────────────────────────────────────────────────────────────
export const BASE_URL     = 'https://10.x.x.x';
export const BASE_URL_SUB = 'https://10.x.x.x:443';

// ── Channel (opsional) ────────────────────────────────────────────────────────
// Dipakai sebagai label group di Grafana (tag group: ::NamaChannel).
// Set session.channel = CHANNEL di awal fungsi BP jika ingin menggunakannya.
// export const CHANNEL = 'NamaChannel';

// ── Parameter bisnis (contoh, sesuaikan kebutuhan) ────────────────────────────
export const SRC_ACCOUNT = '';
export const COMPANY_ID  = '';
// export const BRANCH_CODE = '';
// export const CURRENCY    = 'IDR';
