// app.js — Main application logic

import {
  db, initDB,
  getAllTrades, addTrade, updateTrade, deleteTrade,
  getAllLiveTrades, addLiveTrade, updateLiveTrade, deleteLiveTrade,
  getAllNotes, addNote, deleteNote,
  getAllLiveNotes, addLiveNote, deleteLiveNote
} from './db.js';

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
  mode: 'backtest',
  trades: [],
  notes: [],
  charts: {},
  editingTradeId: null,
  currentTab: 'dashboard',
  analyticsStrategy: '',
  historyFilters: { strategy:'', result:'', dateFrom:'', dateTo:'' },
  bound: false // flag para evitar listeners duplicados
};

// ── BOOT ─────────────────────────────────────────────────────────────────────
async function boot() {
  await initDB();
  bindCloudUI();
  bindLoginUI();
  checkSession();
}

// ── SESSION ───────────────────────────────────────────────────────────────────
function checkSession() {
  if (!db || !db.cloud) { showModeScreen(); return; }
  try {
    db.cloud.currentUser.subscribe(user => {
      if (user && user.isLoggedIn) showModeScreen();
      else showLoginScreen();
    });
  } catch(e) { showModeScreen(); }
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('mode-screen').style.display  = 'none';
  document.getElementById('app-screen').style.display   = 'none';
}

async function showModeScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('mode-screen').style.display  = 'block';
  document.getElementById('app-screen').style.display   = 'none';
  state.bound = false; // reset al volver al mode screen
  await loadAllData();
  renderModeStats();
  bindModeLogout();
}

function showAppScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('mode-screen').style.display  = 'none';
  document.getElementById('app-screen').style.display   = 'block';
}

window.goToModeScreen = async function() { await showModeScreen(); };

window.enterMode = async function(mode) {
  state.mode = mode;
  state.analyticsStrategy = '';
  showAppScreen();
  setupModeUI();
  await loadData();
  // Solo bindear una vez
  if (!state.bound) {
    bindNav();
    bindTradeForm();
    bindEditModal();
    bindDetailModal();
    bindNoteForm();
    bindMonthYearFilter();
    bindHistoryFilters();
    state.bound = true;
  }
  renderAll();
};

// ── MODE UI ───────────────────────────────────────────────────────────────────
function setupModeUI() {
  const badge   = document.getElementById('current-mode-badge');
  const liveQ   = document.getElementById('live-questions-section');
  const btNotes = document.getElementById('backtest-notes-section');
  const btnSave = document.getElementById('btn-save-trade');
  if (state.mode === 'live') {
    badge.textContent = '⚡ Live';
    badge.className   = 'mode-indicator badge-mode-live';
    if (liveQ)   liveQ.style.display   = 'block';
    if (btNotes) btNotes.style.display = 'none';
    if (btnSave) btnSave.textContent   = 'Guardar Trade en Vivo';
  } else {
    badge.textContent = '📊 Backtesting';
    badge.className   = 'mode-indicator badge-mode-bt';
    if (liveQ)   liveQ.style.display   = 'none';
    if (btNotes) btNotes.style.display = 'block';
    if (btnSave) btnSave.textContent   = 'Guardar Backtest';
  }
}

// ── LOGIN UI ──────────────────────────────────────────────────────────────────
function bindLoginUI() {
  const btnSend   = document.getElementById('btn-send-otp');
  const btnVerify = document.getElementById('btn-verify-otp');
  const btnBack   = document.getElementById('btn-back-email');
  if (btnSend) {
    btnSend.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) { setLoginMsg('login-msg','Ingresá tu email','error'); return; }
      if (!db.cloud) { showModeScreen(); return; }
      btnSend.disabled = true;
      setLoginMsg('login-msg','Enviando código...','');
      try {
        await db.cloud.login({ email, otpOnly: true });
        document.getElementById('login-step-email').style.display = 'none';
        document.getElementById('login-step-otp').style.display   = 'block';
        setLoginMsg('login-msg2','Código enviado. Revisá tu email.','success');
      } catch(e) {
        setLoginMsg('login-msg', e.message||'Error al enviar código','error');
        btnSend.disabled = false;
      }
    });
  }
  if (btnVerify) {
    btnVerify.addEventListener('click', async () => {
      const otp = document.getElementById('login-otp').value.trim();
      if (!otp) { setLoginMsg('login-msg2','Ingresá el código','error'); return; }
      btnVerify.disabled = true;
      setLoginMsg('login-msg2','Verificando...','');
      try {
        await db.cloud.login({ otp });
      } catch(e) {
        setLoginMsg('login-msg2', e.message||'Código incorrecto','error');
        btnVerify.disabled = false;
      }
    });
  }
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      document.getElementById('login-step-email').style.display = 'block';
      document.getElementById('login-step-otp').style.display   = 'none';
      setLoginMsg('login-msg','','');
      document.getElementById('btn-send-otp').disabled = false;
    });
  }
}
function setLoginMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'login-msg' + (type?' '+type:'');
}

// ── MODE SCREEN ───────────────────────────────────────────────────────────────
async function loadAllData() {
  state.allBtTrades   = await getAllTrades().catch(()=>[]);
  state.allLiveTrades = await getAllLiveTrades().catch(()=>[]);
}

