// ─────────────────────────────────────────────────────────────────────────────
// Runner API — list scenario/script/hasil & jalankan scenario k6 dari UI.
// Router Express terpisah agar server.js tetap ramping (satu tanggung jawab).
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const MODES = ['testhit', 'loadtest', 'stress', 'spike'];

// Buang karakter berbahaya (cegah path traversal & argumen liar).
const cleanName = (s) => String(s || '').replace(/[^a-zA-Z0-9._-]/g, '');
const cleanTag  = (s) => String(s || '').trim().replace(/[^a-zA-Z0-9._:-]/g, '');

// "k=v,k=v" → ['--tag','k=v', ...] (hanya pasangan valid)
function parseTags(raw) {
  const args = [];
  String(raw || '').split(',').forEach((pair) => {
    const [k, v] = pair.split('=');
    const key = cleanTag(k), val = cleanTag(v);
    if (key && val) args.push('--tag', `${key}=${val}`);
  });
  return args;
}

/**
 * Router API runner. `root` = folder repo (satu level di atas dashboard/).
 * Satu run pada satu waktu (tool lokal single-run).
 */
export function createRunnerRouter(root) {
  const SCEN_DIR    = path.join(root, 'workspace', 'scenarios');
  const SCRIPTS_DIR = path.join(root, 'workspace', 'scripts');
  const RESULTS_DIR = path.join(root, 'results');
  const K6_BIN      = path.join(root, 'bin', process.platform === 'win32' ? 'k6.exe' : 'k6');

  const router = Router();
  let currentRun = null; // { child, testid }

  // ── List scenario ──────────────────────────────────────────────────────────
  router.get('/api/scenarios', (req, res) => {
    try {
      const scenarios = fs.readdirSync(SCEN_DIR)
        .filter((f) => f.endsWith('.js'))
        .map((f) => f.replace(/\.js$/, ''))
        .sort();
      res.json({ scenarios });
    } catch { res.json({ scenarios: [] }); }
  });

  // ── List script (channel → BP) ──────────────────────────────────────────────
  router.get('/api/scripts', (req, res) => {
    try {
      const channels = fs.readdirSync(SCRIPTS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({
          channel: d.name,
          bps: fs.readdirSync(path.join(SCRIPTS_DIR, d.name), { withFileTypes: true })
            .filter((x) => x.isDirectory())
            .map((x) => x.name)
            .sort(),
        }))
        .sort((a, b) => a.channel.localeCompare(b.channel));
      res.json({ channels });
    } catch { res.json({ channels: [] }); }
  });

  // ── Riwayat run (CSV di results/) ────────────────────────────────────────────
  router.get('/api/results', (req, res) => {
    try {
      if (!fs.existsSync(RESULTS_DIR)) return res.json({ results: [] });
      const results = fs.readdirSync(RESULTS_DIR)
        .filter((f) => f.toLowerCase().endsWith('.csv'))
        .map((f) => {
          const full = path.join(RESULTS_DIR, f);
          const st = fs.statSync(full);
          return { name: f, path: full, sizeMB: +(st.size / 1048576).toFixed(2), mtime: st.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
      res.json({ results });
    } catch { res.json({ results: [] }); }
  });

  // ── Jalankan scenario — stream log via SSE ───────────────────────────────────
  router.get('/api/run', (req, res) => {
    const scenario   = cleanName(req.query.scenario);
    const mode       = MODES.includes(String(req.query.mode)) ? String(req.query.mode) : 'testhit';
    const vus        = Math.max(1, parseInt(req.query.vus) || 1);
    const iterations = Math.max(1, parseInt(req.query.iterations) || 1);
    const csv        = String(req.query.csv) === 'true';
    const debug      = String(req.query.debug) === 'true';
    const webdash    = String(req.query.webdash) === 'true';

    const scenPath = path.join(SCEN_DIR, `${scenario}.js`);
    if (!scenario || !scenPath.startsWith(SCEN_DIR + path.sep) || !fs.existsSync(scenPath)) {
      return res.status(404).json({ error: 'Scenario tidak ditemukan' });
    }
    if (!fs.existsSync(K6_BIN)) {
      return res.status(500).json({ error: 'k6 binary tidak ditemukan di bin/.' });
    }
    if (currentRun) {
      return res.status(409).json({ error: 'Masih ada test yang berjalan. Hentikan dulu.' });
    }

    // Susun argumen k6.
    const stamp  = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '').slice(0, 16);
    const testid = `${scenario}_${mode}_${stamp}`;
    const args = [
      'run',
      '-e', `MODE=${mode}`, '-e', `VUS=${vus}`, '-e', `ITERATIONS=${iterations}`,
      '--tag', `testid=${testid}`,
      ...parseTags(req.query.tags),
    ];
    let csvName = null;
    if (csv) {
      if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
      csvName = `${testid}.csv`;
      args.push('--out', `csv=${path.join(RESULTS_DIR, csvName)}`);
    }
    if (webdash) args.push('--out', 'web-dashboard');
    if (debug)   args.push('--http-debug=full');
    args.push(scenPath);

    // Header SSE.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    send('start', { testid, cmd: `k6 ${args.join(' ')}` });

    let child;
    try {
      child = spawn(K6_BIN, args, { cwd: root }); // array args + tanpa shell → aman injeksi
    } catch (err) {
      send('error', { message: err.message });
      return res.end();
    }
    currentRun = { child, testid };

    const clear = () => { if (currentRun && currentRun.child === child) currentRun = null; };
    child.stdout.on('data', (d) => send('log', { text: d.toString() }));
    child.stderr.on('data', (d) => send('log', { text: d.toString() }));
    child.on('close', (code) => { send('done', { code, csv: csvName }); clear(); res.end(); });
    child.on('error', (err) => { send('error', { message: err.message }); clear(); res.end(); });

    // Klien menutup tab saat run → hentikan proses k6.
    req.on('close', () => {
      if (currentRun && currentRun.child === child && child.exitCode === null) {
        try { child.kill(); } catch {}
        clear();
      }
    });
  });

  // ── Stop run ─────────────────────────────────────────────────────────────────
  router.post('/api/run/stop', (req, res) => {
    if (!currentRun) return res.json({ stopped: false });
    const { testid } = currentRun;
    try { currentRun.child.kill(); } catch {}
    currentRun = null;
    res.json({ stopped: true, testid });
  });

  return router;
}
