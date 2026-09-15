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
const PANEL_H2  = 'm-0 mb-4 text-[13px] font-semibold text-head';
const PANEL_H2R = 'm-0 text-[13px] font-semibold text-head';   // varian judul dalam 1 baris flex (tanpa margin-bawah)
const INPUT     = 'w-full border border-border rounded-lg bg-input text-text py-2 px-3 font-sans text-[12.5px] normal-case focus:outline-none focus:border-accent';
const SELECT    = 'w-full border border-border rounded-lg bg-input text-text py-2 px-2.5 font-sans text-[12.5px] normal-case focus:outline-none focus:border-accent';
const TEXTAREA  = 'w-full min-h-[86px] resize-y border border-border rounded-lg bg-input text-text py-2 px-3 font-mono text-[12px] leading-[1.6] normal-case focus:outline-none focus:border-accent';
const LABEL     = 'grid gap-1.5 text-faint text-[10px] font-semibold uppercase tracking-[.1em]';
const BTN_GRAD  = 'bg-accent-grad text-white font-semibold rounded-[7px] px-4 py-2 cursor-pointer border-0 disabled:opacity-55';
const BTN_EXPORT= 'bg-transparent border border-border text-muted text-[10px] py-[2px] px-1.5 rounded cursor-pointer whitespace-nowrap hover:border-accent hover:text-accent';
const SEARCH    = 'bg-input border border-border text-text py-[4px] px-2 rounded text-[11px] w-[180px] focus:outline-none focus:border-accent';
const TABLE_WRAP= 'max-h-[240px] overflow-auto scroll-thin [scrollbar-gutter:stable]';
const TABLE     = 'w-full border-collapse text-[11px]';
const TH        = 'th-sort py-1.5 px-2 border-b border-[rgba(60,60,67,.75)] text-left whitespace-nowrap text-muted font-semibold uppercase text-[9.5px] cursor-pointer';
const TD        = 'py-1.5 px-2 border-b border-[rgba(60,60,67,.75)] text-left whitespace-nowrap tabular-nums';
const CHART_GRID= 'grid grid-cols-2 gap-4 max-[900px]:grid-cols-1';

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

