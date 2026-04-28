// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: QuickPizza API — https://quickpizza.grafana.com
// API publik dari dokumentasi resmi k6 (Grafana), aman dijalankan langsung.
//
// Flow:
//   1. Login               → POST /api/users/token/login
//   2. Recommend Pizza      → POST /api/pizza           (butuh auth)
//   3. Get Pizza Details    → GET  /api/pizza/1 + /api/pizza/2  (batch paralel)
//   4. Submit Rating        → POST /api/ratings         (butuh auth)
//   5. List Ratings         → GET  /api/ratings         (butuh auth) + extract all
//
// Fitur yang didemonstrasikan:
//   extract single  — type: 'jsonpath', 'regex', 'header'
//   extract all     — type: 'jsonpath' + all: true  (setara Select Ordinal: All VuGen)
//   batch           — beberapa request paralel dalam satu transaksi
// ─────────────────────────────────────────────────────────────────────────────
import { sleep } from 'k6';
import { runScript } from '../../../../lib/core/runScript.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { batch } from '../../../../lib/http/batch.js';
import { addAutoHeader } from '../../../../lib/http/headers.js';
import { parameter } from '../parameter.config.js';

const dataset = loadCSV(import.meta.resolve('./PizzaOrder_data.csv'));

export function PizzaOrder() {
    runScript({
        dataset, name: 'PizzaOrder', parameter, fn: (data, session) => {
            let tx = '';

            // ── BP001_01 — Login → extract token dari JSON body ───────────────────────
            // POST /api/users/token/login  →  { "token": "abcd1234" }
            tx = 'BP001_01_Login';
            transaction(tx, () => {
                api({
                    name: '001_01_01_/api/users/token/login',
                    url: `${parameter.BASE_URL}/api/users/token/login`,
                    method: 'POST',
                    body: JSON.stringify({ username: data.username, password: data.password }),
                    transaction: tx,
                    headers: { 'Content-Type': 'application/json' },
                    extract: [
                        { name: 'token', type: 'jsonpath', path: '$.token' },
                    ]
                });
            });
            sleep(1);

            // Inject Authorization header untuk semua request berikutnya
            addAutoHeader('Authorization', `Token ${session.token}`);

            // ── BP001_02 — Recommend Pizza → extract jsonpath + regex + header ────────
            // POST /api/pizza  →  { "pizza": { "id": 170941, "name": "...", "tool": "..." }, "calories": 425 }
            tx = 'BP001_02_RecommendPizza';
            transaction(tx, () => {
                api({
                    name: '001_02_01_/api/pizza',
                    url: `${parameter.BASE_URL}/api/pizza`,
                    method: 'POST',
                    body: JSON.stringify({
                        maxCaloriesPerSlice: 800,
                        mustBeVegetarian: false,
                        maxNumberOfToppings: 4,
                    }),
                    transaction: tx,
                    extract: [
                        // path bersarang
                        { name: 'pizzaName', type: 'jsonpath', path: '$.pizza.name' },
                        { name: 'pizzaCalories', type: 'jsonpath', path: '$.calories' },
                        // type 'regex' — ambil nilai dari raw body dengan regex
                        { name: 'pizzaTool', type: 'regex', pattern: '"tool":"(.*?)"' },
                        // type 'header' — ambil nilai dari response header
                        { name: 'contentType', type: 'header', header: 'Content-Type' },
                    ],
                });
            });
            sleep(1);

            // ── BP001_03 — Get Pizza Details → batch paralel ──────────────────────────
            // GET /api/pizza/1  &  GET /api/pizza/2  — dikirim serentak
            tx = 'BP001_03_GetPizzaDetails';
            transaction(tx, () => {
                batch([
                    { name: '001_03_01_/api/pizza/1', url: `${parameter.BASE_URL}/api/pizza/1` },
                    { name: '001_03_02_/api/pizza/2', url: `${parameter.BASE_URL}/api/pizza/2` },
                ], tx);
            });
            sleep(1);

            // ── BP001_04 — Submit Rating ───────────────────────────────────────────────
            // POST /api/ratings  →  { "id": 12345, "stars": 5, "pizza_id": 1 }
            tx = 'BP001_04_SubmitRating';
            transaction(tx, () => {
                api({
                    name: '001_04_01_/api/ratings',
                    url: `${parameter.BASE_URL}/api/ratings`,
                    method: 'POST',
                    body: JSON.stringify({ stars: 5, pizza_id: 1 }),
                    transaction: tx,
                    extract: [
                        { name: 'ratingId', type: 'jsonpath', path: '$.id' },
                    ],
                });
            });
            sleep(1);

            // ── BP001_05 — List Ratings → extract all ─────────────────────────────────
            // GET /api/ratings  →  { "ratings": [ { "id": 1, "stars": 5, "pizza_id": 1 }, ... ] }
            tx = 'BP001_05_ListRatings';
            transaction(tx, () => {
                api({
                    name: '001_05_01_/api/ratings',
                    url: `${parameter.BASE_URL}/api/ratings`,
                    method: 'GET',
                    transaction: tx,
                    extract: [
                        // all: true → setara Select Ordinal: All di VuGen
                        { name: 'ratingId', type: 'jsonpath', path: '$.ratings[*].id', all: true },
                        { name: 'ratingStars', type: 'jsonpath', path: '$.ratings[*].stars', all: true },
                        // → session.ratingId_1, session.ratingId_2, session.ratingId_count
                        // → session.ratingId = [full array]
                    ],
                });
            });

            sleep(3);
        }
    });
}
