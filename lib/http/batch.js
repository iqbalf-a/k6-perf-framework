import http from "k6/http";
import { check } from "k6";
import { buildHeaders } from "./headers.js";
import { api_duration } from "../core/metrics.js";
import { pushLoki } from "../observability/loki.js";
import { extractJsonpath, extractHeader, extractRegex } from "./extract.js";
import { batchState } from "./_batchState.js";

export function batch(transaction, fn) {
    // Aktifkan batch mode — api() calls di dalam fn() akan di-queue, tidak execute
    batchState.active = true;
    batchState.queue  = [];
    fn();
    batchState.active = false;

    const requests = batchState.queue;
    batchState.queue = [];

    if (!requests.length) return [];

    // Kirim semua request serentak via http.batch()
    const batchReq = requests.map(r => ({
        method: r.method || "GET",
        url:    r.url,
        body:   r.body || null,
        params: {
            headers: buildHeaders(r.method || "GET", r.headers || {}),
            tags: {
                api:         r.name,
                transaction: r.transaction || transaction,
            }
        }
    }));

    const responses = http.batch(batchReq);

    // Proses setiap response: metrics + check + extract + error log
    responses.forEach((res, i) => {
        const r    = requests[i];
        const name = r.name;
        const tx   = r.transaction || transaction;

        api_duration.add(res.timings.duration, { api: name, transaction: tx });

        const shortUrl       = r.url.replace(/^https?:\/\/[^/]+/, "");
        const expectedStatus = (r.method || "GET") === "OPTIONS" ? [200, 204] : [200];
        const isSuccess      = expectedStatus.includes(res.status);
        check(res, { [`${name}_${shortUrl} | status ${res.status}`]: () => isSuccess });

        if (r.extract) {
            r.extract.forEach(e => {
                switch (e.type) {
                    case 'jsonpath': extractJsonpath(res, e.path,    e.name, e.all, e.notFound); break;
                    case 'header':   extractHeader  (res, e.header,  e.name,        e.notFound); break;
                    case 'regex':    extractRegex   (res, e.pattern, e.name, e.all, e.notFound); break;
                }
            });
        }

        if (!isSuccess) {
            console.error(`
API ERROR (batch)
-----------------
API         : ${name}
URL         : ${r.url}
Status      : ${res.status}
Transaction : ${tx}
VU          : ${__VU}
ITER        : ${__ITER}
`);
            pushLoki("error", JSON.stringify({
                type: "BATCH_ERROR", api: name, url: r.url,
                status: res.status, transaction: tx, vu: __VU, iter: __ITER
            }));
        }
    });

    return responses;
}
