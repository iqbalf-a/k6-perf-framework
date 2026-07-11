import http from "k6/http";

export function pushLoki(level, message) {

    const payload = JSON.stringify({

        streams: [{

            stream: {
                job: "k6",
                level: level
            },

            values: [
                [`${Date.now() * 1000000}`, message]
            ]

        }]

    });

    http.post(
        "http://<loki-host>:3100/loki/api/v1/push",
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

}