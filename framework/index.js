// ─────────────────────────────────────────────────────────────────────────────
// framework/index.js — BARREL
// Satu titik import untuk seluruh API framework. Cukup:
//
//   import { runScript, transaction, api, batch, addAutoHeader, loadCSV }
//     from '<relatif>/framework/index.js';
//
// Tidak perlu lagi mengimpor dari banyak file lib/... satu per satu.
// Untuk scenario, import config dari sini juga (MODE, createOptions, dispatchVu).
// ─────────────────────────────────────────────────────────────────────────────

// ── Core / config & runner ────────────────────────────────────────────────────
export { MODE, createOptions, dispatchVu, distributeVus } from './core/config.js';
export { setBpList, getVuUserIndex }       from './core/vuContext.js';
export { runScript }                       from './core/runScript.js';
export { getSession, clearSession }        from './core/session.js';
export { api_duration, trx_duration }      from './core/metrics.js';

// ── HTTP ──────────────────────────────────────────────────────────────────────
export { api }                             from './http/api.js';
export { batch }                           from './http/batch.js';
export { transaction, IterationAbortError } from './http/transaction.js';
export {
    addAutoHeader, deleteAutoHeader, clearAutoHeaders, buildHeaders,
} from './http/headers.js';
export { extractHeader, extractJsonpath, extractRegex } from './http/extract.js';

// ── Data ──────────────────────────────────────────────────────────────────────
export { loadCSV }  from './data/csvLoader.js';
export { getData }  from './data/userProvider.js';

// ── Auth ──────────────────────────────────────────────────────────────────────
export { basicAuth } from './auth/basicAuth.js';

// ── Utils ─────────────────────────────────────────────────────────────────────
export {
    today, todaySTR, yesterday, yesterdaySTR, monthBefore, yearBefore,
    month, year, daysAgo, daysAhead, customDate,
    startOfYear, endOfYear, startOfMonth, endOfMonth,
} from './utils/dateHelper.js';
export { jsonpath } from './utils/jsonpath.js';

// ── Observability ─────────────────────────────────────────────────────────────
export { pushLoki } from './observability/loki.js';
