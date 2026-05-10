import http from "k6/http";
import { check } from "k6";
import { buildHeaders } from "./headers.js";
import { api_duration } from "../core/metrics.js";
import { getSession } from "../core/session.js";
import { pushLoki } from "../observability/loki.js";
import { extractHeader, extractJsonpath, extractRegex } from "./extract.js";
import { batchState } from "./_batchState.js";

const DEBUG_ALL = __ENV.DEBUG === "true";

export function api(request) {
    // Jika dipanggil di dalam batch() callback — enqueue saja, jangan execute
    if (batchState.active) {
        batchState.queue.push(request);
        return null;
    }

    const {
        name,
        url,
        method = "GET",
        body = null,
        headers = {},
        excludeHeaders = [],   // web_remove_header: hapus header auto-inject untuk request ini
        transaction,
        extract = [],
        debug = false
    } = request;

    const session = getSession();

    let finalHeaders = buildHeaders(method, headers);

    // web_remove_header equivalent: strip header tertentu dari hasil merge
    if (excludeHeaders.length > 0) {
        excludeHeaders.forEach(h => delete finalHeaders[h]);
    }

    if (method === "OPTIONS") {
        delete finalHeaders["Authorization"];
        delete finalHeaders["Content-Type"];
    }

    if (debug || DEBUG_ALL) {
        console.log(`
╔══════════════════════════════════════════════
║ [DEBUG REQUEST] ${name}
╠══════════════════════════════════════════════
║ URL     : ${url}
║ Method  : ${method}
║ Headers : ${JSON.stringify(finalHeaders, null, 2)}
║ Body    : ${body || "(none)"}
╚══════════════════════════════════════════════`);
    }

    const params = {
        headers: finalHeaders,
        // redirects: 0,
        tags: {
            api: name,
            transaction: transaction
        }
    };

    let res;
    switch (method) {
        case "POST":
            res = http.post(url, body, params);
            break;
        case "PUT":
            res = http.put(url, body, params);
            break;
        case "PATCH":
            res = http.patch(url, body, params);
            break;
        case "DELETE":
            res = http.del(url, body, params);
            break;
        case "OPTIONS":
            res = http.request("OPTIONS", url, null, params);
            break;
        case "GET":
        default:
            res = http.get(url, params);
            break;
    }

    if (debug || DEBUG_ALL) {
        console.log(`
╔══════════════════════════════════════════════
║ [DEBUG RESPONSE] ${name}
╠══════════════════════════════════════════════
║ Status           : ${res.status}
║ Duration         : ${res.timings.duration}ms
║ Response Headers : ${JSON.stringify(res.headers, null, 2)}
║ Response Body    : ${res.body}
╚══════════════════════════════════════════════`);
    }

    api_duration.add(res.timings.duration, {
        api: name,
        transaction: transaction
    });

    const expectedStatuses = method === "OPTIONS" ? [200, 204] : [200];
    const isSuccess = expectedStatuses.includes(res.status);

    const shortUrl = url.replace(/^https?:\/\/[^/]+/, "");
    check(res, {
        [`${name}_${shortUrl} | status ${res.status}`]: () => isSuccess
    });

    if (!isSuccess) {
        pushLoki("error", JSON.stringify({
            type: "API_ERROR",
            api: name,
            url: url,
            method: method,
            status: res.status,
            transaction: transaction,
            vu: __VU,
            iter: __ITER,
            request: request,
            response: res
        }));
    }

    if (method !== "OPTIONS") {
        extract.forEach(e => {
            switch (e.type) {
                case "header":
                    extractHeader(res, e.header, e.name, e.notFound);
                    break;
                case "jsonpath":
                    extractJsonpath(res, e.path, e.name, e.all, e.notFound);
                    break;
                case "regex":
                    extractRegex(res, e.pattern, e.name, e.all, e.notFound);
                    break;
            }

            if (debug || DEBUG_ALL) {
                console.log(`
╔══════════════════════════════════════════════
║ [DEBUG EXTRACT] ${name}
╠══════════════════════════════════════════════
║ Extract name  : ${e.name}
║ Extract type  : ${e.type}
║ Extract path  : ${e.path || e.pattern || "-"}
║ Extract value : ${JSON.stringify(session[e.name])}
╚══════════════════════════════════════════════`);
            }
        });
    }

    if (DEBUG_ALL) {
        pushLoki("debug", JSON.stringify({
            type: "API_DEBUG",
            api: name,
            method: method,
            status: res.status,
            duration: res.timings.duration,
            transaction: transaction,
            session: session,
            request: request,
            response: res
        }));
    }

    // Dipanggil terakhir — setelah check, pushLoki, dan extract selesai
    // Melempar IterationAbortError untuk menghentikan iterasi
    if (!isSuccess && session.__trx_fail_callback) {
        session.__trx_fail_callback();
    }

    return res;
}
