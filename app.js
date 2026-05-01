// app.js — Main application logic
// REQUIERE type="module" en el <script> del index.html

import {
  db, initDB,
  getAllTrades, addTrade, updateTrade, deleteTrade,
  getAllNotes, addNote, deleteNote
} from './db.js';

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
  trades: [],
  notes: [],
  charts: {},
  editingTradeId: null,
  currentTab: 'dashboard',
  historyFilters: { strategy: '', result: '', dateFrom: '', dateTo: '' }
};

// ── BOOT ─────────────────────────────────────────────────────────────────────
async function boot() {
  // initDB ahora maneja todo: carga el addon, abre la DB y espera a que esté lista
  await initDB();
  console.log('[boot] db.cloud:', db.cloud ? 'disponible ✓' : 'no disponible (solo local)');

  // Ahora sí db.cloud está disponible (o no, pero ya lo sabemos)
  bindCloudUI();
  await loadData();
  bindNav();
  bindTradeForm();
  bindEditModal();
  bindNoteForm();
  bindMonthYearFilter();
  bindHistoryFilters();
  renderAll();
}

async function loadData() {
  state.trades = await getAllTrades();
  state.notes  = await getAllNotes();
}

function renderAll() {
  renderDashboard();
  renderHistory();
  renderAnalytics();
  renderNotes();
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      state.currentTab = tab;
      if (tab === 'dashboard') renderDashboard();
      if (tab === 'analytics') renderAnalytics();
    });
  });
}

// ── METRICS ───────────────────────────────────────────────────────────────────
function computeMetrics(trades) {
  const totalPnl   = trades.reduce((s, t) => s + t.pnl, 0);
  const totalCount = trades.length;
  const decisive   = trades.filter(t => t.result === 'TP' || t.result === 'SL');
  const wins       = decisive.filter(t => t.result === 'TP');
  const losses     = decisive.filter(t => t.result === 'SL');
  const winRate    = decisive.length > 0 ? wins.length / decisive.length : null;
  const lossRate   = winRate !== null ? 1 - winRate : null;
  const avgWin     = wins.length   > 0 ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
  const avgLoss    = losses.length > 0 ? Math.abs(losses.reduce((s,t)=>s+t.pnl,0)/losses.length) : 0;
  const ev         = winRate !== null ? (winRate*avgWin)-(lossRate*avgLoss) : null;

  let bestStreak=0, worstStreak=0, curTP=0, curSL=0;
  const sorted = [...trades].sort((a,b)=>new Date(a.date)-new Date(b.date));
  for (const t of sorted) {
    if (t.result==='TP')      { curTP++; curSL=0; bestStreak=Math.max(bestStreak,curTP); }
    else if (t.result==='SL') { curSL++; curTP=0; worstStreak=Math.max(worstStreak,curSL); }
    else                      { curTP=0; curSL=0; }
  }
  return { totalPnl, totalCount, winRate, ev, bestStreak, worstStreak, decisive, wins, losses };
}

