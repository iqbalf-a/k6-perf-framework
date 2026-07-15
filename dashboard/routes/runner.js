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
const cleanName  = (s) => String(s || '').replace(/[^a-zA-Z0-9._-]/g, '');
const cleanTag   = (s) => String(s || '').trim().replace(/[^a-zA-Z0-9._:-]/g, '');
const cleanIdent = (s) => String(s || '').replace(/[^a-zA-Z0-9_]/g, '');   // identifier fn JS
const cleanBpName= (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '');  // nama BP di bpList

// Generate isi file scenario dari struktur (imports + bpList + loadConfig + boilerplate).
// Dipakai POST /api/scenarios/:name. Prediktif — sejalan dengan Scenario Generator.
function generateScenarioSource(bps, loadConfig) {
  const seen = new Set();
  const imports = [];
  for (const bp of bps) {
    const key = `${bp.fn}|${bp.importPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imports.push(`import { ${bp.fn} } from '${bp.importPath}';`);
  }
  const rows = bps.map((bp) => {
    const alloc = bp.mode === 'percent' ? `percent: ${bp.value}` : `users: ${bp.value}`;
    return `    { name: '${bp.name}', ${alloc}, fn: ${bp.fn}, thinkTime: ${bp.thinkTime} },`;
  }).join('\n');

  const lc = loadConfig || {};
  const usesPercent = bps.some((bp) => bp.mode === 'percent');
  const totalDefault = (lc.totalVus != null && Number(lc.totalVus) > 0) ? Number(lc.totalVus) : 100;

  const lcLines = [
    `    rampStep: ${lc.rampStep ?? 1},`,
    `    rampInterval: ${lc.rampInterval ?? 1},`,
    `    holdDuration: ${lc.holdDuration ?? 5},`,
  ];
  if (usesPercent || (lc.totalVus != null && Number(lc.totalVus) > 0)) {
    lcLines.push(`    totalVus: ${totalDefault},`);
  }

  // Mode percent butuh distributeVus() untuk mengubah percent -> users absolut.
  const fwImports = usesPercent
    ? '{ MODE, createOptions, dispatchVu, setBpList, distributeVus }'
    : '{ MODE, createOptions, dispatchVu, setBpList }';
  const distributeLine = usesPercent
    ? `\n// Ubah percent -> users absolut. Total dari -Vus (jika di-set) atau totalVus di atas.\ndistributeVus(bpList, parseInt(__ENV.VUS) || loadConfig.totalVus);`
    : '';

  return `// ─────────────────────────────────────────────────────────────────────────────
// Scenario di-generate via dashboard (Run Test -> Setting Scenario).
// Boleh diedit manual, tapi simpan ulang dari dashboard akan menimpa file ini.
// ─────────────────────────────────────────────────────────────────────────────
import ${fwImports} from '../../framework/index.js';

${imports.join('\n')}

const bpList = [
${rows}
];

const loadConfig = {
${lcLines.join('\n')}
};

setBpList(bpList);${distributeLine}
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }
`;
}

// Baca config Prometheus RW dari framework/observability/prometheus.env
// (KEY=VALUE, satu sumber yang juga dipakai k6perf.cmd). Baris '#' = komentar.
function loadPrometheusEnv(root) {
  const out = {};
  try {
    const file = path.join(root, 'framework', 'observability', 'prometheus.env');
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq > 0) out[s.slice(0, eq).trim()] = s.slice(eq + 1).trim();
    }
  } catch { /* file opsional — biar k6 yang lapor bila URL kosong */ }
  return out;
}

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

  // ── Parse bpList dari file scenario ────────────────────────────────────────
  function parseScenarioFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract bpList array contents
    const bpListMatch = content.match(/const\s+bpList\s*=\s*\[([\s\S]*?)\];/);
    if (!bpListMatch) return { bps: [], loadConfig: null };

    // Map fn -> importPath dari statement import (untuk pre-fill & simpan balik)
    const importMap = {};
    const impRegex = /import\s*\{\s*([^}]+?)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
    let im;
    while ((im = impRegex.exec(content)) !== null) {
      im[1].split(',').forEach((raw) => {
        const fn = raw.trim().split(/\s+as\s+/)[0].trim();
        if (fn) importMap[fn] = im[2];
      });
    }

    // Strip single-line comments before parsing
    const bpListStr = bpListMatch[1].replace(/\/\/.*$/gm, '');

    // Extract individual BP objects: { name, users|percent, fn, thinkTime }
    const bpRegex = /\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*(?:users:\s*(\d+)|percent:\s*(\d+))\s*,\s*fn:\s*(\w+)\s*(?:,\s*thinkTime:\s*(\d+))?\s*\}/g;
    const bps = [];
    let m;
    while ((m = bpRegex.exec(bpListStr)) !== null) {
      bps.push({
        name: m[1],
        users: m[2] ? parseInt(m[2]) : null,
        percent: m[3] ? parseInt(m[3]) : null,
        fn: m[4],
        importPath: importMap[m[4]] || null,
        thinkTime: m[5] ? parseInt(m[5]) : 0,
      });
    }

    // Extract loadConfig
    const loadConfigMatch = content.match(/const\s+loadConfig\s*=\s*\{([\s\S]*?)\};/);
    let loadConfig = null;
    if (loadConfigMatch) {
      const lcStr = loadConfigMatch[1];
      const getVal = (key) => {
        const m = lcStr.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
        return m ? parseInt(m[1]) : null;
      };
      loadConfig = {
        rampStep: getVal('rampStep'),
        rampInterval: getVal('rampInterval'),
        holdDuration: getVal('holdDuration'),
        totalVus: getVal('totalVus'),
      };
    }

    return { bps, loadConfig };
  }

  // ── List scenario dengan detail bpList ─────────────────────────────────────
  router.get('/api/scenarios/detail', (req, res) => {
    try {
      const files = fs.readdirSync(SCEN_DIR)
        .filter((f) => f.endsWith('.js'))
        .sort();
      const scenarios = files.map((f) => {
        const name = f.replace(/\.js$/, '');
        const filePath = path.join(SCEN_DIR, f);
        const { bps, loadConfig } = parseScenarioFile(filePath);
        return { name, bps, loadConfig };
      });
      res.json({ scenarios });
    } catch { res.json({ scenarios: [] }); }
  });

  // ── Katalog BP tersedia (fn + importPath) untuk "Tambah BP" ─────────────────
  // Runnable BP = `export function Nama()` (params kosong); helper transaksi
  // seperti Login(tx,data) otomatis terabaikan.
  function buildBpCatalog() {
    const catalog = [];
    let channels;
    try { channels = fs.readdirSync(SCRIPTS_DIR, { withFileTypes: true }); } catch { return catalog; }
    for (const ch of channels) {
      if (!ch.isDirectory()) continue;
      const chDir = path.join(SCRIPTS_DIR, ch.name);
      let bpDirs;
      try { bpDirs = fs.readdirSync(chDir, { withFileTypes: true }); } catch { continue; }
      for (const bp of bpDirs) {
        if (!bp.isDirectory()) continue;
        let files;
        try { files = fs.readdirSync(path.join(chDir, bp.name)).filter((f) => f.endsWith('.js')); } catch { continue; }
        for (const file of files) {
          let content;
          try { content = fs.readFileSync(path.join(chDir, bp.name, file), 'utf8'); } catch { continue; }
          const m = content.match(/export\s+function\s+(\w+)\s*\(\s*\)/);
          if (!m) continue;
          catalog.push({
            channel: ch.name,
            bp: bp.name,
            fn: m[1],
            importPath: `../scripts/${ch.name}/${bp.name}/${file}`,
          });
        }
      }
    }
    return catalog;
  }

  router.get('/api/bp-catalog', (req, res) => {
    try { res.json({ catalog: buildBpCatalog() }); }
    catch { res.json({ catalog: [] }); }
  });

  // ── Simpan / buat scenario (tulis file .js dari struktur) ────────────────────
  router.post('/api/scenarios/:name', (req, res) => {
    const name = cleanName(req.params.name);
    if (!name) return res.status(400).json({ error: 'Nama scenario tidak valid' });
    const filePath = path.join(SCEN_DIR, `${name}.js`);
    if (!filePath.startsWith(SCEN_DIR + path.sep)) return res.status(400).json({ error: 'Path tidak valid' });

    const body = req.body || {};
    if (fs.existsSync(filePath) && body.overwrite !== true) {
      return res.status(409).json({ error: `Scenario "${name}" sudah ada.` });
    }

    // Validasi BP terhadap katalog (cegah import sembarangan).
    const known = new Set(buildBpCatalog().map((c) => `${c.fn}|${c.importPath}`));
    const rawBps = Array.isArray(body.bps) ? body.bps : [];
    if (rawBps.length === 0) return res.status(400).json({ error: 'Minimal 1 BP.' });

    // Mode alokasi: scenario-level (frontend) atau per-BP (backward compat)
    const scenarioMode = body.mode === 'percent' ? 'percent' : 'users';

    const bps = [];
    for (const b of rawBps) {
      const bpName = cleanBpName(b.name);
      const fn = cleanIdent(b.fn);
      const importPath = String(b.importPath || '');
      if (!bpName) return res.status(400).json({ error: 'Nama BP kosong.' });
      if (!known.has(`${fn}|${importPath}`)) return res.status(400).json({ error: `BP tidak dikenal: ${fn}` });
      // Gunakan mode per-BP bila ada, atau fallback ke scenario-level
      const bpMode = b.mode === 'percent' ? 'percent' : scenarioMode;
      // Nilai bisa datang sbg `value`, atau `percent`/`users` (payload frontend).
      const rawVal = b.value != null ? b.value : (bpMode === 'percent' ? b.percent : b.users);
      bps.push({
        name: bpName,
        fn,
        importPath,
        mode: bpMode,
        value: Math.max(0, parseInt(rawVal) || 0),
        thinkTime: Math.max(0, parseInt(b.thinkTime) || 0),
      });
    }

    const lc = body.loadConfig || {};
    const loadConfig = {
      rampStep:     Math.max(0, parseInt(lc.rampStep) || 1),
      rampInterval: Math.max(0, parseInt(lc.rampInterval) || 1),
      holdDuration: Math.max(0, parseInt(lc.holdDuration) || 1),
      totalVus:     (lc.totalVus != null && lc.totalVus !== '') ? Math.max(0, parseInt(lc.totalVus) || 0) : null,
    };

    try {
      fs.writeFileSync(filePath, generateScenarioSource(bps, loadConfig), 'utf8');
      res.json({ success: true, name });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
    const prometheus = String(req.query.prometheus) === 'true';

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
    if (prometheus) args.push('--out', 'experimental-prometheus-rw');
    args.push(scenPath);

    // Env untuk child k6. Untuk Prometheus, default dibaca dari
    // framework/observability/prometheus.env (env server yang sudah di-set menang).
    const childEnv = { ...process.env };
    if (prometheus) {
      const cfg = loadPrometheusEnv(root);
      if (!childEnv.K6_PROMETHEUS_RW_SERVER_URL && cfg.K6_PROMETHEUS_RW_SERVER_URL) childEnv.K6_PROMETHEUS_RW_SERVER_URL = cfg.K6_PROMETHEUS_RW_SERVER_URL;
      if (!childEnv.K6_PROMETHEUS_RW_TREND_STATS && cfg.K6_PROMETHEUS_RW_TREND_STATS) childEnv.K6_PROMETHEUS_RW_TREND_STATS = cfg.K6_PROMETHEUS_RW_TREND_STATS;
    }

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
      child = spawn(K6_BIN, args, { cwd: root, env: childEnv }); // array args + tanpa shell → aman injeksi
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
