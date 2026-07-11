# Runner UI — Rencana Implementasi (FINAL)

> Status: **FINAL — arah & scope disetujui user.** Belum dikoding.
> Fitur: UI dashboard untuk **list scenario**, **list script (channel/BP)**,
> **jalankan scenario** (log real-time), dan **riwayat run**.
> Kerjakan bertahap sesuai "Task List".

---

## 1. Tujuan
Menjadikan dashboard sebagai pusat kontrol: pilih scenario, atur mode & VU, jalankan k6,
lihat log real-time, dan buka hasil — tanpa buka CMD.

## 2. Keputusan (dikunci)
| Topik | Keputusan |
|------|-----------|
| Tampilan saat run | **Log mentah saja** (panel terminal). Tanpa metrik live/grafik di v1. |
| Field form | Dasar: **mode, VUs, iterations, Export CSV, Debug**. Tambahan: **totalVus, k6 web dashboard (`--out web-dashboard`), tags kustom**. |
| Akses | **Jaringan tim (LAN)** — bind `0.0.0.0`. v1 tanpa auth; ada guard path + injeksi. Token/allowlist = catatan fase depan. |
| Isi v1 | **Run Test (inti) + Scripts list + Riwayat run.** (Tanpa tombol "Analisa hasil" terpisah — riwayat/dashboard jadi jalur analisa.) |
| Streaming | **SSE** (`EventSource`). |
| Konkurensi | **Satu run** pada satu waktu. |
| Menu | Grup **RUN** di dalam "Tools & Docs" (Run Test · Scripts · Riwayat). Sidebar utama tetap 2 menu. |

## 3. Rekonsiliasi totalVus (penting)
User ingin total VU **di scenario** (`loadConfig.totalVus`), tapi juga mau bisa diatur dari UI.
Solusi: form kirim `-e VUS=<n>`, dan scenario persentase memakai pola:
```js
distributeVus(bpList, parseInt(__ENV.VUS) || loadConfig.totalVus);
```
→ default dari `loadConfig.totalVus` (saat run via CMD tanpa flag), tapi **UI bisa override**.
Saat implementasi: perbarui `scenario_template.js` ke pola ini + jelaskan di docs.
Field UI cukup satu: **"VUs / Total VU"** → dikirim sebagai `-e VUS`.

## 4. Arsitektur
```
Browser (React: RunnerPage / ScriptsPage / HistoryPage)
   │  GET  /api/scenarios            → daftar scenario
   │  GET  /api/scripts              → daftar channel/BP
   │  GET  /api/results              → daftar CSV di results/ (riwayat)
   │  EventSource GET /api/run?...   → spawn k6, stream log (SSE)
   │  POST /api/run/stop             → kill proses
   ▼
server.js ──spawn(array args, TANPA shell)──► bin/k6.exe run ... workspace/scenarios/<x>.js
```

## 5. Backend (`dashboard/server.js`)
Konstanta (root = satu level di atas `dashboard/`):
`ROOT=..` · `SCEN_DIR=workspace/scenarios` · `SCRIPTS_DIR=workspace/scripts` ·
`RESULTS_DIR=results` · `K6_BIN=bin/k6.exe|bin/k6`. Tambah `import { spawn } from 'child_process'`.
Semua endpoint didaftarkan **sebelum** catch-all SPA `app.get('*')`.

1. `GET /api/scenarios` → `{ scenarios: string[] }` (nama tanpa `.js`, sorted).
2. `GET /api/scripts` → `{ channels: [{ channel, bps: string[] }] }`.
3. `GET /api/results` → `{ results: [{ name, sizeMB, mtime }] }` (isi `results/*.csv`, terbaru dulu).
4. `GET /api/run` (SSE) — query: `scenario, mode, vus, iterations, csv, debug, webdash, tags`.
   - **Validasi/keamanan:**
     - `scenario`: sanitize `[^a-zA-Z0-9._-]`; wajib `startsWith(SCEN_DIR+sep)` + `existsSync` (cegah traversal).
     - `mode` ∈ {testhit,loadtest,stress,spike}; `vus`/`iterations` = int ≥ 1.
     - `tags`: parse `k=v` dipisah koma; sanitize k & v (`[^a-zA-Z0-9._:-]`).
     - `spawn(K6_BIN, args, {cwd:ROOT})` **tanpa `shell:true`** → tidak ada shell injection.
     - `K6_BIN` harus ada; kalau `currentRun` masih jalan → 409.
   - Header SSE: `text/event-stream`, `no-cache`, `keep-alive`, `X-Accel-Buffering:no`.
   - `testid=<scenario>_<mode>_<timestamp>`. Args: `run -e MODE -e VUS -e ITERATIONS --tag testid=..`
     `[--tag <k=v> ...] [--out csv=results/<testid>.csv] [--out web-dashboard] [--http-debug=full] <scenPath>`.
   - Events: `start {testid,cmd}` · `log {text}` (stdout+stderr) · `done {code,csv}` · `error {message}`.
   - `currentRun={child,testid}`; `req.on('close')` → kalau masih jalan `child.kill()`.
5. `POST /api/run/stop` → kill `currentRun.child`; balas `{stopped:bool,testid}`.