function equitySeries(trades) {
  const sorted = [...trades].sort((a,b)=>
    new Date(a.date+'T'+(a.createdAt||'00:00:00'))-new Date(b.date+'T'+(b.createdAt||'00:00:00')));
  let eq = 0;
  return sorted.map(t=>({date:t.date,pnl:t.pnl,equity:(eq+=t.pnl),symbol:t.symbol,result:t.result}));
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const m = computeMetrics(state.trades);
  document.getElementById('stat-pnl').textContent   = fmtPnl(m.totalPnl);
  document.getElementById('stat-pnl').className     = 'card-value '+colorClass(m.totalPnl);
  document.getElementById('stat-wr').textContent    = m.winRate!==null?fmtPct(m.winRate):'N/A';
  document.getElementById('stat-wr').className      = 'card-value '+(m.winRate!==null?colorClass(m.winRate-0.5):'neutral');
  document.getElementById('stat-ev').textContent    = m.ev!==null?fmtPnl(m.ev):'N/A';
  document.getElementById('stat-ev').className      = 'card-value '+(m.ev!==null?colorClass(m.ev):'neutral');
  document.getElementById('stat-total').textContent = m.totalCount;
  document.getElementById('stat-best').textContent  = m.bestStreak;
  document.getElementById('stat-worst').textContent = m.worstStreak;

  const series = equitySeries(state.trades);
  renderEquityChart(series);

  const recent = [...state.trades].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  const container = document.getElementById('recent-trades');
  if (recent.length===0) {
    container.innerHTML='<div class="empty-state"><div class="empty-state-icon">📊</div>No hay trades aún</div>';
    return;
  }
  container.innerHTML = recent.map(t=>`
    <div class="recent-item">
      <span class="recent-symbol">${esc(t.symbol)}</span>
      <span class="badge ${t.side==='BUY'?'badge-buy':'badge-sell'}">${t.side}</span>
      <span class="badge ${badgeResult(t.result)}">${t.result}</span>
      <span class="recent-date">${fmtDate(t.date)}</span>
      <span class="recent-pnl ${colorClass(t.pnl)}">${fmtPnl(t.pnl)}</span>
    </div>`).join('');
}

function renderEquityChart(series) {
  const ctx = document.getElementById('chart-equity');
  if (!ctx) return;
  destroyChart('equity');
  if (series.length===0) { ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height); return; }
  const chartLabels = ['Inicio',...series.map(s=>s.date)];
  const chartData   = [0,...series.map(s=>s.equity)];
  const pointColors = ['#4caf50',...series.map(s=>s.equity>=0?'#4caf50':'#f44336')];
  state.charts.equity = new Chart(ctx, {
    type:'line',
    data:{ labels:chartLabels, datasets:[{ label:'Equity', data:chartData,
      borderColor:'#4caf50', backgroundColor:'rgba(76,175,80,.08)', borderWidth:2,
      fill:true, tension:.35, pointRadius:series.length>60?0:3, pointHoverRadius:5,
      pointBackgroundColor:pointColors }]},
    options:{ responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{ legend:{display:false},
        tooltip:{ callbacks:{
          title:items=>items[0].label==='Inicio'?'Inicio':'Fecha: '+items[0].label,
          label:item=>' Equity: '+fmtPnl(item.raw),
          afterLabel:(item)=>{ if(item.dataIndex===0)return''; const p=series[item.dataIndex-1];
            return ` ${p.symbol} ${p.result}  P&L: ${fmtPnl(p.pnl)}`; }},
          backgroundColor:'#1e1e1e',titleColor:'#888',bodyColor:'#f0f0f0',borderColor:'#2e2e2e',borderWidth:1}},
      scales:{
        x:{ticks:{color:'#888',maxTicksLimit:8,font:{size:11}},grid:{color:'#1e1e1e'}},
        y:{ticks:{color:'#888',font:{size:11},callback:v=>fmtPnl(v)},grid:{color:'#252525'}}}}
  });
}

// ── ADD/EDIT TRADE FORM ───────────────────────────────────────────────────────
function bindTradeForm() {
  const form = document.getElementById('trade-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data  = collectTradeForm('trade-form');
    const errEl = document.getElementById('trade-form-error');
    try {
      await addTrade(data);
      showToast('Trade guardado correctamente','success');
      form.reset();
      document.querySelectorAll('.radio-label input[name="side"]')[0].checked   = true;
      document.querySelectorAll('.radio-label input[name="result"]')[0].checked = true;
      await loadData(); renderAll();
    } catch(err) { errEl.textContent = err.message; }
  });
  document.getElementById('trade-form').addEventListener('input',()=>{
    document.getElementById('trade-form-error').textContent='';
  });
}

