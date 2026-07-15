import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { marked } from 'marked';
// Geist font — di-vendor lokal via Fontsource (woff2 ikut ke-bundle Vite → offline).
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-sans/800.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/700.css';
import './index.css';

const cx = (...a) => a.filter(Boolean).join(' ');

/* ─── Reusable Tailwind class primitives ────────────────────────────────── */
const MAIN      = 'px-10 py-9 overflow-auto max-[900px]:px-6 max-[900px]:py-7';
const PANEL     = 'bg-surface border border-border rounded-xl p-6';
const PANEL_H2  = 'm-0 mb-4 text-[14px] font-semibold text-head';
const INPUT     = 'w-full border border-border rounded-lg bg-input text-text py-2.5 px-3.5 font-sans text-[13.5px] normal-case focus:outline-none focus:border-accent';
const SELECT    = 'w-full border border-border rounded-lg bg-input text-text py-2.5 px-3 font-sans text-[13.5px] normal-case focus:outline-none focus:border-accent';
const TEXTAREA  = 'w-full min-h-[86px] resize-y border border-border rounded-lg bg-input text-text py-2.5 px-3.5 font-mono text-[13px] leading-[1.6] normal-case focus:outline-none focus:border-accent';
const LABEL     = 'grid gap-2 text-faint text-[10.5px] font-semibold uppercase tracking-[.1em]';
const BTN_GRAD  = 'bg-accent-grad text-white font-semibold rounded-[7px] px-[18px] py-2.5 cursor-pointer border-0 disabled:opacity-55';
const BTN_EXPORT= 'bg-transparent border border-border text-muted text-[10px] py-[3px] px-2 rounded cursor-pointer whitespace-nowrap hover:border-accent hover:text-accent';
const SEARCH    = 'bg-input border border-border text-text py-[5px] px-2.5 rounded text-[12px] w-[200px] focus:outline-none focus:border-accent';
const TABLE_WRAP= 'max-h-[240px] overflow-auto scroll-thin [scrollbar-gutter:stable]';
const TABLE     = 'w-full border-collapse text-[12px]';
const TH        = 'th-sort py-2 px-2.5 border-b border-[rgba(60,60,67,.75)] text-left whitespace-nowrap text-muted font-semibold uppercase text-[10px] cursor-pointer';
const TD        = 'py-2 px-2.5 border-b border-[rgba(60,60,67,.75)] text-left whitespace-nowrap';
const CHART_GRID= 'grid grid-cols-2 gap-5 max-[900px]:grid-cols-1';

/* Render markdown and post-process headings to add id attributes */
function renderMarkdown(md) {
  const html = marked.parse(md);
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
    if (!h.id) {
      h.id = h.textContent.toLowerCase().trim()
        .replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    }
  });
  div.querySelectorAll('a[href^="http"]').forEach(a => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  return div.innerHTML;
}

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip, Legend);

const COLORS = ['#22d3ee','#39d98a','#ffaa3b','#a78bfa','#f472b6','#fb923c','#34d399','#60a5fa','#e879f9','#4ade80'];

const NAV = [
  { title: 'Utama', items: [
    { id: '',        label: 'Results Dashboard' },
    { id: 'run',     label: 'Run Test'          },
    { id: 'scripts', label: 'Scripts'           },
    { id: 'results', label: 'Riwayat'           },
  ]},
  { title: 'Generators', items: [
    { id: 'script',   label: 'Script Generator'   },
    { id: 'scenario', label: 'Scenario Generator' },
  ]},
];

const DOCS_NAV = [
  { title: 'Pengenalan', items: [
    { label: 'Getting Started', path: 'getting-started' },
    { label: 'Cara Run',        path: 'cara-run'        },
    { label: 'Struktur Folder', path: 'struktur-folder' },
  ]},
  { title: 'Framework Guide', items: [
    { label: 'Tambah BP',        path: 'framework/tambah-bp'        },
    { label: 'Tambah Project',   path: 'framework/tambah-project'   },
    { label: 'Extract & Batch',  path: 'framework/extract-batch'    },
    { label: 'Variable Sources', path: 'framework/variable-sources' },
    { label: 'Auth',             path: 'framework/auth'             },
    { label: 'Transaksi Gagal',  path: 'framework/transaction-fail' },
  ]},
  { title: 'Metrics & Tags', items: [
    { label: 'Custom Metrics', path: 'metrics' },
  ]},
  { title: 'Observability', items: [
    { label: 'k6 Dashboard', path: 'observability/k6-dashboard' },
    { label: 'Grafana Stack', path: 'observability/grafana'     },
  ]},
];

// One flat route derived from the hash. '' = Results Dashboard.
function getRoute() {
  const h = window.location.hash.slice(1);
  if (h === 'docs') return 'docs/getting-started';
  if (h.startsWith('docs/')) return h;
  if (['run', 'scripts', 'results', 'script', 'scenario'].includes(h)) return h;
  return '';
}

