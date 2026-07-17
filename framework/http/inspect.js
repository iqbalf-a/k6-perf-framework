// ─────────────────────────────────────────────────────────────────────────────
// Inspect mode — dipakai halaman "API Inspector" di dashboard.
// Saat k6 dijalankan dengan -e INSPECT=1, api()/batch() menulis satu baris JSON
// per request via console.log dengan prefix @@REQRES. Dashboard mem-parse baris
// ini dari stream log untuk menampilkan detail request/response per API.
// Di run normal (tanpa INSPECT) modul ini tidak melakukan apa-apa.
// ─────────────────────────────────────────────────────────────────────────────

export const inspectActive = __ENV.INSPECT === '1';

const MAX_BODY = 64 * 1024; // potong body besar agar baris log tetap wajar

export function clipBody(raw) {
    if (raw == null) return null;
    const str = typeof raw === 'string' ? raw : String(raw);
    return str.length > MAX_BODY
        ? { body: str.slice(0, MAX_BODY), truncated: true, size: str.length }
        : { body: str, truncated: false, size: str.length };
}

export function emitInspect(entry) {
    if (!inspectActive) return;
    try {
        console.log('@@REQRES ' + JSON.stringify(entry));
    } catch {
        // entry tidak bisa di-serialize — jangan ganggu jalannya test
    }
}