function collectTradeForm(formId) {
  const f = document.getElementById(formId);
  const v = name => f.querySelector(`[name="${name}"]`).value;
  const r = name => { const el=f.querySelector(`[name="${name}"]:checked`); return el?el.value:''; };
  return { strategyName:v('strategyName'), date:v('date'), symbol:v('symbol'),
    killZone:v('killZone'), side:r('side'), result:r('result'), pnl:v('pnl'),
    rrPlanned:v('rrPlanned'), tradingViewUrl:v('tradingViewUrl'),
    imageM3Url:v('imageM3Url'), imageM15Url:v('imageM15Url'), notes:v('notes') };
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function populateStrategyFilter() {
  const sel = document.getElementById('filter-strategy');
  if (!sel) return;
  const strategies = [...new Set(state.trades.map(t=>t.strategyName))].sort();
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Todas las estrategias</option>'+
    strategies.map(s=>`<option value="${esc(s)}"${currentVal===s?' selected':''}>${esc(s)}</option>`).join('');
}

function bindHistoryFilters() {
  const ids=['filter-strategy','filter-result','filter-date-from','filter-date-to'];
  const update=()=>{
    state.historyFilters.strategy = document.getElementById('filter-strategy')?.value||'';
    state.historyFilters.result   = document.getElementById('filter-result')?.value||'';
    state.historyFilters.dateFrom = document.getElementById('filter-date-from')?.value||'';
    state.historyFilters.dateTo   = document.getElementById('filter-date-to')?.value||'';
    renderHistory();
  };
  ids.forEach(id=>document.getElementById(id)?.addEventListener('change',update));
}

function renderHistory() {
  populateStrategyFilter();
  let trades = [...state.trades];
  const f = state.historyFilters;
  if (f.strategy) trades=trades.filter(t=>t.strategyName===f.strategy);
  if (f.result)   trades=trades.filter(t=>t.result===f.result);
  if (f.dateFrom) trades=trades.filter(t=>t.date>=f.dateFrom);
  if (f.dateTo)   trades=trades.filter(t=>t.date<=f.dateTo);

  const container = document.getElementById('trade-list');
  if (trades.length===0) {
    const msg=state.trades.length>0
      ?'<div class="empty-state"><div class="empty-state-icon">🔍</div>No hay trades que coincidan con los filtros</div>'
      :'<div class="empty-state"><div class="empty-state-icon">📋</div>No hay trades registrados</div>';
    container.innerHTML=msg; return;
  }
  const sorted=[...trades].sort((a,b)=>new Date(b.date)-new Date(a.date)||new Date(b.createdAt)-new Date(a.createdAt));
  container.innerHTML=sorted.map(t=>buildTradeCard(t)).join('');
  container.querySelectorAll('.btn-edit').forEach(btn=>btn.addEventListener('click',()=>openEditModal(btn.dataset.id)));
  container.querySelectorAll('.btn-delete').forEach(btn=>btn.addEventListener('click',()=>confirmDelete(btn.dataset.id)));
}

function buildTradeCard(t) {
  const links=[
    t.imageM3Url?`<a href="${esc(t.imageM3Url)}" target="_blank" rel="noopener">Imagen M3</a>`:'',
    t.imageM15Url?`<a href="${esc(t.imageM15Url)}" target="_blank" rel="noopener">Imagen M15</a>`:'',
    t.tradingViewUrl?`<a href="${esc(t.tradingViewUrl)}" target="_blank" rel="noopener">TradingView</a>`:''
  ].filter(Boolean).join('');
  const rrText = t.rrPlanned?`RR ${t.rrPlanned}`:'';
  return `
  <div class="trade-item">
    <div class="trade-item-header">
      <span class="trade-strategy">${esc(t.strategyName)}</span>
      <span class="badge ${t.side==='BUY'?'badge-buy':'badge-sell'}">${t.side}</span>
      <span class="badge ${badgeResult(t.result)}">${t.result}</span>
      <span class="trade-pnl ${colorClass(t.pnl)}">${fmtPnl(t.pnl)}</span>
    </div>
    <div class="trade-meta">
      <span>📅 ${fmtDate(t.date)}</span><span>💱 ${esc(t.symbol)}</span>
      <span>⏰ ${esc(t.killZone)}</span>
      ${rrText?`<span>📐 ${esc(rrText)}</span>`:''}
    </div>
    ${links?`<div class="trade-links">${links}</div>`:''}
    ${t.notes?`<div class="trade-notes-text">${esc(t.notes)}</div>`:''}
    <div class="trade-actions">
      <button class="btn btn-edit" data-id="${t.id}">Editar</button>
      <button class="btn btn-delete" data-id="${t.id}">Borrar</button>
    </div>
  </div>`;
}

// ── EDIT MODAL ─────────────────────────────────────────────────────────────────
function bindEditModal() {
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const data=collectTradeForm('edit-form');
    const errEl=document.getElementById('edit-form-error');
    try { await updateTrade(state.editingTradeId,data); closeEditModal();
      showToast('Trade actualizado','success'); await loadData(); renderAll();
    } catch(err){errEl.textContent=err.message;}
  });
  document.getElementById('modal-cancel').addEventListener('click',closeEditModal);
  document.getElementById('edit-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeEditModal();});
}