function renderModeStats() {
  const bt   = state.allBtTrades   || [];
  const live = state.allLiveTrades || [];
  const all  = [...bt, ...live];
  const mBt   = computeMetrics(bt);
  const mLive = computeMetrics(live);
  const mAll  = computeMetrics(all);
  setEl('ms-pnl',       fmtPnl(mAll.totalPnl), colorClass(mAll.totalPnl));
  setEl('ms-wr',        mAll.winRate!==null?fmtPct(mAll.winRate):'N/A', mAll.winRate!==null?colorClass(mAll.winRate-.5):'neutral');
  setEl('ms-bt-count',  bt.length);
  setEl('ms-live-count',live.length);
  setEl('mc-bt-count',  bt.length);
  setEl('mc-bt-wr',     mBt.winRate!==null?fmtPct(mBt.winRate):'N/A');
  setEl('mc-bt-pnl',    fmtPnl(mBt.totalPnl), colorClass(mBt.totalPnl));
  setEl('mc-live-count',live.length);
  setEl('mc-live-wr',   mLive.winRate!==null?fmtPct(mLive.winRate):'N/A');
  setEl('mc-live-pnl',  fmtPnl(mLive.totalPnl), colorClass(mLive.totalPnl));
  if (db && db.cloud) {
    try {
      db.cloud.syncState.subscribe(s => {
        const badge = document.getElementById('mode-sync-badge'); if(!badge)return;
        const ui = syncPhaseMap(s&&s.phase);
        badge.textContent=ui.text; badge.className='sync-badge '+ui.cls;
      });
      db.cloud.currentUser.subscribe(user => {
        const el = document.getElementById('mode-user-email');
        if(el&&user) el.textContent=user.email||'';
      });
    } catch(e){}
  }
}

function bindModeLogout() {
  const btn = document.getElementById('btn-mode-logout');
  if (btn) btn.onclick = () => {
    if (db && db.cloud) db.cloud.logout({deleteLocalData:false}).catch(()=>{});
    else showLoginScreen();
  };
}

// ── DATA ──────────────────────────────────────────────────────────────────────
async function loadData() {
  if (state.mode === 'live') {
    state.trades = await getAllLiveTrades().catch(()=>[]);
    state.notes  = await getAllLiveNotes().catch(()=>[]);
  } else {
    state.trades = await getAllTrades().catch(()=>[]);
    state.notes  = await getAllNotes().catch(()=>[]);
  }
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
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s=>s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+tab).classList.add('active');
      state.currentTab = tab;
      if (tab==='dashboard') renderDashboard();
      if (tab==='analytics') renderAnalytics();
    });
  });
}

// ── METRICS ───────────────────────────────────────────────────────────────────
function computeMetrics(trades) {
  const totalPnl   = trades.reduce((s,t)=>s+t.pnl,0);
  const totalCount = trades.length;
  // Win rate SOLO con TP y SL, BE excluido
  const decisive   = trades.filter(t=>t.result==='TP'||t.result==='SL');
  const wins       = decisive.filter(t=>t.result==='TP');
  const losses     = decisive.filter(t=>t.result==='SL');
  const bes        = trades.filter(t=>t.result==='BE');
  const winRate    = decisive.length>0 ? wins.length/decisive.length : null;
  const lossRate   = winRate!==null ? 1-winRate : null;
  const avgWin     = wins.length>0   ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
  const avgLoss    = losses.length>0 ? Math.abs(losses.reduce((s,t)=>s+t.pnl,0)/losses.length) : 0;
  const ev         = winRate!==null ? (winRate*avgWin)-(lossRate*avgLoss) : null;
  const profitFactor = avgLoss>0&&wins.length>0
    ? wins.reduce((s,t)=>s+t.pnl,0)/Math.abs(losses.reduce((s,t)=>s+t.pnl,0)) : null;
  const rrValues   = trades.filter(t=>t.rrPlanned).map(t=>t.rrPlanned);
  const avgRR      = rrValues.length>0 ? rrValues.reduce((a,b)=>a+b,0)/rrValues.length : null;
  const bestTrade  = trades.length>0 ? Math.max(...trades.map(t=>t.pnl)) : null;
  const worstTrade = trades.length>0 ? Math.min(...trades.map(t=>t.pnl)) : null;

  // BE outcome
  const beToTP = bes.filter(t=>t.beOutcome==='TP').length;
  const beToSL = bes.filter(t=>t.beOutcome==='SL').length;

  let bestStreak=0,worstStreak=0,curTP=0,curSL=0;
  const sorted=[...trades].sort((a,b)=>new Date(a.date)-new Date(b.date));
  for (const t of sorted) {
    if(t.result==='TP')      {curTP++;curSL=0;bestStreak=Math.max(bestStreak,curTP);}
    else if(t.result==='SL') {curSL++;curTP=0;worstStreak=Math.max(worstStreak,curSL);}
    else                     {curTP=0;curSL=0;}
  }

  // Drawdown
  let peak=0,maxDD=0,ddCount=0,inDD=false,ddDays=[],ddStart=null,eq=0;
  for (const t of sorted) {
    eq+=t.pnl;
    if(eq>peak){if(inDD){ddCount++;if(ddStart)ddDays.push((new Date(t.date)-ddStart)/86400000);}peak=eq;inDD=false;ddStart=null;}
    else if(eq<peak){if(!inDD){inDD=true;ddStart=new Date(t.date);}maxDD=Math.min(maxDD,eq-peak);}
  }
  const avgDD=ddDays.length>0?ddDays.reduce((a,b)=>a+b,0)/ddDays.length:0;

  // Frequency
  const dates=[...new Set(trades.map(t=>t.date))];
  const weeks=[...new Set(trades.map(t=>isoWeek(t.date)))];
  const months=[...new Set(trades.map(t=>t.date.slice(0,7)))];
  const tradesPerDay  =dates.length>0  ?trades.length/dates.length:0;
  const tradesPerWeek =weeks.length>0  ?trades.length/weeks.length:0;
  const tradesPerMonth=months.length>0 ?trades.length/months.length:0;

  return {
    totalPnl,totalCount,winRate,lossRate,ev,profitFactor,
    avgWin,avgLoss,avgRR,bestTrade,worstTrade,
    bestStreak,worstStreak,decisive,wins,losses,bes,
    beToTP,beToSL,
    maxDD,avgDD,ddCount,
    tradesPerDay,tradesPerWeek,tradesPerMonth
  };
}

