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
import './styles.css';

// Render markdown and post-process headings to add id attributes
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

const navItems = [
  { id: 'dashboard', label: 'Results Dashboard' },
  { id: 'script',    label: 'Script Generator'  },
  { id: 'scenario',  label: 'Scenario Generator' },
  { id: 'docs',      label: 'Documentation'      },
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

function getPageFromHash() {
  const h = window.location.hash.slice(1);
  if (h === 'script')   return 'script';
  if (h === 'scenario') return 'scenario';
  if (h.startsWith('docs')) return 'docs';
  return 'dashboard';
}

function App() {
  const [page, setPage] = React.useState(getPageFromHash);
  const [result, setResult] = React.useState(null);
  const [theme, toggleTheme] = useDocsTheme();

  React.useEffect(() => {
    const onPop = () => setPage(getPageFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (newPage) => {
    const hash = newPage === 'dashboard' ? '' : newPage;
    history.pushState(null, '', `#${hash}`);
    setPage(newPage);
  };

  if (page === 'docs') {
    return <DocsPage onBack={() => navigate('dashboard')} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (page === 'dashboard' && result) {
    return <FullScreenResults result={result} onBack={() => setResult(null)} onNewResult={setResult} />;
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <strong>k6 Framework</strong>
            <small>React workspace</small>
          </div>
        </div>

        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <button className="legacy-link" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

      </aside>

      <main className="main-panel">
        {page === 'dashboard' && <DashboardPage onData={setResult} />}
        {page === 'script' && <ScriptGeneratorPage />}
        {page === 'scenario' && <ScenarioGeneratorPage />}
      </main>
    </div>
  );
}

function PageHeader({ title, eyebrow, description }) {
  return (
    <header className="page-header">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
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

function getDocPathFromHash() {
  const h = window.location.hash.slice(1);
  if (h.startsWith('docs/')) return h.slice(5);
  return 'getting-started';
}

function DocsPage({ onBack, theme, toggleTheme }) {
  const [docPath, setDocPath] = React.useState(getDocPathFromHash);

  React.useEffect(() => {
    const onPop = () => setDocPath(getDocPathFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
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
    <div className="docs-shell">
      <aside className="side-nav">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <strong>k6 Framework</strong>
            <small>Documentation</small>
          </div>
        </div>
        <nav>
          {DOCS_NAV.map(section => (
            <div key={section.title} className="docs-sec">
              <div className="docs-nav-hd">{section.title}</div>
              {section.items.map(item => (
                <button
                  key={item.path}
                  className={docPath === item.path ? 'active' : ''}
                  onClick={() => {
                    history.pushState(null, '', `#docs/${item.path}`);
                    setDocPath(item.path);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="legacy-link" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="legacy-link" onClick={onBack}>← Back to App</button>
        </div>
      </aside>
      <div className="docs-body">
        <article
          ref={contentRef}
          className="docs-content"
          dangerouslySetInnerHTML={{ __html: loading ? '<p style="color:var(--muted)">Loading…</p>' : html }}
          onClick={(e) => {
            const a = e.target.closest('a');
            if (!a) return;
            const resolved = resolveDocLink(docPath, a.getAttribute('href'));
            if (!resolved) return;
            e.preventDefault();
            history.pushState(null, '', `#docs/${resolved}`);
            setDocPath(resolved);
          }}
        />
        {toc.length > 0 && (
          <nav className="docs-toc">
            <h2 className="docs-toc-hd">On this page</h2>
            <ul>
              {toc.map(item => (
                <li key={item.id} className={`lvl${item.level}`}>
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
        eyebrow="React Dashboard"
        title="Results Dashboard"
        description="Load hasil CSV k6 untuk melihat hasil test secara visual."
      />

      <section className="panel load-panel">
        <div className="drop-input">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => onUpload(event.target.files?.[0])}
          />
          <strong>{loading ? 'Parsing CSV...' : 'Upload k6 CSV'}</strong>
          <span>Atau gunakan Load via path untuk file besar.</span>
        </div>

        <div className="path-load">
          <input
            value={path}
            placeholder="D:\\path\\to\\result.csv"
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') onLoadPath(); }}
          />
          <button type="button" onClick={onLoadPath} disabled={loading}>Load</button>
        </div>
        {error && <div className="error-text">{error}</div>}
      </section>

      {!loading && (
        <section className="work-grid">
          <div className="panel">
            <h2>Migration Status</h2>
            <ul className="status-list">
              <li><span className="done" /> Express API reuse</li>
              <li><span className="done" /> React shell ready</li>
              <li><span className="done" /> CSV load flow</li>
              <li><span className="done" /> Basic charts</li>
              <li><span className="done" /> Full legacy parity</li>
            </ul>
          </div>
          <div className="panel">
            <h2>Legacy Dashboard</h2>
            <p>
              Versi lama tetap aktif di root path. React ini menjadi tempat migrasi
              dan nantinya generator script/scenario.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

function FullScreenResults({ result: initialResult, onBack, onNewResult }) {
  const [result, setResult] = React.useState(initialResult);
  const [path, setPath] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

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
    <div className="fs-wrap">
      <header className="fs-topbar">
        <button className="fs-back" onClick={onBack}>← Back</button>
        <span className="fs-testid">{result.statCards?.testid || 'result'}</span>
        {result.loadTiming && (
          <span className="fs-timing">
            Loaded {(result.loadTiming.totalMs / 1000).toFixed(1)}s
            <span className="fs-timing-detail">
              · CSV {(result.loadTiming.csvMs / 1000).toFixed(1)}s
              · Queries {(result.loadTiming.queriesMs / 1000).toFixed(1)}s
              · Build {(result.loadTiming.assemblyMs / 1000).toFixed(1)}s
            </span>
          </span>
        )}
        <div className="fs-load-row">
          <input
            value={path}
            placeholder="Load another path…"
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadAnother(); }}
          />
          <button onClick={loadAnother} disabled={loading}>{loading ? '…' : 'Load'}</button>
          {error && <span className="fs-error">{error}</span>}
        </div>
      </header>
      <div className="fs-body">
        <ResultsView data={result} />
      </div>
    </div>
  );
}

/* ─── Section (collapsible) ─────────────────────────────────────────────── */
function Section({ title, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="sec-block">
      <div className="sec-hd" onClick={() => setOpen((o) => !o)}>
        <span className={`sec-arrow ${open ? 'open' : ''}`}>▶</span>
        <span className="sec-title">{title}</span>
        {badge != null && <span className="sec-badge">{badge}</span>}
        <span className="sec-line" />
      </div>
      {open && <div className="sec-body">{children}</div>}
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

  return (
    <div className="tf-bar">
      <span className="tf-label">Time Filter</span>
      <div className="tf-fields">
        <div className="tf-field">
          <span>Start (hh:mm:ss)</span>
          <input
            className="tf-input"
            value={startVal}
            placeholder="0:00:00"
            onChange={(e) => setStartVal(e.target.value)}
          />
        </div>
        <span className="tf-arrow">→</span>
        <div className="tf-field">
          <span>End (hh:mm:ss)</span>
          <input
            className="tf-input"
            value={endVal}
            placeholder="hh:mm:ss"
            onChange={(e) => setEndVal(e.target.value)}
          />
        </div>
        <button className="tf-btn" onClick={handleApplyFilter}>Apply Filter</button>
        <button className="tf-btn tf-reset" onClick={handleResetFilter}>Reset</button>
        <span className="tf-sep" />
        <div className="tf-field">
          <span>Granularity (s)</span>
          <input
            className="tf-gran-in"
            type="number"
            min="1"
            value={granVal}
            placeholder="auto"
            onChange={(e) => setGranVal(e.target.value)}
          />
        </div>
        <button className="tf-btn" onClick={handleApplyGran}>Apply Gran</button>
        <button className="tf-btn tf-reset" onClick={handleResetGran}>Auto</button>
      </div>
      {filterRange && <span className="filter-badge">filtered</span>}
      <span className="tf-duration">Duration: {durationLabel}</span>
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
    <section className="results-stack">
      <div className="result-topline">
        <div>
          <strong>{sc.testid || 'test result'}</strong>
          <span>{fmtN(filteredData.totalRows)} rows · {fmtDuration(durationMs)}</span>
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
        <div className="stat-grid">
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
        <div className="chart-grid">
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
        <div className="chart-grid">
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
        <div className="chart-grid">
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
          <div className="chart-grid">
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
function StatCard({ label, value, sub, tone = '' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

/* ─── ChartPanel — dispatches to LineChart or MultiLineChart ────────────── */
function ChartPanel({ title, series, unit = '', multiLine = false }) {
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
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
    <div className="chart-body">
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
      <div className="chart-body">
        <canvas ref={canvasRef} />
      </div>
      <div className="multi-leg">
        {visible.map((item) => (
          <span key={item.label} className="leg-item">
            <span className="leg-dot" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
        {extra > 0 && !showAll && (
          <button className="leg-toggle" onClick={() => setShowAll(true)}>+ {extra} more</button>
        )}
        {showAll && extra > 0 && (
          <button className="leg-toggle" onClick={() => setShowAll(false)}>show less</button>
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
    <th className={`th-sort${sort.col === col ? ` ${sort.dir}` : ''}`} onClick={() => toggle(col)} style={{ cursor: 'pointer' }}>
      {label}
    </th>
  );

  const handleExport = () => {
    const header = 'Check,Pass,Fail,Total';
    const csvRows = sorted.map((r) => `"${r.check || ''}",${r.pass || 0},${r.fail || 0},${(r.pass || 0) + (r.fail || 0)}`);
    exportCsv([header, ...csvRows].join('\n'), 'checks.csv');
  };

  return (
    <div className="panel table-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Checks</h2>
        <button className="btn-export" onClick={handleExport}>Export CSV</button>
      </div>
      <div className="tw"><table>
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
                <td>{row.check}</td>
                <td>{fmtN(row.pass)}</td>
                <td className={row.fail > 0 ? 'td-bad' : ''}>{fmtN(row.fail)}</td>
                <td>{fmtN(total)} <small>{failPct}% fail</small></td>
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
    <th className={`th-sort${sort.col === col ? ` ${sort.dir}` : ''}`} onClick={() => toggle(col)} style={{ cursor: 'pointer' }}>
      {label}
    </th>
  );

  const handleExport = () => {
    const header = 'Transaction,Min TPS,Avg TPS,Max TPS';
    const csvRows = sorted.map((r) => `"${r.tx}",${r.minTps.toFixed(2)},${r.avgTps.toFixed(2)},${r.maxTps.toFixed(2)}`);
    exportCsv([header, ...csvRows].join('\n'), 'tps-summary.csv');
  };

  if (rows.length === 0) return null;

  return (
    <div className="panel table-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>TPS Summary</h2>
        <button className="btn-export" onClick={handleExport}>Export CSV</button>
      </div>
      <div className="tw"><table>
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
              <td>{row.tx}</td>
              <td>{row.minTps.toFixed(2)}</td>
              <td>{row.avgTps.toFixed(2)}</td>
              <td>{row.maxTps.toFixed(2)}</td>
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
    <th className={`th-sort${sort.col === col ? ` ${sort.dir}` : ''}`} onClick={() => toggle(col)} style={{ cursor: 'pointer' }}>
      {label}
    </th>
  );

  const handleExport = () => {
    const header = 'Transaction,API,Min RPS,Avg RPS,p90 RPS,Max RPS';
    const csvRows = sorted.map((r) => `"${r.tx}","${r.apiName}",${r.minRps.toFixed(2)},${r.avgRps.toFixed(2)},${r.p90Rps.toFixed(2)},${r.maxRps.toFixed(2)}`);
    exportCsv([header, ...csvRows].join('\n'), 'rps-summary.csv');
  };

  if (rows.length === 0) return null;

  return (
    <div className="panel table-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>RPS Summary — by API</h2>
        <button className="btn-export" onClick={handleExport}>Export CSV</button>
      </div>
      <div className="tw"><table>
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
              <td>{row.tx}</td>
              <td>{row.apiName}</td>
              <td>{row.minRps.toFixed(2)}</td>
              <td>{row.avgRps.toFixed(2)}</td>
              <td>{row.p90Rps.toFixed(2)}</td>
              <td>{row.maxRps.toFixed(2)}</td>
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
    <th className={`th-sort${sort.col === col ? ` ${sort.dir}` : ''}`} onClick={() => toggle(col)} style={{ cursor: 'pointer' }}>
      {label}
    </th>
  );

  const handleExport = () => {
    const header = 'Transaction,Min (s),Avg (s),Max (s),p90 (s),Success,Error,Sample,Rate';
    const csvRows = sorted.map((r) =>
      `"${r.transaction}",${fmtSec(r.min)},${fmtSec(r.avg)},${fmtSec(r.max)},${fmtSec(r.p90)},${r.success || 0},${r.error || 0},${r.sample || 0},${r.successRate || 0}%`
    );
    exportCsv([header, ...csvRows].join('\n'), 'transactions.csv');
  };

  return (
    <div className="panel table-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Transactions</h2>
        <input
          className="search-input"
          placeholder="Search transaction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-export" onClick={handleExport}>Export CSV</button>
      </div>
      <div className="tw"><table>
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
              <td><strong>{row.transaction}</strong></td>
              <td>{fmtSec(row.min)}</td>
              <td>{fmtSec(row.avg)}</td>
              <td>{fmtSec(row.max)}</td>
              <td>{fmtSec(row.p90)}</td>
              <td>{fmtN(row.success)}</td>
              <td className={row.error > 0 ? 'td-bad' : ''}>{fmtN(row.error)}</td>
              <td>{fmtN(row.sample)}</td>
              <td>{row.successRate}%</td>
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
    <th className={`th-sort${sort.col === col ? ` ${sort.dir}` : ''}`} onClick={() => toggle(col)} style={{ cursor: 'pointer' }}>
      {label}
    </th>
  );

  const handleExport = () => {
    const header = 'Business Process,API,Min (s),Avg (s),Max (s),p90 (s),Success,Error,Sample,Rate';
    const csvRows = sorted.map((r) =>
      `"${r.transaction}","${r.api}",${fmtSec(r.min)},${fmtSec(r.avg)},${fmtSec(r.max)},${fmtSec(r.p90)},${r.success || 0},${r.error || 0},${r.sample || 0},${r.successRate || 0}%`
    );
    exportCsv([header, ...csvRows].join('\n'), 'apis.csv');
  };

  return (
    <div className="panel table-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: 1 }}>APIs</h2>
        {txOptions.length > 0 && (
          <select
            value={txFilter}
            onChange={(e) => setTxFilter(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px' }}
          >
            <option value="">All transactions</option>
            {txOptions.map((tx) => <option key={tx} value={tx}>{tx}</option>)}
          </select>
        )}
        <input
          className="search-input"
          placeholder="Search API…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-export" onClick={handleExport}>Export CSV</button>
      </div>
      <div className="tw"><table>
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
              <td><small>{row.transaction}</small></td>
              <td><strong>{row.api}</strong></td>
              <td>{fmtSec(row.min)}</td>
              <td>{fmtSec(row.avg)}</td>
              <td>{fmtSec(row.max)}</td>
              <td>{fmtSec(row.p90)}</td>
              <td>{fmtN(row.success)}</td>
              <td className={row.error > 0 ? 'td-bad' : ''}>{fmtN(row.error)}</td>
              <td>{fmtN(row.sample)}</td>
              <td>{row.successRate}%</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

/* ─── ScriptGeneratorPage (unchanged) ──────────────────────────────────── */
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

      <section className="builder-layout">
        <form className="panel form-panel">
          <label>
            Channel
            <input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="_exampleChannel" />
          </label>
          <label>
            Business Process Name
            <input value={bpName} onChange={(event) => setBpName(event.target.value)} placeholder="BP001_LoginInquiry" />
          </label>
          <label>
            Base URL Parameter
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="parameter.BASE_URL" />
          </label>
          <button type="button" onClick={addStep}>Add Step</button>

          <div className="builder-list">
            {steps.map((step, index) => (
              <div className="builder-item" key={step.id}>
                <div className="builder-item-head">
                  <strong>Step {index + 1}</strong>
                  <button type="button" onClick={() => removeStep(step.id)}>Remove</button>
                </div>
                <label>
                  Transaction
                  <input value={step.transaction} onChange={(event) => updateStep(step.id, { transaction: event.target.value })} />
                </label>

                <div className="api-list">
                  {step.apis.map((apiItem, apiIndex) => (
                    <div className="api-item" key={apiItem.id}>
                      <div className="builder-item-head">
                        <strong>API {apiIndex + 1}</strong>
                        <button type="button" onClick={() => removeApi(step.id, apiItem.id)}>Remove API</button>
                      </div>
                      <label>
                        API Name
                        <input value={apiItem.name} onChange={(event) => updateApi(step.id, apiItem.id, { name: event.target.value })} />
                      </label>
                      <div className="inline-fields">
                        <label>
                          Method
                          <select value={apiItem.method} onChange={(event) => updateApi(step.id, apiItem.id, { method: event.target.value })}>
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                            <option>PATCH</option>
                            <option>DELETE</option>
                          </select>
                        </label>
                        <label>
                          Path
                          <input value={apiItem.path} onChange={(event) => updateApi(step.id, apiItem.id, { path: event.target.value })} />
                        </label>
                      </div>
                      <label>
                        Headers JSON (optional)
                        <input
                          value={apiItem.headers}
                          onChange={(event) => updateApi(step.id, apiItem.id, { headers: event.target.value })}
                          placeholder='{"Content-Type":"application/json"}'
                        />
                      </label>
                      {hasBody(apiItem.method) && (
                        <label>
                          Body JSON / Expression
                          <textarea
                            value={apiItem.body}
                            onChange={(event) => updateApi(step.id, apiItem.id, { body: event.target.value })}
                            placeholder='JSON.stringify({ id: data.id })'
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="secondary-action" onClick={() => addApi(step.id)}>Add API</button>
              </div>
            ))}
          </div>
        </form>

        <div className="panel code-preview">
          <h2>Preview</h2>
          <pre>{preview}</pre>
        </div>
      </section>
    </>
  );
}

/* ─── ScenarioGeneratorPage (unchanged) ────────────────────────────────── */
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

      <section className="builder-layout">
        <form className="panel form-panel">
          <label>
            Scenario Name
            <input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="scenario_myproject" />
          </label>
          <label>
            Ramp Step
            <input type="number" value={rampStep} onChange={(event) => setRampStep(event.target.value)} placeholder="5" />
          </label>
          <label>
            Hold Duration (minutes)
            <input type="number" value={holdDuration} onChange={(event) => setHoldDuration(event.target.value)} placeholder="10" />
          </label>
          <button type="button" onClick={addBp}>Add BP Allocation</button>

          <div className="builder-list">
            {bps.map((bp, index) => (
              <div className="builder-item" key={bp.id}>
                <div className="builder-item-head">
                  <strong>BP Allocation {index + 1}</strong>
                  <button type="button" onClick={() => removeBp(bp.id)}>Remove</button>
                </div>
                <label>
                  BP Name
                  <input value={bp.name} onChange={(event) => updateBp(bp.id, { name: event.target.value })} />
                </label>
                <label>
                  Function Name
                  <input value={bp.fn} onChange={(event) => updateBp(bp.id, { fn: event.target.value })} />
                </label>
                <div className="inline-fields">
                  <label>
                    Users
                    <input type="number" value={bp.users} onChange={(event) => updateBp(bp.id, { users: event.target.value })} />
                  </label>
                  <label>
                    Think Time
                    <input type="number" value={bp.thinkTime} onChange={(event) => updateBp(bp.id, { thinkTime: event.target.value })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className="panel code-preview">
          <h2>Preview</h2>
          <pre>{preview}</pre>
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

  return `import { runScript } from '../../../../lib/core/runScript.js';
import { loadCSV } from '../../../../lib/data/csvLoader.js';
import { transaction } from '../../../../lib/http/transaction.js';
import { api } from '../../../../lib/http/api.js';
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

// Target folder: src/script/${channel || '_channel'}/${safeBp}/`;
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
    `import { ${bp.fn || 'BPxxx_NamaBP'} } from '../script/NamaProject/${bp.fn || 'BPxxx_NamaBP'}/${bp.fn || 'BPxxx_NamaBP'}.js';`
  ).join('\n') : '// import { BP001_NamaBP } from \'../script/NamaProject/BP001_NamaBP/BP001_NamaBP.js\';';

  const list = bps.length ? bps.map((bp) =>
    `    { name: '${bp.name || 'BPxxx'}', users: ${Number(bp.users) || 1}, fn: ${bp.fn || 'BPxxx_NamaBP'}, thinkTime: ${Number(bp.thinkTime) || 0} },`
  ).join('\n') : '    // { name: \'BP001\', users: 1, fn: BP001_NamaBP, thinkTime: 1 },';

  return `// File: src/scenario/${scenarioName || 'scenario_myproject'}.js
import { MODE, createOptions, dispatchVu, setBpList } from '../../lib/core/config.js';

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
