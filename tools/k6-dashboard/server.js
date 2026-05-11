const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const duckdb  = require('duckdb');

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
function pctSorted(arr, p) {
  if (!arr.length) return 0;
  return arr[Math.min(Math.floor(arr.length * p), arr.length - 1)] || 0;
}

// ── DuckDB parser ─────────────────────────────────────────────────────────────
function parseK6CSV(filePath) {
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(':memory:');

    // DDL on a dedicated setup connection
    function ddl(sql) {
      return new Promise((res, rej) => {
        const conn = db.connect();
        conn.run(sql, err => { conn.close(); err ? rej(err) : res(); });
      });
    }

    // Each SELECT gets its own connection → DuckDB runs them in parallel internally
    function sel(sql) {
      return new Promise((res, rej) => {
        const conn = db.connect();
        conn.all(sql, (err, rows) => { conn.close(); err ? rej(err) : res(rows || []); });
      });
    }

    const TIMING = ['http_req_duration','http_req_waiting','http_req_sending',
                    'http_req_receiving','http_req_blocked','http_req_connecting',
                    'http_req_tls_handshaking'];

    async function run() {
      // Normalise path for DuckDB (forward slashes, escape single quotes)
      const fp = filePath.replace(/\\/g, '/').replace(/'/g, "''");

      const t0 = Date.now();
      // Load CSV into a real table — CSV dibaca sekali, extra_tags disimpan mentah
      // Regex parsing dilakukan per-query hanya pada subset metric yang relevan
      await ddl(`
        CREATE TABLE k6 AS
        SELECT
          metric_name,
          CAST(timestamp AS BIGINT) * 1000  AS bucket,
          TRY_CAST(metric_value AS DOUBLE)   AS val,
          (expected_response = 'true')        AS is_ok,
          COALESCE("group", '')               AS grp,
          COALESCE("check", '')               AS chk,
          COALESCE(extra_tags, '')            AS extra_tags
        FROM read_csv_auto('${fp}', header=true, ignore_errors=true)
        WHERE metric_name IS NOT NULL AND metric_value IS NOT NULL
      `);
      console.log(`[k6] CREATE TABLE: ${((Date.now()-t0)/1000).toFixed(1)}s`);
      const t1 = Date.now();

      const timingIn = TIMING.map(m => `'${m}'`).join(',');

      // Macro regex inline — tiap query hanya scan subset metric-nya sendiri
      const etx  = `COALESCE(regexp_extract(extra_tags,'transaction=([^&]*)',1),'')`;
      const eapi = `COALESCE(regexp_extract(extra_tags,'api=([^&]*)',1),'')`;
      const etid = `COALESCE(regexp_extract(extra_tags,'testid=([^&]*)',1),'')`;

      let metaRows, reqRows, httpDurBktRows, httpDurStatRows, trxDurBktRows,
          trxDurStatRows, trxCountRows, apiDurRows, checkRows, timingRows, vuRows, tsRows;
      try {
        [metaRows, reqRows, httpDurBktRows, httpDurStatRows, trxDurBktRows,
         trxDurStatRows, trxCountRows, apiDurRows, checkRows, timingRows, vuRows, tsRows,
        ] = await Promise.all([
        // metadata: testid + row count — scan seluruh tabel tapi ringan
        sel(`SELECT MAX(${etid}) FILTER (WHERE extra_tags LIKE '%testid=%') AS testid,
                    COUNT(*) AS total_rows FROM k6`),

        // http_reqs — regex hanya pada ~subset rows metrik ini
        sel(`SELECT bucket, ${etx} AS tx, ${eapi} AS api, grp,
                    SUM(CASE WHEN is_ok     THEN 1 ELSE 0 END) AS ok,
                    SUM(CASE WHEN NOT is_ok THEN 1 ELSE 0 END) AS err
             FROM k6 WHERE metric_name = 'http_reqs'
             GROUP BY bucket, tx, api, grp`),

        // http_req_duration per bucket + api
        sel(`SELECT bucket, ${etx} AS tx, ${eapi} AS api,
                    SUM(val) AS sum, COUNT(*) AS n, MIN(val) AS mn, MAX(val) AS mx
             FROM k6 WHERE metric_name = 'http_req_duration'
             GROUP BY bucket, tx, api`),

        // http_req_duration overall stats — no tag needed
        sel(`SELECT COUNT(*) AS n, SUM(val) AS sum, MIN(val) AS mn, MAX(val) AS mx,
                    PERCENTILE_CONT(0.9)  WITHIN GROUP (ORDER BY val) AS p90,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY val) AS p95,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY val) AS p99
             FROM k6 WHERE metric_name = 'http_req_duration'`),

        // trx_duration per bucket + tx
        sel(`SELECT bucket, ${etx} AS tx,
                    SUM(val) AS sum, COUNT(*) AS n, MIN(val) AS mn, MAX(val) AS mx
             FROM k6 WHERE metric_name = 'trx_duration' AND extra_tags LIKE '%transaction=%'
             GROUP BY bucket, tx`),

        // trx_duration per tx overall — percentiles
        sel(`SELECT ${etx} AS tx, COUNT(*) AS n, SUM(val) AS sum, MIN(val) AS mn, MAX(val) AS mx,
                    PERCENTILE_CONT(0.9)  WITHIN GROUP (ORDER BY val) AS p90,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY val) AS p95,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY val) AS p99
             FROM k6 WHERE metric_name = 'trx_duration' AND extra_tags LIKE '%transaction=%'
             GROUP BY tx`),

        // trx_count_pass / trx_count_fail per bucket + tx
        sel(`SELECT metric_name, bucket, ${etx} AS tx, SUM(val) AS total
             FROM k6
             WHERE metric_name IN ('trx_count','trx_count_pass','trx_count_fail','trx_count_total')
               AND extra_tags LIKE '%transaction=%'
             GROUP BY metric_name, bucket, tx`),

        // api_duration overall per bucket — no tag needed
        sel(`SELECT bucket, SUM(val) AS sum, COUNT(*) AS n
             FROM k6 WHERE metric_name = 'api_duration'
             GROUP BY bucket`),

        // checks — chk sudah kolom langsung
        sel(`SELECT bucket, chk, SUM(val) AS pass, COUNT(*) AS total
             FROM k6 WHERE metric_name = 'checks'
             GROUP BY bucket, chk`),

        // timing metrics — no tag needed
        sel(`SELECT metric_name, bucket, SUM(val) AS sum, COUNT(*) AS n
             FROM k6 WHERE metric_name IN (${timingIn})
             GROUP BY metric_name, bucket`),

        // vus max — no tag needed
        sel(`SELECT MAX(val) AS vus_max FROM k6 WHERE metric_name IN ('vus','vus_max')`),

        // time series — no tag needed
        sel(`SELECT metric_name, bucket, SUM(val) AS sum, COUNT(*) AS n
             FROM k6 GROUP BY metric_name, bucket ORDER BY metric_name, bucket`),
      ]);
      } finally {
        db.close();
      }

      console.log(`[k6] queries:      ${((Date.now()-t1)/1000).toFixed(1)}s`);
      const t2 = Date.now();

      // ── Assemble ────────────────────────────────────────────────────────────
      const testid    = metaRows[0]?.testid    || '';
      const totalRows = Number(metaRows[0]?.total_rows || 0);
      const vusMax    = Number(vuRows[0]?.vus_max      || 0);

      // All buckets from time-series scan
      const allBktSet = new Set();
      tsRows.forEach(r => allBktSet.add(Number(r.bucket)));
      const allBuckets = [...allBktSet].sort((a, b) => a - b);

      // time series
      const tsBkts = {};
      tsRows.forEach(r => {
        const m = r.metric_name, b = Number(r.bucket);
        if (!tsBkts[m]) tsBkts[m] = {};
        tsBkts[m][b] = { sum: Number(r.sum), n: Number(r.n) };
      });
      const timeSeries = {};
      for (const [name, bktsObj] of Object.entries(tsBkts)) {
        timeSeries[name] = allBuckets.map(t => {
          const v = bktsObj[t];
          if (!v || !v.n) return null;
          return { t, v: parseFloat((v.sum / v.n).toFixed(4)), n: v.n };
        }).filter(Boolean);
      }

      // reqBkts + txReqData + apiData + groups
      const reqBkts   = {};
      const txReqData = {};
      const apiData   = {};
      const groupSet  = new Set();
      const txToGroup = {};

      reqRows.forEach(r => {
        const b = Number(r.bucket), ok = Number(r.ok), err = Number(r.err);
        const tx = r.tx || '', api = r.api || '', grp = r.grp || '';

        if (!reqBkts[b]) reqBkts[b] = { ok:0, err:0 };
        reqBkts[b].ok += ok; reqBkts[b].err += err;

        if (grp) { groupSet.add(grp); if (tx && !txToGroup[tx]) txToGroup[tx] = grp; }

        if (tx) {
          if (!txReqData[tx]) txReqData[tx] = { ok:0, err:0 };
          txReqData[tx].ok += ok; txReqData[tx].err += err;
        }
        if (api) {
          const key = `${tx}|||${api}`;
          if (!apiData[key]) apiData[key] = { transaction:tx, api, ok:0, err:0, tsBkts:{} };
          apiData[key].ok += ok; apiData[key].err += err;
          if (!apiData[key].tsBkts[b]) apiData[key].tsBkts[b] = { ok:0, err:0, sum:0, n:0, min:Infinity, max:-Infinity };
          apiData[key].tsBkts[b].ok += ok; apiData[key].tsBkts[b].err += err;
        }
      });

      // http_req_duration per bucket → apiData response time + durBkts for cb
      const durBkts = {};
      httpDurBktRows.forEach(r => {
        const b = Number(r.bucket), tx = r.tx || '', api = r.api || '';
        if (!durBkts[b]) durBkts[b] = { sum:0, n:0, min:Infinity, max:-Infinity };
        durBkts[b].sum += Number(r.sum); durBkts[b].n += Number(r.n);
        if (Number(r.mn) < durBkts[b].min) durBkts[b].min = Number(r.mn);
        if (Number(r.mx) > durBkts[b].max) durBkts[b].max = Number(r.mx);
        if (api) {
          const key = `${tx}|||${api}`;
          if (!apiData[key]) apiData[key] = { transaction:tx, api, ok:0, err:0, tsBkts:{} };
          if (!apiData[key].tsBkts[b]) apiData[key].tsBkts[b] = { ok:0, err:0, sum:0, n:0, min:Infinity, max:-Infinity };
          const v = apiData[key].tsBkts[b];
          v.sum += Number(r.sum); v.n += Number(r.n);
          if (Number(r.mn) < v.min) v.min = Number(r.mn);
          if (Number(r.mx) > v.max) v.max = Number(r.mx);
        }
      });

      // http_req_duration overall stats
      const ds = httpDurStatRows[0] || {};
      const durStats = {
        n: Number(ds.n || 0), avg: Number(ds.n) ? Number(ds.sum) / Number(ds.n) : 0,
        min: Number(ds.mn || 0), max: Number(ds.mx || 0),
        p90: Number(ds.p90 || 0), p95: Number(ds.p95 || 0), p99: Number(ds.p99 || 0),
      };

      // trx_duration: bucket data + per-tx stats
      const txDurBkts  = {};   // tx → bucket → {sum,n,min,max}
      const trxAllBkts = {};   // bucket → total trx completions (for TPS overall)

      trxDurBktRows.forEach(r => {
        const tx = r.tx, b = Number(r.bucket), n = Number(r.n);
        if (!txDurBkts[tx]) txDurBkts[tx] = {};
        txDurBkts[tx][b] = { sum: Number(r.sum), n, min: Number(r.mn), max: Number(r.mx) };
        trxAllBkts[b] = (trxAllBkts[b] || 0) + n;
      });

      const txDurStats = {};   // tx → { n, avg, mn, mx, p90 }
      trxDurStatRows.forEach(r => {
        const n = Number(r.n);
        txDurStats[r.tx] = {
          n, avg: n ? Number(r.sum) / n : 0,
          mn: Number(r.mn), mx: Number(r.mx),
          p90: Number(r.p90 || 0),
        };
      });

      // trx_count per tx + per bucket
      const txCountData = {};
      const txCountBkts = {};
      trxCountRows.forEach(r => {
        const tx = r.tx, b = Number(r.bucket), total = Number(r.total), mn = r.metric_name;
        if (!txCountData[tx]) txCountData[tx] = { pass:0, fail:0, total:0 };
        if (!txCountBkts[tx]) txCountBkts[tx] = {};
        if (!txCountBkts[tx][b]) txCountBkts[tx][b] = { pass:0, fail:0 };
        if (mn === 'trx_count' || mn === 'trx_count_total') txCountData[tx].total += total;
        else if (mn === 'trx_count_pass') { txCountData[tx].pass += total; txCountBkts[tx][b].pass += total; }
        else if (mn === 'trx_count_fail') { txCountData[tx].fail += total; txCountBkts[tx][b].fail += total; }
      });

      // api_duration overall
      const apiDurBkts = {};
      let apiDurSum = 0, apiDurN = 0;
      apiDurRows.forEach(r => {
        const b = Number(r.bucket), sum = Number(r.sum), n = Number(r.n);
        apiDurBkts[b] = { sum, n };
        apiDurSum += sum; apiDurN += n;
      });

      // checks
      const chkBkts     = {};
      const chkNameBkts = {};
      let chkPass = 0, chkTotal = 0;
      checkRows.forEach(r => {
        const b = Number(r.bucket), pass = Number(r.pass), total = Number(r.total);
        if (!chkBkts[b]) chkBkts[b] = { pass:0, total:0 };
        chkBkts[b].pass += pass; chkBkts[b].total += total;
        chkPass += pass; chkTotal += total;
        const name = r.chk;
        if (name) {
          if (!chkNameBkts[name]) chkNameBkts[name] = {};
          if (!chkNameBkts[name][b]) chkNameBkts[name][b] = { pass:0, total:0 };
          chkNameBkts[name][b].pass += pass; chkNameBkts[name][b].total += total;
        }
      });

      // timing metrics
      const timBkts = {};
      TIMING.forEach(m => { timBkts[m] = {}; });
      timingRows.forEach(r => {
        const m = r.metric_name, b = Number(r.bucket);
        if (timBkts[m]) timBkts[m][b] = { sum: Number(r.sum), n: Number(r.n) };
      });

      // ── Dimension lists ─────────────────────────────────────────────────────
      const transactions = [...new Set([
        ...Object.keys(txDurStats),
        ...Object.keys(txReqData),
      ])].sort();
      const apiKeys = Object.keys(apiData);
      const apis = [...new Set(apiKeys.map(k => k.split('|||')[1]))].filter(Boolean).sort();

      // ── TPS / RPS ───────────────────────────────────────────────────────────
      const tpsAll = allBuckets.map(t => ({ t, v: trxAllBkts[t] || 0 }));
      const rpsAll = allBuckets.map(t => ({ t, v: reqBkts[t] ? reqBkts[t].ok : 0 }));

      const tpsByTx = {};
      transactions.forEach(tx => {
        const bkts = txDurBkts[tx] || {};
        tpsByTx[tx] = allBuckets.map(t => ({ t, v: bkts[t]?.n || 0 }));
      });

      const rpsByApi = {};
      apis.forEach(api => {
        const keys = apiKeys.filter(k => k.endsWith('|||' + api));
        rpsByApi[api] = allBuckets.map(t => ({
          t, v: keys.reduce((s, k) => s + (apiData[k].tsBkts[t]?.ok || 0), 0)
        }));
      });

      // ── Response time series ────────────────────────────────────────────────
      const txRtAllBkts = {};
      Object.values(txDurBkts).forEach(bktsObj => {
        Object.entries(bktsObj).forEach(([bt, v]) => {
          if (!txRtAllBkts[bt]) txRtAllBkts[bt] = { sum:0, n:0 };
          txRtAllBkts[bt].sum += v.sum; txRtAllBkts[bt].n += v.n;
        });
      });
      const txResponseTimeAll = allBuckets.map(t => {
        const v = txRtAllBkts[t]; return { t, v: v && v.n ? v.sum / v.n : null };
      });
      const txResponseTime = {};
      transactions.forEach(tx => {
        const bkts = txDurBkts[tx];
        txResponseTime[tx] = allBuckets.map(t => {
          const v = bkts?.[t]; return { t, v: v && v.n ? v.sum / v.n : null };
        });
      });

      const apiResponseTimeAll = allBuckets.map(t => {
        const v = durBkts[t]; return { t, v: v && v.n ? v.sum / v.n : null };
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

      // ── Stat cards ──────────────────────────────────────────────────────────
      const successReqs = rpsAll.reduce((s, p) => s + p.v, 0);
      const errorReqs   = allBuckets.reduce((s, t) => s + (reqBkts[t]?.err || 0), 0);
      const totalReqs   = successReqs + errorReqs;
      const peakRps     = Math.max(0, ...rpsAll.map(p => p.v));
      const peakTps     = Math.max(0, ...tpsAll.map(p => p.v));

      const statCards = {
        totalReqs, successReqs, errorReqs,
        errorPct:     totalReqs ? parseFloat((errorReqs / totalReqs * 100).toFixed(2)) : 0,
        peakRps, peakTps,
        avgDuration:  durStats.avg, p90Duration: durStats.p90,
        p95Duration:  durStats.p95, p99Duration: durStats.p99,
        maxDuration:  durStats.max, minDuration: durStats.min,
        avgApiDur:    apiDurN ? apiDurSum / apiDurN : 0,
        p90ApiDur:    0,
        checksSuccessRate: chkTotal ? parseFloat((chkPass / chkTotal * 100).toFixed(1)) : 0,
        vusMax, testid,
      };

      // ── TX table ────────────────────────────────────────────────────────────
      const txTable = transactions.map(tx => {
        const ts = txDurStats[tx];
        let mn, mx, avg, p90, sample, success, error;

        if (ts && ts.n > 0) {
          mn = ts.mn; mx = ts.mx; avg = ts.avg; p90 = ts.p90; sample = ts.n;
        } else {
          // fallback: estimate from api duration buckets
          let bMn=Infinity, bMx=-Infinity, bSum=0, bN=0;
          const bktAvgs = [];
          const txApiKeys = apiKeys.filter(k => apiData[k].transaction === tx);
          txApiKeys.forEach(k => {
            Object.values(apiData[k].tsBkts).forEach(v => {
              if (!v.n) return;
              if (v.min < bMn) bMn = v.min; if (v.max > bMx) bMx = v.max;
              bSum += v.sum; bN += v.n; bktAvgs.push(v.sum / v.n);
            });
          });
          bktAvgs.sort((a, b) => a - b);
          mn = bMn === Infinity  ? 0 : bMn;
          mx = bMx === -Infinity ? 0 : bMx;
          avg = bN ? bSum / bN : 0;
          p90 = pctSorted(bktAvgs, .9);
          sample = bN ? Math.round(bN / Math.max(txApiKeys.length, 1)) : 0;
        }

        const tc = txCountData[tx];
        if (tc && (tc.total > 0 || tc.pass > 0)) {
          success = tc.pass; error = tc.fail;
          sample  = tc.total || tc.pass + tc.fail;
        } else if (sample > 0) {
          const rd = txReqData[tx] || { ok:0, err:0 };
          const tot = rd.ok + rd.err;
          const errRatio = tot > 0 ? rd.err / tot : 0;
          error   = Math.round(sample * errRatio);
          success = sample - error;
        } else {
          success = 0; error = 0;
        }

        return {
          transaction: tx, min: mn, avg, max: mx, p90,
          success, error, sample,
          successRate: sample ? parseFloat((success / sample * 100).toFixed(1)) : 0,
        };
      });

      // ── API table ───────────────────────────────────────────────────────────
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

      // ── Checks ──────────────────────────────────────────────────────────────
      const checksTable = Object.entries(chkNameBkts).map(([name, nb]) => {
        let pass = 0, total = 0;
        Object.values(nb).forEach(v => { pass += v.pass; total += v.total; });
        return { check:name, pass, fail:total-pass, total,
          rate: total ? parseFloat((pass / total * 100).toFixed(1)) : 0 };
      }).sort((a, b) => b.total - a.total);

      const checksTimeSeries = Object.entries(chkBkts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([t, v]) => ({ t: Number(t), v: v.total ? parseFloat((v.pass / v.total * 100).toFixed(1)) : 0 }));

      // ── Timing ──────────────────────────────────────────────────────────────
      const timingAvg = {};
      TIMING.forEach(m => {
        const bktsObj = timBkts[m]; let sum = 0, n = 0;
        Object.values(bktsObj).forEach(v => { sum += v.sum; n += v.n; });
        timingAvg[m] = { all: { avg: n ? sum / n : 0 } };
      });

      // ── clientBuckets (for time-range slider recompute) ─────────────────────
      const cb = {
        httpReqs:   reqBkts,
        httpDur:    {},
        apiDurAll:  apiDurBkts,
        trxDur:     {},
        trxAllBkts,
        trxPerBkt:  {},
        txReq:      txReqData,
        tx:         {},
        api:        {},
        checks:     chkBkts,
        checkNames: chkNameBkts,
        timing:     {},
        txCount:    txCountData,
        txCountBkts,
      };

      Object.entries(durBkts).forEach(([b, v]) => {
        cb.httpDur[b] = { sum:v.sum, n:v.n,
          min: isFinite(v.min)?v.min:0, max: isFinite(v.max)?v.max:0 };
      });

      transactions.forEach(tx => {
        cb.trxDur[tx] = {};
        cb.trxPerBkt[tx] = {};
        const bkts = txDurBkts[tx] || {};
        Object.entries(bkts).forEach(([b, v]) => {
          cb.trxDur[tx][b] = { sum:v.sum, n:v.n,
            min: isFinite(v.min)?v.min:0, max: isFinite(v.max)?v.max:0 };
          cb.trxPerBkt[tx][b] = v.n;
        });
      });

      Object.entries(apiData).forEach(([key, item]) => {
        cb.api[key] = { transaction:item.transaction, api:item.api, ts:{} };
        Object.entries(item.tsBkts).forEach(([b, v]) => {
          cb.api[key].ts[b] = { ok:v.ok, err:v.err, sum:v.sum, n:v.n,
            min: isFinite(v.min)?v.min:0, max: isFinite(v.max)?v.max:0 };
        });
      });

      Object.values(cb.api).forEach(item => {
        const tx = item.transaction;
        if (!cb.tx[tx]) cb.tx[tx] = {};
        Object.entries(item.ts).forEach(([b, v]) => {
          if (!cb.tx[tx][b]) cb.tx[tx][b] = { ok:0, err:0 };
          cb.tx[tx][b].ok  += v.ok;
          cb.tx[tx][b].err += v.err;
        });
      });

      TIMING.forEach(m => { cb.timing[m] = timBkts[m]; });

      console.log(`[k6] JS assembly:  ${((Date.now()-t2)/1000).toFixed(1)}s`);
      console.log(`[k6] total:        ${((Date.now()-t0)/1000).toFixed(1)}s`);
      return {
        timeSeries, statCards,
        txTable, apiTable, checksTable, checksTimeSeries,
        tpsAll, rpsAll, tpsByTx, rpsByApi, allBuckets,
        txResponseTime, txResponseTimeAll,
        apiResponseTime, apiResponseTimeAll,
        timingAvg, clientBuckets: cb,
        metricNames: Object.keys(tsBkts).sort(),
        transactions, apis,
        groups: [...groupSet].sort(),
        txToGroup,
        timeRange: { start: allBuckets[0]||0, end: allBuckets[allBuckets.length-1]||0 },
        totalRows,
      };
    }

    run().then(resolve).catch(reject);
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('csvFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await parseK6CSV(req.file.path);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err); res.status(500).json({ error: err.message });
  } finally {
    try { fs.unlinkSync(req.file.path); } catch {}
  }
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