function App() {
  const [route, setRoute]   = React.useState(getRoute);
  const [result, setResult] = React.useState(null);
  const [theme, toggleTheme] = useDocsTheme();

  React.useEffect(() => {
    const onPop = () => setRoute(getRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Navigate to any sidebar destination. id: '' | 'run' | … | 'docs/<path>'
  const go = (id) => {
    history.pushState(null, '', `#${id}`);
    setRoute(getRoute());
  };

  // Open a parsed CSV result inside the Results Dashboard (in-shell).
  const openResult = (resultJson) => {
    setResult(resultJson);
    history.pushState(null, '', '#');
    setRoute('');
  };

  return (
    <div className="min-h-screen grid grid-cols-[284px_1fr] max-[900px]:grid-cols-1">
      <Sidebar route={route} go={go} theme={theme} toggleTheme={toggleTheme} />

      {route === '' && (result
        ? <InShellResults result={result} onBack={() => setResult(null)} onNewResult={setResult} />
        : <main className={MAIN}><DashboardPage onData={setResult} /></main>)}
      {route === 'run'      && <main className={MAIN}><RunnerPage go={go} /></main>}
      {route === 'scripts'  && <main className={MAIN}><ScriptsPage /></main>}
      {route === 'results'  && <main className={MAIN}><HistoryPage onResult={openResult} /></main>}
      {route === 'script'   && <main className={MAIN}><ScriptGeneratorPage /></main>}
      {route === 'scenario' && <main className={MAIN}><ScenarioGeneratorPage /></main>}
      {route.startsWith('docs/') && <DocContent docPath={route.slice(5)} go={go} />}
    </div>
  );
}

/* ─── Theme-toggle icons (only the dark/light control uses an icon) ─────── */
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

/* ─── Sidebar — single grouped nav ──────────────────────────────────────── */
function Sidebar({ route, go, theme, toggleTheme }) {
  const navBtn = (active) => cx(
    'text-left rounded-lg px-3 py-2 text-[14px] cursor-pointer transition-colors',
    active ? 'text-head bg-surface-2 font-semibold' : 'text-muted hover:text-head hover:bg-border-soft'
  );
  return (
    <aside className="border-r border-border bg-sidebar px-5 py-[26px] flex flex-col gap-5 sticky top-0 h-screen overflow-y-auto scroll-thin max-[900px]:static max-[900px]:h-auto">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-accent-grad text-white font-bold text-[16px] shrink-0 shadow-[0_0_16px_var(--accent-soft)]">k6</span>
        <div className="leading-tight">
          <strong className="block text-[15px] font-bold tracking-[-.1px] text-head">k6 Framework</strong>
          <small className="block mt-0.5 text-[11px] uppercase tracking-[.08em] text-muted">Performance testing</small>
        </div>
      </div>

      <nav className="grid gap-px">
        {NAV.map((group) => (
          <div key={group.title} className="grid gap-px">
            <div className="px-3 pt-5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[.14em] text-faint">{group.title}</div>
            {group.items.map((it) => (
              <button key={it.id} className={navBtn(route === it.id)} onClick={() => go(it.id)}>{it.label}</button>
            ))}
          </div>
        ))}

        <div className="px-3 pt-5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[.14em] text-faint">Documentation</div>
        {DOCS_NAV.map((section) => (
          <div key={section.title} className="grid gap-px">
            <div className="px-3 pt-3 pb-1 text-[12px] font-semibold text-head">{section.title}</div>
            {section.items.map((item) => (
              <button
                key={item.path}
                className={navBtn(route === `docs/${item.path}`)}
                onClick={() => go(`docs/${item.path}`)}
              >{item.label}</button>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-3.5 border-t border-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between rounded-lg px-[11px] py-2 text-[13px] text-muted cursor-pointer hover:bg-border-soft hover:text-head transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
            <span>{theme === 'dark' ? 'Mode gelap' : 'Mode terang'}</span>
          </span>
          <span className={cx('switch', theme === 'dark' && 'on')}><i /></span>
        </button>
      </div>
    </aside>
  );
}

function PageHeader({ title, eyebrow, description }) {
  return (
    <header className="max-w-[920px] mb-7">
      <span className="inline-block text-[11px] font-semibold tracking-[.16em] uppercase text-faint">{eyebrow}</span>
      <h1 className="mt-2 mb-3 text-[26px] font-bold tracking-[-.02em] text-head">{title}</h1>
      <p className="m-0 max-w-[700px] text-muted text-[15px] leading-[1.7]">{description}</p>
    </header>
  );
}

function useDocsTheme() {
  const [theme, setTheme] = React.useState(
    () => localStorage.getItem('docs-theme') || 'dark'
  );
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('docs-theme', theme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return [theme, toggle];
}

function resolveDocLink(currentPath, href) {
  if (!href) return null;
  if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return null;
  if (href.startsWith('../') || href.startsWith('/')) return null; // non-doc paths, let browser handle
  const clean = href.replace(/^\.\//, '').replace(/\.md$/, '');
  const baseDir = currentPath.includes('/') ? currentPath.split('/').slice(0, -1).join('/') : '';
  return baseDir ? `${baseDir}/${clean}` : clean;
}

// ─── Run Test — jalankan scenario, log real-time via SSE ────────────────────
function RunnerPage({ go }) {
  const [scenarios, setScenarios] = React.useState([]);
  const [form, setForm] = React.useState({
    scenario: '', mode: 'testhit', vus: 1, iterations: 1,
    csv: true, debug: false, webdash: false, prometheus: false, tags: '',
  });
  const [logLines, setLogLines] = React.useState([]);
  const [status, setStatus] = React.useState('idle'); // idle|running|done|error
  const [lastCsv, setLastCsv] = React.useState(null);
  const esRef = React.useRef(null);
  const startedRef = React.useRef(false);
  const logRef = React.useRef(null);

  React.useEffect(() => {
    fetch('/api/scenarios').then((r) => r.json()).then((d) => {
      const list = d.scenarios || [];
      setScenarios(list);
      setForm((f) => (f.scenario ? f : { ...f, scenario: list[0] || '' }));
    }).catch(() => {});
    return () => esRef.current?.close();
  }, []);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const append = (text) => setLogLines((prev) => [...prev, text]);

  const run = () => {
    if (!form.scenario || status === 'running') return;
    setLogLines([]); setStatus('running'); setLastCsv(null); startedRef.current = false;
    const params = new URLSearchParams({
      scenario: form.scenario, mode: form.mode, vus: form.vus, iterations: form.iterations,
      csv: form.csv, debug: form.debug, webdash: form.webdash, prometheus: form.prometheus, tags: form.tags,
    });
    const es = new EventSource(`/api/run?${params.toString()}`);
    esRef.current = es;
    es.addEventListener('start', (e) => { startedRef.current = true; append(`$ ${JSON.parse(e.data).cmd}\n\n`); });
    es.addEventListener('log', (e) => append(JSON.parse(e.data).text));
    es.addEventListener('done', (e) => {
      const d = JSON.parse(e.data);
      append(`\n[selesai] exit code ${d.code}\n`);
      setStatus(d.code === 0 ? 'done' : 'error');
      setLastCsv(d.csv || null);
      es.close(); esRef.current = null;
    });
    es.addEventListener('error', (e) => {
      let msg = ''; try { msg = JSON.parse(e.data).message; } catch {}
      if (msg) append(`\n[error] ${msg}\n`);
      setStatus('error'); es.close(); esRef.current = null;
    });
    es.onerror = () => {
      if (!startedRef.current) append('\n[error] gagal memulai run (scenario/k6 tidak valid, atau sudah ada run lain).\n');
      setStatus((s) => (s === 'running' ? 'error' : s));
      es.close(); esRef.current = null;
    };
  };

  const stop = () => {
    fetch('/api/run/stop', { method: 'POST' }).catch(() => {});
    esRef.current?.close(); esRef.current = null;
    append('\n[dihentikan]\n'); setStatus('idle');
  };

  const statusLabel = { idle: 'Siap', running: 'Berjalan…', done: 'Selesai', error: 'Error' }[status];
  const statusColor = { idle: 'text-muted', running: 'text-accent-2', done: 'text-good', error: 'text-bad' }[status];

  return (
    <>
      <PageHeader eyebrow="Runner" title="Run Test"
        description="Pilih scenario, atur mode & VU, jalankan k6, dan lihat log real-time." />

      <section className={cx(PANEL, 'grid gap-5 mb-5')}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <label className={LABEL}>Scenario
            <select className={SELECT} value={form.scenario} onChange={(e) => set('scenario', e.target.value)}>
              {scenarios.length === 0 && <option value="">(tidak ada scenario)</option>}
              {scenarios.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className={LABEL}>Mode
            <select className={SELECT} value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="testhit">testhit</option>
              <option value="loadtest">loadtest</option>
              <option value="stress">stress</option>
              <option value="spike">spike</option>
            </select>
          </label>
          <label className={LABEL}>VUs / Total VU
            <input className={INPUT} type="number" min="1" value={form.vus} onChange={(e) => set('vus', e.target.value)} />
          </label>
          <label className={LABEL}>Iterations
            <input className={INPUT} type="number" min="1" value={form.iterations} onChange={(e) => set('iterations', e.target.value)} />
          </label>
          <label className={LABEL}>Tags (k=v,k=v)
            <input className={INPUT} value={form.tags} placeholder="env=staging,build=123" onChange={(e) => set('tags', e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 normal-case text-[13px] text-text cursor-pointer"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.csv} onChange={(e) => set('csv', e.target.checked)} /> Export CSV</label>
          <label className="flex items-center gap-2 normal-case text-[13px] text-text cursor-pointer"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.debug} onChange={(e) => set('debug', e.target.checked)} /> Debug (http-debug)</label>
          <label className="flex items-center gap-2 normal-case text-[13px] text-text cursor-pointer"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.webdash} onChange={(e) => set('webdash', e.target.checked)} /> k6 web dashboard</label>
          <label className="flex items-center gap-2 normal-case text-[13px] text-text cursor-pointer" title="Kirim metric via remote write ke Prometheus/Grafana (default localhost:9090)"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.prometheus} onChange={(e) => set('prometheus', e.target.checked)} /> Prometheus (Grafana)</label>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          {status !== 'running'
            ? <button type="button" className={cx(BTN_GRAD, 'text-[14px] px-5 py-[9px] disabled:cursor-not-allowed')} onClick={run} disabled={!form.scenario}>▶ Run</button>
            : <button type="button" className="bg-bad text-white font-semibold rounded-lg text-[14px] px-5 py-[9px] cursor-pointer border-0" onClick={stop}>■ Stop</button>}
          <span className={cx('text-[12px]', statusColor)}>{statusLabel}</span>
          {lastCsv && status !== 'running' && (
            <button type="button" className="bg-transparent border border-border text-muted py-1.5 px-3 rounded-md cursor-pointer text-[12px] hover:border-accent hover:text-accent" onClick={() => go('results')}>CSV: {lastCsv} · buka Riwayat →</button>
          )}
        </div>
      </section>

      <section className={cx(PANEL, 'p-0 overflow-hidden')}>
        <pre ref={logRef} className="m-0 py-4 px-[18px] bg-code text-text font-mono text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words overflow-auto max-h-[58vh] min-h-[240px] scroll-thin">{logLines.join('') || 'Log k6 tampil di sini saat test berjalan…'}</pre>
      </section>
    </>
  );
}

// ─── Scripts — daftar channel & BP (read-only) ──────────────────────────────
function ScriptsPage() {
  const [channels, setChannels] = React.useState(null);
  React.useEffect(() => {
    fetch('/api/scripts').then((r) => r.json()).then((d) => setChannels(d.channels || [])).catch(() => setChannels([]));
  }, []);
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Scripts"
        description="Daftar channel & Business Process di workspace/scripts." />
      {channels === null && <section className={PANEL}><p className="text-muted leading-relaxed">Memuat…</p></section>}
      {channels && channels.length === 0 && <section className={PANEL}><p className="text-muted leading-relaxed">Belum ada channel di workspace/scripts.</p></section>}
      {channels && channels.map((ch) => (
        <section className={cx(PANEL, 'mb-3')} key={ch.channel}>
          <h2 className={PANEL_H2}>{ch.channel}</h2>
          {ch.bps.length === 0
            ? <p className="text-muted leading-relaxed">— belum ada BP —</p>
            : <ul className="list-none m-0 p-0 flex flex-wrap gap-2">{ch.bps.map((bp) => <li key={bp}><code className="font-mono text-[12.5px] text-accent bg-accent-soft py-[3px] px-[9px] rounded-md border border-accent-line">{bp}</code></li>)}</ul>}
        </section>
      ))}
    </>
  );
}

// ─── Riwayat Run — daftar CSV di results/, klik untuk buka di dashboard ──────
function HistoryPage({ onResult }) {
  const [results, setResults] = React.useState(null);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetch('/api/results').then((r) => r.json()).then((d) => setResults(d.results || [])).catch(() => setResults([]));
  }, []);

  const open = async (item) => {
    setBusy(item.name); setError('');
    try {
      const r = await fetch('/api/parse-path', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: item.path }),
      });
      const j = await r.json();
      if (j.success) onResult(j);
      else setError(j.error || 'Gagal memuat CSV');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  return (
    <>
      <PageHeader eyebrow="Runner" title="Riwayat Run"
        description="Hasil CSV di folder results/. Klik 'Buka' untuk analisa di Results Dashboard." />
      {error && <div className="text-bad mb-3">{error}</div>}
      <section className={cx(PANEL, 'overflow-x-auto')}>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className="text-left text-[11px] font-semibold uppercase tracking-[.1em] text-faint py-3 px-4 border-b border-border whitespace-nowrap">File</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-[.1em] text-faint py-3 px-4 border-b border-border whitespace-nowrap">Ukuran</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-[.1em] text-faint py-3 px-4 border-b border-border whitespace-nowrap">Waktu</th>
            <th className="text-right text-[11px] font-semibold uppercase tracking-[.1em] text-faint py-3 px-4 border-b border-border whitespace-nowrap"></th>
          </tr></thead>
          <tbody>
            {results === null && <tr><td className="py-4 px-4 text-[14px] text-muted" colSpan="4">Memuat…</td></tr>}
            {results && results.length === 0 && <tr><td className="py-4 px-4 text-[14px] text-muted" colSpan="4">Belum ada hasil di results/.</td></tr>}
            {results && results.map((it) => (
              <tr key={it.name} className="border-b border-border-soft last:border-b-0 hover:bg-border-soft/60 transition-colors">
                <td className="py-4 px-4 text-[14px] text-text font-medium break-all">{it.name}</td>
                <td className="py-4 px-4 text-[14px] text-muted whitespace-nowrap">{it.sizeMB} MB</td>
                <td className="py-4 px-4 text-[13px] text-muted whitespace-nowrap">{new Date(it.mtime).toLocaleString()}</td>
                <td className="py-4 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="bg-transparent border border-border text-text text-[13px] font-medium py-1.5 px-4 rounded-lg cursor-pointer hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
                    onClick={() => open(it)}
                    disabled={busy === it.name}
                  >
                    {busy === it.name ? 'Membuka…' : 'Buka'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function DocContent({ docPath, go }) {
  const [html, setHtml]       = React.useState('');
  const [toc, setToc]         = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const contentRef            = React.useRef(null);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(true);
    fetch(`/api/docs/${docPath}`)
      .then(r => r.json())
      .then(data => {
        const rendered = renderMarkdown(data.content || '');
        setHtml(rendered);
        const tmp = document.createElement('div');
        tmp.innerHTML = rendered;
        const items = Array.from(tmp.querySelectorAll('h2, h3')).map(h => ({
          level: parseInt(h.tagName[1]),
          id: h.id,
          text: h.textContent,
        }));
        setToc(items);
      })
      .catch(err => {
        console.error('docs load error', err);
        setHtml('<p style="color:var(--muted)">Failed to load page.</p>');
      })
      .finally(() => setLoading(false));
  }, [docPath]);

  // Scroll tracking for TOC active state
  React.useEffect(() => {
    if (!toc.length) return;
    const links = Array.from(document.querySelectorAll('.docs-toc a'));
    const items = toc.map((t, i) => ({ el: document.getElementById(t.id), a: links[i] }))
                     .filter(x => x.el && x.a);
    function update() {
      const sy = window.scrollY + 130;
      let active = items[0];
      for (const h of items) {
        if (h.el.getBoundingClientRect().top + window.scrollY <= sy) active = h;
      }
      links.forEach(a => a.classList.remove('act'));
      if (active) active.a.classList.add('act');
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [toc]);

  return (
    <div className="flex gap-14 items-start px-14 py-16 pb-[120px] relative max-[720px]:px-5 max-[720px]:py-8">
      <article
        ref={contentRef}
        key={docPath}
        className="prose-doc flex-1 min-w-0 max-w-[760px]"
        dangerouslySetInnerHTML={{ __html: loading ? '<p style="color:var(--muted)">Loading…</p>' : html }}
        onClick={(e) => {
          const a = e.target.closest('a');
          if (!a) return;
          const resolved = resolveDocLink(docPath, a.getAttribute('href'));
          if (!resolved) return;
          e.preventDefault();
          go(`docs/${resolved}`);
        }}
      />
      {toc.length > 0 && (
        <nav className="docs-toc w-[216px] shrink-0 sticky top-16 self-start max-[1080px]:hidden">
          <h2 className="text-[12px] font-bold text-head mb-3 pl-[13px]">On this page</h2>
          <ul className="list-none grid gap-px m-0 p-0">
            {toc.map(item => (
              <li key={item.id} className={item.level === 3 ? 'lvl3' : ''}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >{item.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function DashboardPage({ onData }) {
  const [path, setPath] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadResult = React.useCallback(async (request) => {
    setLoading(true);
    setError('');
    try {
      const res = await request();
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parse error');
      onData(json);
    } catch (err) {
      setError(err.message || 'Failed to load result');
    } finally {
      setLoading(false);
    }
  }, [onData]);

  const onUpload = (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('csvFile', file);
    loadResult(() => fetch('/api/upload', { method: 'POST', body: fd }));
  };

  const onLoadPath = () => {
    if (!path.trim()) return;
    loadResult(() => fetch('/api/parse-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: path.trim() }),
    }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Analisa Hasil"
        title="Results Dashboard"
        description="Muat file CSV hasil k6 untuk melihat metrik test secara visual — TPS/RPS, latency, checks, dan detail per transaksi & API."
      />

      <section className={cx(PANEL, 'grid grid-cols-[minmax(240px,360px)_1fr] gap-5 mb-6 max-[900px]:grid-cols-1')}>
        <div className="relative grid place-items-center gap-2 min-h-[140px] border border-dashed border-border rounded-lg bg-code text-center">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => onUpload(event.target.files?.[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <strong className="text-head text-[15px]">{loading ? 'Parsing CSV...' : 'Upload k6 CSV'}</strong>
          <span className="text-muted text-[12px]">Atau gunakan Load via path untuk file besar.</span>
        </div>

        <div className="grid grid-cols-[1fr_auto] content-center gap-2.5">
          <input
            className={INPUT}
            value={path}
            placeholder="D:\\path\\to\\result.csv"
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') onLoadPath(); }}
          />
          <button type="button" className={cx(BTN_GRAD, 'disabled:cursor-wait')} onClick={onLoadPath} disabled={loading}>Load</button>
          {error && <div className="col-span-full text-bad">{error}</div>}
        </div>
      </section>

      {!loading && (
        <section className={PANEL}>
          <h2 className={PANEL_H2}>Cara mendapatkan CSV</h2>
          <ol className="m-0 pl-5 text-muted leading-[1.9] marker:text-faint [&_li]:mb-1.5 [&_strong]:text-head">
            <li>Jalankan test dengan flag CSV: <code className="font-mono text-[12.5px] bg-accent-soft text-accent py-0.5 px-1.5 rounded-[5px]">k6perf run -Scenario &lt;nama&gt; -Mode loadtest -Csv</code></li>
            <li>File otomatis tersimpan di folder <code className="font-mono text-[12.5px] bg-accent-soft text-accent py-0.5 px-1.5 rounded-[5px]">results/</code> sebagai <code className="font-mono text-[12.5px] bg-accent-soft text-accent py-0.5 px-1.5 rounded-[5px]">&lt;testid&gt;.csv</code>.</li>
            <li>Drag file ke area di atas, atau tempel path lengkapnya lalu klik <strong>Load</strong>.</li>
          </ol>
        </section>
      )}
    </>
  );
}

function InShellResults({ result: initialResult, onBack, onNewResult }) {
  const [result, setResult] = React.useState(initialResult);
  const [path, setPath] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => { setResult(initialResult); }, [initialResult]);

  const loadAnother = async () => {
    if (!path.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/parse-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parse error');
      setResult(json);
      onNewResult(json);
      setPath('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={MAIN}>
      <div className="flex items-center gap-3 flex-wrap mb-4 pb-3 border-b border-border">
        <button onClick={onBack} className="bg-transparent border border-border text-muted py-[5px] px-3 rounded cursor-pointer whitespace-nowrap hover:text-accent hover:border-accent transition-colors">← Muat CSV lain</button>
        <span className="text-muted text-[12px] truncate max-w-[280px]">{result.statCards?.testid || 'result'}</span>
        {result.loadTiming && (
          <span className="text-[11px] text-accent whitespace-nowrap">
            Loaded {(result.loadTiming.totalMs / 1000).toFixed(1)}s
            <span className="text-muted">
              {' '}· CSV {(result.loadTiming.csvMs / 1000).toFixed(1)}s
              {' '}· Queries {(result.loadTiming.queriesMs / 1000).toFixed(1)}s
              {' '}· Build {(result.loadTiming.assemblyMs / 1000).toFixed(1)}s
            </span>
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <input
            className="bg-input border border-border text-text py-[5px] px-2.5 rounded w-[320px] text-[12px] focus:outline-none focus:border-accent max-[900px]:w-[180px]"
            value={path}
            placeholder="Load another path…"
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadAnother(); }}
          />
          <button onClick={loadAnother} disabled={loading} className="bg-accent-grad text-white border-0 py-[5px] px-3.5 rounded cursor-pointer font-semibold text-[12px] disabled:opacity-50">{loading ? '…' : 'Load'}</button>
          {error && <span className="text-bad text-[11px]">{error}</span>}
        </div>
      </div>
      <ResultsView data={result} />
    </main>
  );
}

/* ─── Section (collapsible) ─────────────────────────────────────────────── */
function Section({ title, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2.5 cursor-pointer py-2.5 select-none" onClick={() => setOpen((o) => !o)}>
        <span className={cx('text-[10px] text-muted transition-transform', open && 'rotate-90')}>▶</span>
        <span className="text-[12px] text-muted uppercase tracking-[.06em] font-semibold whitespace-nowrap">{title}</span>
        {badge != null && <span className="text-[10px] bg-border text-muted py-px px-1.5 rounded-[10px]">{badge}</span>}
        <span className="flex-1 h-px bg-border" />
      </div>
      {open && <div className="grid gap-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

/* ─── TimeFilterBar ─────────────────────────────────────────────────────── */
function TimeFilterBar({ durationMs, filterRange, onApply, onReset, onGranChange, granularity }) {
  const [startVal, setStartVal] = React.useState('');
  const [endVal, setEndVal] = React.useState('');
  const [granVal, setGranVal] = React.useState('');

  function parseOffset(str) {
    if (!str || !str.trim()) return null;
    const parts = str.trim().split(':').map(Number);
    if (parts.some(Number.isNaN)) return null;
    if (parts.length === 1) return parts[0] * 1000;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    return null;
  }

  const handleApplyFilter = () => {
    const s = parseOffset(startVal);
    const e = parseOffset(endVal);
    onApply(s, e);
  };

  const handleResetFilter = () => {
    setStartVal('');
    setEndVal('');
    onReset();
  };

  const handleApplyGran = () => {
    onGranChange(granVal.trim() || 'auto');
  };

  const handleResetGran = () => {
    setGranVal('');
    onGranChange('auto');
  };

  const totalSec = Math.round((durationMs || 0) / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const durationLabel = hh
    ? `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`
    : `${mm}m ${String(ss).padStart(2, '0')}s`;

  const tfInput = 'bg-input border border-border text-text py-1 px-2 rounded-[5px] text-[12px] focus:outline-none focus:border-accent';
  const tfBtn = 'bg-accent-grad text-white border-0 py-[5px] px-2.5 rounded-[5px] cursor-pointer font-semibold text-[11px] self-end';
  const tfReset = 'bg-transparent border border-border text-muted py-[5px] px-2.5 rounded-[5px] cursor-pointer text-[11px] self-end hover:border-accent hover:text-accent';
  const tfField = 'flex flex-col gap-[3px]';
  const tfFieldLbl = 'text-muted text-[10px]';

  return (
    <div className="flex items-center gap-3 flex-wrap bg-surface border border-border rounded-lg py-2.5 px-3.5 text-[11px]">
      <span className="text-muted uppercase tracking-[.06em] whitespace-nowrap">Time Filter</span>
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <div className={tfField}>
          <span className={tfFieldLbl}>Start (hh:mm:ss)</span>
          <input className={cx(tfInput, 'w-[90px]')} value={startVal} placeholder="0:00:00" onChange={(e) => setStartVal(e.target.value)} />
        </div>
        <span className="text-muted self-end mb-1.5">→</span>
        <div className={tfField}>
          <span className={tfFieldLbl}>End (hh:mm:ss)</span>
          <input className={cx(tfInput, 'w-[90px]')} value={endVal} placeholder="hh:mm:ss" onChange={(e) => setEndVal(e.target.value)} />
        </div>
        <button className={tfBtn} onClick={handleApplyFilter}>Apply Filter</button>
        <button className={tfReset} onClick={handleResetFilter}>Reset</button>
        <span className="w-px h-7 bg-border self-center" />
        <div className={tfField}>
          <span className={tfFieldLbl}>Granularity (s)</span>
          <input className={cx(tfInput, 'w-[60px]')} type="number" min="1" value={granVal} placeholder="auto" onChange={(e) => setGranVal(e.target.value)} />
        </div>
        <button className={tfBtn} onClick={handleApplyGran}>Apply Gran</button>
        <button className={tfReset} onClick={handleResetGran}>Auto</button>
      </div>
      {filterRange && <span className="bg-accent-soft text-accent text-[11px] py-0.5 px-2 rounded-[10px] border border-accent-line">filtered</span>}
      <span className="ml-auto text-muted text-[10px] whitespace-nowrap">Duration: {durationLabel}</span>
    </div>
  );
}

/* ─── ResultsView ───────────────────────────────────────────────────────── */
function ResultsView({ data: baseData }) {
  const [filterRange, setFilterRange] = React.useState(null);
  const [granularity, setGranularity] = React.useState('auto');

  const filteredData = React.useMemo(
    () => filterRange ? recomputeFromBuckets(baseData, filterRange.startMs, filterRange.endMs) : baseData,
    [baseData, filterRange]
  );

  const chartData = React.useMemo(
    () => buildChartView(filteredData, granularity),
    [filteredData, granularity]
  );

  const handleApply = (startOffsetMs, endOffsetMs) => {
    if (startOffsetMs == null && endOffsetMs == null) {
      setFilterRange(null);
    } else {
      setFilterRange({ startMs: startOffsetMs, endMs: endOffsetMs });
    }
  };

  const handleReset = () => {
    setFilterRange(null);
  };

  const sc = filteredData.statCards;
  const durationMs = filteredData.timeRange.end - filteredData.timeRange.start;

  const checksRows = React.useMemo(
    () => filteredData.checksTable || [],
    [filteredData]
  );

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap border border-border rounded-xl bg-surface py-4 px-5">
        <div>
          <strong className="block text-head">{sc.testid || 'test result'}</strong>
          <span className="block mt-1 text-muted">{fmtN(filteredData.totalRows)} rows · {fmtDuration(durationMs)}</span>
        </div>
      </div>

      <TimeFilterBar
        durationMs={baseData.timeRange.end - baseData.timeRange.start}
        filterRange={filterRange}
        onApply={handleApply}
        onReset={handleReset}
        onGranChange={setGranularity}
        granularity={granularity}
      />

      {/* ── Section: Performance Overview ── */}
      <Section title="Performance Overview" defaultOpen={true}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <StatCard label="Total Requests" value={fmtN(sc.totalReqs)} sub={`VUs max: ${sc.vusMax}`} />
          <StatCard label="Success" value={fmtN(sc.successReqs)} sub={`${successPct(sc)}% success`} tone="good" />
          <StatCard label="Errors" value={fmtN(sc.errorReqs)} sub={`${sc.errorPct}% error`} tone="bad" />
          <StatCard label="Peak TPS" value={fmtN(sc.peakTps)} sub="transactions/s" tone="cyan" />
          <StatCard label="Peak RPS" value={fmtN(sc.peakRps)} sub="requests/s" tone="warn" />
          <StatCard label="p95 (s)" value={fmtSec(sc.p95Duration)} sub={`p99: ${fmtSec(sc.p99Duration)} s`} tone="purple" />
          <StatCard label="Avg RT (s)" value={fmtSec(sc.avgDuration)} sub="avg response time" />
          <StatCard
            label="Checks"
            value={`${sc.checksSuccessRate ?? '-'}%`}
            sub="check success rate"
            tone={sc.checksSuccessRate >= 99 ? 'good' : sc.checksSuccessRate > 0 ? 'bad' : ''}
          />
        </div>
        <div className={CHART_GRID}>
          <ChartPanel
            title="VUs · RPS · Errors"
            series={buildMultiSeries({
              VUs: chartData.vus,
              RPS: chartData.rpsAll,
              Errors: chartData.errorsAll,
            }, [COLORS[0], COLORS[1], '#ff4c6a'])}
          />
          <ChartPanel
            title="VU Progression"
            series={[{ label: 'VUs', data: chartData.vus, color: COLORS[0], fill: true }]}
          />
        </div>
      </Section>

      {/* ── Section: TPS · RPS · Response Time ── */}
      <Section title="TPS · RPS · Response Time" defaultOpen={true}>
        <div className={CHART_GRID}>
          <ChartPanel title="TPS Overall" series={[{ label: 'TPS', data: chartData.tpsAll, color: '#22d3ee', fill: true }]} />
          <ChartPanel title="RPS Overall" series={[{ label: 'RPS', data: chartData.rpsAll, color: '#39d98a', fill: true }]} />
          <ChartPanel
            title="TPS by Transaction"
            series={buildMultiSeries(chartData.tpsByTx, COLORS)}
            multiLine
          />
          <ChartPanel
            title="RPS by API"
            series={buildMultiSeries(chartData.rpsByApi, COLORS)}
            multiLine
          />
        </div>
        <div className={CHART_GRID}>
          <ChartPanel
            title="Transaction Response Time"
            unit=" s"
            series={
              Object.keys(chartData.txResponseTime || {}).length > 0
                ? buildMultiSeries(chartData.txResponseTime, COLORS)
                : [{ label: 'Avg all', data: chartData.txResponseTimeAll, color: '#ffaa3b', fill: true }]
            }
            multiLine={Object.keys(chartData.txResponseTime || {}).length > 0}
          />
          <ChartPanel
            title="API Response Time"
            unit=" s"
            series={
              Object.keys(chartData.apiResponseTime || {}).length > 0
                ? buildMultiSeries(chartData.apiResponseTime, COLORS)
                : [{ label: 'Avg all', data: chartData.apiResponseTimeAll, color: '#a78bfa', fill: true }]
            }
            multiLine={Object.keys(chartData.apiResponseTime || {}).length > 0}
          />
        </div>
        <TpsSummaryTable data={filteredData} />
        <RpsSummaryTable data={filteredData} />
      </Section>

      {/* ── Section: Checks ── */}
      {checksRows.length > 0 && (
        <Section title="Checks" defaultOpen={false} badge={checksRows.length}>
          <div className={CHART_GRID}>
            <ChecksTable rows={checksRows} />
            <ChartPanel
              title="Checks Pass Rate Over Time (%)"
              series={[{ label: 'Rate %', data: filteredData.checksTimeSeries || [], color: '#39d98a', fill: true }]}
            />
          </div>
        </Section>
      )}

      {/* ── Section: Run Result ── */}
      <Section title="Run Result" defaultOpen={true}>
        <FullTxTable rows={filteredData.txTable || []} />
        <FullApiTable rows={filteredData.apiTable || []} />
      </Section>
    </section>
  );
}

/* ─── StatCard ──────────────────────────────────────────────────────────── */
const TONE = { good: 'text-good', bad: 'text-bad', cyan: 'text-cyan', warn: 'text-warn', purple: 'text-purple', '': 'text-head' };
function StatCard({ label, value, sub, tone = '' }) {
  return (
    <div className="border border-border rounded-xl bg-surface p-5">
      <span className="block text-faint text-[10.5px] font-semibold uppercase tracking-[.1em]">{label}</span>
      <strong className={cx('block mt-3 mb-1.5 text-[30px] font-mono font-semibold tracking-tight', TONE[tone] || 'text-head')}>{value}</strong>
      <small className="block text-muted text-[12px]">{sub}</small>
    </div>
  );
}

/* ─── ChartPanel — dispatches to LineChart or MultiLineChart ────────────── */
function ChartPanel({ title, series, unit = '', multiLine = false }) {
  return (
    <div className={PANEL}>
      <h2 className={PANEL_H2}>{title}</h2>
      {multiLine
        ? <MultiLineChart series={series} unit={unit} />
        : <LineChart series={series} unit={unit} />
      }
    </div>
  );
}

/* ─── LineChart ─────────────────────────────────────────────────────────── */
function LineChart({ series, unit }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: series[0]?.data.map((point) => fmtTime(point.t)) || [],
        datasets: series.map((item) => ({
          label: item.label,
          data: item.data.map((point) => point.v),
          borderColor: item.color,
          backgroundColor: withAlpha(item.color, 0.14),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.32,
          fill: !!item.fill,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(11,13,20,.96)',
            borderColor: '#242a3d',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toFixed(2)}${unit}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#7880a0', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { beginAtZero: true, ticks: { color: '#7880a0' }, grid: { color: 'rgba(255,255,255,.04)' } },
        },
      },
    });
    return () => chart.destroy();
  }, [series, unit]);

  return (
    <div className="relative h-[280px]">
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ─── MultiLineChart ────────────────────────────────────────────────────── */
function MultiLineChart({ series, unit }) {
  const canvasRef = React.useRef(null);
  const [showAll, setShowAll] = React.useState(false);
  const TOP = 8;

  // Sort by peak value descending
  const sorted = React.useMemo(() => {
    if (!series || series.length === 0) return [];
    return [...series].sort((a, b) => {
      const peakA = (a.data || []).reduce((m, p) => Math.max(m, p.v || 0), 0);
      const peakB = (b.data || []).reduce((m, p) => Math.max(m, p.v || 0), 0);
      return peakB - peakA;
    });
  }, [series]);

  const visible = showAll ? sorted : sorted.slice(0, TOP);
  const extra = sorted.length - TOP;

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: visible[0]?.data.map((p) => fmtTime(p.t)) || [],
        datasets: visible.map((item) => ({
          label: item.label,
          data: (item.data || []).map((p) => p.v),
          borderColor: item.color,
          backgroundColor: withAlpha(item.color, 0.08),
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.32,
          fill: false,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(11,13,20,.96)',
            borderColor: '#242a3d',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toFixed(2)}${unit}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#7880a0', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { beginAtZero: true, ticks: { color: '#7880a0' }, grid: { color: 'rgba(255,255,255,.04)' } },
        },
      },
    });
    return () => chart.destroy();
  }, [visible, unit]);

  return (
    <div>
      <div className="relative h-[280px]">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {visible.map((item) => (
          <span key={item.label} className="flex items-center gap-[5px] text-[11px] text-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
        {extra > 0 && !showAll && (
          <button className="bg-transparent border border-border text-muted text-[10px] py-0.5 px-1.5 rounded cursor-pointer hover:border-accent hover:text-accent" onClick={() => setShowAll(true)}>+ {extra} more</button>
        )}
        {showAll && extra > 0 && (
          <button className="bg-transparent border border-border text-muted text-[10px] py-0.5 px-1.5 rounded cursor-pointer hover:border-accent hover:text-accent" onClick={() => setShowAll(false)}>show less</button>
        )}
      </div>
    </div>
  );
}

/* ─── ChecksTable ───────────────────────────────────────────────────────── */
function ChecksTable({ rows }) {
  const [sort, setSort] = React.useState({ col: 'pass', dir: 'desc' });

  const sorted = React.useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sort.col] ?? 0;
      const vb = b[sort.col] ?? 0;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort]);

  const toggle = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  const th = (col, label) => (
    <th className={cx(TH, sort.col === col && sort.dir)} onClick={() => toggle(col)}>{label}</th>
  );

  const handleExport = () => {
    const header = 'Check,Pass,Fail,Total';
    const csvRows = sorted.map((r) => `"${r.check || ''}",${r.pass || 0},${r.fail || 0},${(r.pass || 0) + (r.fail || 0)}`);
    exportCsv([header, ...csvRows].join('\n'), 'checks.csv');
  };

  return (
    <div className={cx(PANEL, 'overflow-auto')}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={cx(PANEL_H2, 'mb-0')}>Checks</h2>
        <button className={BTN_EXPORT} onClick={handleExport}>Export CSV</button>
      </div>
      <div className={TABLE_WRAP}><table className={TABLE}>
        <thead>
          <tr>
            {th('check', 'Check')}
            {th('pass', 'Pass')}
            {th('fail', 'Fail')}
            {th('total', 'Total')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const total = row.total || (row.pass || 0) + (row.fail || 0);
            const failPct = total ? ((row.fail || 0) / total * 100).toFixed(1) : '0.0';
            return (
              <tr key={i}>
                <td className={TD}>{row.check}</td>
                <td className={TD}>{fmtN(row.pass)}</td>
                <td className={cx(TD, row.fail > 0 && 'text-bad')}>{fmtN(row.fail)}</td>
                <td className={TD}>{fmtN(total)} <small className="block mt-[3px] text-muted">{failPct}% fail</small></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </div>
  );
}

/* ─── TpsSummaryTable ───────────────────────────────────────────────────── */
function TpsSummaryTable({ data }) {
  const [sort, setSort] = React.useState({ col: 'avgTps', dir: 'desc' });

  const rows = React.useMemo(() => {
    const tpsByTx = data.tpsByTx || {};
    return Object.entries(tpsByTx).map(([tx, series]) => {
      const vals = (series || []).filter((p) => p.v > 0).map((p) => p.v);
      const all = (series || []).map((p) => p.v || 0);
      const total = all.length || 1;
      const minTps = vals.length ? vals.reduce((m, v) => Math.min(m, v), Infinity) : 0;
      const maxTps = vals.length ? vals.reduce((m, v) => Math.max(m, v), 0) : 0;
      const avgTps = all.reduce((s, v) => s + v, 0) / total;
      return { tx, minTps, maxTps, avgTps };
    });
  }, [data]);

  const sorted = React.useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sort.col] ?? 0;
      const vb = b[sort.col] ?? 0;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort]);

  const toggle = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  const th = (col, label) => (
    <th className={cx(TH, sort.col === col && sort.dir)} onClick={() => toggle(col)}>{label}</th>
  );

  const handleExport = () => {
    const header = 'Transaction,Min TPS,Avg TPS,Max TPS';
    const csvRows = sorted.map((r) => `"${r.tx}",${r.minTps.toFixed(2)},${r.avgTps.toFixed(2)},${r.maxTps.toFixed(2)}`);
    exportCsv([header, ...csvRows].join('\n'), 'tps-summary.csv');
  };

  if (rows.length === 0) return null;

  return (
    <div className={cx(PANEL, 'overflow-auto')}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={cx(PANEL_H2, 'mb-0')}>TPS Summary</h2>
        <button className={BTN_EXPORT} onClick={handleExport}>Export CSV</button>
      </div>
      <div className={TABLE_WRAP}><table className={TABLE}>
        <thead>
          <tr>
            {th('tx', 'Transaction')}
            {th('minTps', 'Min TPS')}
            {th('avgTps', 'Avg TPS')}
            {th('maxTps', 'Max TPS')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.tx}>
              <td className={TD}>{row.tx}</td>
              <td className={TD}>{row.minTps.toFixed(2)}</td>
              <td className={TD}>{row.avgTps.toFixed(2)}</td>
              <td className={TD}>{row.maxTps.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

/* ─── RpsSummaryTable ───────────────────────────────────────────────────── */
function RpsSummaryTable({ data }) {
  const [sort, setSort] = React.useState({ col: 'avgRps', dir: 'desc' });

  const rows = React.useMemo(() => {
    const apiObj = (data.clientBuckets || {}).api || {};
    return Object.entries(apiObj).map(([key, entry]) => {
      const tx = entry.transaction || key;
      const apiName = entry.api || key;
      const tsMap = entry.ts || {};
      const vals = Object.values(tsMap).map((b) => b.ok || 0).filter((v) => v > 0);
      const all = (data.allBuckets || []).map((t) => tsMap[t]?.ok || 0);
      const total = all.length || 1;
      const minRps = vals.length ? vals.reduce((m, v) => Math.min(m, v), Infinity) : 0;
      const maxRps = vals.length ? vals.reduce((m, v) => Math.max(m, v), 0) : 0;
      const avgRps = all.reduce((s, v) => s + v, 0) / total;
      const p90Rps = vals.length ? [...vals].sort((a, b) => a - b)[Math.floor(vals.length * 0.9)] || 0 : 0;
      return { key, tx, apiName, minRps, avgRps, maxRps, p90Rps };
    });
  }, [data]);

  const sorted = React.useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sort.col] ?? 0;
      const vb = b[sort.col] ?? 0;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort]);

  const toggle = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  const th = (col, label) => (
    <th className={cx(TH, sort.col === col && sort.dir)} onClick={() => toggle(col)}>{label}</th>
  );

  const handleExport = () => {
    const header = 'Transaction,API,Min RPS,Avg RPS,p90 RPS,Max RPS';
    const csvRows = sorted.map((r) => `"${r.tx}","${r.apiName}",${r.minRps.toFixed(2)},${r.avgRps.toFixed(2)},${r.p90Rps.toFixed(2)},${r.maxRps.toFixed(2)}`);
    exportCsv([header, ...csvRows].join('\n'), 'rps-summary.csv');
  };

  if (rows.length === 0) return null;

  return (
    <div className={cx(PANEL, 'overflow-auto')}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={cx(PANEL_H2, 'mb-0')}>RPS Summary — by API</h2>
        <button className={BTN_EXPORT} onClick={handleExport}>Export CSV</button>
      </div>
      <div className={TABLE_WRAP}><table className={TABLE}>
        <thead>
          <tr>
            {th('tx', 'Transaction')}
            {th('apiName', 'API')}
            {th('minRps', 'Min RPS')}
            {th('avgRps', 'Avg RPS')}
            {th('p90Rps', 'p90 RPS')}
            {th('maxRps', 'Max RPS')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key}>
              <td className={TD}>{row.tx}</td>
              <td className={TD}>{row.apiName}</td>
              <td className={TD}>{row.minRps.toFixed(2)}</td>
              <td className={TD}>{row.avgRps.toFixed(2)}</td>
              <td className={TD}>{row.p90Rps.toFixed(2)}</td>
              <td className={TD}>{row.maxRps.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

/* ─── FullTxTable ───────────────────────────────────────────────────────── */
function FullTxTable({ rows }) {
  const [sort, setSort] = React.useState({ col: 'p90', dir: 'desc' });
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(
    () => rows.filter((r) => !search || (r.transaction || '').toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sort.col] ?? 0;
      const vb = b[sort.col] ?? 0;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const toggle = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  const th = (col, label) => (
    <th className={cx(TH, sort.col === col && sort.dir)} onClick={() => toggle(col)}>{label}</th>
  );

  const handleExport = () => {
    const header = 'Transaction,Min (s),Avg (s),Max (s),p90 (s),Success,Error,Sample,Rate';
    const csvRows = sorted.map((r) =>
      `"${r.transaction}",${fmtSec(r.min)},${fmtSec(r.avg)},${fmtSec(r.max)},${fmtSec(r.p90)},${r.success || 0},${r.error || 0},${r.sample || 0},${r.successRate || 0}%`
    );
    exportCsv([header, ...csvRows].join('\n'), 'transactions.csv');
  };

  return (
    <div className={cx(PANEL, 'overflow-auto')}>
      <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
        <h2 className={cx(PANEL_H2, 'mb-0 flex-1')}>Transactions</h2>
        <input
          className={SEARCH}
          placeholder="Search transaction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={BTN_EXPORT} onClick={handleExport}>Export CSV</button>
      </div>
      <div className={TABLE_WRAP}><table className={TABLE}>
        <thead>
          <tr>
            {th('transaction', 'Transaction')}
            {th('min', 'Min (s)')}
            {th('avg', 'Avg (s)')}
            {th('max', 'Max (s)')}
            {th('p90', 'p90 (s)')}
            {th('success', 'Success')}
            {th('error', 'Error')}
            {th('sample', 'Sample')}
            {th('successRate', 'Rate')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.transaction}>
              <td className={TD}><strong className="text-head">{row.transaction}</strong></td>
              <td className={TD}>{fmtSec(row.min)}</td>
              <td className={TD}>{fmtSec(row.avg)}</td>
              <td className={TD}>{fmtSec(row.max)}</td>
              <td className={TD}>{fmtSec(row.p90)}</td>
              <td className={TD}>{fmtN(row.success)}</td>
              <td className={cx(TD, row.error > 0 && 'text-bad')}>{fmtN(row.error)}</td>
              <td className={TD}>{fmtN(row.sample)}</td>
              <td className={TD}>{row.successRate}%</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

/* ─── FullApiTable ──────────────────────────────────────────────────────── */
function FullApiTable({ rows }) {
  const [sort, setSort] = React.useState({ col: 'p90', dir: 'desc' });
  const [search, setSearch] = React.useState('');
  const [txFilter, setTxFilter] = React.useState('');

  const txOptions = React.useMemo(() => {
    const set = new Set(rows.map((r) => r.transaction).filter(Boolean));
    return [...set].sort();
  }, [rows]);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      const matchTx = !txFilter || r.transaction === txFilter;
      const matchSearch = !search || (r.api || '').toLowerCase().includes(search.toLowerCase());
      return matchTx && matchSearch;
    });
  }, [rows, search, txFilter]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sort.col] ?? 0;
      const vb = b[sort.col] ?? 0;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const toggle = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  const th = (col, label) => (
    <th className={cx(TH, sort.col === col && sort.dir)} onClick={() => toggle(col)}>{label}</th>
  );

  const handleExport = () => {
    const header = 'Business Process,API,Min (s),Avg (s),Max (s),p90 (s),Success,Error,Sample,Rate';
    const csvRows = sorted.map((r) =>
      `"${r.transaction}","${r.api}",${fmtSec(r.min)},${fmtSec(r.avg)},${fmtSec(r.max)},${fmtSec(r.p90)},${r.success || 0},${r.error || 0},${r.sample || 0},${r.successRate || 0}%`
    );
    exportCsv([header, ...csvRows].join('\n'), 'apis.csv');
  };

  return (
    <div className={cx(PANEL, 'overflow-auto')}>
      <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
        <h2 className={cx(PANEL_H2, 'mb-0 flex-1')}>APIs</h2>
        {txOptions.length > 0 && (
          <select
            value={txFilter}
            onChange={(e) => setTxFilter(e.target.value)}
            className="border border-border rounded-[7px] bg-input text-text py-1 px-2 text-[12px] focus:outline-none focus:border-accent"
          >
            <option value="">All transactions</option>
            {txOptions.map((tx) => <option key={tx} value={tx}>{tx}</option>)}
          </select>
        )}
        <input
          className={SEARCH}
          placeholder="Search API…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={BTN_EXPORT} onClick={handleExport}>Export CSV</button>
      </div>
      <div className={TABLE_WRAP}><table className={TABLE}>
        <thead>
          <tr>
            {th('transaction', 'Business Process')}
            {th('api', 'API')}
            {th('min', 'Min (s)')}
            {th('avg', 'Avg (s)')}
            {th('max', 'Max (s)')}
            {th('p90', 'p90 (s)')}
            {th('success', 'Success')}
            {th('error', 'Error')}
            {th('sample', 'Sample')}
            {th('successRate', 'Rate')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={`${row.transaction}-${row.api}-${i}`}>
              <td className={TD}><small className="text-muted">{row.transaction}</small></td>
              <td className={TD}><strong className="text-head">{row.api}</strong></td>
              <td className={TD}>{fmtSec(row.min)}</td>
              <td className={TD}>{fmtSec(row.avg)}</td>
              <td className={TD}>{fmtSec(row.max)}</td>
              <td className={TD}>{fmtSec(row.p90)}</td>
              <td className={TD}>{fmtN(row.success)}</td>
              <td className={cx(TD, row.error > 0 && 'text-bad')}>{fmtN(row.error)}</td>
              <td className={TD}>{fmtN(row.sample)}</td>
              <td className={TD}>{row.successRate}%</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

/* ─── ScriptGeneratorPage ──────────────────────────────────────────────── */
function ScriptGeneratorPage() {
  const [channel, setChannel] = React.useState('_exampleChannel');
  const [bpName, setBpName] = React.useState('BP001_LoginInquiry');
  const [baseUrl, setBaseUrl] = React.useState('parameter.BASE_URL');
  const [steps, setSteps] = React.useState([]);

  const addStep = () => {
    const next = steps.length + 1;
    setSteps((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        transaction: `${bpName}_${String(next).padStart(2, '0')}`,
        apis: [createApiDraft(next, 1)],
      },
    ]);
  };

  const updateStep = (id, patch) => {
    setSteps((current) => current.map((step) => step.id === id ? { ...step, ...patch } : step));
  };

  const addApi = (stepId) => {
    setSteps((current) => current.map((step, stepIndex) => {
      if (step.id !== stepId) return step;
      return { ...step, apis: [...step.apis, createApiDraft(stepIndex + 1, step.apis.length + 1)] };
    }));
  };

  const updateApi = (stepId, apiId, patch) => {
    setSteps((current) => current.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        apis: step.apis.map((apiItem) => apiItem.id === apiId ? { ...apiItem, ...patch } : apiItem),
      };
    }));
  };

  const removeApi = (stepId, apiId) => {
    setSteps((current) => current.map((step) => {
      if (step.id !== stepId) return step;
      return { ...step, apis: step.apis.filter((apiItem) => apiItem.id !== apiId) };
    }));
  };

  const removeStep = (id) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  const preview = React.useMemo(
    () => buildScriptPreview({ channel, bpName, baseUrl, steps }),
    [channel, bpName, baseUrl, steps]
  );

  return (
    <>
      <PageHeader
        eyebrow="Generator"
        title="Script Generator"
        description="Fondasi UI untuk membuat BP/API flow tanpa menulis JavaScript langsung."
      />

      <section className="grid grid-cols-2 gap-3.5 max-[900px]:grid-cols-1">
        <form className={cx(PANEL, 'grid gap-3.5 content-start')}>
          <label className={LABEL}>
            Channel
            <input className={INPUT} value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="_exampleChannel" />
          </label>
          <label className={LABEL}>
            Business Process Name
            <input className={INPUT} value={bpName} onChange={(event) => setBpName(event.target.value)} placeholder="BP001_LoginInquiry" />
          </label>
          <label className={LABEL}>
            Base URL Parameter
            <input className={INPUT} value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="parameter.BASE_URL" />
          </label>
          <button type="button" className={cx(BTN_GRAD, 'w-fit')} onClick={addStep}>Add Step</button>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div className="grid gap-2.5 border border-border rounded-lg bg-surface-2 p-3" key={step.id}>
                <div className="flex items-center justify-between gap-2.5">
                  <strong className="text-text">Step {index + 1}</strong>
                  <button type="button" className="w-auto bg-transparent border border-bad text-bad py-[5px] px-2 rounded-md cursor-pointer text-[13px]" onClick={() => removeStep(step.id)}>Remove</button>
                </div>
                <label className={LABEL}>
                  Transaction
                  <input className={INPUT} value={step.transaction} onChange={(event) => updateStep(step.id, { transaction: event.target.value })} />
                </label>

                <div className="grid gap-2.5">
                  {step.apis.map((apiItem, apiIndex) => (
                    <div className="grid gap-2.5 border border-[rgba(60,60,67,.85)] rounded-[7px] bg-surface p-[11px]" key={apiItem.id}>
                      <div className="flex items-center justify-between gap-2.5">
                        <strong className="text-text">API {apiIndex + 1}</strong>
                        <button type="button" className="w-auto bg-transparent border border-bad text-bad py-[5px] px-2 rounded-md cursor-pointer text-[13px]" onClick={() => removeApi(step.id, apiItem.id)}>Remove API</button>
                      </div>
                      <label className={LABEL}>
                        API Name
                        <input className={INPUT} value={apiItem.name} onChange={(event) => updateApi(step.id, apiItem.id, { name: event.target.value })} />
                      </label>
                      <div className="grid grid-cols-[minmax(100px,.7fr)_1fr] gap-2.5 max-[900px]:grid-cols-1">
                        <label className={LABEL}>
                          Method
                          <select className={SELECT} value={apiItem.method} onChange={(event) => updateApi(step.id, apiItem.id, { method: event.target.value })}>
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                            <option>PATCH</option>
                            <option>DELETE</option>
                          </select>
                        </label>
                        <label className={LABEL}>
                          Path
                          <input className={INPUT} value={apiItem.path} onChange={(event) => updateApi(step.id, apiItem.id, { path: event.target.value })} />
                        </label>
                      </div>
                      <label className={LABEL}>
                        Headers JSON (optional)
                        <input
                          className={INPUT}
                          value={apiItem.headers}
                          onChange={(event) => updateApi(step.id, apiItem.id, { headers: event.target.value })}
                          placeholder='{"Content-Type":"application/json"}'
                        />
                      </label>
                      {hasBody(apiItem.method) && (
                        <label className={LABEL}>
                          Body JSON / Expression
                          <textarea
                            className={TEXTAREA}
                            value={apiItem.body}
                            onChange={(event) => updateApi(step.id, apiItem.id, { body: event.target.value })}
                            placeholder='JSON.stringify({ id: data.id })'
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="w-fit bg-transparent border border-accent text-accent rounded-[7px] px-[18px] py-2.5 cursor-pointer hover:bg-accent-soft" onClick={() => addApi(step.id)}>Add API</button>
              </div>
            ))}
          </div>
        </form>

        <div className={PANEL}>
          <h2 className={PANEL_H2}>Preview</h2>
          <pre className="relative m-0 p-3.5 overflow-auto rounded-lg bg-code text-text font-mono text-[12.5px] leading-[1.65] min-h-[360px] scroll-thin before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-accent-grad before:rounded-t-lg">{preview}</pre>
        </div>
      </section>
    </>
  );
}

/* ─── ScenarioGeneratorPage ────────────────────────────────────────────── */
function ScenarioGeneratorPage() {
  const [scenarioName, setScenarioName] = React.useState('scenario_myproject');
  const [rampStep, setRampStep] = React.useState(5);
  const [holdDuration, setHoldDuration] = React.useState(10);
  const [bps, setBps] = React.useState([]);

  const addBp = () => {
    const next = bps.length + 1;
    setBps((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: `BP${String(next).padStart(3, '0')}`,
        fn: `BP${String(next).padStart(3, '0')}_NamaBP`,
        users: 1,
        thinkTime: 1,
      },
    ]);
  };

  const updateBp = (id, patch) => {
    setBps((current) => current.map((bp) => bp.id === id ? { ...bp, ...patch } : bp));
  };

  const removeBp = (id) => {
    setBps((current) => current.filter((bp) => bp.id !== id));
  };

  const preview = React.useMemo(
    () => buildScenarioPreview({ scenarioName, rampStep, holdDuration, bps }),
    [scenarioName, rampStep, holdDuration, bps]
  );

  return (
    <>
      <PageHeader
        eyebrow="Generator"
        title="Scenario Generator"
        description="Fondasi UI untuk menyusun daftar BP, alokasi VU, dan konfigurasi ramp-up."
      />

      <section className="grid grid-cols-2 gap-3.5 max-[900px]:grid-cols-1">
        <form className={cx(PANEL, 'grid gap-3.5 content-start')}>
          <label className={LABEL}>
            Scenario Name
            <input className={INPUT} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="scenario_myproject" />
          </label>
          <label className={LABEL}>
            Ramp Step
            <input className={INPUT} type="number" value={rampStep} onChange={(event) => setRampStep(event.target.value)} placeholder="5" />
          </label>
          <label className={LABEL}>
            Hold Duration (minutes)
            <input className={INPUT} type="number" value={holdDuration} onChange={(event) => setHoldDuration(event.target.value)} placeholder="10" />
          </label>
          <button type="button" className={cx(BTN_GRAD, 'w-fit')} onClick={addBp}>Add BP Allocation</button>

          <div className="grid gap-3">
            {bps.map((bp, index) => (
              <div className="grid gap-2.5 border border-border rounded-lg bg-surface-2 p-3" key={bp.id}>
                <div className="flex items-center justify-between gap-2.5">
                  <strong className="text-text">BP Allocation {index + 1}</strong>
                  <button type="button" className="w-auto bg-transparent border border-bad text-bad py-[5px] px-2 rounded-md cursor-pointer text-[13px]" onClick={() => removeBp(bp.id)}>Remove</button>
                </div>
                <label className={LABEL}>
                  BP Name
                  <input className={INPUT} value={bp.name} onChange={(event) => updateBp(bp.id, { name: event.target.value })} />
                </label>
                <label className={LABEL}>
                  Function Name
                  <input className={INPUT} value={bp.fn} onChange={(event) => updateBp(bp.id, { fn: event.target.value })} />
                </label>
                <div className="grid grid-cols-[minmax(100px,.7fr)_1fr] gap-2.5 max-[900px]:grid-cols-1">
                  <label className={LABEL}>
                    Users
                    <input className={INPUT} type="number" value={bp.users} onChange={(event) => updateBp(bp.id, { users: event.target.value })} />
                  </label>
                  <label className={LABEL}>
                    Think Time
                    <input className={INPUT} type="number" value={bp.thinkTime} onChange={(event) => updateBp(bp.id, { thinkTime: event.target.value })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className={PANEL}>
          <h2 className={PANEL_H2}>Preview</h2>
          <pre className="relative m-0 p-3.5 overflow-auto rounded-lg bg-code text-text font-mono text-[12.5px] leading-[1.65] min-h-[360px] scroll-thin before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-accent-grad before:rounded-t-lg">{preview}</pre>
        </div>
      </section>
    </>
  );
}

/* ─── buildChartView ────────────────────────────────────────────────────── */
function buildChartView(data, selectedGranularity) {
  const durationSec = Math.max(1, Math.round((data.timeRange.end - data.timeRange.start) / 1000));
  const auto = roundNice(Math.ceil(durationSec / 250));
  const granularitySec = selectedGranularity === 'auto' ? auto : Math.max(1, Number(selectedGranularity));
  const granMs = granularitySec * 1000;
  const start = data.timeRange.start;

  return {
    granularitySec,
    tpsAll: aggregateSeries(data.tpsAll, granMs, 'rate', start),
    rpsAll: aggregateSeries(data.rpsAll, granMs, 'rate', start),
    txResponseTimeAll: aggregateSeries(data.txResponseTimeAll, granMs, 'avg', start).map((p) => ({ ...p, v: p.v / 1000 })),
    apiResponseTimeAll: aggregateSeries(data.apiResponseTimeAll, granMs, 'avg', start).map((p) => ({ ...p, v: p.v / 1000 })),
    vus: aggregateSeries(
      data.timeSeries?.['vus_max']?.length
        ? data.timeSeries['vus_max']
        : data.timeSeries?.['vus']?.length
          ? data.timeSeries['vus']
          : (Object.entries(data.timeSeries || {}).find(([k]) => k.toLowerCase().includes('vu'))?.[1] || []),
      granMs, 'avg', start
    ),
    errorsAll: aggregateSeries(
      (data.allBuckets || []).map((t) => ({ t, v: data.clientBuckets?.httpReqs?.[t]?.err || 0 })),
      granMs, 'rate', start
    ),
    tpsByTx: Object.fromEntries(
      Object.entries(data.tpsByTx || {}).map(([tx, s]) => [tx, aggregateSeries(s, granMs, 'rate', start)])
    ),
    rpsByApi: Object.fromEntries(
      Object.entries(data.rpsByApi || {}).map(([api, s]) => [api, aggregateSeries(s, granMs, 'rate', start)])
    ),
    txResponseTime: Object.fromEntries(
      Object.entries(data.txResponseTime || {}).map(([tx, s]) => [tx, aggregateSeries((s || []).filter((p) => p.v != null), granMs, 'avg', start).map((p) => ({ ...p, v: p.v / 1000 }))])
    ),
    apiResponseTime: Object.fromEntries(
      Object.entries(data.apiResponseTime || {}).map(([api, s]) => [api, aggregateSeries((s || []).filter((p) => p.v != null), granMs, 'avg', start).map((p) => ({ ...p, v: p.v / 1000 }))])
    ),
  };
}

/* ─── recomputeFromBuckets ──────────────────────────────────────────────── */
function recomputeFromBuckets(data, startOffsetMs, endOffsetMs) {
  const baseStart = data.timeRange.start;
  const baseEnd = data.timeRange.end;
  const lo = startOffsetMs != null ? baseStart + startOffsetMs : baseStart;
  const hi = endOffsetMs != null ? baseStart + endOffsetMs : baseEnd;

  const allBuckets = (data.allBuckets || []).filter((t) => t >= lo && t <= hi);
  if (allBuckets.length === 0) return data;

  const rangeStart = allBuckets[0];
  const rangeEnd = allBuckets[allBuckets.length - 1];

  // tpsAll / rpsAll
  const tpsAll = (data.tpsAll || []).filter((p) => p.t >= lo && p.t <= hi);
  const rpsAll = (data.rpsAll || []).filter((p) => p.t >= lo && p.t <= hi);
  const txResponseTimeAll = (data.txResponseTimeAll || []).filter((p) => p.t >= lo && p.t <= hi);
  const apiResponseTimeAll = (data.apiResponseTimeAll || []).filter((p) => p.t >= lo && p.t <= hi);

  // tpsByTx
  const tpsByTx = Object.fromEntries(
    Object.entries(data.tpsByTx || {}).map(([tx, s]) => [tx, (s || []).filter((p) => p.t >= lo && p.t <= hi)])
  );

  // rpsByApi
  const rpsByApi = Object.fromEntries(
    Object.entries(data.rpsByApi || {}).map(([api, s]) => [api, (s || []).filter((p) => p.t >= lo && p.t <= hi)])
  );

  // txResponseTime / apiResponseTime
  const txResponseTime = Object.fromEntries(
    Object.entries(data.txResponseTime || {}).map(([tx, s]) => [tx, (s || []).filter((p) => p.t >= lo && p.t <= hi)])
  );
  const apiResponseTime = Object.fromEntries(
    Object.entries(data.apiResponseTime || {}).map(([tx, s]) => [tx, (s || []).filter((p) => p.t >= lo && p.t <= hi)])
  );

  // recompute stat cards from filtered buckets
  const cb = data.clientBuckets || {};
  let totalReqs = 0, successReqs = 0, errorReqs = 0;
  let peakTps = 0, peakRps = 0;

  // walk through tpsAll/rpsAll for peaks
  tpsAll.forEach((p) => { if (p.v > peakTps) peakTps = p.v; });
  rpsAll.forEach((p) => { if (p.v > peakRps) peakRps = p.v; });

  // count reqs from httpReqs buckets
  const httpReqs = cb.httpReqs || {};
  allBuckets.forEach((t) => {
    const b = httpReqs[t];
    if (b) {
      totalReqs += (b.ok || 0) + (b.err || 0);
      successReqs += (b.ok || 0);
      errorReqs += (b.err || 0);
    }
  });
  const errorPct = totalReqs ? ((errorReqs / totalReqs) * 100).toFixed(2) : '0.00';

  const sc = {
    ...data.statCards,
    totalReqs,
    successReqs,
    errorReqs,
    errorPct,
    peakTps: Math.round(peakTps),
    peakRps: Math.round(peakRps),
  };

  const timeSeries = Object.fromEntries(
    Object.entries(data.timeSeries || {}).map(([k, s]) => [k, (s || []).filter((p) => p.t >= lo && p.t <= hi)])
  );

  return {
    ...data,
    allBuckets,
    timeRange: { start: rangeStart, end: rangeEnd },
    tpsAll,
    rpsAll,
    txResponseTimeAll,
    apiResponseTimeAll,
    tpsByTx,
    rpsByApi,
    txResponseTime,
    apiResponseTime,
    timeSeries,
    statCards: sc,
  };
}

/* ─── buildMultiSeries ──────────────────────────────────────────────────── */
function buildMultiSeries(seriesMap, colors) {
  if (!seriesMap) return [];
  return Object.entries(seriesMap).map(([label, data], i) => ({
    label,
    data: data || [],
    color: colors[i % colors.length],
  }));
}

/* ─── exportCsv ─────────────────────────────────────────────────────────── */
function exportCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Script / Scenario builder helpers (unchanged) ────────────────────── */
function buildScriptPreview({ channel, bpName, baseUrl, steps }) {
  const safeBp = bpName || 'BP001_NamaBP';
  const renderedSteps = steps.length ? steps.map((step) => {
    const renderedApis = step.apis.length ? step.apis.map((apiItem) => renderApiPreview(apiItem, baseUrl)).join('\n\n') : '                // klik Add API untuk menambahkan request';
    return `            tx = '${step.transaction || safeBp}';
            transaction(tx, () => {
${renderedApis}
            });`;
  }).join('\n\n') : '            // klik Add Step untuk menambahkan transaksi';

  return `import {
    runScript, loadCSV, transaction, api,
} from '../../../../framework/index.js';
import { parameter } from '../parameter.config.js';

const dataset = loadCSV(import.meta.resolve('./${safeBp}_data.csv'));

export function ${safeBp}() {
    runScript({
        dataset,
        name: '${safeBp}',
        parameter,
        fn: (data, session) => {
            let tx = '';

${renderedSteps}
        }
    });
}

// Target folder: workspace/scripts/${channel || '_channel'}/${safeBp}/`;
}

function createApiDraft(stepIndex, apiIndex) {
  return {
    id: crypto.randomUUID(),
    name: `${String(stepIndex).padStart(3, '0')}_${String(apiIndex).padStart(2, '0')}_/api/example`,
    method: 'GET',
    path: '/api/example',
    headers: '',
    body: 'JSON.stringify({})',
  };
}

function hasBody(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function renderApiPreview(apiItem, baseUrl) {
  const lines = [
    `                api({`,
    `                    name: '${apiItem.name || 'api_step'}',`,
    `                    url: \`${baseUrl || 'parameter.BASE_URL'}${apiItem.path || '/api/example'}\`,`,
    `                    method: '${apiItem.method || 'GET'}',`,
  ];

  if (hasBody(apiItem.method) && apiItem.body.trim()) {
    lines.push(`                    body: ${apiItem.body.trim()},`);
  }

  if (apiItem.headers.trim()) {
    lines.push(`                    headers: ${apiItem.headers.trim()},`);
  }

  lines.push(`                    transaction: tx,`);
  lines.push(`                });`);
  return lines.join('\n');
}

function buildScenarioPreview({ scenarioName, rampStep, holdDuration, bps }) {
  const imports = bps.length ? bps.map((bp) =>
    `import { ${bp.fn || 'BPxxx_NamaBP'} } from '../scripts/NamaProject/${bp.fn || 'BPxxx_NamaBP'}/${bp.fn || 'BPxxx_NamaBP'}.js';`
  ).join('\n') : '// import { BP001_NamaBP } from \'../scripts/NamaProject/BP001_NamaBP/BP001_NamaBP.js\';';

  const list = bps.length ? bps.map((bp) =>
    `    { name: '${bp.name || 'BPxxx'}', users: ${Number(bp.users) || 1}, fn: ${bp.fn || 'BPxxx_NamaBP'}, thinkTime: ${Number(bp.thinkTime) || 0} },`
  ).join('\n') : '    // { name: \'BP001\', users: 1, fn: BP001_NamaBP, thinkTime: 1 },';

  return `// File: workspace/scenarios/${scenarioName || 'scenario_myproject'}.js
import { MODE, createOptions, dispatchVu, setBpList } from '../../framework/index.js';

${imports}

const bpList = [
${list}
];

const loadConfig = {
    rampStep: ${Number(rampStep) || 1},
    rampInterval: 1,
    holdDuration: ${Number(holdDuration) || 10},
};

setBpList(bpList);
export const options = createOptions(bpList, MODE, loadConfig);
export default function () { dispatchVu(bpList, MODE); }`;
}

/* ─── Utility functions (all unchanged) ────────────────────────────────── */
function aggregateSeries(series = [], granMs, mode, start) {
  if (granMs <= 1000) return series;
  const buckets = new Map();
  series.forEach((point) => {
    if (point?.v == null || Number.isNaN(Number(point.v))) return;
    const key = start + Math.floor((point.t - start) / granMs) * granMs;
    const bucket = buckets.get(key) || { t: key, sum: 0, n: 0 };
    const weight = Number(point.n || 1);
    bucket.sum += Number(point.v) * weight;
    bucket.n += weight;
    buckets.set(key, bucket);
  });
  return [...buckets.values()].sort((a, b) => a.t - b.t).map((bucket) => ({
    t: bucket.t,
    v: mode === 'rate' ? bucket.sum / (granMs / 1000) : bucket.sum / Math.max(bucket.n, 1),
  }));
}

function roundNice(sec) {
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  return steps.find((step) => step >= sec) || steps[steps.length - 1];
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(ms) {
  if (!ms) return '-';
  const sec = Math.round(ms / 1000);
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return min ? `${min}m ${String(rest).padStart(2, '0')}s` : `${rest}s`;
}

function fmtSec(v) {
  if (v == null || Number.isNaN(Number(v))) return '-';
  return (Number(v) / 1000).toFixed(3);
}

function fmtN(v) {
  if (v == null || Number.isNaN(Number(v))) return '-';
  return Number(v).toLocaleString();
}

function successPct(sc) {
  return sc.totalReqs ? ((sc.successReqs / sc.totalReqs) * 100).toFixed(1) : '0.0';
}

function withAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

createRoot(document.getElementById('root')).render(<App />);