function equitySeries(trades) {
  const sorted=[...trades].sort((a,b)=>
    new Date(a.date+'T'+(a.createdAt||'00:00:00'))-new Date(b.date+'T'+(b.createdAt||'00:00:00')));
  let eq=0;
  return sorted.map(t=>({date:t.date,pnl:t.pnl,equity:(eq+=t.pnl),symbol:t.symbol,result:t.result}));
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const m=computeMetrics(state.trades);
  setEl('stat-pnl',  fmtPnl(m.totalPnl), colorClass(m.totalPnl));
  setEl('stat-wr',   m.winRate!==null?fmtPct(m.winRate):'N/A', m.winRate!==null?colorClass(m.winRate-.5):'neutral');
  setEl('stat-ev',   m.ev!==null?fmtPnl(m.ev):'N/A', m.ev!==null?colorClass(m.ev):'neutral');
  setEl('stat-total',m.totalCount);
  setEl('stat-best', m.bestStreak);
  setEl('stat-worst',m.worstStreak);
  renderEquityChart(equitySeries(state.trades),'chart-equity');
  const recent=[...state.trades].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  const container=document.getElementById('recent-trades');
  if(recent.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">📊</div>No hay trades aún</div>';return;}
  container.innerHTML=recent.map(t=>`
    <div class="recent-item">
      <span class="recent-symbol">${esc(t.symbol)}</span>
      <span class="badge ${t.side==='BUY'?'badge-buy':'badge-sell'}">${t.side}</span>
      <span class="badge ${badgeResult(t.result)}">${t.result}</span>
      <span class="recent-date">${fmtDate(t.date)}</span>
      <span class="recent-pnl ${colorClass(t.pnl)}">${fmtPnl(t.pnl)}</span>
    </div>`).join('');
}

function renderEquityChart(series, canvasId) {
  const ctx=document.getElementById(canvasId); if(!ctx)return;
  const key=canvasId==='chart-equity'?'equity':'equityAnalytics';
  destroyChart(key);
  if(series.length===0){ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height);return;}
  const labels=['Inicio',...series.map(s=>s.date)];
  const data=[0,...series.map(s=>s.equity)];
  const pts=['#4caf50',...series.map(s=>s.equity>=0?'#4caf50':'#f44336')];
  state.charts[key]=new Chart(ctx,{type:'line',
    data:{labels,datasets:[{label:'Equity',data,borderColor:'#4caf50',
      backgroundColor:'rgba(76,175,80,.08)',borderWidth:2,fill:true,tension:.35,
      pointRadius:series.length>60?0:3,pointHoverRadius:5,pointBackgroundColor:pts}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{callbacks:{
        title:items=>items[0].label==='Inicio'?'Inicio':'Fecha: '+items[0].label,
        label:item=>' Equity: '+fmtPnl(item.raw),
        afterLabel:(item)=>{if(item.dataIndex===0)return'';const p=series[item.dataIndex-1];
          return ` ${p.symbol} ${p.result}  P&L: ${fmtPnl(p.pnl)}`;},},
        backgroundColor:'#1e1e1e',titleColor:'#888',bodyColor:'#f0f0f0',borderColor:'#2e2e2e',borderWidth:1}},
      scales:{x:{ticks:{color:'#888',maxTicksLimit:8,font:{size:11}},grid:{color:'#1e1e1e'}},
        y:{ticks:{color:'#888',font:{size:11},callback:v=>fmtPnl(v)},grid:{color:'#252525'}}}}});
}

// ── TRADE FORM ────────────────────────────────────────────────────────────────
function bindTradeForm() {
  const form=document.getElementById('trade-form');
  // BE outcome toggle
  form.querySelectorAll('[name="result"]').forEach(radio=>{
    radio.addEventListener('change',()=>{
      const beSection=document.getElementById('be-outcome-section');
      if(radio.value==='BE'&&radio.checked){
        beSection.style.display='block';
      } else if(radio.checked) {
        beSection.style.display='none';
        form.querySelectorAll('[name="beOutcome"]').forEach(r=>r.checked=false);
      }
    });
  });
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const data=collectTradeForm('trade-form');
    const errEl=document.getElementById('trade-form-error');
    try {
      if(state.mode==='live') await addLiveTrade(data);
      else await addTrade(data);
      showToast('Trade guardado correctamente','success');
      form.reset();
      form.querySelectorAll('.radio-label input[name="side"]')[0].checked=true;
      form.querySelectorAll('.radio-label input[name="result"]')[0].checked=true;
      document.getElementById('be-outcome-section').style.display='none';
      await loadData(); renderAll();
    } catch(err){errEl.textContent=err.message;}
  });
  form.addEventListener('input',()=>{document.getElementById('trade-form-error').textContent='';});
}