// crypto.randomUUID hanya tersedia di secure context (https/localhost).
// Fallback supaya dashboard tetap jalan saat diakses via IP jaringan
// (http://10.x.x.x:3000) — tanpa ini klik Add Step/Tambah BP bikin blank page.
const uid = () => (window.crypto?.randomUUID
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const NAV = [
  { title: 'Workspace', items: [
    { id: '',        label: 'Results Dashboard' },
    { id: 'run',     label: 'Run Test'          },
    { id: 'inspect', label: 'API Inspector'     },
    { id: 'scripts', label: 'Scripts'           },
    { id: 'results', label: 'Run History'       },
  ]},
  { title: 'Generators', items: [
    { id: 'script',   label: 'Script Generator'   },
    { id: 'scenario', label: 'Scenario Generator' },
  ]},
];

const DOCS_NAV = [
  { title: 'Pengenalan', items: [
    { label: 'Getting Started', path: 'getting-started' },
    { label: 'Menjalankan Test', path: 'cara-run'       },
    { label: 'Struktur Folder', path: 'struktur-folder' },
  ]},
  { title: 'Framework Guide', items: [
    { label: 'Tambah BP',        path: 'framework/tambah-bp'        },
    { label: 'Tambah Project',   path: 'framework/tambah-project'   },
    { label: 'Extract & Batch',  path: 'framework/extract-batch'    },
    { label: 'Variable Sources', path: 'framework/variable-sources' },
    { label: 'Auth',             path: 'framework/auth'             },
    { label: 'Menangani Transaksi Gagal', path: 'framework/transaction-fail' },
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
  if (['run', 'inspect', 'scripts', 'results', 'script', 'scenario'].includes(h)) return h;
  return '';
}

function App() {
  const [route, setRoute]   = React.useState(getRoute);
  const [result, setResult] = React.useState(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [theme, toggleTheme] = useDocsTheme();

  React.useEffect(() => {
    const onPop = () => setRoute(getRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Ctrl+K / Cmd+K → buka global search
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      <Sidebar route={route} go={go} theme={theme} toggleTheme={toggleTheme} onSearch={() => setSearchOpen(true)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} go={go} />

      {route === '' && (result
        ? <InShellResults result={result} onBack={() => setResult(null)} onNewResult={setResult} />
        : <main className={MAIN}><DashboardPage onData={setResult} /></main>)}
      {route === 'run'      && <main className={MAIN}><RunnerPage go={go} /></main>}
      {route === 'inspect'  && <main className={MAIN}><ApiInspectorPage /></main>}
      {route === 'scripts'  && <main className={MAIN}><ScriptsPage /></main>}
      {route === 'results'  && <main className={MAIN}><HistoryPage onResult={openResult} /></main>}
      {route === 'script'   && <main className={MAIN}><ScriptGeneratorPage /></main>}
      {route === 'scenario' && <main className={MAIN}><ScenarioGeneratorPage /></main>}
      {route.startsWith('docs/') && <DocContent docPath={route.slice(5)} go={go} />}
    </div>
  );
}

/* ─── SearchPalette — global search (Ctrl+K): halaman, scenario, script/BP,
   dan isi docs. Index dibangun sekali saat pertama dibuka; semua sumber dari
   API yang sudah ada, tanpa backend baru. ──────────────────────────────── */
const stripMd = (md) => String(md || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/^#{1,6}\s*/gm, '')
  .replace(/[|>*_~]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function SearchPalette({ open, onClose, go }) {
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState(null); // null = index belum dibangun
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  // Bangun index sekali saat pertama dibuka. Halaman tampil langsung;
  // scenario/script/docs menyusul begitu fetch selesai.
  React.useEffect(() => {
    if (!open || items) return;
    const pages = NAV.flatMap((g) => g.items.map((it) => ({
      group: 'Halaman', label: it.label, hint: g.title, run: () => go(it.id),
    })));
    setItems(pages);
    Promise.allSettled([
      fetch('/api/scenarios').then((r) => r.json()),
      fetch('/api/bp-catalog').then((r) => r.json()),
      ...DOCS_NAV.flatMap((s) => s.items).map((d) =>
        fetch(`/api/docs/${d.path}`).then((r) => r.json()).then((j) => ({ ...d, text: stripMd(j.content) }))),
    ]).then(([scen, cat, ...docs]) => {
      const out = [...pages];
      if (scen.status === 'fulfilled') (scen.value.scenarios || []).forEach((name) => out.push({
        group: 'Scenario', label: name, hint: 'buka di Run Test',
        run: () => {
          sessionStorage.setItem('k6.selectScenario', name);
          window.dispatchEvent(new CustomEvent('k6-select-scenario', { detail: name }));
          go('run');
        },
      }));
      if (cat.status === 'fulfilled') (cat.value.catalog || []).forEach((c) => out.push({
        group: 'Script', label: `${c.channel}/${c.bp} · ${c.fn}`, hint: 'workspace/scripts', run: () => go('scripts'),
      }));
      docs.forEach((d) => {
        if (d.status === 'fulfilled') out.push({
          group: 'Docs', label: d.value.label, text: d.value.text, hint: 'Documentation',
          run: () => go(`docs/${d.value.path}`),
        });
      });
      setItems(out);
    });
  }, [open, items, go]);

  React.useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);
  React.useEffect(() => { setActive(0); }, [query]);
  React.useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const results = React.useMemo(() => {
    if (!items) return [];
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const scored = [];
    for (const it of items) {
      const label = it.label.toLowerCase();
      const text = (it.text || '').toLowerCase();
      if (tokens.length === 0) {
        // Tanpa query: tampilkan halaman saja sebagai quick-nav.
        if (it.group === 'Halaman') scored.push({ it, score: 0, snippet: null });
        continue;
      }
      const inLabel = tokens.every((t) => label.includes(t));
      if (!inLabel && !tokens.every((t) => label.includes(t) || text.includes(t))) continue;
      let snippet = null;
      if (!inLabel && text) {
        const hit = tokens.find((t) => text.includes(t));
        const idx = text.indexOf(hit);
        const start = Math.max(0, idx - 40);
        snippet = (start > 0 ? '…' : '') + it.text.slice(start, idx + 70) + '…';
      }
      scored.push({ it, score: inLabel ? 0 : 1, snippet });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 24);
  }, [items, query]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { const r = results[active]; if (r) { r.it.run(); onClose(); } }
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex justify-center items-start pt-[12vh] p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[min(92vw,620px)] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        <input ref={inputRef}
          className="w-full bg-transparent border-0 border-b border-border text-text text-[14px] py-3 px-4 focus:outline-none placeholder:text-faint"
          placeholder="Cari halaman, scenario, script, atau docs…"
          value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} />
        <div ref={listRef} className="max-h-[50vh] overflow-auto scroll-thin py-1.5">
          {items === null && <div className="py-3 px-4 text-[12px] text-muted">Memuat index…</div>}
          {items !== null && results.length === 0 && (
            <div className="py-3 px-4 text-[12px] text-muted">Tidak ada hasil untuk “{query}”.</div>
          )}
          {results.map((r, i) => (
            <div key={`${r.it.group}-${r.it.label}-${i}`} data-active={i === active}
              className={cx('flex flex-col gap-0.5 py-2 px-4 cursor-pointer', i === active ? 'bg-accent-soft' : 'hover:bg-border-soft')}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); r.it.run(); onClose(); }}>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-faint bg-border py-px px-1.5 rounded shrink-0 w-[62px] text-center">{r.it.group}</span>
                <span className="text-[13px] text-text truncate">{r.it.label}</span>
                {r.it.hint && <span className="text-[10px] text-faint ml-auto shrink-0">{r.it.hint}</span>}
              </div>
              {r.snippet && <div className="text-[11px] text-muted pl-[70px] truncate">{r.snippet}</div>}
            </div>
          ))}
        </div>
        <div className="flex gap-3 py-2 px-4 border-t border-border text-[10px] text-faint">
          <span>↑↓ navigasi</span><span>Enter buka</span><span>Esc tutup</span>
        </div>
      </div>
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
function Sidebar({ route, go, theme, toggleTheme, onSearch }) {
  const navBtn = (active) => cx(
    'text-left rounded-lg px-2.5 py-1.5 text-[12.5px] cursor-pointer transition-colors',
    active ? 'text-head bg-surface-2 font-semibold' : 'text-muted hover:text-head hover:bg-border-soft'
  );
  return (
    <aside className="border-r border-border bg-sidebar px-4 py-5 flex flex-col gap-4 sticky top-0 h-screen overflow-y-auto scroll-thin max-[900px]:static max-[900px]:h-auto">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent-grad text-white font-bold text-[14px] shrink-0 shadow-[0_0_16px_var(--accent-soft)]">k6</span>
        <div className="leading-tight">
          <strong className="block text-[13px] font-bold tracking-[-.1px] text-head">k6 Framework</strong>
          <small className="block mt-0.5 text-[10px] uppercase tracking-[.08em] text-muted">Performance testing</small>
        </div>
      </div>

      <button type="button" onClick={onSearch}
        className="flex items-center gap-2 w-full border border-border rounded-lg bg-input text-faint text-[12px] py-1.5 px-2.5 cursor-pointer hover:border-accent hover:text-muted transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        Cari…
        <kbd className="ml-auto text-[9px] font-mono border border-border rounded px-1 py-px">Ctrl K</kbd>
      </button>

      <nav className="grid gap-px">
        {NAV.map((group) => (
          <div key={group.title} className="grid gap-px">
            <div className="px-2.5 pt-4 pb-1 text-[9.5px] font-semibold uppercase tracking-[.14em] text-faint">{group.title}</div>
            {group.items.map((it) => (
              <button key={it.id} className={navBtn(route === it.id)} onClick={() => go(it.id)}>{it.label}</button>
            ))}
          </div>
        ))}

        <div className="px-2.5 pt-4 pb-1 text-[9.5px] font-semibold uppercase tracking-[.14em] text-faint">Documentation</div>
        {DOCS_NAV.map((section) => (
          <div key={section.title} className="grid gap-px">
            <div className="px-2.5 pt-2.5 pb-0.5 text-[11px] font-semibold text-head">{section.title}</div>
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

      <div className="mt-auto pt-3 border-t border-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] text-muted cursor-pointer hover:bg-border-soft hover:text-head transition-colors"
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
    <header className="max-w-[920px] mb-6">
      <span className="inline-block text-[10px] font-semibold tracking-[.16em] uppercase text-faint">{eyebrow}</span>
      <h1 className="mt-1.5 mb-2 text-[22px] font-bold tracking-[-.02em] text-head">{title}</h1>
      <p className="m-0 max-w-[700px] text-muted text-[13px] leading-[1.7]">{description}</p>
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

// ─── SearchableSelect — dropdown dengan input search ──────────────────────
// options: string[] atau { value, label }[]
function SearchableSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const ref = React.useRef(null);

  const isObj = options.length > 0 && typeof options[0] === 'object';
  const getLabel = (o) => isObj ? o.label : o;
  const getValue = (o) => isObj ? o.value : o;

  const filtered = options.filter((o) => {
    const label = getLabel(o).toLowerCase();
    return !query || label.includes(query.toLowerCase());
  });

  const displayValue = (() => {
    if (!value) return '';
    const found = options.find((o) => getValue(o) === value);
    return found ? getLabel(found) : value;
  })();

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        className={INPUT}
        value={open ? query : displayValue}
        placeholder={placeholder || 'Pilih…'}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        readOnly={!open}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-auto rounded-lg border border-border bg-surface shadow-lg scroll-thin">
          {filtered.length === 0 && <div className="py-2 px-3.5 text-[12px] text-muted">Tidak ditemukan</div>}
          {filtered.map((o) => {
            const v = getValue(o);
            const l = getLabel(o);
            return (
              <div
                key={v}
                className={cx(
                  'py-2 px-3.5 text-[13px] cursor-pointer hover:bg-accent-soft transition-colors',
                  v === value ? 'text-accent font-semibold bg-accent-soft/50' : 'text-text'
                )}
                onMouseDown={() => { onChange(v); setOpen(false); setQuery(''); }}
              >
                {l}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Run Test — jalankan scenario, log real-time via SSE ────────────────────
function RunnerPage({ go }) {
  const [scenarios, setScenarios] = React.useState([]);
  const [scenarioDetails, setScenarioDetails] = React.useState({});
  const [form, setForm] = React.useState({
    scenario: '', mode: 'testhit', iterations: 1,
    csv: true, debug: false, webdash: false, prometheus: false, tags: '',
  });
  const [logLines, setLogLines] = React.useState([]);
  const [status, setStatus] = React.useState('idle'); // idle|running|done|error
  const [lastCsv, setLastCsv] = React.useState(null);
  const esRef = React.useRef(null);
  const startedRef = React.useRef(false);
  const logRef = React.useRef(null);

  const loadScenarios = React.useCallback((selectName) => {
    fetch('/api/scenarios/detail').then((r) => r.json()).then((d) => {
      const arr = d.scenarios || [];
      const list = arr.map((s) => s.name);
      setScenarios(list);
      const details = {};
      arr.forEach((s) => { details[s.name] = s; });
      setScenarioDetails(details);
      // Pre-select dari global search (Ctrl+K) — dipasang sebelum navigasi ke sini.
      const want = sessionStorage.getItem('k6.selectScenario');
      if (want) sessionStorage.removeItem('k6.selectScenario');
      setForm((f) => {
        const pick = selectName || want;
        if (pick && list.includes(pick)) return { ...f, scenario: pick };
        return f.scenario ? f : { ...f, scenario: list[0] || '' };
      });
    }).catch(() => {});
  }, []);

  // Global search memilih scenario saat halaman ini sudah terbuka.
  React.useEffect(() => {
    const onSelect = (e) => {
      sessionStorage.removeItem('k6.selectScenario');
      setForm((f) => ({ ...f, scenario: e.detail }));
    };
    window.addEventListener('k6-select-scenario', onSelect);
    return () => window.removeEventListener('k6-select-scenario', onSelect);
  }, []);

  React.useEffect(() => {
    loadScenarios();
    return () => esRef.current?.close();
  }, [loadScenarios]);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const append = (text) => setLogLines((prev) => [...prev, text]);

  // Mode-specific field visibility. Tidak ada input VUs: loadtest memakai
  // alokasi users/totalVus dari scenario (Edit Scenario), testhit fix 1 VU.
  const showIterations = form.mode === 'testhit';

  const run = () => {
    if (!form.scenario || status === 'running') return;
    setLogLines([]); setStatus('running'); setLastCsv(null); startedRef.current = false;
    const params = new URLSearchParams({
      scenario: form.scenario, mode: form.mode, iterations: form.iterations,
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
      if (!startedRef.current) append('\n[error] Run gagal dimulai — scenario/k6 tidak valid, atau masih ada run lain yang berjalan.\n');
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
        description="Pilih scenario, atur mode, jalankan k6, dan lihat log real-time." />

      <section className={cx(PANEL, 'grid gap-4 mb-4')}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <label className={LABEL}>Scenario
            <SearchableSelect
              value={form.scenario}
              options={scenarios}
              onChange={(v) => set('scenario', v)}
              placeholder="(pilih scenario)"
            />
          </label>
          <label className={LABEL}>Mode
            <select className={SELECT} value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="testhit">testhit</option>
              <option value="loadtest">loadtest</option>
              <option value="stress" disabled>stress (coming soon)</option>
              <option value="spike" disabled>spike (coming soon)</option>
            </select>
          </label>
          {showIterations && (
            <label className={LABEL}>Iterations
              <input className={INPUT} type="number" min="1" value={form.iterations} onChange={(e) => set('iterations', e.target.value)} />
            </label>
          )}
          <label className={LABEL}>Tags (k=v,k=v)
            <input className={INPUT} value={form.tags} placeholder="env=staging,build=123" onChange={(e) => set('tags', e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-1.5 normal-case text-[12px] text-text cursor-pointer"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.csv} onChange={(e) => set('csv', e.target.checked)} /> Export CSV</label>
          <label className="flex items-center gap-1.5 normal-case text-[12px] text-text cursor-pointer"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.debug} onChange={(e) => set('debug', e.target.checked)} /> Debug (http-debug)</label>
          <label className="flex items-center gap-1.5 normal-case text-[12px] text-text cursor-pointer"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.webdash} onChange={(e) => set('webdash', e.target.checked)} /> k6 web dashboard</label>
          <label className="flex items-center gap-1.5 normal-case text-[12px] text-text cursor-pointer" title="Kirim metric via remote write ke Prometheus/Grafana (default localhost:9090)"><input type="checkbox" className="w-auto m-0 accent-accent" checked={form.prometheus} onChange={(e) => set('prometheus', e.target.checked)} /> Prometheus (Grafana)</label>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {status !== 'running'
            ? <button type="button" className={cx(BTN_GRAD, 'text-[12px] px-3.5 py-[6px] disabled:cursor-not-allowed')} onClick={run} disabled={!form.scenario}>▶ Run</button>
            : <button type="button" className="bg-bad text-white font-semibold rounded-lg text-[12px] px-3.5 py-[6px] cursor-pointer border-0" onClick={stop}>■ Stop</button>}
          <span className={cx('text-[11px]', statusColor)}>{statusLabel}</span>
          {lastCsv && status !== 'running' && (
            <button type="button" className="bg-transparent border border-border text-muted py-0.5 px-2 rounded-md cursor-pointer text-[10px] hover:border-accent hover:text-accent" onClick={() => go('results')}>CSV: {lastCsv} → Run History</button>
          )}
        </div>
      </section>

      {/* ── Scenario Settings ── */}
      {form.scenario && scenarioDetails[form.scenario] && (
        <ScenarioSettings
          detail={scenarioDetails[form.scenario]}
          onSaved={(name) => loadScenarios(name)}
        />
      )}

      <section className={cx(PANEL, 'p-0 overflow-hidden')}>
        <pre ref={logRef} className="m-0 py-3 px-4 bg-code text-text font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap break-words overflow-auto max-h-[58vh] min-h-[200px] scroll-thin">{logLines.join('') || 'Log k6 tampil di sini saat test berjalan…'}</pre>
      </section>
    </>
  );
}

// ─── RampSparkline — gambaran profil beban loadtest: tangga ramp-up lalu hold.
//     Titik (menit, VU) mengikuti generateStages() di framework/core/config.js:
//     spawn rampStep serentak → hold rampInterval menit → ulang → hold holdDuration.
//     Tiap anak tangga punya titik hover berisi menit & jumlah VU-nya.
function RampSparkline({ rampStep, rampInterval, holdDuration, total, height = 150 }) {
  const pts = [[0, 0]];
  const marks = []; // { t, v } di tiap lompatan VU
  let t = 0, v = 0;
  if (rampStep > 0) {
    while (v < total) {
      v = Math.min(v + rampStep, total);
      pts.push([t, v]);
      marks.push({ t, v });
      if (v < total) { t += rampInterval; pts.push([t, v]); }
    }
  } else {
    v = total; pts.push([0, v]); marks.push({ t: 0, v });
  }
  const holdStart = t;
  t += holdDuration;
  pts.push([t, v]);
  const T = t;
  if (T <= 0 || total <= 0) return null;

  // Skala 0–100 di kedua sumbu; overlay HTML pakai persen yang sama supaya
  // titik hover tidak ikut terdistorsi preserveAspectRatio="none".
  const PAD = 5;
  const sx = (m) => (m / T) * 100;
  const sy = (u) => 100 - PAD - (u / total) * (100 - PAD * 2);
  const line = pts.map(([m, u]) => `${sx(m).toFixed(2)},${sy(u).toFixed(2)}`).join(' ');

  // Kalau tangganya sangat banyak, tampilkan sebagian titik saja biar tidak penuh.
  const every = Math.max(1, Math.ceil(marks.length / 40));
  const shown = marks.filter((m, i) => i % every === 0 || i === marks.length - 1);

  // Sumbu Y (VU): 0, tengah, puncak. Sumbu X (menit): interval "cantik" ≤5 tick.
  const yTicks = total > 1 ? [0, Math.round(total / 2), total] : [0, total];
  const xNice = [1, 2, 5, 10, 15, 20, 30, 60, 120, 240, 480];
  const xStep = xNice.find((s) => T / s <= 5) || Math.ceil(T / 5);
  const xTicks = [];
  for (let m = 0; m <= T; m += xStep) xTicks.push(m);
  // Tampilkan menit terakhir juga, kecuali terlalu mepet dgn tick sebelumnya.
  if (T - xTicks[xTicks.length - 1] >= xStep * 0.35) xTicks.push(T);

  return (
    <div className="flex gap-1">
      {/* Label sumbu Y (VU) */}
      <div className="relative w-8 shrink-0 text-[9px] text-faint font-mono" style={{ height }}>
        {yTicks.map((u) => (
          <span key={u} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${sy(u)}%` }}>{u}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative overflow-visible" style={{ height }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full block" aria-hidden="true">
            {yTicks.map((u) => (
              <line key={`y${u}`} x1="0" x2="100" y1={sy(u)} y2={sy(u)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            ))}
            {xTicks.map((m) => (
              <line key={`x${m}`} x1={sx(m)} x2={sx(m)} y1="0" y2="100" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points={`0,100 ${line} 100,100`} fill="var(--accent-soft)" />
            <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {holdDuration > 0 && (
            <div className="absolute inset-y-0 cursor-help" title={`Menit ${holdStart}–${T}: hold di ${total} VU`}
              style={{ left: `${sx(holdStart)}%`, right: 0 }} />
          )}
          {shown.map((m) => (
            <div key={`${m.t}-${m.v}`} title={`Menit ${m.t}: naik ke ${m.v} VU`}
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface border-2 border-accent cursor-help hover:scale-150 hover:bg-accent transition-transform"
              style={{ left: `${sx(m.t)}%`, top: `${sy(m.v)}%` }} />
          ))}
        </div>
        {/* Label sumbu X (menit) */}
        <div className="relative h-3.5 text-[9px] text-faint font-mono">
          {xTicks.map((m, i) => (
            <span key={m}
              className={cx('absolute tabular-nums', i === 0 ? '' : (i === xTicks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'))}
              style={{ left: `${sx(m)}%` }}>{m}{i === xTicks.length - 1 && ' min'}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LoadProfilePanel — blok profil beban (durasi + sparkline), dipakai di
//     view mode dan edit mode ScenarioSettings ───────────────────────────────
function LoadProfilePanel({ rampStep, rampInterval, holdDuration, total }) {
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  if (!(total > 0)) return null;
  // Cermin generateStages(): (langkah ramp - 1) × interval + hold.
  const rampMin = rampStep > 0 ? Math.max(0, Math.ceil(total / rampStep) - 1) * rampInterval : 0;
  const estMin = rampMin + holdDuration;
  const durasi = (
    <span className="text-[11px] text-muted">
      Estimasi durasi: <strong className="text-text font-mono">±{estMin} min</strong>
      {rampMin > 0 && <span className="text-faint"> — ramp {rampMin} min + hold {holdDuration} min</span>}
      {rampStep === 0 && <span className="text-faint"> — simultan: semua VU mulai bersamaan</span>}
    </span>
  );
  return (
    <div className="mb-3 border border-border rounded-lg bg-surface-2 py-2.5 px-3">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">Load Profile (loadtest)</span>
        <div className="ml-auto flex items-center gap-2">
          {durasi}
          <button type="button" onClick={() => setExpanded(true)} title="Perbesar grafik"
            className="bg-transparent border border-border text-muted text-[11px] leading-none py-1 px-1.5 rounded-md cursor-pointer hover:border-accent hover:text-accent transition-colors">
            ⤢
          </button>
        </div>
      </div>
      <RampSparkline rampStep={rampStep} rampInterval={rampInterval} holdDuration={holdDuration} total={total} />

      {expanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
          <div className="w-[min(94vw,1100px)] bg-surface border border-border rounded-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <h3 className="m-0 text-[13px] font-semibold text-head uppercase tracking-[.08em]">Load Profile (loadtest)</h3>
              <div className="ml-auto flex items-center gap-3">
                {durasi}
                <button type="button" onClick={() => setExpanded(false)}
                  className="bg-transparent border border-border text-muted text-[12px] leading-none py-1.5 px-2.5 rounded-md cursor-pointer hover:border-accent hover:text-accent transition-colors">
                  ✕ Tutup
                </button>
              </div>
            </div>
            <RampSparkline rampStep={rampStep} rampInterval={rampInterval} holdDuration={holdDuration} total={total}
              height={Math.round(window.innerHeight * 0.55)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ScenarioSettings — lihat & edit setting scenario (users/percent per BP,
//     tambah/hapus BP, loadConfig), simpan / simpan sebagai baru ────────────
function ScenarioSettings({ detail, onSaved }) {
  const [editing, setEditing] = React.useState(false);
  const [catalog, setCatalog] = React.useState([]);
  const [bps, setBps] = React.useState([]);
  const [mode, setMode] = React.useState('users'); // 'users' | 'percent' — 1x untuk semua BP
  const [lc, setLc] = React.useState({ rampStep: 1, rampInterval: 1, holdDuration: 5, totalVus: '' });
  // Pola LoadRunner: 'simultan' = semua VU mulai bersamaan (rampStep 0),
  // 'bertahap' = start N VU tiap interval (granularity).
  const [rampType, setRampType] = React.useState('bertahap');
  const [saveAs, setSaveAs] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null); // { type:'good'|'bad', text }

  const fIn  = 'w-full border border-border rounded-lg bg-input text-text py-1.5 px-2.5 text-[13px] normal-case focus:outline-none focus:border-accent';

  React.useEffect(() => {
    fetch('/api/bp-catalog').then((r) => r.json()).then((d) => setCatalog(d.catalog || [])).catch(() => {});
  }, []);

  // Folder BP = "<channel>/<bp>". Cocokkan ke katalog dulu (akurat walau path
  // ditulis tidak standar); fallback parse posisi segmen ../scripts/<ch>/<bp>/<file>.
  const folderOf = React.useCallback((fn, importPath) => {
    const c = catalog.find((x) => x.fn === fn && x.importPath === importPath);
    if (c) return `${c.channel}/${c.bp}`;
    const parts = String(importPath || '').split('/');
    const i = parts.indexOf('scripts');
    return (i >= 0 && parts.length >= i + 3) ? `${parts[i + 1]}/${parts[i + 2]}` : '';
  }, [catalog]);

  const initFromDetail = React.useCallback(() => {
    const detectedMode = (detail.bps || []).some((b) => b.percent != null) ? 'percent' : 'users';
    setMode(detectedMode);
    setBps((detail.bps || []).map((b) => ({
      key: uid(),
      name: b.name,
      fn: b.fn || '',
      importPath: b.importPath || '',
      folder: folderOf(b.fn, b.importPath),
      value: detectedMode === 'percent' ? (b.percent ?? 50) : (b.users ?? 1),
      thinkTime: b.thinkTime ?? 0,
    })));
    const l = detail.loadConfig || {};
    setRampType((l.rampStep ?? 1) === 0 ? 'simultan' : 'bertahap');
    setLc({
      rampStep: (l.rampStep ?? 1) === 0 ? 1 : (l.rampStep ?? 1), // simpan nilai >0 utk saat toggle balik
      rampInterval: l.rampInterval ?? 1,
      holdDuration: l.holdDuration ?? 5,
      totalVus: l.totalVus ?? '',
    });
    setSaveAs(''); setMsg(null);
  }, [detail, folderOf]);

  // Scenario berganti → keluar edit & reset pesan
  React.useEffect(() => { setEditing(false); setMsg(null); }, [detail.name]);

  const startEdit = () => { initFromDetail(); setEditing(true); };

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'users' ? 'percent' : 'users';
      setBps((cur) => cur.map((b) => ({
        ...b,
        value: next === 'percent' ? Math.min(100, Math.round((Number(b.value) || 1) / (cur.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1) * 100)) : 1,
      })));
      return next;
    });
  };

  const setBp = (key, patch) => setBps((cur) => cur.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const removeBp = (key) => setBps((cur) => cur.filter((b) => b.key !== key));
  const addBp = () => {
    setBps((cur) => [...cur, {
      key: uid(),
      name: '',
      fn: '', importPath: '', folder: '',
      value: mode === 'percent' ? 50 : 1,
      thinkTime: 1,
    }]);
  };
  const folders = [...new Set(catalog.map((c) => `${c.channel}/${c.bp}`))];
  const scriptsIn = (folder) => catalog.filter((c) => `${c.channel}/${c.bp}` === folder);
  const pickFolder = (key, folder) => {
    const scripts = scriptsIn(folder);
    // Kalau folder cuma punya 1 script, langsung terpilih; selain itu user pilih sendiri.
    const c = scripts.length === 1 ? scripts[0] : null;
    setBp(key, {
      folder,
      fn: c ? c.fn : '',
      importPath: c ? c.importPath : '',
      name: c ? c.bp : (folder.split('/')[1] || ''),
    });
  };
  const pickScript = (key, combo) => {
    const c = catalog.find((x) => `${x.fn}|${x.importPath}` === combo);
    if (c) setBp(key, { fn: c.fn, importPath: c.importPath, name: c.bp, folder: `${c.channel}/${c.bp}` });
  };

  const save = async (targetName, overwrite) => {
    if (!targetName) { setMsg({ type: 'bad', text: 'Nama scenario kosong.' }); return; }
    if (bps.length === 0) { setMsg({ type: 'bad', text: 'Minimal 1 BP.' }); return; }
    if (bps.some((b) => !b.fn || !b.importPath)) { setMsg({ type: 'bad', text: 'Ada BP yang belum dipilih.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(`/api/scenarios/${encodeURIComponent(targetName)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overwrite,
          mode, // scenario-level mode
          bps: bps.map((b) => ({
            name: b.name, fn: b.fn, importPath: b.importPath,
            ...(mode === 'percent' ? { percent: Number(b.value) || 0 } : { users: Number(b.value) || 0 }),
            thinkTime: Number(b.thinkTime) || 0,
          })),
          loadConfig: { ...lc, rampStep: rampType === 'simultan' ? 0 : lc.rampStep },
        }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || 'Gagal menyimpan');
      setMsg({ type: 'good', text: `Tersimpan: ${j.name}.js` });
      setEditing(false);
      onSaved?.(j.name);
    } catch (e) {
      setMsg({ type: 'bad', text: e.message });
    } finally { setSaving(false); }
  };

  // ── View mode: breakdown ──
  if (!editing) {
    const bpsV = detail.bps || [];
    const totalUsers = bpsV.reduce((s, bp) => s + (bp.users || 0), 0);
    const totalPercent = bpsV.reduce((s, bp) => s + (bp.percent || 0), 0);
    const isPercentMode = totalPercent > 0 && totalUsers === 0;
    // Total VU utk hitung percent: totalVus scenario (diatur via Edit Scenario).
    const cfgTotal = detail.loadConfig?.totalVus;
    const pctTotal = (cfgTotal && cfgTotal > 0) ? cfgTotal : 0;
    const bpColors = ['#22d3ee','#39d98a','#ffaa3b','#a78bfa','#f472b6','#fb923c','#34d399','#60a5fa'];
    // Input LoadProfilePanel + deteksi BP 0 VU.
    const lcV = detail.loadConfig || {};
    const effTotal  = isPercentMode ? pctTotal : totalUsers;
    const rampStepV = Number(lcV.rampStep) || 0;
    const rampIntV  = Number(lcV.rampInterval) || 1;
    const holdV     = Number(lcV.holdDuration) || 0;
    return (
      <section className={cx(PANEL, 'mb-5')}>
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <h2 className={PANEL_H2R}>Scenario: {detail.name}</h2>
          {bpsV.length > 0 && (
            <span className={cx('text-[10px] font-semibold py-0.5 px-2 rounded-full uppercase tracking-wide',
              isPercentMode ? 'bg-accent-soft text-accent' : 'bg-border text-muted')}>
              {isPercentMode ? 'Persentase' : 'Absolut'}
            </span>
          )}
          <button type="button" onClick={startEdit}
            className="ml-auto bg-transparent border border-border text-text text-[11px] font-medium py-1 px-3 rounded-lg cursor-pointer hover:border-accent hover:text-accent transition-colors">
Edit Scenario
          </button>
        </div>
        {bpsV.length === 0 ? (
          <p className="text-muted text-[12px]">BP di scenario ini belum terbaca. Klik <strong className="text-text">Edit Scenario</strong> untuk mengatur.</p>
        ) : (<>
          <div className="grid gap-2 mb-3">
            {bpsV.map((bp, i) => {
              const calc = isPercentMode ? Math.round((bp.percent || 0) / 100 * pctTotal) : bp.users;
              // Porsi BP utk mini-bar: percent langsung, atau users relatif ke total.
              const share = isPercentMode
                ? (bp.percent || 0)
                : (totalUsers > 0 ? ((bp.users || 0) / totalUsers) * 100 : 0);
              const script = [folderOf(bp.fn, bp.importPath), bp.fn].filter(Boolean).join(' · ');
              // Warn hanya kalau totalnya ada tapi BP ini mendapat 0 VU (pembulatan/alokasi kecil).
              const zeroVu = calc === 0 && effTotal > 0;
              return (
                <div key={bp.name} className="border border-border rounded-lg bg-surface-2 py-2 px-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <strong className="text-[12px] text-accent font-mono truncate">{bp.name}</strong>
                        {zeroVu && (
                          <span className="text-[9px] font-semibold text-warn bg-warn/10 border border-warn/40 py-px px-1 rounded shrink-0"
                            title="BP ini mendapat 0 VU. Naikkan alokasi atau Total VUs.">
                            0 VU
                          </span>
                        )}
                        {bp.thinkTime > 0 && <span className="text-[9px] text-muted bg-border py-px px-1 rounded shrink-0">think: {bp.thinkTime}s</span>}
                      </div>
                      {script && <div className="text-[10px] text-faint font-mono truncate mt-0.5">{script}</div>}
                    </div>
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      {isPercentMode && <span className="text-[10px] text-faint mr-1">{bp.percent}%</span>}
                      <span className={cx('text-[20px] font-mono font-bold leading-none tabular-nums', zeroVu ? 'text-warn' : 'text-head')}>{calc}</span>
                      <span className="text-[10px] text-muted uppercase tracking-wide">VUs</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-[3px] rounded-full bg-border/50 overflow-hidden" title={`${bp.name}: ${Math.round(share)}%`}>
                    <div className="h-full rounded-full transition-[width]"
                      style={{ width: `${Math.min(100, share)}%`, background: bpColors[i % bpColors.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
          {detail.loadConfig && (
            <LoadProfilePanel rampStep={rampStepV} rampInterval={rampIntV} holdDuration={holdV} total={effTotal} />
          )}
          <div className="flex flex-wrap gap-4 text-[11px] text-muted">
            {isPercentMode
              ? <span>Total VUs: <strong className="text-text font-mono">{pctTotal}</strong> <span className="text-faint">({cfgTotal > 0 ? 'dari totalVus scenario' : 'totalVus belum diatur — klik Edit Scenario'})</span></span>
              : totalUsers > 0 && <span>Total VUs: <strong className="text-text font-mono">{totalUsers}</strong></span>}
            {isPercentMode && <span>Total Persentase: <strong className={cx(totalPercent === 100 ? 'text-good' : 'text-warn', 'font-mono')}>{totalPercent}%</strong>{totalPercent !== 100 && <span className="text-warn ml-1">— {totalPercent < 100 ? `kurang ${100 - totalPercent}%` : `lebih ${totalPercent - 100}%`}</span>}</span>}
            {detail.loadConfig?.rampStep != null && (detail.loadConfig.rampStep === 0
              ? <span>Start: <strong className="text-text">simultan</strong></span>
              : <span>Ramp: +{detail.loadConfig.rampStep} VUs / {detail.loadConfig.rampInterval || 1} min</span>)}
            {detail.loadConfig?.holdDuration != null && <span>Hold: {detail.loadConfig.holdDuration} min</span>}
          </div>
        </>)}
        {msg && <div className={cx('mt-3 text-[12px]', msg.type === 'good' ? 'text-good' : 'text-bad')}>{msg.text}</div>}
      </section>
    );
  }

  // ── Edit mode: form ──
  const usesPercent = mode === 'percent';
  const totalPercentEdit = usesPercent ? bps.reduce((s, b) => s + (Number(b.value) || 0), 0) : 0;
  // Total VU utk preview profil: percent → totalVus; absolut → jumlah alokasi.
  const totalEdit = usesPercent
    ? (Number(lc.totalVus) || 0)
    : bps.reduce((s, b) => s + (Number(b.value) || 0), 0);
  const effRampStep = rampType === 'simultan' ? 0 : (Number(lc.rampStep) || 0);
  return (
    <section className={cx(PANEL, 'mb-4')}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h2 className={PANEL_H2R}>Edit Scenario — {detail.name}</h2>
        <button type="button" onClick={() => { setEditing(false); setMsg(null); }}
          className="ml-auto bg-transparent border border-border text-muted text-[11px] py-1 px-3 rounded-lg cursor-pointer hover:border-accent hover:text-accent transition-colors">
          Batal
        </button>
      </div>

      {/* Mode toggle — 1x untuk semua BP */}
      <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-border">
        <span className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">Alokasi</span>
        <button type="button" onClick={toggleMode}
          className={cx(
            'relative inline-flex h-5 w-[96px] items-center rounded-full border-0 cursor-pointer transition-colors',
            usesPercent ? 'bg-accent' : 'bg-border'
          )}>
          <span className={cx(
            'absolute h-4 w-[44px] rounded-full bg-white shadow transition-transform',
            usesPercent ? 'translate-x-[48px]' : 'translate-x-[1px]'
          )} />
          <span className="relative z-10 w-1/2 text-center text-[10px] font-semibold"
            style={{ color: usesPercent ? 'rgba(255,255,255,.7)' : 'var(--head)' }}>
            Absolut
          </span>
          <span className="relative z-10 w-1/2 text-center text-[10px] font-semibold"
            style={{ color: usesPercent ? 'var(--head)' : 'rgba(255,255,255,.7)' }}>
            %
          </span>
        </button>
        <span className={cx(
          'text-[9px] font-semibold py-0.5 px-1.5 rounded-full uppercase tracking-wide',
          usesPercent ? 'bg-accent-soft text-accent' : 'bg-border text-muted'
        )}>
          {usesPercent ? 'Persentase' : 'Absolut'}
        </span>
        {usesPercent && (
          <span className={cx('text-[11px] font-mono', totalPercentEdit === 100 ? 'text-good' : 'text-warn')}>
            Total: {totalPercentEdit}%{totalPercentEdit !== 100 && ` — ${totalPercentEdit < 100 ? `kurang ${100 - totalPercentEdit}%` : `lebih ${totalPercentEdit - 100}%`}`}
          </span>
        )}
      </div>

      <div className="grid gap-2 mb-3">
        <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_auto] gap-2 text-[9px] font-semibold uppercase tracking-[.08em] text-faint px-1">
          <span>Folder (channel/BP)</span><span>Script (fn)</span><span>{usesPercent ? 'Alokasi (%)' : 'Alokasi (Users)'}</span><span>Think (s)</span><span></span>
        </div>
        {bps.map((b) => (
          <div key={b.key} className="grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_auto] gap-2 md:items-center border border-border rounded-lg bg-surface-2 p-2">
            <SearchableSelect
              value={b.folder}
              options={folders}
              onChange={(v) => pickFolder(b.key, v)}
              placeholder="Pilih folder…"
            />
            <SearchableSelect
              value={b.fn ? `${b.fn}|${b.importPath}` : ''}
              options={scriptsIn(b.folder).map((c) => ({
                value: `${c.fn}|${c.importPath}`,
                label: `${c.importPath.split('/').pop()} · ${c.fn}`,
              }))}
              onChange={(v) => pickScript(b.key, v)}
              placeholder={b.folder ? 'Pilih script…' : 'Pilih folder terlebih dahulu'}
            />
            <div className="relative">
              <input className={cx(fIn, usesPercent && 'pr-6')} type="number" min="0" value={b.value}
                placeholder={usesPercent ? '%' : 'users'}
                onChange={(e) => setBp(b.key, { value: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })} />
              {usesPercent && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-faint pointer-events-none">%</span>}
            </div>
            <input className={fIn} type="number" min="0" value={b.thinkTime} placeholder="think(s)"
              onChange={(e) => setBp(b.key, { thinkTime: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })} />
            <button type="button" onClick={() => removeBp(b.key)}
              className="justify-self-end bg-transparent border border-bad text-bad text-[11px] py-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-bad/10">Hapus</button>
          </div>
        ))}
        <button type="button" onClick={addBp} disabled={catalog.length === 0}
          className="w-fit bg-transparent border border-accent text-accent text-[12px] py-1.5 px-3.5 rounded-lg cursor-pointer hover:bg-accent-soft disabled:opacity-50">+ Tambah BP</button>
      </div>

      <div className="mb-3 border border-border rounded-lg bg-surface-2 p-3">
        <div className="flex items-baseline gap-2 flex-wrap mb-2.5">
          <span className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">Load Profile</span>
          <span className="text-[10px] text-faint">hanya dipakai mode loadtest — testhit mengabaikan bagian ini</span>
        </div>

        {/* Cara start VU — pola LoadRunner: simultan vs bertahap (granularity) */}
        <div className="flex rounded-lg border border-border overflow-hidden w-fit mb-2.5">
          {[
            ['simultan', 'Simultan', 'Semua VU mulai bersamaan'],
            ['bertahap', 'Bertahap', 'Start N VU tiap interval (gaya LoadRunner)'],
          ].map(([val, lbl, tip]) => (
            <button key={val} type="button" title={tip} onClick={() => setRampType(val)}
              className={cx('border-0 text-[11px] font-medium py-1.5 px-3 cursor-pointer transition-colors',
                rampType === val ? 'bg-accent text-white' : 'bg-transparent text-muted hover:text-text')}>
              {lbl}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
          {rampType === 'bertahap' && (<>
            <label className={LABEL}>Ramp Step (VU)<input className={INPUT} type="number" min="1" value={lc.rampStep} onChange={(e) => setLc((v) => ({ ...v, rampStep: e.target.value }))} /></label>
            <label className={LABEL}>Ramp Interval (min)<input className={INPUT} type="number" min="0" value={lc.rampInterval} onChange={(e) => setLc((v) => ({ ...v, rampInterval: e.target.value }))} /></label>
          </>)}
          <label className={LABEL}>Hold Duration (min)<input className={INPUT} type="number" min="0" value={lc.holdDuration} onChange={(e) => setLc((v) => ({ ...v, holdDuration: e.target.value }))} /></label>
          <label className={cx(LABEL, !usesPercent && 'opacity-50')}>Total VUs {usesPercent ? '' : '(percent saja)'}<input className={INPUT} type="number" min="0" value={lc.totalVus} onChange={(e) => setLc((v) => ({ ...v, totalVus: e.target.value }))} placeholder="—" /></label>
        </div>
      </div>

      <LoadProfilePanel
        rampStep={effRampStep}
        rampInterval={Number(lc.rampInterval) || 1}
        holdDuration={Number(lc.holdDuration) || 0}
        total={totalEdit}
      />

      <div className="flex items-center gap-2.5 flex-wrap border-t border-border pt-3">
        <button type="button" onClick={() => save(detail.name, true)} disabled={saving}
          className={cx(BTN_GRAD, 'text-[12px] px-3.5 py-1.5')}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        <span className="w-px h-5 bg-border" />
        <input className={cx(INPUT, 'w-[180px]')} value={saveAs} onChange={(e) => setSaveAs(e.target.value)} placeholder="nama_scenario_baru" />
        <button type="button" onClick={() => save(saveAs.trim(), false)} disabled={saving || !saveAs.trim()}
          className="bg-transparent border border-accent text-accent text-[12px] font-medium py-1.5 px-3.5 rounded-lg cursor-pointer hover:bg-accent-soft disabled:opacity-50">Simpan sebagai scenario baru</button>
        {msg && <span className={cx('text-[11px]', msg.type === 'good' ? 'text-good' : 'text-bad')}>{msg.text}</span>}
      </div>
    </section>
  );
}

// ─── ApiInspectorPage — jalankan 1 script BP (1 VU, 1 iterasi) dan periksa
//     request/response tiap API, gaya k6 Studio: daftar API di kiri, panel
//     Request (atas) + Response (bawah) di kanan. ───────────────────────────
const METHOD_COLORS = {
  GET: '#22d3ee', POST: '#39d98a', PUT: '#ffaa3b',
  PATCH: '#a78bfa', DELETE: '#f87171', OPTIONS: '#868a99',
};

// Pretty-print JSON bila bisa; selain itu kembalikan apa adanya.
const prettyBody = (clip) => {
  if (!clip || clip.body == null || clip.body === '') return null;
  try { return JSON.stringify(JSON.parse(clip.body), null, 2); }
  catch { return clip.body; }
};

function KvTable({ obj }) {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) return <p className="text-faint text-[11px] m-0">(kosong)</p>;
  return (
    <table className="w-full border-collapse text-[11px]">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-border-soft last:border-0 align-top">
            <td className="py-1 pr-3 font-mono text-accent whitespace-nowrap">{k}</td>
            <td className="py-1 font-mono text-text break-all">{String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ApiInspectorPage() {
  const [catalog, setCatalog] = React.useState([]);
  const [folder, setFolder] = React.useState('');
  const [combo, setCombo] = React.useState(''); // "fn|importPath"
  const [status, setStatus] = React.useState('idle'); // idle|running|done|error
  const [calls, setCalls] = React.useState([]);
  const [selected, setSelected] = React.useState(-1);
  const [rawLog, setRawLog] = React.useState('');
  const [showRaw, setShowRaw] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState(''); // baris error pertama dari log k6
  const [reqTab, setReqTab] = React.useState('body'); // body|headers (dua panel pakai state sendiri)
  const [resTab, setResTab] = React.useState('body');
  const esRef = React.useRef(null);
  const lineBufRef = React.useRef('');

  React.useEffect(() => {
    fetch('/api/bp-catalog').then((r) => r.json()).then((d) => setCatalog(d.catalog || [])).catch(() => {});
    return () => esRef.current?.close();
  }, []);

  const folders = [...new Set(catalog.map((c) => `${c.channel}/${c.bp}`))];
  const scriptsIn = (f) => catalog.filter((c) => `${c.channel}/${c.bp}` === f);
  const pickFolder = (f) => {
    const scripts = scriptsIn(f);
    setFolder(f);
    setCombo(scripts.length === 1 ? `${scripts[0].fn}|${scripts[0].importPath}` : '');
  };

  // Satu baris log k6 (--log-format=json). Baris @@REQRES → entri panggilan API;
  // sisanya → raw log (tampilkan msg-nya saja biar terbaca).
  const handleLine = (line) => {
    const s = line.trim();
    if (!s) return;
    if (s.startsWith('{')) {
      try {
        const o = JSON.parse(s);
        if (typeof o.msg === 'string' && o.msg.startsWith('@@REQRES ')) {
          const entry = JSON.parse(o.msg.slice(9));
          setCalls((cur) => {
            setSelected((sel) => (sel === -1 ? cur.length : sel));
            return [...cur, entry];
          });
          return;
        }
        if (o.level === 'error' && typeof o.msg === 'string') {
          setErrMsg((cur) => cur || o.msg.split('\n')[0]); // simpan error pertama saja
        }
        setRawLog((cur) => cur + (o.level ? `[${o.level}] ` : '') + (o.msg ?? s) + '\n');
        return;
      } catch { /* bukan JSON utuh — jatuh ke bawah */ }
    }
    setRawLog((cur) => cur + line + '\n');
  };

  const run = () => {
    if (!combo || status === 'running') return;
    const [fn, importPath] = [combo.slice(0, combo.indexOf('|')), combo.slice(combo.indexOf('|') + 1)];
    setCalls([]); setSelected(-1); setRawLog(''); setErrMsg(''); setStatus('running');
    lineBufRef.current = '';
    const es = new EventSource(`/api/inspect?${new URLSearchParams({ fn, importPath })}`);
    esRef.current = es;
    es.addEventListener('log', (e) => {
      lineBufRef.current += JSON.parse(e.data).text;
      const parts = lineBufRef.current.split('\n');
      lineBufRef.current = parts.pop(); // sisakan baris yang belum utuh
      parts.forEach(handleLine);
    });
    es.addEventListener('done', (e) => {
      if (lineBufRef.current) { handleLine(lineBufRef.current); lineBufRef.current = ''; }
      const failed = JSON.parse(e.data).code !== 0;
      setStatus(failed ? 'error' : 'done');
      if (failed) setShowRaw(true); // run gagal → langsung buka log
      es.close(); esRef.current = null;
    });
    es.addEventListener('error', (e) => {
      let msg = ''; try { msg = JSON.parse(e.data).message; } catch {}
      if (msg) { setRawLog((cur) => cur + `[error] ${msg}\n`); setErrMsg((cur) => cur || msg); }
      setStatus('error'); setShowRaw(true);
      es.close(); esRef.current = null;
    });
  };

  const stop = () => {
    fetch('/api/run/stop', { method: 'POST' }).catch(() => {});
    esRef.current?.close(); esRef.current = null;
    setStatus('idle');
  };

  const call = calls[selected] || null;
  const statusLabel = { idle: 'Siap', running: 'Berjalan…', done: 'Selesai', error: 'Error' }[status];
  const statusColor = { idle: 'text-muted', running: 'text-accent-2', done: 'text-good', error: 'text-bad' }[status];
  const statusBadge = (s) => (s >= 200 && s < 300 ? 'text-good bg-good/10 border-good/30'
    : s >= 400 ? 'text-bad bg-bad/10 border-bad/30' : 'text-warn bg-warn/10 border-warn/30');

  const panelTab = (activeTab, tab, set) => (
    <button type="button" onClick={() => set(tab)}
      className={cx('bg-transparent border-0 cursor-pointer text-[10px] uppercase tracking-wide py-0.5 px-1.5 rounded',
        activeTab === tab ? 'text-accent font-semibold bg-accent-soft' : 'text-muted hover:text-text')}>
      {tab === 'body' ? 'Body' : 'Headers'}
    </button>
  );

  const reqBody = call && prettyBody(call.reqBody);
  const resBody = call && prettyBody(call.resBody);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="API Inspector"
        description="Jalankan satu script BP (1 VU, 1 iterasi) dan periksa request/response tiap API — untuk verifikasi script sebelum load test." />

      <section className={cx(PANEL, 'grid gap-3 mb-4')}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          <label className={LABEL}>Folder (channel/BP)
            <SearchableSelect value={folder} options={folders} onChange={pickFolder} placeholder="Pilih folder…" />
          </label>
          <label className={LABEL}>Script (fn)
            <SearchableSelect
              value={combo}
              options={scriptsIn(folder).map((c) => ({
                value: `${c.fn}|${c.importPath}`,
                label: `${c.importPath.split('/').pop()} · ${c.fn}`,
              }))}
              onChange={setCombo}
              placeholder={folder ? 'Pilih script…' : 'Pilih folder terlebih dahulu'}
            />
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {status !== 'running'
            ? <button type="button" className={cx(BTN_GRAD, 'text-[12px] px-3.5 py-[6px] disabled:cursor-not-allowed')} onClick={run} disabled={!combo}>▶ Run &amp; Inspect</button>
            : <button type="button" className="bg-bad text-white font-semibold rounded-lg text-[12px] px-3.5 py-[6px] cursor-pointer border-0" onClick={stop}>■ Stop</button>}
          <span className={cx('text-[11px]', statusColor)}>{statusLabel}</span>
          {calls.length > 0 && <span className="text-[11px] text-muted">{calls.length} API call</span>}
        </div>
        {status === 'error' && (
          <div className="flex items-start gap-2 border border-bad/40 bg-bad/10 rounded-lg py-2 px-3">
            <span className="text-bad text-[13px] leading-none mt-px shrink-0">✕</span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-bad">Run gagal{calls.length === 0 && ' — tidak ada API call yang sempat terkirim (error saat load script)'}</div>
              {errMsg && <pre className="m-0 mt-1 text-[11px] font-mono text-text whitespace-pre-wrap break-words">{errMsg}</pre>}
              <div className="text-[11px] text-muted mt-1">Detail lengkap ada di <strong className="text-text">Log k6</strong> di bagian bawah.</div>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-[minmax(280px,2fr)_3fr] gap-4 mb-4 max-[900px]:grid-cols-1">
        {/* Daftar API */}
        <div className={cx(PANEL, 'p-0 overflow-hidden flex flex-col max-h-[62vh]')}>
          <div className="py-2 px-3 border-b border-border text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">API Calls</div>
          <div className="overflow-auto scroll-thin flex-1">
            {calls.length === 0 && (
              <p className="text-muted text-[12px] py-3 px-3.5 m-0">
                {status === 'running' ? 'Menunggu API call pertama…' : 'Pilih script lalu klik Run & Inspect.'}
              </p>
            )}
            {calls.map((c, i) => {
              const showTx = i === 0 || calls[i - 1].tx !== c.tx;
              return (
                <React.Fragment key={i}>
                  {showTx && c.tx && (
                    <div className="py-1.5 px-3 bg-surface-2 border-y border-border-soft text-[10px] font-semibold text-head font-mono truncate">{c.tx}</div>
                  )}
                  <div onClick={() => setSelected(i)}
                    className={cx('flex items-center gap-2 py-2 px-3 cursor-pointer border-b border-border-soft',
                      i === selected ? 'bg-accent-soft' : 'hover:bg-border-soft')}>
                    <span className="text-[10px] font-mono font-bold w-[46px] shrink-0" style={{ color: METHOD_COLORS[c.method] || 'var(--muted)' }}>{c.method}</span>
                    <span className="text-[11.5px] text-text font-mono truncate flex-1" title={c.url}>{c.api}</span>
                    {c.batch && <span className="text-[8px] text-muted bg-border py-px px-1 rounded shrink-0">batch</span>}
                    <span className={cx('text-[10px] font-mono font-semibold border rounded px-1 py-px shrink-0', statusBadge(c.status))}>{c.status}</span>
                    <span className="text-[10px] text-faint font-mono w-[52px] text-right shrink-0">{c.duration} ms</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Request / Response */}
        <div className="grid grid-rows-2 gap-4 max-h-[62vh]">
          <div className={cx(PANEL, 'p-0 overflow-hidden flex flex-col min-h-0')}>
            <div className="flex items-center gap-2 py-2 px-3 border-b border-border">
              <span className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">Request</span>
              {call && <span className="text-[11px] font-mono truncate text-muted" title={call.url}>
                <strong style={{ color: METHOD_COLORS[call.method] || 'var(--text)' }}>{call.method}</strong> {call.url}
              </span>}
              <span className="ml-auto flex gap-1">{panelTab(reqTab, 'body', setReqTab)}{panelTab(reqTab, 'headers', setReqTab)}</span>
            </div>
            <div className="overflow-auto scroll-thin flex-1 py-2.5 px-3 bg-code">
              {!call && <p className="text-faint text-[11px] m-0">Pilih API call di daftar kiri.</p>}
              {call && reqTab === 'headers' && <KvTable obj={call.reqHeaders} />}
              {call && reqTab === 'body' && (
                reqBody
                  ? <pre className="m-0 font-mono text-[11px] leading-[1.5] whitespace-pre-wrap break-words text-text">{reqBody}{call.reqBody?.truncated && `\n… (terpotong, total ${call.reqBody.size} bytes)`}</pre>
                  : <p className="text-faint text-[11px] m-0">(tidak ada body)</p>
              )}
            </div>
          </div>

          <div className={cx(PANEL, 'p-0 overflow-hidden flex flex-col min-h-0')}>
            <div className="flex items-center gap-2 py-2 px-3 border-b border-border">
              <span className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">Response</span>
              {call && (
                <span className="flex items-center gap-2">
                  <span className={cx('text-[10px] font-mono font-semibold border rounded px-1 py-px', statusBadge(call.status))}>{call.status}</span>
                  <span className="text-[10px] text-faint font-mono">{call.duration} ms</span>
                </span>
              )}
              <span className="ml-auto flex gap-1">{panelTab(resTab, 'body', setResTab)}{panelTab(resTab, 'headers', setResTab)}</span>
            </div>
            <div className="overflow-auto scroll-thin flex-1 py-2.5 px-3 bg-code">
              {!call && <p className="text-faint text-[11px] m-0">Pilih API call di daftar kiri.</p>}
              {call && resTab === 'headers' && <KvTable obj={call.resHeaders} />}
              {call && resTab === 'body' && (
                resBody
                  ? <pre className="m-0 font-mono text-[11px] leading-[1.5] whitespace-pre-wrap break-words text-text">{resBody}{call.resBody?.truncated && `\n… (terpotong, total ${call.resBody.size} bytes)`}</pre>
                  : <p className="text-faint text-[11px] m-0">(tidak ada body)</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Log k6 mentah */}
      <section className={cx(PANEL, 'p-0 overflow-hidden')}>
        <button type="button" onClick={() => setShowRaw((v) => !v)}
          className="w-full flex items-center gap-2 bg-transparent border-0 py-2 px-3 cursor-pointer text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint hover:text-muted">
          <span className={cx('transition-transform', showRaw && 'rotate-90')}>▶</span> Log k6
        </button>
        {showRaw && (
          <pre className="m-0 py-3 px-4 bg-code text-text font-mono text-[11px] leading-[1.55] whitespace-pre-wrap break-words overflow-auto max-h-[40vh] border-t border-border scroll-thin">{rawLog || '(kosong)'}</pre>
        )}
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
      {channels === null && <section className={PANEL}><p className="text-[12px] text-muted leading-relaxed">Memuat…</p></section>}
      {channels && channels.length === 0 && <section className={PANEL}><p className="text-[12px] text-muted leading-relaxed">Belum ada channel di workspace/scripts.</p></section>}
      {channels && channels.map((ch) => (
        <section className={cx(PANEL, 'mb-2.5')} key={ch.channel}>
          <h2 className={PANEL_H2}>{ch.channel}</h2>
          {ch.bps.length === 0
            ? <p className="text-[12px] text-muted leading-relaxed">— belum ada BP —</p>
            : <ul className="list-none m-0 p-0 flex flex-wrap gap-1.5">{ch.bps.map((bp) => <li key={bp}><code className="font-mono text-[11.5px] text-accent bg-accent-soft py-[2px] px-2 rounded-md border border-accent-line">{bp}</code></li>)}</ul>}
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
      <PageHeader eyebrow="Runner" title="Run History"
        description="Hasil CSV di folder results/. Klik 'Buka' untuk analisa di Results Dashboard." />
      {error && <div className="text-bad mb-2 text-[12px]">{error}</div>}
      <section className={cx(PANEL, 'overflow-x-auto')}>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className="text-left text-[10px] font-semibold uppercase tracking-[.1em] text-faint py-2 px-3 border-b border-border whitespace-nowrap">File</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-[.1em] text-faint py-2 px-3 border-b border-border whitespace-nowrap">Ukuran</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-[.1em] text-faint py-2 px-3 border-b border-border whitespace-nowrap">Waktu</th>
            <th className="text-right text-[10px] font-semibold uppercase tracking-[.1em] text-faint py-2 px-3 border-b border-border whitespace-nowrap"></th>
          </tr></thead>
          <tbody>
            {results === null && <tr><td className="py-3 px-3 text-[12px] text-muted" colSpan="4">Memuat…</td></tr>}
            {results && results.length === 0 && <tr><td className="py-3 px-3 text-[12px] text-muted" colSpan="4">Belum ada hasil di results/.</td></tr>}
            {results && results.map((it) => (
              <tr key={it.name} className="border-b border-border-soft last:border-b-0 hover:bg-border-soft/60 transition-colors">
                <td className="py-3 px-3 text-[12px] text-text font-medium font-mono break-all">{it.name}</td>
                <td className="py-3 px-3 text-[12px] text-muted whitespace-nowrap">{it.sizeMB} MB</td>
                <td className="py-3 px-3 text-[11px] text-muted whitespace-nowrap">{new Date(it.mtime).toLocaleString()}</td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="bg-transparent border border-border text-text text-[11px] font-medium py-1 px-3 rounded-lg cursor-pointer hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
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
    <div className="flex gap-12 items-start px-12 py-14 pb-[100px] relative max-[720px]:px-4 max-[720px]:py-6">
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
        <nav className="docs-toc w-[200px] shrink-0 sticky top-14 self-start max-[1080px]:hidden">
          <h2 className="text-[11px] font-bold text-head mb-2.5 pl-3">On this page</h2>
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

      <section className={cx(PANEL, 'grid grid-cols-[minmax(240px,360px)_1fr] gap-4 mb-5 max-[900px]:grid-cols-1')}>
        <div className="relative grid place-items-center gap-1.5 min-h-[120px] border border-dashed border-border rounded-lg bg-code text-center">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => onUpload(event.target.files?.[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <strong className="text-head text-[13px]">{loading ? 'Parsing CSV...' : 'Upload k6 CSV'}</strong>
          <span className="text-muted text-[11px]">Atau gunakan Load via path untuk file besar.</span>
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
          <ol className="m-0 pl-5 text-[12px] text-muted leading-[1.8] marker:text-faint [&_li]:mb-1 [&_strong]:text-head">
            <li>Jalankan test dengan flag CSV: <code className="font-mono text-[11.5px] bg-accent-soft text-accent py-0.5 px-1.5 rounded-[5px]">k6perf run -Scenario &lt;nama&gt; -Mode loadtest -Csv</code></li>
            <li>File otomatis tersimpan di folder <code className="font-mono text-[11.5px] bg-accent-soft text-accent py-0.5 px-1.5 rounded-[5px]">results/</code> sebagai <code className="font-mono text-[11.5px] bg-accent-soft text-accent py-0.5 px-1.5 rounded-[5px]">&lt;testid&gt;.csv</code>.</li>
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
        <span className="text-muted text-[12px] font-mono truncate max-w-[280px]">{result.statCards?.testid || 'result'}</span>
        {result.loadTiming && (
          <span className="text-[11px] text-accent font-mono whitespace-nowrap">
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
            className="bg-input border border-border text-text font-mono py-[5px] px-2.5 rounded w-[320px] text-[12px] focus:outline-none focus:border-accent max-[900px]:w-[180px]"
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
          <strong className="block text-head font-mono">{sc.testid || 'test result'}</strong>
          <span className="block mt-1 text-muted font-mono">{fmtN(filteredData.totalRows)} rows · {fmtDuration(durationMs)}</span>
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
      <strong className={cx('block mt-3 mb-1.5 text-[26px] font-mono font-semibold tracking-tight tabular-nums', TONE[tone] || 'text-head')}>{value}</strong>
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
        <h2 className={PANEL_H2R}>Checks</h2>
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
        <h2 className={PANEL_H2R}>TPS Summary</h2>
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
        <h2 className={PANEL_H2R}>RPS Summary — by API</h2>
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
    const header = 'Transaction,Min (s),Avg (s),Max (s),p90 (s),p95 (s),p99 (s),Success,Error,Sample,Rate';
    const csvRows = sorted.map((r) =>
      `"${r.transaction}",${fmtSec(r.min)},${fmtSec(r.avg)},${fmtSec(r.max)},${fmtSec(r.p90)},${fmtSec(r.p95)},${fmtSec(r.p99)},${r.success || 0},${r.error || 0},${r.sample || 0},${r.successRate || 0}%`
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
            {th('p95', 'p95 (s)')}
            {th('p99', 'p99 (s)')}
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
              <td className={TD}>{fmtSec(row.p95)}</td>
              <td className={TD}>{fmtSec(row.p99)}</td>
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
    const header = 'Business Process,API,Min (s),Avg (s),Max (s),p90 (s),p95 (s),p99 (s),Success,Error,Sample,Rate';
    const csvRows = sorted.map((r) =>
      `"${r.transaction}","${r.api}",${fmtSec(r.min)},${fmtSec(r.avg)},${fmtSec(r.max)},${fmtSec(r.p90)},${fmtSec(r.p95)},${fmtSec(r.p99)},${r.success || 0},${r.error || 0},${r.sample || 0},${r.successRate || 0}%`
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
            className="border border-border rounded-[7px] bg-input text-text font-sans py-1 px-2 text-[12px] focus:outline-none focus:border-accent"
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
            {th('p95', 'p95 (s)')}
            {th('p99', 'p99 (s)')}
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
              <td className={TD}>{fmtSec(row.p95)}</td>
              <td className={TD}>{fmtSec(row.p99)}</td>
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
        id: uid(),
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
          <button type="button" className={cx(BTN_GRAD, 'w-fit text-[12px] py-1.5 px-3')} onClick={addStep}>+ Add Step</button>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div className="grid gap-2.5 border border-border rounded-lg bg-surface-2 p-3" key={step.id}>
                <div className="flex items-center justify-between gap-2.5">
                  <strong className="text-[12px] text-text">Step {index + 1}</strong>
                  <button type="button" className="w-auto bg-transparent border border-bad text-bad py-0.5 px-1.5 rounded-md cursor-pointer text-[11px]" onClick={() => removeStep(step.id)}>Remove</button>
                </div>
                <label className={LABEL}>
                  Transaction
                  <input className={INPUT} value={step.transaction} onChange={(event) => updateStep(step.id, { transaction: event.target.value })} />
                </label>

                <div className="grid gap-2.5">
                  {step.apis.map((apiItem, apiIndex) => (
                    <div className="grid gap-2.5 border border-[rgba(60,60,67,.85)] rounded-[7px] bg-surface p-[11px]" key={apiItem.id}>
                      <div className="flex items-center justify-between gap-2.5">
                        <strong className="text-[12px] text-text">API {apiIndex + 1}</strong>
                        <button type="button" className="w-auto bg-transparent border border-bad text-bad py-0.5 px-1.5 rounded-md cursor-pointer text-[11px]" onClick={() => removeApi(step.id, apiItem.id)}>Remove API</button>
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
                <button type="button" className="w-fit bg-transparent border border-accent text-accent text-[12px] rounded-lg py-1.5 px-3.5 cursor-pointer hover:bg-accent-soft" onClick={() => addApi(step.id)}>+ Add API</button>
              </div>
            ))}
          </div>
        </form>

        <div className={PANEL}>
          <h2 className={PANEL_H2}>Preview</h2>
          <pre className="relative m-0 p-3 overflow-auto rounded-lg bg-code text-text font-mono text-[11.5px] leading-[1.6] min-h-[320px] scroll-thin before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-accent-grad before:rounded-t-lg">{preview}</pre>
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
  const [mode, setMode] = React.useState('absolute'); // 'absolute' | 'percent'
  const [bps, setBps] = React.useState([]);
  const [scriptOptions, setScriptOptions] = React.useState([]);

  React.useEffect(() => {
    fetch('/api/scripts').then((r) => r.json()).then((d) => {
      const list = [];
      (d.channels || []).forEach((ch) => {
        (ch.bps || []).forEach((bp) => {
          list.push(`${ch.channel}/${bp}`);
        });
      });
      setScriptOptions(list);
    }).catch(() => {});
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'absolute' ? 'percent' : 'absolute';
      // Convert existing BP values
      setBps((current) => current.map((bp) => {
        if (next === 'percent') {
          return { ...bp, percent: bp.users || 1, users: null };
        } else {
          return { ...bp, users: bp.percent || 50, percent: null };
        }
      }));
      return next;
    });
  };

  const addBp = () => {
    const next = bps.length + 1;
    setBps((current) => [
      ...current,
      {
        id: uid(),
        name: `BP${String(next).padStart(3, '0')}`,
        fn: `BP${String(next).padStart(3, '0')}_NamaBP`,
        users: mode === 'absolute' ? 1 : null,
        percent: mode === 'percent' ? 50 : null,
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

  const totalPercent = bps.reduce((s, bp) => s + (bp.percent || 0), 0);

  const preview = React.useMemo(
    () => buildScenarioPreview({ scenarioName, rampStep, holdDuration, mode, bps }),
    [scenarioName, rampStep, holdDuration, mode, bps]
  );

  return (
    <>
      <PageHeader
        eyebrow="Generator"
        title="Scenario Generator"
        description="Fondasi UI untuk menyusun daftar BP, alokasi VU, dan konfigurasi ramp-up."
      />

      <section className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <form className={cx(PANEL, 'grid gap-3 content-start')}>
          <label className={LABEL}>
            Scenario Name
            <input className={INPUT} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="scenario_myproject" />
          </label>

          {/* Mode toggle — 1x set untuk semua BP */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-faint">Alokasi</span>
            <button type="button" onClick={toggleMode}
              className={cx(
                'relative inline-flex h-5 w-[96px] items-center rounded-full border-0 cursor-pointer transition-colors',
                mode === 'percent' ? 'bg-accent' : 'bg-border'
              )}>
              <span className={cx(
                'absolute h-4 w-[44px] rounded-full bg-white shadow transition-transform',
                mode === 'percent' ? 'translate-x-[48px]' : 'translate-x-[1px]'
              )} />
              <span className="relative z-10 w-1/2 text-center text-[10px] font-semibold"
                style={{ color: mode === 'percent' ? 'rgba(255,255,255,.7)' : 'var(--head)' }}>
                Absolut
              </span>
              <span className="relative z-10 w-1/2 text-center text-[10px] font-semibold"
                style={{ color: mode === 'percent' ? 'var(--head)' : 'rgba(255,255,255,.7)' }}>
                %
              </span>
            </button>
            <span className={cx(
              'text-[9px] font-semibold py-0.5 px-1.5 rounded-full uppercase tracking-wide',
              mode === 'percent' ? 'bg-accent-soft text-accent' : 'bg-border text-muted'
            )}>
              {mode === 'percent' ? 'Persentase' : 'Absolut'}
            </span>
          </div>

          <label className={LABEL}>
            Ramp Step
            <input className={INPUT} type="number" value={rampStep} onChange={(event) => setRampStep(event.target.value)} placeholder="5" />
          </label>
          <label className={LABEL}>
            Hold Duration (minutes)
            <input className={INPUT} type="number" value={holdDuration} onChange={(event) => setHoldDuration(event.target.value)} placeholder="10" />
          </label>

          {/* Percent total warning */}
          {mode === 'percent' && bps.length > 0 && (
            <div className={cx(
              'flex items-center gap-2 text-[12px] font-mono py-2 px-3 rounded-lg border',
              totalPercent === 100 ? 'border-good/30 bg-good/10 text-good' : 'border-warn/30 bg-warn/10 text-warn'
            )}>
              <span>Total: <strong>{totalPercent}%</strong></span>
              {totalPercent !== 100 && <span>— {totalPercent < 100 ? `kurang ${100 - totalPercent}%` : `lebih ${totalPercent - 100}%`}</span>}
            </div>
          )}

          <button type="button" className={cx(BTN_GRAD, 'w-fit text-[12px] py-1.5 px-3')} onClick={addBp}>+ Tambah BP</button>

          <div className="grid gap-2">
            {bps.map((bp, index) => (
              <div className="grid gap-2 border border-border rounded-lg bg-surface-2 p-2.5" key={bp.id}>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[12px] text-text">BP {index + 1}</strong>
                  <button type="button" className="w-auto bg-transparent border border-bad text-bad py-0.5 px-1.5 rounded-md cursor-pointer text-[11px]" onClick={() => removeBp(bp.id)}>Remove</button>
                </div>
                <label className={LABEL}>
                  BP Name
                  <input className={INPUT} value={bp.name} onChange={(event) => updateBp(bp.id, { name: event.target.value })} />
                </label>
                <label className={LABEL}>
                  Function Name
                  <SearchableSelect
                    value={bp.fn}
                    options={scriptOptions}
                    onChange={(v) => updateBp(bp.id, { fn: v })}
                    placeholder="Pilih script BP…"
                  />
                </label>
                <div className="grid grid-cols-[minmax(100px,.7fr)_1fr] gap-2 max-[900px]:grid-cols-1">
                  {mode === 'absolute' ? (
                    <label className={LABEL}>
                      Users (VUs)
                      <input className={INPUT} type="number" min="1" value={bp.users ?? 1} onChange={(event) => updateBp(bp.id, { users: parseInt(event.target.value) || 1 })} />
                    </label>
                  ) : (
                    <label className={LABEL}>
                      Persentase (%)
                      <div className="relative">
                        <input className={cx(INPUT, 'pr-6')} type="number" min="0" max="100" value={bp.percent ?? 50} onChange={(event) => updateBp(bp.id, { percent: parseInt(event.target.value) || 0 })} />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-faint pointer-events-none">%</span>
                      </div>
                    </label>
                  )}
                  <label className={LABEL}>
                    Think Time (s)
                    <input className={INPUT} type="number" min="0" value={bp.thinkTime} onChange={(event) => updateBp(bp.id, { thinkTime: parseInt(event.target.value) || 0 })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className={PANEL}>
          <h2 className={PANEL_H2}>Preview</h2>
          <pre className="relative m-0 p-3 overflow-auto rounded-lg bg-code text-text font-mono text-[11.5px] leading-[1.6] min-h-[320px] scroll-thin before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-accent-grad before:rounded-t-lg">{preview}</pre>
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
    id: uid(),
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

function buildScenarioPreview({ scenarioName, rampStep, holdDuration, mode, bps }) {
  const imports = bps.length ? bps.map((bp) =>
    `import { ${bp.fn || 'BPxxx_NamaBP'} } from '../scripts/NamaProject/${bp.fn || 'BPxxx_NamaBP'}/${bp.fn || 'BPxxx_NamaBP'}.js';`
  ).join('\n') : '// import { BP001_NamaBP } from \'../scripts/NamaProject/BP001_NamaBP/BP001_NamaBP.js\';';

  const isPercentMode = mode === 'percent';

  const list = bps.length ? bps.map((bp) => {
    if (isPercentMode) {
      return `    { name: '${bp.name || 'BPxxx'}', percent: ${Number(bp.percent) || 50}, fn: ${bp.fn || 'BPxxx_NamaBP'}, thinkTime: ${Number(bp.thinkTime) || 0} },`;
    }
    return `    { name: '${bp.name || 'BPxxx'}', users: ${Number(bp.users) || 1}, fn: ${bp.fn || 'BPxxx_NamaBP'}, thinkTime: ${Number(bp.thinkTime) || 0} },`;
  }).join('\n') : '    // { name: \'BP001\', users: 1, fn: BP001_NamaBP, thinkTime: 1 },';

  const loadConfigLines = [
    `    rampStep: ${Number(rampStep) || 1},`,
    `    rampInterval: 1,`,
    `    holdDuration: ${Number(holdDuration) || 10},`,
  ];
  if (isPercentMode) {
    loadConfigLines.push(`    totalVus: 10,`);
  }

  return `// File: workspace/scenarios/${scenarioName || 'scenario_myproject'}.js
import { MODE, createOptions, dispatchVu, setBpList } from '../../framework/index.js';

${imports}

const bpList = [
${list}
];

const loadConfig = {
${loadConfigLines.join('\n')}
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
