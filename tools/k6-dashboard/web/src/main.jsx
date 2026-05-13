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
import './styles.css';

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip, Legend);

const navItems = [
  { id: 'dashboard', label: 'Results Dashboard' },
  { id: 'script', label: 'Script Generator' },
  { id: 'scenario', label: 'Scenario Generator' },
];

function App() {
  const [page, setPage] = React.useState('dashboard');

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
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <a className="legacy-link" href="/">
          Open legacy dashboard
        </a>
      </aside>

      <main className="main-panel">
        {page === 'dashboard' && <DashboardPage />}
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

function DashboardPage() {
  const [data, setData] = React.useState(null);
  const [path, setPath] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [granularity, setGranularity] = React.useState('auto');

  const loadResult = React.useCallback(async (request) => {
    setLoading(true);
    setError('');
    try {
      const res = await request();
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parse error');
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to load result');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const chartData = React.useMemo(() => {
    if (!data) return null;
    return buildChartView(data, granularity);
  }, [data, granularity]);

  return (
    <>
      <PageHeader
        eyebrow="React Dashboard"
        title="Results Dashboard"
        description="Load hasil CSV k6 lewat API yang sama dengan dashboard lama. Ini versi React awal untuk migrasi bertahap."
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

      {data && chartData && (
        <ResultsView
          data={data}
          chartData={chartData}
          granularity={granularity}
          setGranularity={setGranularity}
        />
      )}

      {!data && !loading && (
        <section className="work-grid">
          <div className="panel">
            <h2>Migration Status</h2>
            <ul className="status-list">
              <li><span className="done" /> Express API reuse</li>
              <li><span className="done" /> React shell ready</li>
              <li><span className="done" /> CSV load flow</li>
              <li><span className="done" /> Basic charts</li>
              <li><span /> Full legacy parity</li>
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

function ResultsView({ data, chartData, granularity, setGranularity }) {
  const sc = data.statCards;
  const topTx = [...(data.txTable || [])].sort((a, b) => b.p90 - a.p90).slice(0, 8);
  const topApi = [...(data.apiTable || [])].sort((a, b) => b.p90 - a.p90).slice(0, 8);

  return (
    <section className="results-stack">
      <div className="result-topline">
        <div>
          <strong>{sc.testid || 'test result'}</strong>
          <span>{fmtN(data.totalRows)} rows · {fmtDuration(data.timeRange.end - data.timeRange.start)}</span>
        </div>
        <label className="gran-control">
          Granularity
          <select value={granularity} onChange={(event) => setGranularity(event.target.value)}>
            <option value="auto">Auto ({chartData.granularitySec}s)</option>
            <option value="1">1s</option>
            <option value="5">5s</option>
            <option value="10">10s</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
            <option value="300">5m</option>
          </select>
        </label>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Requests" value={fmtN(sc.totalReqs)} sub={`VUs max: ${sc.vusMax}`} />
        <StatCard label="Success" value={fmtN(sc.successReqs)} sub={`${successPct(sc)}% success`} tone="good" />
        <StatCard label="Errors" value={fmtN(sc.errorReqs)} sub={`${sc.errorPct}% error`} tone="bad" />
        <StatCard label="Peak TPS" value={fmtN(sc.peakTps)} sub="transactions/s" tone="cyan" />
        <StatCard label="Peak RPS" value={fmtN(sc.peakRps)} sub="requests/s" tone="warn" />
        <StatCard label="p95 Duration" value={fmtMs(sc.p95Duration)} sub={`p99: ${fmtMs(sc.p99Duration)}`} tone="purple" />
      </div>

      <div className="chart-grid">
        <ChartPanel title="TPS Overall" series={[{ label: 'TPS', data: chartData.tpsAll, color: '#22d3ee', fill: true }]} />
        <ChartPanel title="RPS Overall" series={[{ label: 'RPS', data: chartData.rpsAll, color: '#39d98a', fill: true }]} />
        <ChartPanel title="Transaction Response Time" unit="ms" series={[
          { label: 'Avg all', data: chartData.txResponseTimeAll, color: '#ffaa3b', fill: true },
        ]} />
        <ChartPanel title="API Response Time" unit="ms" series={[
          { label: 'Avg all', data: chartData.apiResponseTimeAll, color: '#a78bfa', fill: true },
        ]} />
      </div>

      <div className="table-grid">
        <ResultTable title="Top Slow Transactions" rows={topTx} primary="transaction" />
        <ResultTable title="Top Slow APIs" rows={topApi} primary="api" secondary="transaction" />
      </div>
    </section>
  );
}

function StatCard({ label, value, sub, tone = '' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function ChartPanel({ title, series, unit = '' }) {
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      <LineChart series={series} unit={unit} />
    </div>
  );
}

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

  return <canvas ref={canvasRef} />;
}

function ResultTable({ title, rows, primary, secondary }) {
  return (
    <div className="panel table-panel">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>p90</th>
            <th>Avg</th>
            <th>Rate</th>
            <th>Sample</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.transaction}-${row.api || row.transaction}`}>
              <td>
                <strong>{row[primary]}</strong>
                {secondary && <small>{row[secondary]}</small>}
              </td>
              <td>{fmtMs(row.p90)}</td>
              <td>{fmtMs(row.avg)}</td>
              <td>{row.successRate}%</td>
              <td>{fmtN(row.sample)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

  const preview = buildScriptPreview({ channel, bpName, baseUrl, steps });

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

  const preview = buildScenarioPreview({ scenarioName, rampStep, holdDuration, bps });

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

function buildChartView(data, selectedGranularity) {
  const durationSec = Math.max(1, Math.round((data.timeRange.end - data.timeRange.start) / 1000));
  const auto = roundNice(Math.ceil(durationSec / 250));
  const granularitySec = selectedGranularity === 'auto' ? auto : Math.max(1, Number(selectedGranularity));
  const granMs = granularitySec * 1000;
  return {
    granularitySec,
    tpsAll: aggregateSeries(data.tpsAll, granMs, 'rate', data.timeRange.start),
    rpsAll: aggregateSeries(data.rpsAll, granMs, 'rate', data.timeRange.start),
    txResponseTimeAll: aggregateSeries(data.txResponseTimeAll, granMs, 'avg', data.timeRange.start),
    apiResponseTimeAll: aggregateSeries(data.apiResponseTimeAll, granMs, 'avg', data.timeRange.start),
  };
}

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

function buildScenarioPreview({ rampStep, holdDuration, bps }) {
  const imports = bps.length ? bps.map((bp) =>
    `import { ${bp.fn || 'BPxxx_NamaBP'} } from '../script/NamaProject/${bp.fn || 'BPxxx_NamaBP'}/${bp.fn || 'BPxxx_NamaBP'}.js';`
  ).join('\n') : '// import { BP001_NamaBP } from \'../script/NamaProject/BP001_NamaBP/BP001_NamaBP.js\';';

  const list = bps.length ? bps.map((bp) =>
    `    { name: '${bp.name || 'BPxxx'}', users: ${Number(bp.users) || 1}, fn: ${bp.fn || 'BPxxx_NamaBP'}, thinkTime: ${Number(bp.thinkTime) || 0} },`
  ).join('\n') : '    // { name: \'BP001\', users: 1, fn: BP001_NamaBP, thinkTime: 1 },';

  return `import { MODE, createOptions, dispatchVu, setBpList } from '../../lib/core/config.js';

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

function fmtMs(v) {
  if (v == null || Number.isNaN(Number(v))) return '-';
  return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Number(v).toFixed(1)}ms`;
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