function openEditModal(id) {
  const t=state.trades.find(x=>x.id===id); if(!t)return;
  state.editingTradeId=id;
  const f=document.getElementById('edit-form');
  const set=(name,val)=>{const el=f.querySelector(`[name="${name}"]`);if(el)el.value=val??'';};
  const setRadio=(name,val)=>f.querySelectorAll(`[name="${name}"]`).forEach(r=>{r.checked=r.value===val;});
  set('strategyName',t.strategyName); set('date',t.date); set('symbol',t.symbol);
  set('killZone',t.killZone); setRadio('side',t.side); setRadio('result',t.result);
  set('pnl',t.pnl); set('rrPlanned',t.rrPlanned??''); set('tradingViewUrl',t.tradingViewUrl);
  set('imageM3Url',t.imageM3Url); set('imageM15Url',t.imageM15Url); set('notes',t.notes);
  document.getElementById('edit-form-error').textContent='';
  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  state.editingTradeId=null;
}

// ── CONFIRM DELETE ─────────────────────────────────────────────────────────────
function confirmDelete(id) {
  const overlay=document.getElementById('confirm-overlay');
  overlay.classList.add('open');
  document.getElementById('confirm-yes').onclick=async()=>{
    await deleteTrade(id); overlay.classList.remove('open');
    showToast('Trade eliminado','success'); await loadData(); renderAll();
  };
  document.getElementById('confirm-no').onclick=()=>overlay.classList.remove('open');
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function renderAnalytics() {
  const trades=state.trades, m=computeMetrics(trades);
  const byDay=groupBy(trades,t=>t.date);
  let bestDayLabel='—',bestDayVal=0;
  for(const[d,ts]of Object.entries(byDay)){const s=ts.reduce((a,t)=>a+t.pnl,0);if(s>bestDayVal){bestDayVal=s;bestDayLabel=fmtDate(d);}}
  const byWeek=groupBy(trades,t=>isoWeek(t.date));
  let bestWeekLabel='—',bestWeekVal=0;
  for(const[w,ts]of Object.entries(byWeek)){const s=ts.reduce((a,t)=>a+t.pnl,0);if(s>bestWeekVal){bestWeekVal=s;bestWeekLabel='Sem '+w;}}
  const longs=trades.filter(t=>t.side==='BUY'&&t.result!=='BE');
  const shorts=trades.filter(t=>t.side==='SELL'&&t.result!=='BE');
  const longWins=longs.filter(t=>t.result==='TP'),shortWins=shorts.filter(t=>t.result==='TP');
  const longWR=longs.length>0?longWins.length/longs.length:null;
  const shortWR=shorts.length>0?shortWins.length/shorts.length:null;
  const longPnl=trades.filter(t=>t.side==='BUY').reduce((s,t)=>s+t.pnl,0);
  const shortPnl=trades.filter(t=>t.side==='SELL').reduce((s,t)=>s+t.pnl,0);

  document.getElementById('a-best-day').textContent    = bestDayLabel;
  document.getElementById('a-best-day-v').textContent  = fmtPnl(bestDayVal);
  document.getElementById('a-best-day-v').className    = 'card-value '+colorClass(bestDayVal);
  document.getElementById('a-best-week').textContent   = bestWeekLabel;
  document.getElementById('a-best-week-v').textContent = fmtPnl(bestWeekVal);
  document.getElementById('a-best-week-v').className   = 'card-value '+colorClass(bestWeekVal);
  document.getElementById('a-best-streak').textContent = m.bestStreak;
  document.getElementById('a-worst-streak').textContent= m.worstStreak;
  document.getElementById('a-wr-long').textContent     = longWR!==null?`${longWins.length}/${longs.length}`:'N/A';
  document.getElementById('a-wr-long-pct').textContent = longWR!==null?fmtPct(longWR):'';
  document.getElementById('a-wr-long-pnl').textContent = fmtPnl(longPnl);
  document.getElementById('a-wr-long-pnl').className   = 'card-sub '+colorClass(longPnl);
  document.getElementById('a-wr-short').textContent    = shortWR!==null?`${shortWins.length}/${shorts.length}`:'N/A';
  document.getElementById('a-wr-short-pct').textContent= shortWR!==null?fmtPct(shortWR):'';
  document.getElementById('a-wr-short-pnl').textContent= fmtPnl(shortPnl);
  document.getElementById('a-wr-short-pnl').className  = 'card-sub '+colorClass(shortPnl);

  renderDonutChart(m.decisive.length>0?m.wins.length:0,m.decisive.length>0?m.losses.length:0);
  renderKillZoneChart(trades); renderDowChart(trades); renderMonthChart(trades); renderStrategyCards(trades);
}

function renderDonutChart(wins,losses) {
  const ctx=document.getElementById('chart-donut'); if(!ctx)return;
  destroyChart('donut'); if(wins+losses===0)return;
  state.charts.donut=new Chart(ctx,{type:'doughnut',
    data:{labels:['Ganancias (TP)','Pérdidas (SL)'],datasets:[{data:[wins,losses],backgroundColor:['#4caf50','#f44336'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{color:'#888',font:{size:11}}},
        tooltip:{callbacks:{label:item=>` ${item.label}: ${item.raw} trades (${fmtPct(item.raw/(wins+losses))})`},
        backgroundColor:'#1e1e1e',titleColor:'#888',bodyColor:'#f0f0f0',borderColor:'#2e2e2e',borderWidth:1}}}});
}

function renderKillZoneChart(trades) {
  const ctx=document.getElementById('chart-killzone'); if(!ctx)return;
  destroyChart('killzone');
  const map=groupBy(trades,t=>t.killZone),labels=Object.keys(map);
  const data=labels.map(k=>map[k].reduce((s,t)=>s+t.pnl,0));
  if(labels.length===0)return;
  state.charts.killzone=barChart(ctx,labels,data,'P&L por Kill Zone');
}

function renderDowChart(trades) {
  const ctx=document.getElementById('chart-dow'); if(!ctx)return;
  destroyChart('dow');
  const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const map={};days.forEach(d=>{map[d]=0;});
  trades.forEach(t=>{const d=new Date(t.date+'T12:00:00');const name=days[d.getDay()===0?6:d.getDay()-1];map[name]=(map[name]||0)+t.pnl;});
  const labels=['Lunes','Martes','Miércoles','Jueves','Viernes'];
  state.charts.dow=barChart(ctx,labels,labels.map(d=>map[d]||0),'P&L por Día');
}

function renderMonthChart(trades) {
  const ctx=document.getElementById('chart-month'); if(!ctx)return;
  const sel=document.getElementById('month-chart-year');
  if(sel){
    const currentYear=new Date().getFullYear();
    const yearsSet=new Set(trades.map(t=>new Date(t.date+'T12:00:00').getFullYear()));
    yearsSet.add(currentYear);
    const years=[...yearsSet].sort((a,b)=>b-a);
    const prevVal=sel.value?parseInt(sel.value):currentYear;
    sel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
    sel.value=years.includes(prevVal)?prevVal:currentYear;
  }
  const selectedYear=sel?parseInt(sel.value):new Date().getFullYear();
  const filtered=trades.filter(t=>new Date(t.date+'T12:00:00').getFullYear()===selectedYear);
  destroyChart('month');
  const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const map={};months.forEach((_,i)=>{map[i]=0;});
  filtered.forEach(t=>{const mo=new Date(t.date+'T12:00:00').getMonth();map[mo]=(map[mo]||0)+t.pnl;});
  state.charts.month=barChart(ctx,months,months.map((_,i)=>map[i]||0),'P&L por Mes');
}

function bindMonthYearFilter() {
  const sel=document.getElementById('month-chart-year');
  if(sel)sel.addEventListener('change',()=>renderMonthChart(state.trades));
}

function barChart(ctx,labels,data,label) {
  return new Chart(ctx,{type:'bar',
    data:{labels,datasets:[{label,data,
      backgroundColor:data.map(v=>v>=0?'rgba(76,175,80,.75)':'rgba(244,67,54,.75)'),
      borderColor:data.map(v=>v>=0?'#4caf50':'#f44336'),borderWidth:1,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:item=>` ${fmtPnl(item.raw)}`},
        backgroundColor:'#1e1e1e',titleColor:'#888',bodyColor:'#f0f0f0',borderColor:'#2e2e2e',borderWidth:1}},
      scales:{x:{ticks:{color:'#888',font:{size:11}},grid:{color:'#1e1e1e'}},
        y:{ticks:{color:'#888',font:{size:11},callback:v=>fmtPnl(v)},grid:{color:'#252525'}}}}});
}

function renderStrategyCards(trades) {
  const map=groupBy(trades,t=>t.strategyName);
  const container=document.getElementById('strategy-cards');
  if(Object.keys(map).length===0){
    container.innerHTML='<div class="empty-state"><div class="empty-state-icon">📈</div>Sin estrategias registradas</div>';return;}
  container.innerHTML=Object.entries(map).map(([name,ts])=>{
    const dec=ts.filter(t=>t.result!=='BE'),wins=dec.filter(t=>t.result==='TP').length;
    const wr=dec.length>0?fmtPct(wins/dec.length):'N/A';
    const pnl=ts.reduce((s,t)=>s+t.pnl,0);
    return `<div class="strategy-card">
      <div class="strategy-name" title="${esc(name)}">${esc(name)}</div>
      <div class="strategy-stat"><span>Trades</span><span>${ts.length}</span></div>
      <div class="strategy-stat"><span>Win Rate</span><span>${wr}</span></div>
      <div class="strategy-stat"><span>P&L Total</span><span class="${colorClass(pnl)}">${fmtPnl(pnl)}</span></div>
    </div>`;}).join('');
}

// ── NOTES ─────────────────────────────────────────────────────────────────────
function bindNoteForm() {
  document.getElementById('btn-add-note').addEventListener('click', async()=>{
    const textEl=document.getElementById('note-text'),linksEl=document.getElementById('note-links');
    const text=textEl.value.trim(),links=linksEl.value.split('\n').map(l=>l.trim()).filter(Boolean);
    if(!text){showToast('Escribe algo en la nota','error');return;}
    try { await addNote({text,links}); textEl.value='';linksEl.value='';
      showToast('Nota guardada','success'); await loadData(); renderNotes();
    } catch(err){showToast(err.message,'error');}
  });
}

function renderNotes() {
  const container=document.getElementById('notes-list');
  if(state.notes.length===0){
    container.innerHTML='<div class="empty-state"><div class="empty-state-icon">📝</div>No hay notas aún</div>';return;}
  container.innerHTML=state.notes.map(n=>`
    <div class="note-item">
      <div class="note-item-header">
        <span class="note-date">${fmtDateTime(n.date)}</span>
        <button class="btn-sm-red" data-note-id="${n.id}">Borrar</button>
      </div>
      <div class="note-text">${esc(n.text)}</div>
      ${n.links&&n.links.length>0?`<div class="note-links">${n.links.map((l,i)=>`<a href="${esc(l)}" target="_blank" rel="noopener">Link ${i+1}</a>`).join('')}</div>`:''}`
    +`</div>`).join('');
  container.querySelectorAll('.btn-sm-red').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      await deleteNote(btn.dataset.noteId); showToast('Nota eliminada','success');
      await loadData(); renderNotes();
    });
  });
}

