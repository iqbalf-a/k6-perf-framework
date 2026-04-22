// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: QuickPizza API — https://quickpizza.grafana.com
// API publik dari dokumentasi resmi k6 (Grafana), aman dijalankan langsung.
//
// Flow:
//   1. Login               → POST /api/users/token/login
//   2. Recommend Pizza      → POST /api/pizza           (butuh auth)
//   3. Get Pizza Detail     → GET  /api/pizza/:id       (pakai id hasil extract)
//   4. Submit Rating        → POST /api/ratings         (butuh auth)
//   5. List Ratings         → GET  /api/ratings         (butuh auth)
//
// Extractor yang didemonstrasikan:
//   type: 'json'   — ambil field dari JSON body respons
//   type: 'regex'  — ambil substring dari raw body pakai regex
//   type: 'header' — ambil nilai dari response header
// ─────────────────────────────────────────────────────────────────────────────
import { sleep } from 'k6';
import { getSession } from '../../../../lib/core/session.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { getUser } from '../../../../lib/data/userProvider.js';
import { addAutoHeader, deleteAutoHeader } from '../../../../lib/http/headers.js';
import { BASE_URL } from '../channel.config.js';

const users = loadCSV(import.meta.resolve('./PizzaOrder_data.csv'));

export function PizzaOrder() {
    const user = getUser(users, 'PizzaOrder');
    const session = getSession();
    let tx = '';

    // ── BP001_01 — Login → extract token dari JSON body ───────────────────────
    // POST /api/users/token/login  →  { "token": "abcd1234" }
    tx = 'BP001_01_Login';
    transaction(tx, () => {
        api({
            name       : '001_01_01_/api/users/token/login',
            url        : `${BASE_URL}/api/users/token/login`,
            method     : 'POST',
            body       : JSON.stringify({ username: user.username, password: user.password }),
            transaction: tx,
            headers    : { 'Content-Type': 'application/json' },
            extract    : [
                // type 'json' — field langsung di root response body
                // session.token otomatis dipakai buildHeaders sebagai Authorization
                { name: 'token', type: 'json', path: 'token' },
            ],
            // debug: true,
        });
    });
    sleep(1);

    // Inject Authorization header untuk semua request berikutnya
    addAutoHeader('Authorization', `Token ${session.token}`);

    // ── BP001_02 — Recommend Pizza → extract json + regex ─────────────────────
    // POST /api/pizza  →  { "pizza": { "id": 170941, "name": "...", "tool": "..." }, "calories": 425 }
    tx = 'BP001_02_RecommendPizza';
    transaction(tx, () => {
        api({
            name       : '001_02_01_/api/pizza',
            url        : `${BASE_URL}/api/pizza`,
            method     : 'POST',
            body       : JSON.stringify({
                maxCaloriesPerSlice : 800,
                mustBeVegetarian    : false,
                maxNumberOfToppings : 4,
            }),
            transaction: tx,
            extract    : [
                // type 'json' — path bersarang
                { name: 'pizzaName',     type: 'json',  path: 'pizza.name'  },
                { name: 'pizzaCalories', type: 'json',  path: 'calories'    },
                // type 'regex' — ambil nama tool dari raw body dengan regex
                // body contoh: ... "tool":"Knife" ...
                { name: 'pizzaTool',     type: 'regex', pattern: '"tool":"(.*?)"' },
            ],
            // debug: true,
        });
    });
    sleep(1);

    // ── BP001_03 — Get Pizza Detail → pakai id statis dari DB permanen ─────────
    // GET /api/pizza/:id  →  { "id": 1, "name": "...", "dough": {...}, "ingredients": [...] }
    // Catatan: pizza ID dari step recommend (session.pizzaId) adalah temporary;
    // untuk demo get-by-id dipakai ID=1 yang selalu ada di database.
    tx = 'BP001_03_GetPizzaDetail';
    transaction(tx, () => {
        api({
            name       : '001_03_01_/api/pizza/:id',
            url        : `${BASE_URL}/api/pizza/1`,
            method     : 'GET',
            transaction: tx,
            extract    : [
                // Ambil nama pizza yang disimpan di DB
                { name: 'staticPizzaName', type: 'json', path: 'name' },
                // type 'header' — ambil nilai dari response header
                // Berguna untuk extract Set-Cookie, X-Request-Id, X-Session-Id, dll.
                { name: 'contentType', type: 'header', header: 'Content-Type' },
            ],
        });
    });
    sleep(1);

    // ── BP001_04 — Submit Rating → extract rating id ──────────────────────────
    // POST /api/ratings  →  { "id": 12345, "stars": 5, "pizza_id": 1 }
    // Catatan: pizza_id harus berupa ID dari pizza yang tersimpan di DB (bukan pizza
    // temporary dari recommend). ID 1–13 adalah pizza seed yang selalu tersedia.
    tx = 'BP001_04_SubmitRating';
    transaction(tx, () => {
        api({
            name       : '001_04_01_/api/ratings',
            url        : `${BASE_URL}/api/ratings`,
            method     : 'POST',
            body       : JSON.stringify({ stars: 5, pizza_id: 1 }),
            transaction: tx,
            extract    : [
                { name: 'ratingId', type: 'json', path: 'id' },
            ],
        });
    });
    sleep(1);

    // ── BP001_05 — List Ratings ────────────────────────────────────────────────
    // GET /api/ratings  →  { "ratings": [ { "id": ..., "stars": ..., "pizza_id": ... }, ... ] }
    tx = 'BP001_05_ListRatings';
    transaction(tx, () => {
        api({
            name       : '001_05_01_/api/ratings',
            url        : `${BASE_URL}/api/ratings`,
            method     : 'GET',
            transaction: tx,
        });
    });

    // Bersihkan auth header setelah flow selesai
    deleteAutoHeader('Authorization');

    sleep(3);
}
