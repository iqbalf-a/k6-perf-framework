// ─── State ────────────────────────────────────────────────────────────────────
let DATA = null, FLT = null, GRP = '';
const D  = () => FLT || DATA;
const CH = {};
const TABLE_SORT = {};
const TABLE_RENDER_FNS = {
  tblChecks: renderChecksTable, tblTx: renderTxTable, tblApi: renderApiTable,
  tblTpsStat: renderTpsStat, tblRpsStat: renderRpsStat,
};

function tableSort(tblId, col){
  const cur=TABLE_SORT[tblId];
  TABLE_SORT[tblId]=cur?.col===col?{col,dir:cur.dir==='asc'?'desc':'asc'}:{col,dir:'asc'};
  TABLE_RENDER_FNS[tblId]?.();
}
function applySort(rows, tblId){
  const s=TABLE_SORT[tblId]; if(!s) return rows;
  return [...rows].sort((a,b)=>{
    const av=a[s.col], bv=b[s.col];
    const cmp=typeof av==='string'?av.localeCompare(bv):(av-bv);
    return s.dir==='asc'?cmp:-cmp;
  });
}
function updateSortIndicators(tblId){
  const s=TABLE_SORT[tblId];
  document.querySelectorAll(`#${tblId} thead .th-sort`).forEach(th=>{
    th.classList.remove('asc','desc');
    if(s&&th.dataset.sortKey===s.col) th.classList.add(s.dir);
  });
}

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtS   = v => (v==null||isNaN(v)) ? '—' : (v/1000).toFixed(3);
const fmtMs  = v => (v==null||isNaN(v)) ? '—' : v>=1000?(v/1000).toFixed(2)+'s':v.toFixed(1)+'ms';
const fmtN   = v => (v==null||isNaN(v)) ? '—' : Number(v).toLocaleString();

// Actual wall-clock time (for labels)
const fmtT   = ts => new Date(ts).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

// Duration since start of test → HH:MM:SS
function fmtOffset(ms){
  if(ms<0) ms=0;
  const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
}

// Human-readable duration
function fmtDur(ms){
  if(ms<1000) return ms+'ms';
  if(ms<60000) return (ms/1000).toFixed(1)+'s';
  const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000);
  return m+'m '+(s<10?'0':'')+s+'s';
}

// Parse HH:MM:SS → total seconds (or null if invalid)
function parseHMS(str){
  const m=str.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if(!m) return null;
  const h=parseInt(m[1]), mm=parseInt(m[2]), ss=parseInt(m[3]);
  if(mm>59||ss>59) return null;
  return h*3600+mm*60+ss;
}

const PAL = ['#39d98a','#4f9dff','#ffaa3b','#a78bfa','#22d3ee','#fde047','#ff4c6a','#f472b6','#fb923c','#34d399','#818cf8','#f43f5e'];
const ha  = (hex,a)=>{ const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; };

// ─── Chart helpers ────────────────────────────────────────────────────────────
function destroyChart(id){ if(CH[id]){try{CH[id].destroy()}catch(e){}delete CH[id];} }