// ── CLOUD UI ──────────────────────────────────────────────────────────────────
function bindCloudUI() {
  if (!db || !db.cloud) {
    // Sin cloud: ocultar el botón de login para no confundir
    const loginBtn = document.getElementById('btn-cloud-login');
    const syncBadge = document.getElementById('sync-status');
    if (loginBtn) loginBtn.style.display = 'none';
    if (syncBadge) { syncBadge.textContent = 'Solo local'; }
    return;
  }

  const syncPhaseMap = phase => {
    if (!phase||phase==='not-started'||phase==='offline'||phase==='disconnected'||phase==='error')
      return {text:'Offline',cls:'sync-offline'};
    if (phase==='connecting'||phase==='pushing'||phase==='pulling')
      return {text:'Sincronizando...',cls:'sync-syncing'};
    if (phase==='in-sync'||phase==='connected')
      return {text:'Sincronizado',cls:'sync-ok'};
    return {text:'Offline',cls:'sync-offline'};
  };

  try {
    db.cloud.syncState.subscribe(syncState=>{
      const badge=document.getElementById('sync-status'); if(!badge)return;
      const ui=syncPhaseMap(syncState&&syncState.phase);
      badge.textContent=ui.text; badge.className='sync-badge '+ui.cls;
    });
  } catch(e){console.warn('syncState subscribe falló:',e.message);}

  try {
    db.cloud.currentUser.subscribe(user=>{
      const loginBtn=document.getElementById('btn-cloud-login');
      const userWrap=document.getElementById('cloud-user-wrap');
      const emailEl=document.getElementById('cloud-user-email');
      if(!loginBtn||!userWrap||!emailEl)return;
      if(user&&user.isLoggedIn){
        loginBtn.style.display='none'; userWrap.style.display='flex';
        emailEl.textContent=user.email||'Usuario';
      } else {
        loginBtn.style.display=''; userWrap.style.display='none';
      }
    });
  } catch(e){console.warn('currentUser subscribe falló:',e.message);}

  const loginBtn=document.getElementById('btn-cloud-login');
  if(loginBtn)loginBtn.addEventListener('click',()=>{
    db.cloud.login().catch(e=>showToast('Error al iniciar sesión: '+e.message,'error'));
  });

  const logoutBtn=document.getElementById('btn-cloud-logout');
  if(logoutBtn)logoutBtn.addEventListener('click',()=>{
    db.cloud.logout({deleteLocalData:false}).catch(e=>showToast('Error al cerrar sesión: '+e.message,'error'));
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function destroyChart(key){if(state.charts[key]){state.charts[key].destroy();delete state.charts[key];}}
function colorClass(v){return v>0?'positive':v<0?'negative':'neutral';}
function badgeResult(r){return r==='TP'?'badge-tp':r==='SL'?'badge-sl':'badge-be';}
function fmtPnl(v){const n=Number(v);if(isNaN(n))return'—';return(n>=0?'+':'')+n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' $';}
function fmtPct(v){return(v*100).toFixed(1)+'%';}
function fmtDate(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
function fmtDateTime(iso){if(!iso)return'—';const dt=new Date(iso);return dt.toLocaleDateString('es-ES')+' '+dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});}
function esc(str){return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function groupBy(arr,fn){return arr.reduce((acc,item)=>{const k=fn(item);if(!acc[k])acc[k]=[];acc[k].push(item);return acc;},{});}
function isoWeek(dateStr){const d=new Date(dateStr+'T12:00:00');const jan4=new Date(d.getFullYear(),0,4);const week1=new Date(jan4.getTime()-(jan4.getDay()||7-1)*86400000);return d.getFullYear()+'-W'+String(Math.ceil((d-week1)/(7*86400000))).padStart(2,'0');}
function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type+' show';clearTimeout(t._timer);t._timer=setTimeout(()=>{t.classList.remove('show');},3000);}

// ── INIT ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
