const express    = require('express');
const multer     = require('multer');
const { parse }  = require('csv-parse');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename:    (req, file, cb) => cb(null, `k6_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 * 1024 } });

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseTags(str) {
  const t = {};
  if (!str) return t;
  str.split('&').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) t[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return t;
}

function pctSorted(arr, p) {
  if (!arr.length) return 0;
  return arr[Math.min(Math.floor(arr.length * p), arr.length - 1)] || 0;
}

function statsFromSorted(s) {
  const n = s.length;
  if (!n) return { count:0, sum:0, min:0, max:0, avg:0, p90:0, p95:0, p99:0 };
  const sum = s.reduce((a, v) => a + v, 0);
  return { count:n, sum, min:s[0], max:s[n-1], avg:sum/n,
    p90:pctSorted(s,.9), p95:pctSorted(s,.95), p99:pctSorted(s,.99) };
}

// ── Streaming parser ───────────────────────────────────────────────────────────
function parseK6CSV(filePath) {
  return new Promise((resolve, reject) => {
    const SZ  = 1000;
    const bkt = ts => Math.floor(ts / SZ) * SZ;

    const allBktSet = new Set();

    // time series: metricName -> { bucket -> { sum, n } }
    const tsBkts = {};

    // http_reqs: bucket -> { ok, err }
    const reqBkts = {};

    // http_req_duration: bucket -> { sum, n, min, max }  + flat vals for pct
    const durBkts = {};
    const durVals = [];

    // api_duration (per-API): global bucket -> { sum, n }  + flat vals
    // Used ONLY for api response time charts, NOT for txTable
    const apiDurBkts = {};
    const apiDurVals = [];

    // trx_duration (per-TRANSACTION iteration): the correct source for txTable duration
    //   txDurData[tx] = { bkts:{ b->{ sum,n,min,max } }, vals:[] }
    const txDurData = {};

    // http_reqs per transaction: txReqData[tx] = { ok, err }
    // Used for success/error count (before trx_count overrides)
    const txReqData = {};

    // per-api: 'tx|||api' -> { transaction, api, ok, err, tsBkts:{ b->{ ok,err,sum,n,min,max } } }
    const apiData = {};

    // trx_count custom metrics: tx -> { pass, fail, total }
    const txCountData = {};

    // checks: bucket -> { pass, total }
    const chkBkts = {};
    const chkNameBkts = {};
    let chkPass = 0, chkTotal = 0;

    const TIMING = ['http_req_duration','http_req_waiting','http_req_sending',
                    'http_req_receiving','http_req_blocked','http_req_connecting',
                    'http_req_tls_handshaking'];
    const timBkts = {};
    TIMING.forEach(m => { timBkts[m] = {}; });

    let vusMax = 0, totalRows = 0, testid = '';

    // ── Per-row handler ───────────────────────────────────────────────────────
    function onRow(row) {
      const metricName = row.metric_name;
      const ts  = parseInt(row.timestamp) * 1000;
      const val = parseFloat(row.metric_value);
      if (!metricName || isNaN(val) || isNaN(ts)) return;
      totalRows++;

      const b = bkt(ts);
      allBktSet.add(b);

      // time series for every metric
      if (!tsBkts[metricName]) tsBkts[metricName] = {};
      const tsb = tsBkts[metricName];
      if (!tsb[b]) tsb[b] = { sum:0, n:0 };
      tsb[b].sum += val; tsb[b].n++;

      let et = null;
      const getEt = () => { if (!et) et = parseTags(row.extra_tags); return et; };
      const isOk  = row.expected_response === 'true';

      switch (metricName) {

        // ── http_reqs ────────────────────────────────────────────────────────
        case 'http_reqs': {
          const { transaction:tx, api, testid:tid } = getEt();
          if (tid && !testid) testid = tid;

          if (!reqBkts[b]) reqBkts[b] = { ok:0, err:0 };
          if (isOk) reqBkts[b].ok++; else reqBkts[b].err++;

          if (tx) {
            // track ok/err per tx (for success rate when trx_count not available)
            if (!txReqData[tx]) txReqData[tx] = { ok:0, err:0 };
            if (isOk) txReqData[tx].ok++; else txReqData[tx].err++;
          }
          if (api) {
            const key = `${tx||''}|||${api}`;
            if (!apiData[key]) apiData[key] = { transaction:tx||'', api, ok:0, err:0, tsBkts:{} };
            if (isOk) apiData[key].ok++; else apiData[key].err++;
            const ab = apiData[key].tsBkts;
            if (!ab[b]) ab[b] = { ok:0, err:0, sum:0, n:0, min:Infinity, max:-Infinity };
            if (isOk) ab[b].ok++; else ab[b].err++;
          }
          break;
        }

        // ── http_req_duration ────────────────────────────────────────────────
        case 'http_req_duration': {
          const { transaction:tx, api, testid:tid } = getEt();
          if (tid && !testid) testid = tid;

          if (!durBkts[b]) durBkts[b] = { sum:0, n:0, min:Infinity, max:-Infinity };
          durBkts[b].sum += val; durBkts[b].n++;
          if (val < durBkts[b].min) durBkts[b].min = val;
          if (val > durBkts[b].max) durBkts[b].max = val;
          durVals.push(val);

          if (api) {
            const key = `${tx||''}|||${api}`;
            if (!apiData[key]) apiData[key] = { transaction:tx||'', api, ok:0, err:0, tsBkts:{} };
            const ab = apiData[key].tsBkts;
            if (!ab[b]) ab[b] = { ok:0, err:0, sum:0, n:0, min:Infinity, max:-Infinity };
            ab[b].sum += val; ab[b].n++;
            if (val < ab[b].min) ab[b].min = val;
            if (val > ab[b].max) ab[b].max = val;
          }
          break;
        }

        // ── api_duration (per-API call) ──────────────────────────────────────
        // Used ONLY for "API Response Time" charts, NOT for txTable
        case 'api_duration': {
          const { testid:tid } = getEt();
          if (tid && !testid) testid = tid;

          if (!apiDurBkts[b]) apiDurBkts[b] = { sum:0, n:0 };
          apiDurBkts[b].sum += val; apiDurBkts[b].n++;
          apiDurVals.push(val);
          break;
        }

        // ── trx_duration (per-TRANSACTION iteration) ─────────────────────────
        // This is the CORRECT metric for txTable: min/avg/max/p90/sample
        // 1 entry per transaction iteration, value = full transaction duration
        case 'trx_duration': {
          const { transaction:tx, testid:tid } = getEt();
          if (tid && !testid) testid = tid;
          if (!tx) break;

          if (!txDurData[tx]) txDurData[tx] = { bkts:{}, vals:[] };
          txDurData[tx].vals.push(val);
          if (!txDurData[tx].bkts[b]) txDurData[tx].bkts[b] = { sum:0, n:0, min:Infinity, max:-Infinity };
          const v = txDurData[tx].bkts[b];
          v.sum += val; v.n++;
          if (val < v.min) v.min = val;
          if (val > v.max) v.max = val;
          break;
        }

        // ── trx_count custom metrics ─────────────────────────────────────────
        case 'trx_count':
        case 'trx_count_total': {
          const { transaction:tx, testid:tid } = getEt();
          if (tid && !testid) testid = tid;
          if (tx) {
            if (!txCountData[tx]) txCountData[tx] = { pass:0, fail:0, total:0 };
            txCountData[tx].total += val;
          }
          break;
        }
        case 'trx_count_pass': {
          const { transaction:tx, testid:tid } = getEt();
          if (tid && !testid) testid = tid;
          if (tx) {
            if (!txCountData[tx]) txCountData[tx] = { pass:0, fail:0, total:0 };
            txCountData[tx].pass += val;
          }
          break;
        }
        case 'trx_count_fail': {
          const { transaction:tx, testid:tid } = getEt();
          if (tid && !testid) testid = tid;
          if (tx) {
            if (!txCountData[tx]) txCountData[tx] = { pass:0, fail:0, total:0 };
            txCountData[tx].fail += val;
          }
          break;
        }

        // ── checks ───────────────────────────────────────────────────────────
        case 'checks': {
          const { testid:tid } = getEt();
          if (tid && !testid) testid = tid;
          if (!chkBkts[b]) chkBkts[b] = { pass:0, total:0 };
          chkBkts[b].total++; chkTotal++;
          if (val === 1) { chkBkts[b].pass++; chkPass++; }
          const check = row.check || '';
          if (check) {
            if (!chkNameBkts[check]) chkNameBkts[check] = {};
            if (!chkNameBkts[check][b]) chkNameBkts[check][b] = { pass:0, total:0 };
            chkNameBkts[check][b].total++;
            if (val === 1) chkNameBkts[check][b].pass++;
          }
          break;
        }

        case 'vus':
        case 'vus_max':
          vusMax = Math.max(vusMax, val);
          if (!testid) { const { testid:tid } = getEt(); if (tid) testid = tid; }
          break;
      }

      // timing metrics
      if (timBkts[metricName]) {
        const tm = timBkts[metricName];
        if (!tm[b]) tm[b] = { sum:0, n:0 };
        tm[b].sum += val; tm[b].n++;
      }

      if (!testid) { const { testid:tid } = getEt(); if (tid) testid = tid; }
    }

    // ── Finalize ──────────────────────────────────────────────────────────────
    function finalize() {
      const allBuckets = [...allBktSet].sort((a, b) => a - b);

      // time series
      const timeSeries = {};
      for (const [name, bktsObj] of Object.entries(tsBkts)) {
        timeSeries[name] = allBuckets.map(t => {
          const v = bktsObj[t];
          if (!v || !v.n) return null;
          return { t, v: parseFloat((v.sum / v.n).toFixed(4)), n: v.n };
        }).filter(Boolean);
      }

      // TPS / RPS
      const tpsAll = allBuckets.map(t => ({ t, v: reqBkts[t] ? reqBkts[t].ok + reqBkts[t].err : 0 }));
      const rpsAll = allBuckets.map(t => ({ t, v: reqBkts[t] ? reqBkts[t].ok : 0 }));

      // Dimension lists from trx_duration (most accurate) then fallback to txReqData
      const transactions = [...new Set([
        ...Object.keys(txDurData),
        ...Object.keys(txReqData),
      ])].sort();
      const apiKeys = Object.keys(apiData);
      const apis = [...new Set(apiKeys.map(k => k.split('|||')[1]))].filter(Boolean).sort();

      // TPS/RPS by transaction (from http_reqs)
      const tpsByTx = {}, rpsByTx = {};
      transactions.forEach(tx => {
        // need per-bucket counts from http_reqs — rebuild from apiData
        const txApiKeys = apiKeys.filter(k => apiData[k].transaction === tx);
        const txBktMap = {};
        txApiKeys.forEach(k => {
          Object.entries(apiData[k].tsBkts).forEach(([bt, v]) => {
            if (!txBktMap[bt]) txBktMap[bt] = { ok:0, err:0 };
            txBktMap[bt].ok  += v.ok;
            txBktMap[bt].err += v.err;
          });
        });
        tpsByTx[tx] = allBuckets.map(t => ({ t, v: txBktMap[t] ? txBktMap[t].ok + txBktMap[t].err : 0 }));
        rpsByTx[tx] = allBuckets.map(t => ({ t, v: txBktMap[t] ? txBktMap[t].ok : 0 }));
      });

      // RPS by api
      const rpsByApi = {};
      apis.forEach(api => {
        const keys = apiKeys.filter(k => k.endsWith('|||' + api));
        rpsByApi[api] = allBuckets.map(t => ({ t, v: keys.reduce((s, k) => s + (apiData[k].tsBkts[t]?.ok || 0), 0) }));
      });

      // Transaction response time from trx_duration buckets
      const txRtAllBkts = {};
      Object.values(txDurData).forEach(td => {
        Object.entries(td.bkts).forEach(([bt, v]) => {
          if (!txRtAllBkts[bt]) txRtAllBkts[bt] = { sum:0, n:0 };
          txRtAllBkts[bt].sum += v.sum; txRtAllBkts[bt].n += v.n;
        });
      });
      const txResponseTimeAll = allBuckets.map(t => {
        const v = txRtAllBkts[t]; return { t, v: v && v.n ? v.sum / v.n : null };
      });
      const txResponseTime = {};
      transactions.forEach(tx => {
        const td = txDurData[tx];
        if (td) {
          txResponseTime[tx] = allBuckets.map(t => {
            const v = td.bkts[t]; return { t, v: v && v.n ? v.sum / v.n : null };
          });
        } else {
          txResponseTime[tx] = allBuckets.map(t => ({ t, v: null }));
        }
      });

      // API response time from http_req_duration
      const apiResponseTimeAll = allBuckets.map(t => {
        const v = timBkts['http_req_duration'][t]; return { t, v: v && v.n ? v.sum / v.n : null };
      });
      const apiResponseTime = {};
      apis.forEach(api => {
        const keys = apiKeys.filter(k => k.endsWith('|||' + api));
        apiResponseTime[api] = allBuckets.map(t => {
          let sum = 0, n = 0;
          keys.forEach(k => { const v = apiData[k].tsBkts[t]; if (v && v.n) { sum += v.sum; n += v.n; } });
          return { t, v: n ? sum / n : null };
        });
      });

      // Stat cards
      const totalReqs   = tpsAll.reduce((s, p) => s + p.v, 0);
      const successReqs = rpsAll.reduce((s, p) => s + p.v, 0);
      const errorReqs   = totalReqs - successReqs;
      const peakRps     = Math.max(0, ...rpsAll.map(p => p.v));
      const peakTps     = Math.max(0, ...tpsAll.map(p => p.v));

      durVals.sort((a, b) => a - b);
      const durStats = statsFromSorted(durVals);
      apiDurVals.sort((a, b) => a - b);
      const apiDurStats = statsFromSorted(apiDurVals);
      const checksSuccessRate = chkTotal ? parseFloat((chkPass / chkTotal * 100).toFixed(1)) : 0;

      const statCards = {
        totalReqs, successReqs, errorReqs,
        errorPct: totalReqs ? parseFloat((errorReqs / totalReqs * 100).toFixed(2)) : 0,
        peakRps, peakTps,
        avgDuration: durStats.avg,  p90Duration: durStats.p90,
        p95Duration: durStats.p95,  p99Duration: durStats.p99,
        maxDuration: durStats.max,  minDuration: durStats.min,
        avgApiDur: apiDurStats.avg, p90ApiDur: apiDurStats.p90,
        checksSuccessRate, vusMax, testid,
      };

      // ── TX table ──────────────────────────────────────────────────────────
      // Duration: from trx_duration (1 per iteration) — CORRECT
      // Sample:   count of trx_duration entries
      // Success/Error: from trx_count_pass/fail → else estimate from http_reqs ratio
      const txTable = transactions.map(tx => {
        const td = txDurData[tx];

        let mn, mx, avg, p90, sample, success, error;

        if (td && td.vals.length > 0) {
          // ── Have trx_duration data — accurate ────────────────────────────
          const sorted = [...td.vals].sort((a, b) => a - b);
          const n   = sorted.length;
          const sum = sorted.reduce((a, v) => a + v, 0);
          mn   = sorted[0];
          mx   = sorted[n - 1];
          avg  = sum / n;
          p90  = pctSorted(sorted, .9);
          // sample = number of trx_duration entries = number of iterations
          sample = n;
        } else {
          // ── No trx_duration — fallback to api_duration bucket avgs ───────
          // (legacy path, less accurate)
          const bktAvgs = [];
          let bMn=Infinity, bMx=-Infinity, bSum=0, bN=0;
          const txApiKeys = apiKeys.filter(k => apiData[k].transaction === tx);
          txApiKeys.forEach(k => {
            Object.values(apiData[k].tsBkts).forEach(v => {
              if (!v.n) return;
              if (v.min < bMn) bMn = v.min; if (v.max > bMx) bMx = v.max;
              bSum += v.sum; bN += v.n; bktAvgs.push(v.sum / v.n);
            });
          });
          bktAvgs.sort((a, b) => a - b);
          const numApis = Math.max(txApiKeys.length, 1);
          mn  = bMn === Infinity  ? 0 : bMn;
          mx  = bMx === -Infinity ? 0 : bMx;
          avg = bN ? bSum / bN : 0;
          p90 = pctSorted(bktAvgs, .9);
          sample = bN ? Math.round(bN / numApis) : 0;
        }

        // success / error counts
        const tc = txCountData[tx];
        if (tc && (tc.total > 0 || tc.pass > 0)) {
          success = tc.pass;
          error   = tc.fail;
          sample  = tc.total || tc.pass + tc.fail;
        } else if (sample > 0) {
          // estimate from http_reqs ratio
          const rd = txReqData[tx] || { ok:0, err:0 };
          const total = rd.ok + rd.err;
          const errRatio = total > 0 ? rd.err / total : 0;
          error   = Math.round(sample * errRatio);
          success = sample - error;
        } else {
          success = 0; error = 0;
        }

        return {
          transaction: tx,
          min: mn, avg, max: mx, p90,
          success, error, sample,
          successRate: sample ? parseFloat((success / sample * 100).toFixed(1)) : 0,
        };
      });

      // ── API table ─────────────────────────────────────────────────────────
      const apiTable = Object.values(apiData).map(item => {
        let mn = Infinity, mx = -Infinity, sum = 0, n = 0;
        const bktAvgs = [];
        Object.values(item.tsBkts).forEach(v => {
          if (!v.n) return;
          if (v.min < mn) mn = v.min; if (v.max > mx) mx = v.max;
          sum += v.sum; n += v.n; bktAvgs.push(v.sum / v.n);
        });
        bktAvgs.sort((a, b) => a - b);
        const sample = item.ok + item.err;
        return {
          transaction: item.transaction, api: item.api,
          min: mn === Infinity  ? 0 : mn,
          avg: n ? sum / n      : 0,
          max: mx === -Infinity ? 0 : mx,
          p90: pctSorted(bktAvgs, .9),
          success: item.ok, error: item.err, sample,
          successRate: sample ? parseFloat((item.ok / sample * 100).toFixed(1)) : 0,
        };
      }).sort((a, b) => a.transaction.localeCompare(b.transaction) || a.api.localeCompare(b.api));

      // Checks table
      const checksTable = Object.entries(chkNameBkts).map(([name, nb]) => {
        let pass = 0, total = 0;
        Object.values(nb).forEach(v => { pass += v.pass; total += v.total; });
        return { check:name, pass, fail:total-pass, total,
          rate: total ? parseFloat((pass / total * 100).toFixed(1)) : 0 };
      }).sort((a, b) => b.total - a.total);

      const checksTimeSeries = Object.entries(chkBkts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([t, v]) => ({ t: Number(t), v: v.total ? parseFloat((v.pass / v.total * 100).toFixed(1)) : 0 }));

      // Timing avg
      const timingAvg = {};
      TIMING.forEach(m => {
        const bktsObj = timBkts[m]; let sum = 0, n = 0;
        Object.values(bktsObj).forEach(v => { sum += v.sum; n += v.n; });
        timingAvg[m] = { all: { avg: n ? sum / n : 0 } };
      });

      // ── clientBuckets for time-range slider ───────────────────────────────
      const cb = {
        httpReqs:   reqBkts,
        httpDur:    {},
        apiDurAll:  apiDurBkts,
        // trxDur: per-tx trx_duration buckets (for txTable recompute on filter)
        trxDur:     {},
        // txReq: per-tx http_reqs ok/err (for success/error estimate on filter)
        txReq:      txReqData,
        api:        {},
        checks:     chkBkts,
        checkNames: chkNameBkts,
        timing:     {},
        txCount:    txCountData,
      };

      Object.entries(durBkts).forEach(([b, v]) => {
        cb.httpDur[b] = { sum:v.sum, n:v.n,
          min: isFinite(v.min)?v.min:0, max: isFinite(v.max)?v.max:0 };
      });

      // trxDur per tx
      transactions.forEach(tx => {
        cb.trxDur[tx] = {};
        const td = txDurData[tx];
        if (td) {
          Object.entries(td.bkts).forEach(([b, v]) => {
            cb.trxDur[tx][b] = { sum:v.sum, n:v.n,
              min: isFinite(v.min)?v.min:0, max: isFinite(v.max)?v.max:0 };
          });
        }
      });

      Object.entries(apiData).forEach(([key, item]) => {
        cb.api[key] = { transaction:item.transaction, api:item.api, ts:{} };
        Object.entries(item.tsBkts).forEach(([b, v]) => {
          cb.api[key].ts[b] = { ok:v.ok, err:v.err, sum:v.sum, n:v.n,
            min: isFinite(v.min)?v.min:0, max: isFinite(v.max)?v.max:0 };
        });
      });

      TIMING.forEach(m => { cb.timing[m] = timBkts[m]; });

      // lightweight summary
      const summary = {};
      Object.entries(tsBkts).forEach(([name, bktsObj]) => {
        let sum=0, n=0, mn=Infinity, mx=-Infinity;
        Object.values(bktsObj).forEach(v => {
          sum+=v.sum; n+=v.n;
          const avg=v.n?v.sum/v.n:0;
          if(avg<mn)mn=avg; if(avg>mx)mx=avg;
        });
        summary[name] = { count:n, avg:n?sum/n:0, min:mn===Infinity?0:mn, max:mx===-Infinity?0:mx };
      });

      resolve({
        summary, timeSeries, statCards,
        txTable, apiTable, checksTable, checksTimeSeries,
        tpsAll, rpsAll, tpsByTx, rpsByTx, rpsByApi, allBuckets,
        txResponseTime, txResponseTimeAll,
        apiResponseTime, apiResponseTimeAll,
        timingAvg, clientBuckets: cb,
        metricNames: Object.keys(tsBkts).sort(),
        transactions, apis,
        timeRange: { start: allBuckets[0]||0, end: allBuckets[allBuckets.length-1]||0 },
        totalRows,
      });
    }

    // ── Wire streaming parser ─────────────────────────────────────────────────
    const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
    const parser = parse({ columns:true, skip_empty_lines:true, trim:true });
    parser.on('readable', () => { let r; while ((r = parser.read()) !== null) onRow(r); });
    parser.on('error', reject);
    parser.on('end',   () => { try { finalize(); } catch (e) { reject(e); } });
    stream.on('error', reject);
    stream.pipe(parser);
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await parseK6CSV(req.file.path);
    try { fs.unlinkSync(req.file.path); } catch {}
    res.json({ success: true, ...result });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.post('/api/parse-path', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath required' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: `File not found: ${filePath}` });
    const result = await parseK6CSV(filePath);
    res.json({ success: true, ...result });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips  = [];
  for (const iface of Object.values(nets))
    for (const addr of iface)
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
  console.log('\n🚀  k6 Dashboard running\n');
  console.log(`   Local    →  http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   Network  →  http://${ip}:${PORT}`));
  console.log('\n   Tip: gunakan "Load via path" untuk file besar (skip upload copy)\n');
});