function baseOpts(unit=''){
  return {
    responsive:true, interaction:{mode:'index',intersect:false}, animation:{duration:280},
    plugins:{
      legend:{display:false},
      tooltip:{backgroundColor:'rgba(11,13,20,.96)',borderColor:'#1e2235',borderWidth:1,
        titleColor:'#dde1f0',bodyColor:'#4a5070',
        callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.parsed.y!=null?ctx.parsed.y.toFixed(2):'—'}${unit}`}}
    },
    scales:{
      x:{ticks:{color:'#4a5070',maxTicksLimit:8,font:{family:'Consolas',size:10}},grid:{color:'rgba(255,255,255,.04)'}},
      y:{ticks:{color:'#4a5070',font:{family:'Consolas',size:10}},grid:{color:'rgba(255,255,255,.04)'}}
    }
  };
}
function ds(label,data,color,o={}){
  return {label,data,borderColor:color,backgroundColor:o.fill?ha(color,.14):'transparent',
    borderWidth:o.w??1.5,pointRadius:0,tension:.3,fill:o.fill??false,
    yAxisID:o.axis??'y',borderDash:o.dash??[],spanGaps:true};
}
function makeLeg(el,items){
  el.innerHTML=items.map(i=>`<div class="leg-item"><div class="leg-dot" style="background:${i.c}"></div><span>${i.l}</span></div>`).join('');
}
function toggleSec(hd){
  hd.nextElementSibling.classList.toggle('hide');
  hd.querySelector('.sec-arrow').classList.toggle('open');
}

// ─── Upload ───────────────────────────────────────────────────────────────────
const dz=document.getElementById('dropzone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files[0])uploadFile(e.dataTransfer.files[0]);});
document.getElementById('fileInput').addEventListener('change',e=>{if(e.target.files[0])uploadFile(e.target.files[0]);});

function loadPath(){
  const p=document.getElementById('pathInput').value.trim(); if(!p)return;
  setLoad(true);
  fetch('/api/parse-path',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filePath:p})})
    .then(r=>r.json()).then(onData).catch(e=>showErr(e.message));
}
function uploadFile(f){
  setLoad(true);
  const fd=new FormData(); fd.append('csvFile',f);
  fetch('/api/upload',{method:'POST',body:fd}).then(r=>r.json()).then(onData).catch(e=>showErr(e.message));
}
let _loadTimer=null, _loadStart=0;
function setLoad(on){
  document.getElementById('uploadScreen').style.display=on?'none':'flex';
  document.getElementById('loading').style.display=on?'flex':'none';
  document.getElementById('dashboard').style.display='none';
  if(on){
    _loadStart=Date.now();
    document.getElementById('loadTimer').textContent='0:00';
    _loadTimer=setInterval(()=>{
      const s=Math.floor((Date.now()-_loadStart)/1000);
      document.getElementById('loadTimer').textContent=
        Math.floor(s/60)+':'+(s%60).toString().padStart(2,'0');
    },1000);
  } else {
    clearInterval(_loadTimer);
    const s=Math.floor((Date.now()-_loadStart)/1000);
    const elapsed=Math.floor(s/60)+':'+(s%60).toString().padStart(2,'0');
    document.getElementById('loadedIn').textContent=elapsed+'s';
    _loadTimer=null;
  }
}
function showErr(msg){ setLoad(false); document.getElementById('uploadHint').textContent='❌ '+(msg||'Error'); }
function resetDash(){
  DATA=null; FLT=null; GRP='';
  Object.keys(CH).forEach(k=>{try{CH[k].destroy()}catch(e){}delete CH[k];});
  document.getElementById('uploadScreen').style.display='flex';
  document.getElementById('loading').style.display='none';
  document.getElementById('dashboard').style.display='none';
  document.getElementById('fileInput').value='';
}
function onData(res){
  if(!res.success){showErr(res.error||'Parse error');return;}
  setLoad(false);
  DATA=res; FLT=null; GRP='';
  initSlider();
  document.getElementById('uploadScreen').style.display='none';
  document.getElementById('loading').style.display='none';
  document.getElementById('dashboard').style.display='block';
  document.getElementById('topTestid').textContent=DATA.statCards.testid||'—';
  document.getElementById('topRows').textContent=DATA.totalRows.toLocaleString();
  const dur=DATA.timeRange.end-DATA.timeRange.start;
  document.getElementById('topDuration').textContent=dur?fmtDur(dur):'—';
  renderApiFilter();
  initGroupFilter();
  renderAll();
  initChartExportButtons();
}

// ─── Slider ───────────────────────────────────────────────────────────────────
const FS={posL:0,posR:1,drag:null};
let debTimer=null;

function initSlider(){
  const {start,end}=DATA.timeRange;
  // Slider labels = actual wall-clock time
  document.getElementById('tfL').textContent=fmtT(start);
  document.getElementById('tfR').textContent=fmtT(end);
  FS.posL=0; FS.posR=1;
  syncInputsFromSlider();
  updateSliderUI();
  drawHisto();
}

function tsOf(pos){ const {start,end}=DATA.timeRange; return Math.round(start+pos*(end-start)); }
function posOf(ts){ const {start,end}=DATA.timeRange; if(end===start)return 0; return Math.max(0,Math.min(1,(ts-start)/(end-start))); }

// Sync duration inputs + clock hints from current slider positions
function syncInputsFromSlider(){
  if(!DATA) return;
  const sTs=tsOf(FS.posL), eTs=tsOf(FS.posR);
  const sOff=sTs-DATA.timeRange.start, eOff=eTs-DATA.timeRange.start;

  const si=document.getElementById('inputStart');
  const ei=document.getElementById('inputEnd');
  si.value=fmtOffset(sOff);
  ei.value=fmtOffset(eOff);
  si.classList.remove('invalid');
  ei.classList.remove('invalid');

  updateClockHint('hintStart', sTs, FS.posL>0.001||FS.posR<0.999);
  updateClockHint('hintEnd',   eTs, FS.posL>0.001||FS.posR<0.999);
}

function updateClockHint(id, ts, active){
  const el=document.getElementById(id);
  el.textContent=fmtT(ts);
  if(active) el.classList.add('active'); else el.classList.remove('active');
}

function getAreaX(e){
  const r=document.getElementById('tfArea').getBoundingClientRect();
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  return Math.max(0,Math.min(1,(cx-r.left)/r.width));
}

function updateSliderUI(){
  const lp=(FS.posL*100).toFixed(2)+'%', rp=(FS.posR*100).toFixed(2)+'%';
  document.getElementById('tfHL').style.left=lp;
  document.getElementById('tfHR').style.left=rp;
  document.getElementById('tfFill').style.left=lp;
  document.getElementById('tfFill').style.width=((FS.posR-FS.posL)*100).toFixed(2)+'%';
  document.getElementById('tfShadeL').style.right=(100-FS.posL*100).toFixed(2)+'%';
  document.getElementById('tfShadeR').style.left=(FS.posR*100).toFixed(2)+'%';
  document.getElementById('tfMid').textContent=fmtT(tsOf(.5));

  const active=FS.posL>0.001||FS.posR<0.999;
  const sTs=tsOf(FS.posL), eTs=tsOf(FS.posR);
  const badge=document.getElementById('tfDurBadge');
  const btn=document.getElementById('tfResetBtn');

  if(active){
    const selDur=eTs-sTs;
    const sOff=sTs-DATA.timeRange.start, eOff=eTs-DATA.timeRange.start;
    badge.textContent=`${fmtOffset(sOff)} → ${fmtOffset(eOff)}  (${fmtDur(selDur)})`;
    badge.classList.add('filtered');
    btn.classList.add('active'); btn.textContent='✕ Reset';
  } else {
    badge.textContent='Full range';
    badge.classList.remove('filtered');
    btn.classList.remove('active'); btn.textContent='Reset';
  }
  drawHisto();
}

function drawHisto(){
  const svg=document.getElementById('tfHisto'), area=document.getElementById('tfArea');
  const W=area.clientWidth||600, H=area.clientHeight||32;
  const data=DATA.tpsAll; if(!data.length)return;
  const maxV=Math.max(...data.map(p=>p.v),1);
  const t0=data[0].t, t1=data[data.length-1].t, tR=t1-t0||1;
  const bw=Math.max(2,W/data.length*0.85);
  const bars=data.map(p=>{
    const x=((p.t-t0)/tR)*W, h=Math.max(2,(p.v/maxV)*(H-5));
    const inR=posOf(p.t)>=FS.posL&&posOf(p.t)<=FS.posR;
    return `<rect x="${x.toFixed(1)}" y="${(H-h-2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${inR?'rgba(57,217,138,.65)':'rgba(57,217,138,.15)'}" rx="1"/>`;
  }).join('');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('width',W); svg.setAttribute('height',H);
  svg.innerHTML=bars;
}

// Drag
document.getElementById('tfHL').addEventListener('mousedown',e=>{e.preventDefault();FS.drag='L';document.getElementById('tfHL').classList.add('drag');});
document.getElementById('tfHR').addEventListener('mousedown',e=>{e.preventDefault();FS.drag='R';document.getElementById('tfHR').classList.add('drag');});
document.getElementById('tfHL').addEventListener('touchstart',e=>{FS.drag='L';document.getElementById('tfHL').classList.add('drag');},{passive:true});
document.getElementById('tfHR').addEventListener('touchstart',e=>{FS.drag='R';document.getElementById('tfHR').classList.add('drag');},{passive:true});
document.addEventListener('mousemove',onDrag); document.addEventListener('touchmove',onDrag,{passive:true});
document.addEventListener('mouseup',endDrag); document.addEventListener('touchend',endDrag);

function onDrag(e){
  if(!FS.drag||!DATA)return;
  const pos=getAreaX(e);
  if(FS.drag==='L') FS.posL=Math.min(pos,FS.posR-0.005);
  else              FS.posR=Math.max(pos,FS.posL+0.005);
  syncInputsFromSlider();
  updateSliderUI();
  clearTimeout(debTimer); debTimer=setTimeout(applyFilter,150);
}
function endDrag(){
  if(!FS.drag)return;
  ['tfHL','tfHR'].forEach(id=>document.getElementById(id).classList.remove('drag'));
  FS.drag=null; clearTimeout(debTimer); applyFilter();
}
document.getElementById('tfArea').addEventListener('click',e=>{
  if(!DATA)return;
  const pos=getAreaX(e), dL=Math.abs(pos-FS.posL), dR=Math.abs(pos-FS.posR);
  if(dL<dR) FS.posL=Math.min(pos,FS.posR-0.005); else FS.posR=Math.max(pos,FS.posL+0.005);
  syncInputsFromSlider(); updateSliderUI(); applyFilter();
});

// ─── Duration input handlers ──────────────────────────────────────────────────

// Live update clock hint as user types
function onDurInput(inputId, hintId){
  if(!DATA) return;
  const el=document.getElementById(inputId);
  const val=el.value.trim();
  const sec=parseHMS(val);
  const hint=document.getElementById(hintId);

  if(val===''||sec===null){
    el.classList.remove('invalid');
    hint.textContent='—'; hint.classList.remove('active');
    return;
  }
  el.classList.remove('invalid');
  // Show actual clock time
  const ts=DATA.timeRange.start + sec*1000;
  const {start,end}=DATA.timeRange;
  if(ts>=start&&ts<=end){
    hint.textContent=fmtT(ts);
    hint.classList.add('active');
  } else {
    hint.textContent=fmtT(Math.max(start,Math.min(end,ts)))+' (clamped)';
    hint.classList.remove('active');
  }
}

function onDurKey(e, inputId){
  if(e.key==='Enter') applyDurInput();
  if(e.key==='Tab'&&inputId==='inputStart'){
    e.preventDefault();
    const ei=document.getElementById('inputEnd');
    ei.focus(); ei.select();
  }
}

function applyDurInput(){
  if(!DATA) return;
  const sEl=document.getElementById('inputStart');
  const eEl=document.getElementById('inputEnd');
  const sSec=parseHMS(sEl.value);
  const eSec=parseHMS(eEl.value);

  let err=false;
  if(sSec===null){ sEl.classList.add('invalid'); err=true; } else sEl.classList.remove('invalid');
  if(eSec===null){ eEl.classList.add('invalid'); err=true; } else eEl.classList.remove('invalid');
  if(err) return;

  const {start,end}=DATA.timeRange;
  let sTs=start+sSec*1000;
  let eTs=start+eSec*1000;

  // Clamp to data range
  sTs=Math.max(sTs,start);
  eTs=Math.min(eTs,end);

  if(sTs>=eTs){ eEl.classList.add('invalid'); return; }

  FS.posL=posOf(sTs);
  FS.posR=posOf(eTs);
  syncInputsFromSlider(); // refresh hints with clamped values
  updateSliderUI();
  applyFilter();
}

function resetFilter(){
  FS.posL=0; FS.posR=1; FLT=null;
  syncInputsFromSlider();
  updateSliderUI();
  renderAll();
}

function applyFilter(){
  if(!DATA) return;
  const active=FS.posL>0.001||FS.posR<0.999;
  if(!active){FLT=null;renderAll();return;}
  const badge=document.getElementById('tfDurBadge');
  const prev=badge.textContent; badge.textContent='Computing…';
  // setTimeout(0) beri browser kesempatan repaint sebelum komputasi berat dimulai
  setTimeout(()=>{
    FLT=recompute(tsOf(FS.posL),tsOf(FS.posR));
    renderAll();
    updateSliderUI();
  },0);
}

// ─── Recompute for time range ─────────────────────────────────────────────────
function recompute(s,e){
  const cb=DATA.clientBuckets;
  const inR=t=>Number(t)>=s&&Number(t)<=e;
  function pct(arr,p){if(!arr.length)return 0;return arr[Math.min(Math.floor(arr.length*p),arr.length-1)];}

  let totalReqs=0,successReqs=0,errorReqs=0,peakRps=0;
  Object.entries(cb.httpReqs).forEach(([t,v])=>{ if(!inR(t))return; totalReqs+=v.ok+v.err; successReqs+=v.ok; errorReqs+=v.err; peakRps=Math.max(peakRps,v.ok+v.err); });

  let durSum=0,durN=0,durMin=Infinity,durMax=-Infinity; const durAvgs=[];
  Object.entries(cb.httpDur).forEach(([t,v])=>{ if(!inR(t))return; durSum+=v.sum; durN+=v.n; if(v.min<durMin)durMin=v.min; if(v.max>durMax)durMax=v.max; if(v.n)durAvgs.push(v.sum/v.n); });
  durAvgs.sort((a,b)=>a-b);

  let apiSum=0,apiN=0; const apiAvgs=[];
  Object.entries(cb.apiDurAll).forEach(([t,v])=>{ if(!inR(t))return; apiSum+=v.sum; apiN+=v.n; if(v.n)apiAvgs.push(v.sum/v.n); });
  apiAvgs.sort((a,b)=>a-b);

  let chkPass=0,chkTotal=0;
  Object.entries(cb.checks).forEach(([t,v])=>{ if(!inR(t))return; chkPass+=v.pass; chkTotal+=v.total; });

  const vusMax=Math.max(0,...(DATA.timeSeries['vus']||[]).filter(p=>p.t>=s&&p.t<=e).map(p=>p.v),0);
  const peakTps=Math.max(0,...Object.entries(cb.trxAllBkts||{}).filter(([t])=>inR(t)).map(([,n])=>n),0);

  const timingAvg={};
  ['http_req_duration','http_req_waiting','http_req_sending','http_req_receiving','http_req_blocked','http_req_connecting','http_req_tls_handshaking'].forEach(m=>{
    let sum=0,n=0; Object.entries(cb.timing[m]||{}).forEach(([t,v])=>{ if(!inR(t))return; sum+=v.sum; n+=v.n; });
    timingAvg[m]={all:{avg:n?sum/n:0}};
  });

  const txTable=DATA.transactions.map(tx=>{
    // Duration stats from trx_duration buckets (1 per iteration = correct)
    const trxB=cb.trxDur?.[tx]||{};
    let sum=0,n=0,mn=Infinity,mx=-Infinity; const vals=[];
    Object.entries(trxB).forEach(([t,v])=>{
      if(!inR(t))return;
      sum+=v.sum; n+=v.n;
      if(v.min<mn)mn=v.min; if(v.max>mx)mx=v.max;
      // push individual bucket values for pct approximation
      for(let i=0;i<v.n;i++) vals.push(v.sum/v.n);
    });
    vals.sort((a,b)=>a-b);
    const sample=n; // trx_duration count = iterations
    // success/error — use per-bucket txCountBkts (time-range aware) to avoid rate > 100%
    let success=0, error=0;
    const bktCounts = cb.txCountBkts?.[tx]||{};
    const hasBktCount = Object.keys(bktCounts).length > 0;
    if(hasBktCount){
      Object.entries(bktCounts).forEach(([t,v])=>{ if(!inR(t)) return; success+=v.pass; error+=v.fail; });
      const bktSample = success + error;
      const finalSample = sample || bktSample;
      return {transaction:tx,min:mn===Infinity?0:mn,avg:finalSample&&n?sum/n:0,max:mx<0?0:mx,
        p90:pct(vals,.9),success,error,sample:finalSample,
        successRate:finalSample?parseFloat((success/finalSample*100).toFixed(1)):0};
    }
    // fallback: estimate from http_reqs ratio
    const rd=(cb.txReq||{})[tx]||{ok:0,err:0};
    const total=rd.ok+rd.err;
    const errRatio=total>0?rd.err/total:0;
    error=Math.round(sample*errRatio); success=sample-error;
    return {transaction:tx,min:mn===Infinity?0:mn,avg:n?sum/n:0,max:mx<0?0:mx,
      p90:pct(vals,.9),success,error,sample,
      successRate:sample?parseFloat((success/sample*100).toFixed(1)):0};
  });

  const apiTable=Object.values(cb.api).map(item=>{
    let ok=0,err=0,sum=0,n=0,mn=Infinity,mx=-Infinity; const avgs=[];
    Object.entries(item.ts).forEach(([t,v])=>{ if(!inR(t))return; ok+=v.ok; err+=v.err; sum+=v.sum; n+=v.n; if(v.min<mn)mn=v.min; if(v.max>mx)mx=v.max; if(v.n)avgs.push(v.sum/v.n); });
    avgs.sort((a,b)=>a-b); const samp=ok+err;
    return {transaction:item.transaction,api:item.api,min:mn===Infinity?0:mn,avg:n?sum/n:0,max:mx<0?0:mx,
      p90:pct(avgs,.9),success:ok,error:err,sample:samp,successRate:samp?parseFloat((ok/samp*100).toFixed(1)):0};
  }).sort((a,b)=>a.transaction.localeCompare(b.transaction)||a.api.localeCompare(b.api));

  const checksTable=Object.entries(cb.checkNames).map(([name,nb])=>{
    let pass=0,total=0; Object.entries(nb).forEach(([t,v])=>{ if(!inR(t))return; pass+=v.pass; total+=v.total; });
    return {check:name,pass,fail:total-pass,total,rate:total?parseFloat((pass/total*100).toFixed(1)):0};
  }).sort((a,b)=>b.total-a.total);

  const fts=arr=>(arr||[]).filter(p=>p.t>=s&&p.t<=e);
  const tpsAll=fts(DATA.tpsAll), allBuckets=tpsAll.map(p=>p.t);
  const rpsAllMap={}; Object.entries(cb.httpReqs).forEach(([t,v])=>{ if(inR(t))rpsAllMap[Number(t)]=v.ok; });
  const rpsAll=allBuckets.map(t=>({t,v:rpsAllMap[t]||0}));

  const tpsByTx={},rpsByApi={};
  DATA.transactions.forEach(tx=>{
    const trxB=cb.trxPerBkt?.[tx]||{};
    tpsByTx[tx]=allBuckets.map(t=>({t,v:trxB[t]||0}));
  });
  DATA.apis.forEach(api=>{ const key=Object.keys(cb.api).find(k=>k.endsWith('|||'+api)); rpsByApi[api]=allBuckets.map(t=>({t,v:key?(cb.api[key].ts[t]?.ok||0):0})); });

  const txResponseTimeAll=allBuckets.map(t=>{ const v=cb.apiDurAll[t]; return {t,v:v&&v.n?v.sum/v.n:null}; });
  const txResponseTime={};
  DATA.transactions.forEach(tx=>{ const txB=cb.trxDur?.[tx]||{}; txResponseTime[tx]=allBuckets.map(t=>{ const v=txB[t]; return {t,v:v&&v.n?v.sum/v.n:null}; }); });
  const apiResponseTimeAll=fts(DATA.apiResponseTimeAll);
  const apiResponseTime={};
  DATA.apis.forEach(api=>{ apiResponseTime[api]=fts(DATA.apiResponseTime[api]||[]); });
  const checksTimeSeries=fts(DATA.checksTimeSeries);

  return {
    ...DATA,
    statCards:{...DATA.statCards,totalReqs,successReqs,errorReqs,
      errorPct:totalReqs?parseFloat((errorReqs/totalReqs*100).toFixed(2)):0,
      peakRps,peakTps,avgApiDur:apiN?apiSum/apiN:0,p90ApiDur:pct(apiAvgs,.9),
      avgDuration:durN?durSum/durN:0,p90Duration:pct(durAvgs,.9),p95Duration:pct(durAvgs,.95),
      p99Duration:pct(durAvgs,.99),maxDuration:durMax<0?0:durMax,minDuration:durMin===Infinity?0:durMin,
      checksSuccessRate:chkTotal?parseFloat((chkPass/chkTotal*100).toFixed(1)):0,vusMax},
    timeSeries:Object.fromEntries(Object.entries(DATA.timeSeries).map(([k,v])=>[k,fts(v)])),
    tpsAll,rpsAll,allBuckets,tpsByTx,rpsByApi,
    txResponseTime,txResponseTimeAll,apiResponseTime,apiResponseTimeAll,
    checksTimeSeries,txTable,apiTable,checksTable,timingAvg,
    timeRange:{start:s,end:e},
  };
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderAll(){
  renderStats(); renderOverview(); renderVuChart(); renderTpsOv(); renderRpsOv(); renderTps(); renderRps(); renderTxRt(); renderApiRt();
  renderTimingBars(); renderLatStats(); renderReqRate(); renderLatTimings(); renderTransfer();
  renderChecksTable(); renderChecksChart(); renderTxTable(); renderApiTable();
  renderTpsStat(); renderRpsStat();
}

function renderStats(){
  const sc=D().statCards;
  const sp=sc.totalReqs?(sc.successReqs/sc.totalReqs*100).toFixed(1):0;
  document.getElementById('sr1').innerHTML=`
    <div class="sc"><div class="sc-label">Total Requests</div><div class="sc-val cb">${fmtN(sc.totalReqs)}</div><div class="sc-sub">VUs max: ${sc.vusMax}</div></div>
    <div class="sc"><div class="sc-label">Success</div><div class="sc-val cg">${fmtN(sc.successReqs)}</div><div class="sc-sub">${sp}% success</div></div>
    <div class="sc"><div class="sc-label">Error</div><div class="sc-val cr">${fmtN(sc.errorReqs)}</div><div class="sc-sub">${sc.errorPct}% error</div></div>
    <div class="sc"><div class="sc-label">Peak RPS</div><div class="sc-val co">${fmtN(sc.peakRps)}</div><div class="sc-sub">req/s max</div></div>
    <div class="sc"><div class="sc-label">Avg Duration</div><div class="sc-val cc">${fmtMs(sc.avgDuration)}</div><div class="sc-sub">p90: ${fmtMs(sc.p90Duration)}</div></div>
    <div class="sc"><div class="sc-label">p95 Duration</div><div class="sc-val cp">${fmtMs(sc.p95Duration)}</div><div class="sc-sub">p99: ${fmtMs(sc.p99Duration)}</div></div>
    <div class="sc"><div class="sc-label">Max Duration</div><div class="sc-val cr">${fmtMs(sc.maxDuration)}</div><div class="sc-sub">min: ${fmtMs(sc.minDuration)}</div></div>`;
  document.getElementById('sr2').innerHTML=`
    <div class="sc checks-sc" style="grid-column:span 2"><div class="sc-label">Checks Success Rate</div><div class="sc-val">${sc.checksSuccessRate}%</div><div class="sc-sub">aggregate all checks</div></div>
    <div class="sc"><div class="sc-label">Peak TPS</div><div class="sc-val cy">${fmtN(sc.peakTps)}</div><div class="sc-sub">trans/s max</div></div>
    <div class="sc"><div class="sc-label">Avg API Duration</div><div class="sc-val cp">${fmtMs(sc.avgApiDur)}</div><div class="sc-sub">p90: ${fmtMs(sc.p90ApiDur)}</div></div>`;
}

function renderOverview(){
  destroyChart('ov');
  const d=D(), durTs=d.timeSeries['http_req_duration']||[], vusTs=d.timeSeries['vus']||[], reqTs=d.tpsAll||[];
  const ep=d.statCards.totalReqs?d.statCards.errorReqs/d.statCards.totalReqs:0;
  const tSet=[...new Set([...durTs,...vusTs,...reqTs].map(p=>p.t))].sort((a,b)=>a-b);
  const mapV=ser=>{const m=Object.fromEntries(ser.map(p=>[p.t,p.v]));return tSet.map(t=>m[t]??null);};
  const opts=baseOpts();
  opts.scales.y1={position:'right',ticks:{color:'#4a5070',font:{family:'Consolas',size:10}},grid:{drawOnChartArea:false}};
  opts.scales.y2={position:'right',display:false};
  opts.plugins.legend={display:true,labels:{color:'#4a5070',font:{family:'Consolas',size:10},boxWidth:10,padding:14}};
  CH['ov']=new Chart(document.getElementById('cOverview').getContext('2d'),{type:'line',data:{labels:tSet.map(fmtT),datasets:[
    ds('http_req_duration (ms)',mapV(durTs),'#4f9dff',{fill:true,w:2}),
    {...ds('vus',mapV(vusTs),'#ff4c6a',{w:2}),yAxisID:'y1'},
    {...ds('RPS',reqTs.map(p=>p.v),'#39d98a',{dash:[5,3]}),yAxisID:'y2'},
    {...ds('Errors/s',reqTs.map(p=>+(p.v*ep).toFixed(3)),'#ff4c6a',{dash:[5,3]}),yAxisID:'y2'},
  ]},options:opts});
}
function renderTpsOv(){
  destroyChart('tpsov');
  const d=D(), lbl=d.allBuckets.map(fmtT);
  const opts=baseOpts(); opts.scales.y.min=0;
  CH['tpsov']=new Chart(document.getElementById('cTpsOv').getContext('2d'),{type:'line',
    data:{labels:lbl,datasets:[{...ds('TPS Overall',d.tpsAll.map(p=>p.v),'#22d3ee',{fill:true,w:2})}]},
    options:opts});
}
function renderRpsOv(){
  destroyChart('rpsov');
  const d=D(), lbl=d.allBuckets.map(fmtT);
  const opts=baseOpts(); opts.scales.y.min=0;
  CH['rpsov']=new Chart(document.getElementById('cRpsOv').getContext('2d'),{type:'line',
    data:{labels:lbl,datasets:[{...ds('RPS Overall',d.rpsAll.map(p=>p.v),'#39d98a',{fill:true,w:2})}]},
    options:opts});
}
function renderTps(){
  destroyChart('tps');
  const d=D(), lbl=d.allBuckets.map(fmtT);
  const txs=getActiveTx();
  const dsets=[];
  txs.slice(0,12).forEach((tx,i)=>{ const s=d.tpsByTx[tx]||[]; dsets.push(ds(tx,s.map(p=>p.v),PAL[i%PAL.length])); });
  const opts=baseOpts(); opts.plugins.legend={display:false};
  CH['tps']=new Chart(document.getElementById('cTps').getContext('2d'),{type:'line',data:{labels:lbl,datasets:dsets},options:opts});
  makeLeg(document.getElementById('legTps'),txs.slice(0,12).map((tx,i)=>({l:tx,c:PAL[i%PAL.length]})));
}
function renderRps(){
  destroyChart('rps');
  const d=D(), lbl=d.allBuckets.map(fmtT);
  const activeApis=getActiveApis();
  const dsets=[];
  activeApis.slice(0,12).forEach((api,i)=>{ const s=d.rpsByApi[api]||[]; dsets.push(ds(api,s.map(p=>p.v),PAL[i%PAL.length])); });
  CH['rps']=new Chart(document.getElementById('cRps').getContext('2d'),{type:'line',data:{labels:lbl,datasets:dsets},options:baseOpts()});
  makeLeg(document.getElementById('legRps'),activeApis.slice(0,12).map((api,i)=>({l:api,c:PAL[i%PAL.length]})));
}
function renderTxRt(){
  destroyChart('txrt');
  const d=D(), lbl=d.allBuckets.map(fmtT);
  const txs=getActiveTx();
  const dsets=[{...ds('Avg (all)',d.txResponseTimeAll.map(p=>p?.v??null),'#ffaa3b',{fill:true,w:2.5})}];
  txs.slice(0,8).forEach((tx,i)=>{ const s=d.txResponseTime[tx]||[]; dsets.push(ds(tx,s.map(p=>p?.v??null),PAL[i])); });
  CH['txrt']=new Chart(document.getElementById('cTxRt').getContext('2d'),{type:'line',data:{labels:lbl,datasets:dsets},options:baseOpts('ms')});
  makeLeg(document.getElementById('legTxRt'),[{l:'Overall',c:'#ffaa3b'},...txs.slice(0,8).map((tx,i)=>({l:tx,c:PAL[i]}))]);
}
function renderApiRt(){
  destroyChart('apirt');
  const d=D(), lbl=d.allBuckets.map(fmtT);
  const activeApis=getActiveApis();
  const dsets=[{...ds('Avg (all)',d.apiResponseTimeAll.map(p=>p?.v??null),'#a78bfa',{fill:true,w:2.5})}];
  activeApis.slice(0,8).forEach((api,i)=>{ const s=d.apiResponseTime[api]||[]; dsets.push(ds(api,s.map(p=>p?.v??null),PAL[i+1])); });
  CH['apirt']=new Chart(document.getElementById('cApiRt').getContext('2d'),{type:'line',data:{labels:lbl,datasets:dsets},options:baseOpts('ms')});
  makeLeg(document.getElementById('legApiRt'),[{l:'Overall',c:'#a78bfa'},...activeApis.slice(0,8).map((api,i)=>({l:api,c:PAL[i+1]}))]);
}
function renderTimingBars(){
  const mets=['http_req_duration','http_req_waiting','http_req_sending','http_req_receiving','http_req_blocked','http_req_connecting','http_req_tls_handshaking'];
  const lbls=['Duration','Waiting','Sending','Receiving','Blocked','Connecting','TLS'];
  const cols=['#4f9dff','#a78bfa','#39d98a','#22d3ee','#ffaa3b','#fde047','#f472b6'];
  const avgs=mets.map(m=>D().timingAvg[m]?.all?.avg||0), maxV=Math.max(...avgs,1);
  document.getElementById('timingBars').innerHTML=mets.map((m,i)=>{
    const v=avgs[i],p=Math.min(v/maxV*100,100).toFixed(1);
    return `<div class="tbr"><div class="tbl">${lbls[i]}</div><div class="tbv">${fmtMs(v)}</div><div class="tbw"><div class="tbb" style="width:${p}%;background:${cols[i]}"></div></div></div>`;
  }).join('');
}
function renderLatStats(){
  destroyChart('ls');
  const d=D(), durTs=d.timeSeries['http_req_duration']||[];
  const sr=d.statCards.totalReqs?d.statCards.successReqs/d.statCards.totalReqs:1, er=1-sr;
  const opts=baseOpts('ms'); opts.plugins.legend={display:true,labels:{color:'#4a5070',font:{family:'Consolas',size:10},boxWidth:8,padding:10}};
  CH['ls']=new Chart(document.getElementById('cLatStats').getContext('2d'),{type:'line',data:{labels:durTs.map(p=>fmtT(p.t)),datasets:[
    ds('All',durTs.map(p=>p.v),'#fde047'),ds('Success',durTs.map(p=>+(p.v*sr).toFixed(2)),'#39d98a'),ds('Error',durTs.map(p=>+(p.v*er).toFixed(2)),'#ff4c6a',{dash:[4,3]}),
  ]},options:opts});
}
function renderReqRate(){
  destroyChart('rr');
  const d=D(); const sr=d.statCards.totalReqs?d.statCards.successReqs/d.statCards.totalReqs:1, er=1-sr;
  const opts=baseOpts('req/s'); opts.plugins.legend={display:true,labels:{color:'#4a5070',font:{family:'Consolas',size:10},boxWidth:8,padding:10}};
  CH['rr']=new Chart(document.getElementById('cReqRate').getContext('2d'),{type:'line',data:{labels:d.tpsAll.map(p=>fmtT(p.t)),datasets:[
    ds('Total',d.tpsAll.map(p=>p.v),'#ffaa3b',{dash:[5,3]}),ds('Success',d.tpsAll.map(p=>+(p.v*sr).toFixed(2)),'#39d98a',{dash:[5,3]}),ds('Errors',d.tpsAll.map(p=>+(p.v*er).toFixed(2)),'#ff4c6a',{dash:[5,3]}),
  ]},options:opts});
}
function renderLatTimings(){
  destroyChart('lt');
  const d=D();
  const mets=['http_req_duration','http_req_waiting','http_req_sending','http_req_receiving','http_req_blocked'];
  const cols=['#4f9dff','#a78bfa','#39d98a','#22d3ee','#ffaa3b'];
  const lbls=['duration','waiting','sending','receiving','blocked'];
  const allTs=[...new Set(mets.flatMap(m=>(d.timeSeries[m]||[]).map(p=>p.t)))].sort((a,b)=>a-b);
  const dsets=mets.map((m,i)=>{ const mp=Object.fromEntries((d.timeSeries[m]||[]).map(p=>[p.t,p.v])); return ds(lbls[i],allTs.map(t=>mp[t]??null),cols[i]); });
  const opts=baseOpts('ms'); opts.plugins.legend={display:true,labels:{color:'#4a5070',font:{family:'Consolas',size:10},boxWidth:8,padding:10}};
  CH['lt']=new Chart(document.getElementById('cLatTimings').getContext('2d'),{type:'line',data:{labels:allTs.map(fmtT),datasets:dsets},options:opts});
}
function renderTransfer(){
  destroyChart('tr');
  const d=D(), sTs=d.timeSeries['data_sent']||[], rTs=d.timeSeries['data_received']||[];
  const allTs=[...new Set([...sTs,...rTs].map(p=>p.t))].sort((a,b)=>a-b);
  const mv=s=>{ const m=Object.fromEntries(s.map(p=>[p.t,p.v])); return allTs.map(t=>m[t]??null); };
  const opts=baseOpts('B/s'); opts.plugins.legend={display:true,labels:{color:'#4a5070',font:{family:'Consolas',size:10},boxWidth:8,padding:10}};
  CH['tr']=new Chart(document.getElementById('cTransfer').getContext('2d'),{type:'line',data:{labels:allTs.map(fmtT),datasets:[ds('data_sent',mv(sTs),'#ffaa3b',{fill:true}),ds('data_received',mv(rTs),'#39d98a',{fill:true})]},options:opts});
}
function renderChecksTable(){
  const rows=applySort(D().checksTable,'tblChecks');
  document.querySelector('#tblChecks tbody').innerHTML=
    rows.map(r=>`<tr><td title="${r.check}">${r.check}</td><td class="r cg">${r.pass}</td><td class="r ${r.fail>0?'cr':''}">${r.fail}</td><td class="r">${r.total}</td><td class="r"><span class="pill ${r.rate>=100?'pg':r.rate>=90?'po':'pr'}">${r.rate}%</span></td></tr>`).join('')
    ||'<tr><td colspan="5" style="color:var(--muted);padding:16px;text-align:center">No checks data</td></tr>';
  updateSortIndicators('tblChecks');
}
function renderChecksChart(){
  destroyChart('cc');
  const ser=D().checksTimeSeries;
  const opts=baseOpts('%'); opts.scales.y.min=0; opts.scales.y.max=100;
  CH['cc']=new Chart(document.getElementById('cChecks').getContext('2d'),{type:'line',data:{labels:ser.map(p=>fmtT(p.t)),datasets:[ds('Success Rate %',ser.map(p=>p.v),'#39d98a',{fill:true,w:2})]},options:opts});
}
function renderTxTable(){
  const q=(document.getElementById('txSearch')?.value||'').toLowerCase();
  const txs=new Set(getActiveTx());
  const filtered=D().txTable.filter(r=>{
    if(!txs.has(r.transaction)) return false;
    if(q && !r.transaction.toLowerCase().includes(q)) return false;
    return true;
  });
  const rows=applySort(filtered,'tblTx');
  document.querySelector('#tblTx tbody').innerHTML=
    rows.map(r=>`<tr>
      <td><strong>${r.transaction}</strong></td>
      <td class="r">${fmtS(r.min)}</td><td class="r">${fmtS(r.avg)}</td>
      <td class="r">${fmtS(r.max)}</td><td class="r">${fmtS(r.p90)}</td>
      <td class="r cg">${r.success}</td><td class="r ${r.error>0?'cr':''}">${r.error}</td>
      <td class="r">${r.sample}</td>
      <td class="r"><span class="pill ${r.successRate>=99?'pg':r.successRate>=90?'pb':'pr'}">${r.successRate}%</span></td>
    </tr>`).join('')
    ||'<tr><td colspan="9" style="color:var(--muted);padding:16px;text-align:center">No transaction data</td></tr>';
  updateSortIndicators('tblTx');
}
function renderApiFilter(){
  document.getElementById('apiFilter').innerHTML=
    '<option value="">All Transactions</option>'+(DATA?.transactions||[]).map(tx=>`<option value="${tx}">${tx}</option>`).join('');
}
function renderApiTable(){
  const f=document.getElementById('apiFilter').value;
  const q=(document.getElementById('apiSearch')?.value||'').toLowerCase();
  const txs=new Set(getActiveTx());
  const filtered=D().apiTable.filter(r=>{
    if(GRP && !txs.has(r.transaction)) return false;
    if(f && r.transaction!==f) return false;
    if(q && !r.api.toLowerCase().includes(q)) return false;
    return true;
  });
  const rows=applySort(filtered,'tblApi');
  document.querySelector('#tblApi tbody').innerHTML=
    rows.map(r=>`<tr>
      <td style="color:var(--muted)" title="${r.transaction}">${r.transaction}</td>
      <td title="${r.api}"><strong>${r.api}</strong></td>
      <td class="r">${fmtS(r.min)}</td><td class="r">${fmtS(r.avg)}</td>
      <td class="r">${fmtS(r.max)}</td><td class="r">${fmtS(r.p90)}</td>
      <td class="r cg">${r.success}</td><td class="r ${r.error>0?'cr':''}">${r.error}</td>
      <td class="r">${r.sample}</td>
      <td class="r"><span class="pill ${r.successRate>=99?'pg':r.successRate>=90?'pb':'pr'}">${r.successRate}%</span></td>
    </tr>`).join('')
    ||'<tr><td colspan="10" style="color:var(--muted);padding:16px;text-align:center">No API data</td></tr>';
  updateSortIndicators('tblApi');
}

// ─── Group Filter ─────────────────────────────────────────────────────────────
function initGroupFilter(){
  const groups=DATA?.groups||[];
  const wrap=document.getElementById('groupFilterWrap');
  const sel=document.getElementById('groupFilter');
  if(!groups.length){ wrap.style.display='none'; GRP=''; return; }
  wrap.style.display='flex';
  sel.innerHTML='<option value="">All Groups</option>'+groups.map(g=>`<option value="${g}">${g.replace(/^:+/,'')}</option>`).join('');
  sel.value=GRP;
}
function applyGroupFilter(){
  GRP=document.getElementById('groupFilter').value;
  renderAll();
}
function getActiveTx(){
  if(!GRP) return D().transactions;
  const txMap=DATA.txToGroup||{};
  return D().transactions.filter(tx=>txMap[tx]===GRP);
}
function getActiveApis(){
  if(!GRP) return D().apis;
  const txs=new Set(getActiveTx());
  const seen=new Set(); const result=[];
  Object.values(DATA.clientBuckets?.api||{}).forEach(item=>{
    if(txs.has(item.transaction)&&!seen.has(item.api)){ seen.add(item.api); result.push(item.api); }
  });
  return result.sort();
}

// ─── VU Progression chart ────────────────────────────────────────────────────
function renderVuChart(){
  destroyChart('vu');
  const d=D(), ser=d.timeSeries['vus']||[];
  if(!ser.length) return;
  const opts=baseOpts(); opts.scales.y.min=0;
  opts.plugins.tooltip.callbacks.label=ctx=>` VUs: ${Math.round(ctx.parsed.y)}`;
  CH['vu']=new Chart(document.getElementById('cVu').getContext('2d'),{
    type:'line',
    data:{labels:ser.map(p=>fmtT(p.t)),datasets:[{...ds('VUs',ser.map(p=>p.v),'#ff4c6a',{fill:true,w:2})}]},
    options:opts
  });
}

// ─── TPS / RPS stat tables ────────────────────────────────────────────────────
function renderTpsStat(){
  const d=D(), txs=getActiveTx();
  const ovPts=d.tpsAll.map(p=>p.v).filter(v=>v>0);
  const ovRow=ovPts.length?{min:Math.min(...ovPts),avg:ovPts.reduce((a,v)=>a+v,0)/ovPts.length,max:Math.max(...ovPts)}:null;
  const rows=txs.map(tx=>{
    const pts=(d.tpsByTx[tx]||[]).map(p=>p.v).filter(v=>v>0);
    if(!pts.length) return null;
    const sum=pts.reduce((a,v)=>a+v,0);
    return {tx,min:Math.min(...pts),avg:sum/pts.length,max:Math.max(...pts)};
  }).filter(Boolean);
  const ovHtml=ovRow?`<tr style="border-bottom:2px solid var(--border2)"><td><strong class="cc">Overall</strong></td><td class="r cc">${ovRow.min.toFixed(2)}</td><td class="r cc">${ovRow.avg.toFixed(2)}</td><td class="r cc">${ovRow.max.toFixed(2)}</td></tr>`:'';
  const sorted=applySort(rows,'tblTpsStat');
  document.querySelector('#tblTpsStat tbody').innerHTML=
    ovHtml+sorted.map(r=>`<tr><td><strong>${r.tx}</strong></td><td class="r">${r.min.toFixed(2)}</td><td class="r">${r.avg.toFixed(2)}</td><td class="r">${r.max.toFixed(2)}</td></tr>`).join('')
    ||'<tr><td colspan="4" style="color:var(--muted);padding:16px;text-align:center">No TPS data</td></tr>';
  updateSortIndicators('tblTpsStat');
}
function renderRpsStat(){
  const d=D(), cb=DATA.clientBuckets;
  const {start,end}=d.timeRange;
  const inR=t=>Number(t)>=start&&Number(t)<=end;
  const txs=new Set(getActiveTx());
  const ovPts=d.rpsAll.map(p=>p.v).filter(v=>v>0);
  const ovRow=ovPts.length?{min:Math.min(...ovPts),avg:ovPts.reduce((a,v)=>a+v,0)/ovPts.length,max:Math.max(...ovPts)}:null;
  const rows=[];
  Object.values(cb.api).forEach(item=>{
    if(GRP&&!txs.has(item.transaction)) return;
    const pts=[];
    Object.entries(item.ts).forEach(([t,v])=>{ if(inR(t)&&v.ok>0) pts.push(v.ok); });
    if(!pts.length) return;
    const sum=pts.reduce((a,v)=>a+v,0);
    rows.push({tx:item.transaction,api:item.api,min:Math.min(...pts),avg:sum/pts.length,max:Math.max(...pts)});
  });
  if(!TABLE_SORT['tblRpsStat']) rows.sort((a,b)=>a.tx.localeCompare(b.tx)||a.api.localeCompare(b.api));
  const ovHtml=ovRow?`<tr style="border-bottom:2px solid var(--border2)"><td><strong class="cc">Overall</strong></td><td style="color:var(--muted)">—</td><td class="r cc">${ovRow.min.toFixed(2)}</td><td class="r cc">${ovRow.avg.toFixed(2)}</td><td class="r cc">${ovRow.max.toFixed(2)}</td></tr>`:'';
  const sorted=applySort(rows,'tblRpsStat');
  document.querySelector('#tblRpsStat tbody').innerHTML=
    ovHtml+sorted.map(r=>`<tr><td style="color:var(--muted)">${r.tx}</td><td><strong>${r.api}</strong></td><td class="r">${r.min.toFixed(2)}</td><td class="r">${r.avg.toFixed(2)}</td><td class="r">${r.max.toFixed(2)}</td></tr>`).join('')
    ||'<tr><td colspan="5" style="color:var(--muted);padding:16px;text-align:center">No RPS data</td></tr>';
  updateSortIndicators('tblRpsStat');
}

// ─── Export to CSV ────────────────────────────────────────────────────────────
function exportTableToCSV(tableId, filename){
  const tbl=document.getElementById(tableId); if(!tbl) return;
  const rows=[...tbl.querySelectorAll('tr')];
  const csv=rows.map(r=>[...r.querySelectorAll('th,td')].map(c=>{ const t=c.innerText.replace(/"/g,'""'); return `"${t}"`; }).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=(filename||tableId)+'.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
}

window.addEventListener('resize',()=>{ if(DATA){drawHisto();updateSliderUI();} });

// ─── Chart Modal / Fullscreen ─────────────────────────────────────────────────
const CHART_PANELS=[
  {id:'cOverview',   file:'overview'},
  {id:'cVu',         file:'vu_progression'},
  {id:'cTpsOv',      file:'tps_overall'},
  {id:'cRpsOv',      file:'rps_overall'},
  {id:'cTps',        file:'tps_by_transaction'},
  {id:'cRps',        file:'rps_by_api'},
  {id:'cTxRt',       file:'tx_response_time'},
  {id:'cApiRt',      file:'api_response_time'},
  {id:'cLatStats',   file:'latency_stats'},
  {id:'cReqRate',    file:'request_rate'},
  {id:'cLatTimings', file:'latency_timings'},
  {id:'cTransfer',   file:'transfer_rate'},
  {id:'cChecks',     file:'checks'},
];

let _modalChart=null, _modalTitle='', _modalFile='';

function openChartModal(srcId, file, title){
  const src=document.getElementById(srcId); if(!src) return;
  const srcChart=Chart.getChart(src); if(!srcChart) return;

  _modalTitle=title||''; _modalFile=file||srcId;
  document.getElementById('modalTitle').textContent=_modalTitle;
  document.getElementById('chartModal').classList.add('open');
  document.body.style.overflow='hidden';

  if(_modalChart){ _modalChart.destroy(); _modalChart=null; }

  // Clone data (arrays only, no functions)
  const data={
    labels: srcChart.data.labels ? [...srcChart.data.labels] : [],
    datasets: srcChart.data.datasets.map(d=>({...d, data:[...d.data]})),
  };

  // Fresh options — keep axis unit hint from src chart if present
  const unitHint=srcChart.options?.scales?.y?.ticks?._unit||'';
  const opts=baseOpts(unitHint);
  opts.animation=false;
  opts.responsive=true;
  opts.maintainAspectRatio=false;
  // Restore legend if source had it
  if(srcChart.options?.plugins?.legend?.display){
    opts.plugins.legend=JSON.parse(JSON.stringify(srcChart.options.plugins.legend));
  }

  _modalChart=new Chart(document.getElementById('cModal'),{
    type: srcChart.config.type,
    data, options: opts,
  });
}

function closeChartModal(){
  document.getElementById('chartModal').classList.remove('open');
  document.body.style.overflow='';
  if(_modalChart){ _modalChart.destroy(); _modalChart=null; }
}

function onModalBgClick(e){
  if(e.target===document.getElementById('chartModal')) closeChartModal();
}

function downloadModalPNG(){
  const canvas=document.getElementById('cModal'); if(!canvas) return;
  const isLight=document.documentElement.getAttribute('data-theme')==='light';
  const PAD=_modalTitle?28:0;
  const tmp=document.createElement('canvas');
  tmp.width=canvas.width; tmp.height=canvas.height+PAD;
  const ctx=tmp.getContext('2d');
  ctx.fillStyle=isLight?'#ffffff':'#0f1119';
  ctx.fillRect(0,0,tmp.width,tmp.height);
  if(_modalTitle){
    ctx.fillStyle=isLight?'#7880a0':'#8892b0';
    ctx.font='bold 11px Consolas,monospace';
    ctx.fillText(_modalTitle.toUpperCase(),12,17);
  }
  ctx.drawImage(canvas,0,PAD);
  const a=document.createElement('a');
  a.href=tmp.toDataURL('image/png');
  a.download=_modalFile+'.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ESC to close modal
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeChartModal(); });

function initChartExportButtons(){
  CHART_PANELS.forEach(({id,file})=>{
    const canvas=document.getElementById(id); if(!canvas) return;
    const pt=canvas.closest('.panel')?.querySelector('.pt'); if(!pt) return;
    if(pt.querySelector('.btn-fs')) return;
    const title=[...pt.childNodes]
      .filter(n=>n.nodeType===Node.TEXT_NODE)
      .map(n=>n.textContent.trim()).join(' ').trim();
    const btn=document.createElement('button');
    btn.className='btn-fs'; btn.textContent='⛶';
    btn.title='Fullscreen';
    btn.onclick=()=>openChartModal(id,file,title);
    pt.appendChild(btn);
  });
}

// ─── Dark / Light Theme ───────────────────────────────────────────────────────
function toggleTheme(){
  const html=document.documentElement;
  const next=html.getAttribute('data-theme')==='light'?'dark':'light';
  applyTheme(next);
  localStorage.setItem('k6-theme',next);
}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  const btn=document.getElementById('btnTheme');
  if(btn) btn.textContent=t==='light'?'Dark':'Light';
}
// Restore saved theme on load
(()=>{ const t=localStorage.getItem('k6-theme')||'dark'; applyTheme(t); })();