function collectTradeForm(formId) {
  const f=document.getElementById(formId);
  const v=name=>{const el=f.querySelector(`[name="${name}"]`);return el?el.value:'';};
  const r=name=>{const el=f.querySelector(`[name="${name}"]:checked`);return el?el.value:'';};
  return {
    strategyName:v('strategyName'),date:v('date'),symbol:v('symbol'),
    killZone:v('killZone'),side:r('side'),result:r('result'),
    beOutcome:r('beOutcome'),
    pnl:v('pnl'),rrPlanned:v('rrPlanned'),tradingViewUrl:v('tradingViewUrl'),
    imageM3Url:v('imageM3Url'),imageM15Url:v('imageM15Url'),
    notes:v('notes'),setup:v('setup'),fomo:v('fomo'),aprendizaje:v('aprendizaje')
  };
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function populateStrategyFilter() {
  const sel=document.getElementById('filter-strategy'); if(!sel)return;
  const strategies=[...new Set(state.trades.map(t=>t.strategyName))].sort();
  const currentVal=sel.value;
  sel.innerHTML='<option value="">Todas las estrategias</option>'+
    strategies.map(s=>`<option value="${esc(s)}"${currentVal===s?' selected':''}>${esc(s)}</option>`).join('');
}

function bindHistoryFilters() {
  const ids=['filter-strategy','filter-result','filter-date-from','filter-date-to'];
  const update=()=>{
    state.historyFilters.strategy=document.getElementById('filter-strategy')?.value||'';
    state.historyFilters.result  =document.getElementById('filter-result')?.value||'';
    state.historyFilters.dateFrom=document.getElementById('filter-date-from')?.value||'';
    state.historyFilters.dateTo  =document.getElementById('filter-date-to')?.value||'';
    renderHistory();
  };
  ids.forEach(id=>document.getElementById(id)?.addEventListener('change',update));
}

function renderHistory() {
  populateStrategyFilter();
  let trades=[...state.trades];
  const f=state.historyFilters;
  if(f.strategy) trades=trades.filter(t=>t.strategyName===f.strategy);
  if(f.result)   trades=trades.filter(t=>t.result===f.result);
  if(f.dateFrom) trades=trades.filter(t=>t.date>=f.dateFrom);
  if(f.dateTo)   trades=trades.filter(t=>t.date<=f.dateTo);
  const container=document.getElementById('trade-list');
  if(trades.length===0){
    container.innerHTML=state.trades.length>0
      ?'<div class="empty-state"><div class="empty-state-icon">🔍</div>No hay trades que coincidan</div>'
      :'<div class="empty-state"><div class="empty-state-icon">📋</div>No hay trades registrados</div>';
    return;
  }
  const sorted=[...trades].sort((a,b)=>new Date(b.date)-new Date(a.date)||new Date(b.createdAt)-new Date(a.createdAt));
  container.innerHTML=sorted.map(t=>buildTradeCard(t)).join('');
  container.querySelectorAll('.btn-edit').forEach(btn=>btn.addEventListener('click',()=>openEditModal(btn.dataset.id)));
  container.querySelectorAll('.btn-delete').forEach(btn=>btn.addEventListener('click',()=>confirmDelete(btn.dataset.id)));
  container.querySelectorAll('.btn-detail').forEach(btn=>btn.addEventListener('click',()=>openDetailModal(btn.dataset.id)));
}

function buildTradeCard(t) {
  const links=[
    t.imageM3Url?`<a href="${esc(t.imageM3Url)}" target="_blank" rel="noopener">Imagen M3</a>`:'',
    t.imageM15Url?`<a href="${esc(t.imageM15Url)}" target="_blank" rel="noopener">Imagen M15</a>`:'',
    t.tradingViewUrl?`<a href="${esc(t.tradingViewUrl)}" target="_blank" rel="noopener">TradingView</a>`:''
  ].filter(Boolean).join('');
  const beTag = t.result==='BE'&&t.beOutcome
    ? `<span class="badge badge-be" style="font-size:.65rem">BE→${t.beOutcome}</span>` : '';
  return `
  <div class="trade-item">
    <div class="trade-item-header">
      <span class="trade-strategy">${esc(t.strategyName)}</span>
      <span class="badge ${t.side==='BUY'?'badge-buy':'badge-sell'}">${t.side}</span>
      <span class="badge ${badgeResult(t.result)}">${t.result}</span>
      ${beTag}
      <span class="trade-pnl ${colorClass(t.pnl)}">${fmtPnl(t.pnl)}</span>
    </div>
    <div class="trade-meta">
      <span>📅 ${fmtDate(t.date)}</span><span>💱 ${esc(t.symbol)}</span>
      <span>⏰ ${esc(t.killZone)}</span>
      ${t.rrPlanned?`<span>📐 RR ${t.rrPlanned}</span>`:''}
    </div>
    ${links?`<div class="trade-links">${links}</div>`:''}
    <div class="trade-actions">
      <button class="btn btn-detail" data-id="${t.id}">Ver detalle</button>
      <button class="btn btn-edit"   data-id="${t.id}">Editar</button>
      <button class="btn btn-delete" data-id="${t.id}">Borrar</button>
    </div>
  </div>`;
}

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
function bindDetailModal() {
  document.getElementById('detail-modal-close').addEventListener('click',closeDetailModal);
  document.getElementById('detail-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDetailModal();});
}

function openDetailModal(id) {
  const t=state.trades.find(x=>x.id===id); if(!t)return;
  const modeLabel=state.mode==='live'
    ?'<span class="badge badge-mode-live">Live</span>'
    :'<span class="badge badge-mode-bt">Backtest</span>';
  document.getElementById('detail-modal-title').innerHTML=
    `${esc(t.strategyName)} ${modeLabel} <span class="badge ${t.side==='BUY'?'badge-buy':'badge-sell'}">${t.side}</span> <span class="badge ${badgeResult(t.result)}">${t.result}</span>`;
  const links=[
    t.imageM3Url?`<a class="detail-link" href="${esc(t.imageM3Url)}" target="_blank" rel="noopener">Imagen M3</a>`:'',
    t.imageM15Url?`<a class="detail-link" href="${esc(t.imageM15Url)}" target="_blank" rel="noopener">Imagen M15</a>`:'',
    t.tradingViewUrl?`<a class="detail-link" href="${esc(t.tradingViewUrl)}" target="_blank" rel="noopener">TradingView</a>`:''
  ].filter(Boolean).join('');
  const beOutcomeRow = t.result==='BE'&&t.beOutcome
    ?`<div class="detail-row"><span class="detail-row-label">Continuó a</span><span class="detail-row-value">${t.beOutcome==='TP'?'✅ TP':'❌ SL'}</span></div>` : '';
  const liveSection=state.mode==='live'?`
    <div class="detail-section">Análisis del Trade</div>
    <div class="detail-question"><div class="detail-question-label">¿Cuál fue tu setup?</div><div class="detail-question-answer">${esc(t.setup||'—')}</div></div>
    <div class="detail-question"><div class="detail-question-label">¿Tuviste FOMO o dudas?</div><div class="detail-question-answer">${esc(t.fomo||'—')}</div></div>
    <div class="detail-question"><div class="detail-question-label">¿Qué aprendiste?</div><div class="detail-question-answer">${esc(t.aprendizaje||'—')}</div></div>`
    :(t.notes?`<div class="detail-section">Notas</div><div class="detail-question"><div class="detail-question-answer">${esc(t.notes)}</div></div>`:'');
  document.getElementById('detail-modal-body').innerHTML=`
    <div class="detail-grid">
      <div class="detail-card"><div class="detail-card-label">P&L</div><div class="detail-card-value ${colorClass(t.pnl)}">${fmtPnl(t.pnl)}</div></div>
      <div class="detail-card"><div class="detail-card-label">RR Planificado</div><div class="detail-card-value">${t.rrPlanned||'—'}</div></div>
      <div class="detail-card"><div class="detail-card-label">Fecha</div><div class="detail-card-value">${fmtDate(t.date)}</div></div>
    </div>
    <div class="detail-section">Detalles</div>
    <div class="detail-row"><span class="detail-row-label">Símbolo</span><span class="detail-row-value">${esc(t.symbol)}</span></div>
    <div class="detail-row"><span class="detail-row-label">Kill Zone</span><span class="detail-row-value">${esc(t.killZone)}</span></div>
    <div class="detail-row"><span class="detail-row-label">Lado</span><span class="detail-row-value">${t.side==='BUY'?'BUY (Long)':'SELL (Short)'}</span></div>
    <div class="detail-row"><span class="detail-row-label">Resultado</span><span class="detail-row-value">${t.result}</span></div>
    ${beOutcomeRow}
    ${liveSection}
    ${links?`<div class="detail-section">Referencias</div><div class="detail-links">${links}</div>`:''}`;
  document.getElementById('detail-modal').classList.add('open');
}

function closeDetailModal() { document.getElementById('detail-modal').classList.remove('open'); }

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
function bindEditModal() {
  document.getElementById('modal-save').addEventListener('click', async()=>{
    const data=collectTradeForm('edit-form');
    const errEl=document.getElementById('edit-form-error');
    try {
      if(state.mode==='live') await updateLiveTrade(state.editingTradeId,data);
      else await updateTrade(state.editingTradeId,data);
      closeEditModal(); showToast('Trade actualizado','success');
      await loadData(); renderAll();
    } catch(err){errEl.textContent=err.message;}
  });
  document.getElementById('modal-cancel').addEventListener('click',closeEditModal);
  document.getElementById('edit-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeEditModal();});

  // BE outcome toggle en edit form
  document.getElementById('edit-form').querySelectorAll('[name="result"]').forEach(radio=>{
    radio.addEventListener('change',()=>{
      const beSection=document.getElementById('edit-be-outcome-section');
      if(radio.value==='BE'&&radio.checked) beSection.style.display='block';
      else if(radio.checked) {
        beSection.style.display='none';
        document.getElementById('edit-form').querySelectorAll('[name="beOutcome"]').forEach(r=>r.checked=false);
      }
    });
  });
}

function openEditModal(id) {
  const t=state.trades.find(x=>x.id===id); if(!t)return;
  state.editingTradeId=id;
  const f=document.getElementById('edit-form');
  const set=(name,val)=>{const el=f.querySelector(`[name="${name}"]`);if(el)el.value=val??'';};
  const setRadio=(name,val)=>f.querySelectorAll(`[name="${name}"]`).forEach(r=>{r.checked=r.value===val;});
  set('strategyName',t.strategyName);set('date',t.date);set('symbol',t.symbol);
  set('killZone',t.killZone);setRadio('side',t.side);setRadio('result',t.result);
  set('pnl',t.pnl);set('rrPlanned',t.rrPlanned??'');
  set('tradingViewUrl',t.tradingViewUrl);set('imageM3Url',t.imageM3Url);set('imageM15Url',t.imageM15Url);
  // BE outcome
  const beSection=document.getElementById('edit-be-outcome-section');
  if(t.result==='BE'){beSection.style.display='block';setRadio('beOutcome',t.beOutcome||'');}
  else beSection.style.display='none';
  // mode specific
  const liveQ=document.getElementById('edit-live-questions');
  const btNotes=document.getElementById('edit-backtest-notes');
  if(state.mode==='live'){
    if(liveQ)liveQ.style.display='block';if(btNotes)btNotes.style.display='none';
    set('setup',t.setup);set('fomo',t.fomo);set('aprendizaje',t.aprendizaje);
  } else {
    if(liveQ)liveQ.style.display='none';if(btNotes)btNotes.style.display='block';
    set('notes',t.notes);
  }
  document.getElementById('edit-form-error').textContent='';
  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() { document.getElementById('edit-modal').classList.remove('open'); state.editingTradeId=null; }

// ── CONFIRM DELETE ────────────────────────────────────────────────────────────
function confirmDelete(id) {
  const overlay=document.getElementById('confirm-overlay');
  overlay.classList.add('open');
  document.getElementById('confirm-yes').onclick=async()=>{
    if(state.mode==='live') await deleteLiveTrade(id);
    else await deleteTrade(id);
    overlay.classList.remove('open');
    showToast('Trade eliminado','success');
    await loadData(); renderAll();
  };
  document.getElementById('confirm-no').onclick=()=>overlay.classList.remove('open');
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function renderAnalytics() {
  const strategies=[...new Set(state.trades.map(t=>t.strategyName))].sort();
  const btnContainer=document.getElementById('strategy-filter-btns');
  if(btnContainer){
    btnContainer.innerHTML=`<button class="strategy-filter-btn ${!state.analyticsStrategy?'active':''}" data-strategy="">Todas</button>`
      +strategies.map(s=>`<button class="strategy-filter-btn ${state.analyticsStrategy===s?'active':''}" data-strategy="${esc(s)}">${esc(s)}</button>`).join('');
    btnContainer.querySelectorAll('.strategy-filter-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{ state.analyticsStrategy=btn.dataset.strategy; renderAnalytics(); });
    });
  }
  const trades=state.analyticsStrategy?state.trades.filter(t=>t.strategyName===state.analyticsStrategy):state.trades;
  const m=computeMetrics(trades);

  // Métricas clave
  const mg=document.getElementById('analytics-metrics-grid');
  if(mg) mg.innerHTML=[
    metricCard('P&L Total',fmtPnl(m.totalPnl),colorClass(m.totalPnl),null,'Suma total de ganancias y pérdidas de todos los trades.'),
    metricCard('Win Rate',m.winRate!==null?fmtPct(m.winRate):'N/A',m.winRate!==null?colorClass(m.winRate-.5):'neutral','excl. BE','Porcentaje de trades ganadores sobre decisivos (TP+SL). Los BE no entran en el cálculo.'),
    metricCard('Profit Factor',m.profitFactor!==null?m.profitFactor.toFixed(2):'N/A',m.profitFactor!==null?colorClass(m.profitFactor-1):'neutral',null,'Divide el total de ganancias entre el total de pérdidas. Mayor a 1 = sistema rentable.'),
    metricCard('Expected Value',m.ev!==null?fmtPnl(m.ev):'N/A',m.ev!==null?colorClass(m.ev):'neutral','excl. BE','Resultado promedio esperado por trade. Positivo = sistema con ventaja estadística.'),
    metricCard('RR Prom. Real',m.avgRR!==null?m.avgRR.toFixed(2):'N/A','neutral','planificado','Risk/Reward promedio planificado. Si es menor al ideal, revisá tu gestión de salidas.'),
    metricCard('Mejor Trade',m.bestTrade!==null?fmtPnl(m.bestTrade):'N/A','positive',null,'El trade individual con mayor ganancia.'),
    metricCard('Peor Trade',m.worstTrade!==null?fmtPnl(m.worstTrade):'N/A','negative',null,'El trade individual con mayor pérdida.'),
    metricCard('Total Trades',m.totalCount,'neutral',`${m.wins.length} TP · ${m.losses.length} SL · ${m.bes.length} BE`,'Total de trades registrados.'),
  ].join('');

  // Winners / Losers
  const wlGrid=document.getElementById('analytics-wl-grid');
  if(wlGrid) wlGrid.innerHTML=`
    <div class="wl-card">
      <div class="wl-title" style="color:var(--green)">✅ Ganadores</div>
      <div class="wl-row"><span class="wl-key">Total</span><span class="wl-val">${m.wins.length}</span></div>
      <div class="wl-row"><span class="wl-key">Mejor ganancia</span><span class="wl-val positive">${m.bestTrade!==null&&m.bestTrade>0?fmtPnl(m.bestTrade):'—'}</span></div>
      <div class="wl-row"><span class="wl-key">Promedio ganancia</span><span class="wl-val positive">${m.avgWin>0?fmtPnl(m.avgWin):'—'}</span></div>
      <div class="wl-row"><span class="wl-key">Racha máx. ganadora</span><span class="wl-val">${m.bestStreak}</span></div>
    </div>
    <div class="wl-card">
      <div class="wl-title" style="color:var(--red)">❌ Perdedores</div>
      <div class="wl-row"><span class="wl-key">Total</span><span class="wl-val">${m.losses.length}</span></div>
      <div class="wl-row"><span class="wl-key">Peor pérdida</span><span class="wl-val negative">${m.worstTrade!==null&&m.worstTrade<0?fmtPnl(m.worstTrade):'—'}</span></div>
      <div class="wl-row"><span class="wl-key">Promedio pérdida</span><span class="wl-val negative">${m.avgLoss>0?'-'+m.avgLoss.toFixed(2)+' $':'—'}</span></div>
      <div class="wl-row"><span class="wl-key">Racha máx. perdedora</span><span class="wl-val">${m.worstStreak}</span></div>
    </div>`;

  // BE outcome cards
  const beGrid=document.getElementById('analytics-be-grid');
  if(beGrid){
    const total=m.bes.length;
    const tpPct=total>0?Math.round(m.beToTP/total*100):0;
    const slPct=total>0?Math.round(m.beToSL/total*100):0;
    beGrid.innerHTML=total===0?'':`
      <div class="card">
        <div class="card-label">BE → Continuó a TP
          <div class="tooltip-wrap"><div class="tooltip-icon">i</div>
          <div class="tooltip-box"><div class="tooltip-box-title">BE → TP</div>Breakevens donde el precio continuó hacia el Take Profit después de sacarte. El mercado validó tu dirección — revisá si podés dejar correr más las ganancias.</div></div>
        </div>
        <div class="card-value positive">${m.beToTP}</div>
        <div class="card-sub">${tpPct}% de ${total} BE totales</div>
        <div style="height:5px;border-radius:3px;background:var(--bg-input);margin-top:8px;overflow:hidden">
          <div style="height:100%;width:${tpPct}%;background:var(--green);border-radius:3px"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-label">BE → Continuó a SL
          <div class="tooltip-wrap"><div class="tooltip-icon">i</div>
          <div class="tooltip-box"><div class="tooltip-box-title">BE → SL</div>Breakevens donde el precio fue hacia el Stop Loss después de sacarte. El BE te protegió de una pérdida — analizá si tu stop estaba bien ubicado.</div></div>
        </div>
        <div class="card-value negative">${m.beToSL}</div>
        <div class="card-sub">${slPct}% de ${total} BE totales</div>
        <div style="height:5px;border-radius:3px;background:var(--bg-input);margin-top:8px;overflow:hidden">
          <div style="height:100%;width:${slPct}%;background:var(--red);border-radius:3px"></div>
        </div>
      </div>`;
  }

  // Drawdown
  const ddGrid=document.getElementById('analytics-dd-grid');
  if(ddGrid) ddGrid.innerHTML=[
    metricCard('Max Drawdown',m.maxDD!==0?fmtPnl(m.maxDD):'—',m.maxDD<0?'negative':'neutral',null,'La mayor caída acumulada desde un pico hasta el punto más bajo.'),
    metricCard('Tiempo Recuperación',m.avgDD>0?m.avgDD.toFixed(1)+' días':'—','neutral',null,'Días promedio que tardó tu cuenta en recuperarse luego de cada drawdown.'),
    metricCard('Frecuencia DD',m.ddCount,'neutral','veces','Cuántas veces tu cuenta entró en drawdown.'),
    metricCard('Mejor Racha',m.bestStreak,'positive','TPs consecutivos','Mayor cantidad de trades ganadores consecutivos.'),
  ].join('');

  // Frecuencia
  const freqGrid=document.getElementById('analytics-freq-grid');
  if(freqGrid) freqGrid.innerHTML=`
    <div class="freq-card"><div class="freq-label">Trades / día (prom.)</div><div class="freq-value">${m.tradesPerDay.toFixed(1)}</div></div>
    <div class="freq-card"><div class="freq-label">Trades / semana (prom.)</div><div class="freq-value">${m.tradesPerWeek.toFixed(1)}</div></div>
    <div class="freq-card"><div class="freq-label">Trades / mes (prom.)</div><div class="freq-value">${m.tradesPerMonth.toFixed(1)}</div></div>`;

  renderDayWR(trades);
  renderDonutChart(m.wins.length,m.losses.length,m.bes.length);
  renderKillZoneChart(trades);
  renderMonthChart(trades);
  renderEquityChart(equitySeries(trades),'chart-equity-analytics');
  renderPerfCalendar(trades);
}

function metricCard(label,value,cls,sub,tooltip){
  return `<div class="card">
    <div class="card-label">${label}${tooltip?`<div class="tooltip-wrap"><div class="tooltip-icon">i</div><div class="tooltip-box"><div class="tooltip-box-title">${label}</div>${tooltip}</div></div>`:''}</div>
    <div class="card-value ${cls||''}">${value}</div>
    ${sub?`<div class="card-sub">${sub}</div>`:''}
  </div>`;
}

function renderDayWR(trades){
  const wrap=document.getElementById('analytics-daywr'); if(!wrap)return;
  const days=['Lunes','Martes','Miércoles','Jueves','Viernes'];
  const map={};days.forEach(d=>{map[d]={pnl:0,wins:0,total:0};});
  trades.forEach(t=>{
    const d=new Date(t.date+'T12:00:00');
    const name=days[d.getDay()===0?6:d.getDay()-1];
    if(!name||!map[name])return;
    map[name].pnl+=t.pnl;
    if(t.result!=='BE')map[name].total++;
    if(t.result==='TP')map[name].wins++;
  });
  const maxPnl=Math.max(...days.map(d=>Math.abs(map[d].pnl)),1);
  wrap.innerHTML=days.map(d=>{
    const {pnl,wins,total}=map[d];
    const wr=total>0?wins/total:null;
    const barW=Math.round(Math.abs(pnl)/maxPnl*100);
    const barColor=pnl>=0?'var(--green)':'var(--red)';
    return `<div class="daywr-row">
      <span class="daywr-name">${d}</span>
      <div class="daywr-bar-wrap"><div class="daywr-bar" style="width:${barW}%;background:${barColor}"></div></div>
      <span class="daywr-pct ${wr!==null?colorClass(wr-.5):'neutral'}">${wr!==null?fmtPct(wr):'N/A'}</span>
    </div>`;
  }).join('');
}

function renderPerfCalendar(trades){
  const wrap=document.getElementById('perf-calendar-wrap'); if(!wrap)return;
  const byDay={};trades.forEach(t=>{byDay[t.date]=(byDay[t.date]||0)+t.pnl;});
  if(Object.keys(byDay).length===0){wrap.innerHTML='<div class="empty-state" style="padding:24px">Sin datos</div>';return;}
  const dates=Object.keys(byDay).sort();
  const months=[...new Set(dates.map(d=>d.slice(0,7)))].sort().reverse().slice(0,3);
  const monthNames=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  wrap.innerHTML=months.map(month=>{
    const[y,m]=month.split('-').map(Number);
    const firstDay=new Date(y,m-1,1).getDay();
    const daysInMonth=new Date(y,m,0).getDate();
    const offset=firstDay===0?6:firstDay-1;
    let cells='';
    for(let i=0;i<offset;i++)cells+=`<div class="cal-day empty"></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const key=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const pnl=byDay[key];
      if(pnl===undefined)cells+=`<div class="cal-day no-data"><span class="cal-num">${d}</span></div>`;
      else cells+=`<div class="cal-day ${pnl>=0?'pos':'neg'}"><span class="cal-num">${d}</span><span class="cal-pnl">${pnl>=0?'+':''}${pnl.toFixed(0)}$</span></div>`;
    }
    return `<div style="margin-bottom:16px">
      <div style="font-size:.82rem;font-weight:600;color:var(--text-muted);margin-bottom:8px">${monthNames[m-1]} ${y}</div>
      <div class="perf-calendar">
        <div class="cal-header">Lun</div><div class="cal-header">Mar</div><div class="cal-header">Mié</div>
        <div class="cal-header">Jue</div><div class="cal-header">Vie</div><div class="cal-header">Sáb</div><div class="cal-header">Dom</div>
        ${cells}
      </div></div>`;
  }).join('');
}

function renderDonutChart(wins,losses,bes){
  const ctx=document.getElementById('chart-donut'); if(!ctx)return;
  destroyChart('donut');
  if(wins+losses+bes===0)return;
  state.charts.donut=new Chart(ctx,{type:'doughnut',
    data:{labels:['TP','SL','BE'],datasets:[{data:[wins,losses,bes],
      backgroundColor:['rgba(76,175,80,.8)','rgba(244,67,54,.8)','rgba(136,136,136,.5)'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{color:'#888',font:{size:11}}},
        tooltip:{callbacks:{label:item=>` ${item.label}: ${item.raw}`},
        backgroundColor:'#1e1e1e',bodyColor:'#f0f0f0',borderColor:'#2e2e2e',borderWidth:1}}}});
}

function renderKillZoneChart(trades){
  const ctx=document.getElementById('chart-killzone'); if(!ctx)return;
  destroyChart('killzone');
  const map=groupBy(trades,t=>t.killZone),labels=Object.keys(map);
  const data=labels.map(k=>map[k].reduce((s,t)=>s+t.pnl,0));
  if(labels.length===0)return;
  state.charts.killzone=barChart(ctx,labels,data,'P&L por Kill Zone');
}

function renderMonthChart(trades){
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

function bindMonthYearFilter(){
  const sel=document.getElementById('month-chart-year');
  if(sel)sel.addEventListener('change',()=>renderMonthChart(state.trades));
}

function barChart(ctx,labels,data,label){
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

// ── NOTES ─────────────────────────────────────────────────────────────────────
function bindNoteForm(){
  document.getElementById('btn-add-note').addEventListener('click', async()=>{
    const textEl=document.getElementById('note-text'),linksEl=document.getElementById('note-links');
    const text=textEl.value.trim(),links=linksEl.value.split('\n').map(l=>l.trim()).filter(Boolean);
    if(!text){showToast('Escribe algo en la nota','error');return;}
    try {
      if(state.mode==='live') await addLiveNote({text,links});
      else await addNote({text,links});
      textEl.value='';linksEl.value='';
      showToast('Nota guardada','success');
      await loadData(); renderNotes();
    } catch(err){showToast(err.message,'error');}
  });
}

function renderNotes(){
  const container=document.getElementById('notes-list');
  if(state.notes.length===0){container.innerHTML='<div class="empty-state"><div class="empty-state-icon">📝</div>No hay notas aún</div>';return;}
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
    btn.addEventListener('click', async()=>{
      if(state.mode==='live') await deleteLiveNote(btn.dataset.noteId);
      else await deleteNote(btn.dataset.noteId);
      showToast('Nota eliminada','success');
      await loadData(); renderNotes();
    });
  });
}

// ── CLOUD UI ──────────────────────────────────────────────────────────────────
function bindCloudUI(){
  if(!db||!db.cloud){
    const loginBtn=document.getElementById('btn-cloud-login');
    const syncBadge=document.getElementById('sync-status');
    if(loginBtn)loginBtn.style.display='none';
    if(syncBadge)syncBadge.textContent='Solo local';
    return;
  }
  try{db.cloud.syncState.subscribe(s=>{
    const badge=document.getElementById('sync-status');if(!badge)return;
    const ui=syncPhaseMap(s&&s.phase);badge.textContent=ui.text;badge.className='sync-badge '+ui.cls;
  });}catch(e){}
  try{db.cloud.currentUser.subscribe(user=>{
    const loginBtn=document.getElementById('btn-cloud-login');
    const userWrap=document.getElementById('cloud-user-wrap');
    const emailEl=document.getElementById('cloud-user-email');
    if(!loginBtn||!userWrap||!emailEl)return;
    if(user&&user.isLoggedIn){loginBtn.style.display='none';userWrap.style.display='flex';emailEl.textContent=user.email||'Usuario';}
    else{loginBtn.style.display='';userWrap.style.display='none';}
  });}catch(e){}
  const loginBtn=document.getElementById('btn-cloud-login');
  if(loginBtn)loginBtn.addEventListener('click',()=>{db.cloud.login().catch(e=>showToast('Error: '+e.message,'error'));});
  const logoutBtn=document.getElementById('btn-cloud-logout');
  if(logoutBtn)logoutBtn.addEventListener('click',()=>{db.cloud.logout({deleteLocalData:false}).catch(()=>{});});
}

function syncPhaseMap(phase){
  if(!phase||['not-started','offline','disconnected','error'].includes(phase))return{text:'Offline',cls:'sync-offline'};
  if(['connecting','pushing','pulling'].includes(phase))return{text:'Sincronizando...',cls:'sync-syncing'};
  if(['in-sync','connected'].includes(phase))return{text:'Sincronizado',cls:'sync-ok'};
  return{text:'Offline',cls:'sync-offline'};
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
function setEl(id,val,cls){const el=document.getElementById(id);if(!el)return;el.textContent=val;if(cls)el.className='card-value '+cls;}
function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type+' show';clearTimeout(t._timer);t._timer=setTimeout(()=>{t.classList.remove('show');},3000);}

document.addEventListener('DOMContentLoaded', boot);
