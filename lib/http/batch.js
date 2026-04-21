import http from "k6/http";
import { check } from "k6";
import { buildHeaders } from "./headers.js";
import { api_duration } from "../core/metrics.js";
import { pushLoki } from "../observability/loki.js";


export function batch(requests, transaction) {
    const batchReq = requests.map(r => ({
        method: r.method || "GET",
        url: r.url,
        params: {
            headers: buildHeaders(r.method || "GET", r.headers || {}),
            tags: {
                api: r.name,
                transaction: transaction
            }
        }
    }));

    const responses = http.batch(batchReq);

    // ✅ Loop hasil response — check status + catat metric + log error
    responses.forEach((res, i) => {
        const name = requests[i].name;

        // ✅ Catat duration per request
        api_duration.add(res.timings.duration, {
            api: name,
            transaction: transaction
        });

        // ✅ Check status 200 — muncul di result seperti api()
        check(res, {
            [`${name} status 200`]: r => r.status === 200
        });

        // ✅ Log error jika gagal
        if (res.status !== 200) {
            const errorMsg = `
API ERROR (batch)
-----------------
API         : ${name}
URL         : ${requests[i].url}
Status      : ${res.status}
Transaction : ${transaction}
VU          : ${__VU}
ITER        : ${__ITER}
`;
            console.error(errorMsg);
            pushLoki("error", JSON.stringify({
                type:        "BATCH_ERROR",
                api:         name,
                url:         requests[i].url,
                status:      res.status,
                transaction: transaction,
                vu:          __VU,
                iter:        __ITER
            }));
        }
    });

    return responses;
}