## 6. Frontend (`dashboard/src/main.jsx`)
**Routing/hash:** perluas `getPageFromHash` (tambah `run`,`scripts`,`results` → `'tools'`),
`getSubFromHash` (`run`/`scripts`/`results`; default `{kind:'run'}`), `subToHash`.

**ToolsPage:** grup sub-nav baru **RUN** (Run Test→`go('run')` · Scripts→`go('scripts')` ·
Riwayat→`go('results')`) di atas Generator. Render sub sesuai `sub.kind` di `.main-panel`
(kecuali doc → `DocContent`). Teruskan `onResult` (untuk buka CSV ke dashboard).

**App:** `runResult(csvPathAbs)` — POST `/api/parse-path` → `setResult` + `navigate('dashboard')`.

**RunnerPage** (`onResult`): state scenario/mode/vus/iterations/csv/debug/webdash/tags/logLines/status/lastCsv.
- Mount: `fetch('/api/scenarios')`.
- Form: select scenario · select mode · number "VUs / Total VU" · number iterations ·
  checkbox Export CSV · checkbox Debug · checkbox k6 web dashboard · input Tags (`k=v,k=v`).
- `run()`: `EventSource('/api/run?'+params)`; handler `start/log/done/error`; auto-scroll log;
  tombol Run↔Stop; badge status (idle/running/done/error). Selesai+csv → catat `lastCsv`.
- Panel **log terminal** (mono, auto-scroll, pre-wrap).

**ScriptsPage:** `fetch('/api/scripts')` → daftar channel + BP (read-only).

**HistoryPage:** `fetch('/api/results')` → tabel CSV (nama, ukuran, waktu); klik → `onResult(pathAbs)`
(muat ke Results Dashboard).

## 7. CSS (`dashboard/src/styles.css`)
- `.run-log` — terminal: `background:var(--code)`, `font-family:var(--font-mono)`, `12.5px`,
  `white-space:pre-wrap`, `overflow:auto`, `max-height:~58vh`, radius, border.
- `input[type="checkbox"]{ width:auto }` (hindari full-width dari `input{width:100%}`).
- `.chk` — label checkbox: flex row, `text-transform:none`, font normal.
- `.btn-run` (gradient aksen), `.btn-stop` (merah), `.run-status.running/done/error` (badge).
- `.run-fields` (grid form), tabel riwayat pakai `.panel table` yang ada.

## 8. Task List (urut)
1. [ ] `server.js`: `import spawn` + konstanta path.
2. [ ] `server.js`: `GET /api/scenarios`, `/api/scripts`, `/api/results` (sisip sebelum SPA catch-all).
3. [ ] `server.js`: `GET /api/run` (SSE) + `POST /api/run/stop`.
4. [ ] Uji backend: list endpoints (fetch), jalankan 1 scenario via SSE (log, exit code, CSV muncul).
5. [ ] `main.jsx`: perluas routing (`getPageFromHash`/`getSubFromHash`/`subToHash`).
6. [ ] `main.jsx`: `RunnerPage` + `ScriptsPage` + `HistoryPage`.
7. [ ] `main.jsx`: `ToolsPage` grup RUN + render; `App.runResult` + `onResult`.
8. [ ] `styles.css`: `.run-log`, checkbox fix, `.chk`, tombol/status.
9. [ ] Perbarui `scenario_template.js` ke pola `parseInt(__ENV.VUS) || loadConfig.totalVus` + docs.
10. [ ] `npx vite build` (validasi compile) → hapus `dist`.
11. [ ] Restart `k6perf dashboard` → uji end-to-end (list, run testhit, stop, CSV, riwayat→analisa).

## 9. Kriteria selesai (v1)
- List scenario dari `workspace/scenarios/` tampil; Run `scenario_example` (testhit) → log k6 real-time;
  selesai dengan exit code; Export CSV → file di `results/` + muncul di Riwayat; klik riwayat → hasil
  terbuka di Results Dashboard.
- Stop menghentikan run; menutup tab saat run juga menghentikan proses.
- Scripts list menampilkan channel & BP.
- Path traversal ditolak (404); tags/scenario tersanitasi; spawn tanpa shell (no injection).
- Sidebar utama tetap 2 menu; semua konsisten satu tema (satu web).

## 10. Catatan/risiko & fase depan
- **Keamanan LAN:** v1 tanpa auth. Fase depan: token bersama (`K6PERF_TOKEN`) / allowlist IP /
  tombol konfirmasi sebelum run. Guard path + spawn-tanpa-shell sudah mengurangi risiko.
- k6 tulis progress bar ke **stderr** (`\r`) → log bisa "berkedip"; rapikan bila perlu (fase 2).
- Perubahan `server.js` butuh **restart** dashboard (bukan HMR).
- Agent (Claude) tak bisa eksekusi `cmd/powershell` → uji end-to-end UI oleh user; agent validasi
  via `vite build` + `bin/k6.exe` langsung.
- Fase 2 kandidat: metrik live saat run, riwayat lebih kaya (durasi/exit), env override (BASE_URL),
  multi-run/antrian, hapus CSV lama dari UI.
