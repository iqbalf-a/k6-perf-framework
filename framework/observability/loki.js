import http from "k6/http";

// Loki bersifat OPT-IN: aktif hanya bila k6 dijalankan dengan
//   -e LOKI_URL=http://<host>:3100
// Tanpa env itu, pushLoki() no-op — tidak ada request keluar, tidak ada
// error DNS di log, dan metrik http tidak tercemar request observability.
const LOKI_URL = (__ENV.LOKI_URL || '').replace(/\/$/, '');

export function pushLoki(level, message) {
    if (!LOKI_URL) return;

    const payload = JSON.stringify({
        streams: [{
            stream: { job: "k6", level: level },
            values: [[`${Date.now() * 1000000}`, message]],
        }],
    });

    http.post(
        `${LOKI_URL}/loki/api/v1/push`,
        payload,
        {
            headers: { 'Content-Type': 'application/json' },
            // Tag khusus supaya request observability mudah dipisahkan dari
            // metrik API bisnis di hasil test.
            tags: { api: 'loki_push', transaction: '_observability' },
        }
    );
}
