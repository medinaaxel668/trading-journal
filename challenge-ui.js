// challenge-ui.js — UI del módulo Challenge (CON INSIGHTS)
import {
  getAllChallenges, addChallenge, updateChallenge, deleteChallenge,
  computeChallengeMetrics, ensureChallengeTable
} from './challenge.js';
import { generateInsights } from './insights.js';

const challengeState = {
  challenges: [],
  currentTab: 'dashboard',
  filterType: 'todos',
  filterFirma: 'Todas',
  editingId: null,
  // Prefill para "Crear fase fondeada": valores por defecto sin entrar en modo edición.
  prefill: null,
};

export async function initChallenge() {
  await ensureChallengeTable();
  await loadChallenges();
}

async function loadChallenges() {
  challengeState.challenges = await getAllChallenges().catch(() => []);
}

export async function enterChallengeMode() {
  await initChallenge();
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('mode-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  // Guardar contenido original del main antes de sobrescribirlo
  const main = document.querySelector('main.content');
  if (main && !main.dataset.originalContent) {
    main.dataset.originalContent = main.innerHTML;
  }
  const badge = document.getElementById('current-mode-badge');
  if (badge) {
    badge.textContent = 'Challenge';
    badge.className = 'mode-indicator badge-mode-challenge';
  }
  setupChallengeTabs();
  renderChallengeTab();
}

export function restoreOriginalTabs() {
  const nav = document.querySelector('.tabs');
  const main = document.querySelector('main.content');
  if (!nav || !nav.dataset.originalTabs) return;
  nav.innerHTML = nav.dataset.originalTabs;
  delete nav.dataset.originalTabs;
  // Restaurar también el contenido original del main
  if (main && main.dataset.originalContent) {
    main.innerHTML = main.dataset.originalContent;
    delete main.dataset.originalContent;
  }
}

function setupChallengeTabs() {
  const nav = document.querySelector('.tabs');
  if (!nav) return;
  if (!nav.dataset.originalTabs) {
    nav.dataset.originalTabs = nav.innerHTML;
  }
  nav.innerHTML = `
    <button class="tab-btn active" data-challenge-tab="dashboard">📊 Dashboard</button>
    <button class="tab-btn" data-challenge-tab="registrar">➕ Registrar</button>
    <button class="tab-btn" data-challenge-tab="historial">📋 Historial</button>
    <button class="tab-btn" data-challenge-tab="analytics">📈 Analytics</button>
    <button class="tab-btn" data-challenge-tab="insights">🤖 Insights</button>
  `;
  nav.querySelectorAll('[data-challenge-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('[data-challenge-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      challengeState.currentTab = btn.dataset.challengeTab;
      renderChallengeTab();
    });
  });
}

function renderChallengeTab() {
  const main = document.querySelector('main.content');
  if (!main) return;
  switch (challengeState.currentTab) {
    case 'dashboard': renderChallengeDashboard(main); break;
    case 'registrar': renderChallengeForm(main); break;
    case 'historial': renderChallengeHistory(main); break;
    case 'analytics': renderChallengeAnalytics(main); break;
    case 'insights': renderChallengeInsights(main); break;
  }
}

// ── DASHBOARD (igual que antes) ──────────────────────────────────────────────
function renderChallengeDashboard(container) {
  const m = computeChallengeMetrics(challengeState.challenges);
  container.innerHTML = `
    <section class="tab-section active">
      <div class="mode-stat-card" style="margin-bottom:24px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <select id="ch-filter-type" class="form-select" style="max-width:200px">
            <option value="todos" ${challengeState.filterType === 'todos' ? 'selected' : ''}>Todos los tipos</option>
            <option value="simulado" ${challengeState.filterType === 'simulado' ? 'selected' : ''}>Simulados</option>
            <option value="real" ${challengeState.filterType === 'real' ? 'selected' : ''}>Reales</option>
          </select>
          <select id="ch-filter-firma" class="form-select" style="max-width:200px">
            <option value="Todas">Todas las firmas</option>
            ${[...new Set(challengeState.challenges.map(c => c.firma))].map(f =>
              `<option value="${f}" ${challengeState.filterFirma === f ? 'selected' : ''}>${f}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="mode-stats-grid">
        <div class="card"><div class="card-label">Pruebas Totales</div><div class="card-value">${m.total}</div><div class="card-sub">$100 por prueba</div></div>
        <div class="card"><div class="card-label">Pasadas</div><div class="card-value positive">${m.passed}</div><div class="card-sub">${m.total > 0 ? Math.round((m.passed / m.total) * 100) : 0}% aprobación</div></div>
        <div class="card"><div class="card-label">Perdidas</div><div class="card-value negative">${m.lost}</div><div class="card-sub">${m.total > 0 ? Math.round((m.lost / m.total) * 100) : 0}% pérdida</div></div>
        <div class="card"><div class="card-label">Retiros</div><div class="card-value" style="color:var(--accent)">${m.withdrawals}</div><div class="card-sub">$500 por payout</div></div>
        <div class="card"><div class="card-label">En curso</div><div class="card-value">${m.enCurso}</div><div class="card-sub">activos ahora</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
        <div class="mode-stat-card">
          <div class="card-label" style="text-align:left">Conversión Pasadas → Retiro</div>
          <div class="card-value positive" style="font-size:2.5rem;margin:8px 0">${m.conversionFromPassed}%</div>
          <div class="card-sub">${m.withdrawals} retiros / ${m.passed} pasadas</div>
        </div>
        <div class="mode-stat-card">
          <div class="card-label" style="text-align:left">Conversión Total → Retiro</div>
          <div class="card-value" style="font-size:2.5rem;margin:8px 0;color:var(--accent)">${m.totalConversion}%</div>
          <div class="card-sub">${m.withdrawals} retiros / ${m.total} pruebas totales</div>
        </div>
      </div>
      <div class="mode-stat-card" style="margin-top:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">Embudo de Conversión</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${renderFunnelBar('Pruebas iniciadas', m.total, m.total, 'var(--blue, #3b82f6)')}
          ${renderFunnelBar('Pruebas pasadas', m.passed, m.total, 'var(--green, #4caf50)')}
          ${renderFunnelBar('Llegaron a retiro', m.withdrawals, m.total, 'var(--accent, #D7C9AE)')}
        </div>
      </div>
      <div class="mode-stat-card" style="margin-top:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">Retorno de Inversión</div>
        <div class="card-sub" style="margin-bottom:12px">Cuenta 50K · $100/prueba · Payout $500</div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px">
          <div><div class="card-sub">Invertido</div><div class="card-value negative" style="font-size:1.3rem">$${m.totalInvested.toLocaleString()}</div></div>
          <div><div class="card-sub">Total retirado</div><div class="card-value positive" style="font-size:1.3rem">$${m.totalWithdrawn.toLocaleString()}</div></div>
          <div><div class="card-sub">Ganancia neta</div><div class="card-value ${m.netProfit >= 0 ? 'positive' : 'negative'}" style="font-size:1.3rem">${m.netProfit >= 0 ? '+' : ''}$${m.netProfit.toLocaleString()}</div></div>
          <div><div class="card-sub">ROI</div><div class="card-value ${m.roi >= 0 ? 'positive' : 'negative'}" style="font-size:1.3rem">${m.roi >= 0 ? '+' : ''}${m.roi}%</div></div>
        </div>
      </div>
      <div class="mode-stats-grid" style="margin-top:24px">
        <div class="card"><div class="card-label">Prom. días examen</div><div class="card-value">${m.avgDaysExam}</div></div>
        <div class="card"><div class="card-label">Prom. días retiro</div><div class="card-value">${m.avgDaysRetiro}</div></div>
        <div class="card"><div class="card-label">Prom. días total</div><div class="card-value">${m.avgDaysExam + m.avgDaysRetiro}</div></div>
        <div class="card"><div class="card-label">Winrate promedio</div><div class="card-value">${m.avgWinrate}%</div></div>
      </div>
    </section>
  `;
  document.getElementById('ch-filter-type')?.addEventListener('change', (e) => {
    challengeState.filterType = e.target.value;
    renderChallengeTab();
  });
  document.getElementById('ch-filter-firma')?.addEventListener('change', (e) => {
    challengeState.filterFirma = e.target.value;
    renderChallengeTab();
  });
}

function renderFunnelBar(label, value, max, color) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:var(--text)">${label}</span>
        <span style="font-weight:600">${value}</span>
      </div>
      <div style="height:28px;background:var(--bg-input);border-radius:8px;overflow:hidden">
        <div style="height:100%;width:${Math.max(width, 8)}%;background:${color};border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;transition:width 0.5s">
          <span style="font-size:0.75rem;font-weight:600;color:white">${value}</span>
        </div>
      </div>
    </div>
  `;
}

// ── FORMULARIO (igual que antes) ─────────────────────────────────────────────
// Escapa texto para usarlo dentro de atributos HTML o textarea.
function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── FASES (examen / fondeado) ────────────────────────────────────────────────
// La fase es un tipo estático del registro; el estado (en_examen, pasado, …) sigue
// siendo dinámico. Los challenges viejos sin fase se muestran como Examen.
export function faseOf(c) {
  return c && c.fase === 'fondeado' ? 'fondeado' : 'examen';
}
export function faseLabel(fase) {
  return fase === 'fondeado' ? 'Fondeado' : 'Examen';
}
export function fasePillHtml(c) {
  const fase = faseOf(c);
  const style = fase === 'fondeado'
    ? 'background:rgba(255,193,7,.15);color:#ffca28;border:1px solid rgba(255,193,7,.3)'
    : 'background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)';
  return `<span style="font-size:.7rem;padding:2px 8px;border-radius:4px;${style}">${fase === 'fondeado' ? '💰 Fondeado' : '📝 Examen'}</span>`;
}
export function parentChallenge(c, challenges) {
  if (!c || !c.continuaA) return null;
  return (challenges || []).find(p => String(p.id) === String(c.continuaA)) || null;
}
export function continuaLineHtml(c, challenges) {
  if (!c || !c.continuaA) return '';
  const p = parentChallenge(c, challenges);
  const name = p ? (p.nombre || p.firma || '—') : '(registro eliminado)';
  const fl = p ? faseLabel(faseOf(p)) : '—';
  return `<div style="font-size:.8rem;color:var(--text-muted);margin:2px 0 6px">↳ continuación de <strong>${escAttr(name)}</strong> (${fl})</div>`;
}
// Solo un examen con estado "pasado" puede generar su fase fondeada.
export function canCreateFundedPhase(c) {
  return !!c && faseOf(c) === 'examen' && c.status === 'pasado';
}
// Valores precargados al crear la fase fondeada desde un examen pasado.
export function buildFundedPrefill(src) {
  if (!src) return null;
  return {
    nombre: src.nombre || '',
    type: src.type || 'simulado',
    firma: src.firma || '',
    cuentaSize: src.cuentaSize ?? 50000,
    profitTargetRetiro: src.profitTargetRetiro ?? 1000,
    payoutPercent: src.payoutPercent ?? 50,
    fase: 'fondeado',
    continuaA: src.id || '',
  };
}

function renderChallengeForm(container) {
  const today = new Date().toISOString().split('T')[0];
  // Si estamos editando, buscar el challenge para precargar sus datos en el form.
  // Si el id ya no existe (p. ej. se borró en otro dispositivo), volver a modo alta.
  let editing = null;
  if (challengeState.editingId) {
    editing = challengeState.challenges.find(c => String(c.id) === String(challengeState.editingId)) || null;
    if (!editing) challengeState.editingId = null;
  }
  // Prefill: valores por defecto al crear una fase fondeada (no es edición).
  const prefill = !editing ? (challengeState.prefill || null) : null;
  // src unifica edición y prefill para los valores por defecto del formulario.
  const src = editing || prefill || {};
  const isEdit = !!editing;
  const numVal = (v, fallback) => (v ?? fallback);
  const sel = (opt, cur) => String(opt) === String(cur) ? 'selected' : '';
  // Firmas: si la guardada no está en la lista base, agregarla para no perderla.
  const firmasBase = ['Alpha Capital', 'Funding Pips', 'FTMO', 'Apex', 'The Funded Trader'];
  const firmas = (src.firma && !firmasBase.includes(src.firma))
    ? [src.firma, ...firmasBase]
    : firmasBase;
  // Opciones de "Es continuación de": todos los challenges salvo el que se edita.
  const continuaOpts = challengeState.challenges.filter(c => !editing || String(c.id) !== String(editing.id));
  const prefillParent = prefill?.continuaA
    ? challengeState.challenges.find(c => String(c.id) === String(prefill.continuaA))
    : null;
  const formTitle = isEdit
    ? `Editar Challenge${src.firma ? ` — ${escAttr(src.firma)}` : ''}`
    : (prefill ? 'Registrar Fase Fondeada' : 'Registrar Nuevo Challenge');
  container.innerHTML = `
    <section class="tab-section active">
      <div class="mode-stat-card" style="text-align:left">
        <h2 style="margin-bottom:24px">${formTitle}</h2>
        ${(!isEdit && prefill) ? `<div style="margin-bottom:16px;font-size:.85rem;color:var(--text-muted)">↳ Precargado desde el examen <strong>${escAttr(prefillParent?.nombre || prefillParent?.firma || '')}</strong><button type="button" id="ch-clear-prefill" class="tab-btn" style="padding:2px 10px;font-size:.75rem;margin-left:8px">empezar de cero</button></div>` : ''}
        <form id="challenge-form">
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div class="mode-stat-label" style="margin-bottom:12px">Configuración</div>
            <div class="grid-2-col">
              <div><label class="mode-stat-label">Tipo</label><select name="type" class="form-select"><option value="simulado" ${sel('simulado', src.type ?? 'simulado')}>Simulado (FX Replay)</option><option value="real" ${sel('real', src.type)}>Real (Firma)</option></select></div>
              <div><label class="mode-stat-label">Nombre del Challenge (opcional)</label><input name="nombre" class="form-input" type="text" placeholder="Ej: Fase 1 FTMO" value="${escAttr(src.nombre)}" /></div>
              <div><label class="mode-stat-label">Firma</label><select name="firma" class="form-select">${firmas.map(f => `<option ${sel(f, src.firma ?? 'Alpha Capital')}>${escAttr(f)}</option>`).join('')}</select></div>
              <div><label class="mode-stat-label">Tamaño de cuenta ($)</label><input name="cuentaSize" class="form-input" type="number" value="${numVal(src.cuentaSize, 50000)}" /></div>
              <div><label class="mode-stat-label">Costo ($)</label><input name="costo" class="form-input" type="number" value="${numVal(src.costo, 100)}" /></div>
              <div><label class="mode-stat-label">Fase</label><select name="fase" class="form-select"><option value="examen" ${sel('examen', src.fase ?? 'examen')}>📝 Examen</option><option value="fondeado" ${sel('fondeado', src.fase)}>💰 Fondeado</option></select></div>
              <div><label class="mode-stat-label">Es continuación de</label><select name="continuaA" class="form-select"><option value="">— Ninguno —</option>${continuaOpts.map(c => `<option value="${c.id}" ${sel(c.id, src.continuaA ?? '')}>${escAttr(c.nombre || c.firma)} (${faseLabel(faseOf(c))})</option>`).join('')}</select></div>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div class="mode-stat-label" style="margin-bottom:12px">Objetivos</div>
            <div class="grid-3-col">
              <div><label class="mode-stat-label">Target examen ($)</label><input name="profitTargetExamen" class="form-input" type="number" value="${numVal(src.profitTargetExamen, 3000)}" /></div>
              <div><label class="mode-stat-label">Target retiro ($)</label><input name="profitTargetRetiro" class="form-input" type="number" value="${numVal(src.profitTargetRetiro, 1000)}" /></div>
              <div><label class="mode-stat-label">Payout (%)</label><input name="payoutPercent" class="form-input" type="number" value="${numVal(src.payoutPercent, 50)}" /></div>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div class="mode-stat-label" style="margin-bottom:12px">Fechas y Estado</div>
            <div class="grid-2-col">
              <div><label class="mode-stat-label">Estado</label><select name="status" class="form-select"><option value="en_examen" ${sel('en_examen', src.status ?? 'en_examen')}>En examen</option><option value="pasado" ${sel('pasado', src.status)}>Pasado</option><option value="en_retiro" ${sel('en_retiro', src.status)}>En fase retiro</option><option value="retiro_logrado" ${sel('retiro_logrado', src.status)}>Retiro logrado</option><option value="perdido" ${sel('perdido', src.status)}>Perdido</option><option value="retiro_fallido" ${sel('retiro_fallido', src.status)}>Retiro fallido</option></select></div>
              <div><label class="mode-stat-label">Fecha inicio examen</label><input name="fechaInicioExamen" class="form-input" type="date" value="${escAttr(src.fechaInicioExamen || today)}" required /></div>
              <div><label class="mode-stat-label">Fecha fin examen</label><input name="fechaFinExamen" class="form-input" type="date" value="${escAttr(src.fechaFinExamen)}" /></div>
              <div><label class="mode-stat-label">Fecha inicio retiro</label><input name="fechaInicioRetiro" class="form-input" type="date" value="${escAttr(src.fechaInicioRetiro)}" /></div>
              <div><label class="mode-stat-label">Fecha fin retiro</label><input name="fechaFinRetiro" class="form-input" type="date" value="${escAttr(src.fechaFinRetiro)}" /></div>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div class="mode-stat-label" style="margin-bottom:12px">Métricas Operativas</div>
            <div class="grid-3-col">
              <div><label class="mode-stat-label">Profit examen ($)</label><input name="profitExamen" class="form-input" type="number" value="${numVal(src.profitExamen, 0)}" /></div>
              <div><label class="mode-stat-label">Profit retiro ($)</label><input name="profitRetiro" class="form-input" type="number" value="${numVal(src.profitRetiro, 0)}" /></div>
              <div><label class="mode-stat-label">DD examen ($)</label><input name="drawdownExamen" class="form-input" type="number" value="${numVal(src.drawdownExamen, 0)}" /></div>
              <div><label class="mode-stat-label">DD retiro ($)</label><input name="drawdownRetiro" class="form-input" type="number" value="${numVal(src.drawdownRetiro, 0)}" /></div>
              <div style="display:none"><label class="mode-stat-label">Trades totales</label><input name="tradesTotales" class="form-input" type="number" value="${numVal(src.tradesTotales, 0)}" /></div>
              <div style="display:none"><label class="mode-stat-label">Trades fuera del plan</label><input name="tradesFueraDelPlan" class="form-input" type="number" value="${numVal(src.tradesFueraDelPlan, 0)}" /></div>
              <div style="display:none"><label class="mode-stat-label">Overtrades</label><input name="overtrades" class="form-input" type="number" value="${numVal(src.overtrades, 0)}" /></div>
              <div style="display:none"><label class="mode-stat-label">Revenge trades</label><input name="revengeTrades" class="form-input" type="number" value="${numVal(src.revengeTrades, 0)}" /></div>
              <div style="display:none"><label class="mode-stat-label">Winrate (%)</label><input name="winrate" class="form-input" type="number" value="${numVal(src.winrate, 0)}" /></div>
              <div><label class="mode-stat-label">RR promedio</label><input name="rrPromedio" class="form-input" type="number" step="0.1" value="${numVal(src.rrPromedio, 0)}" /></div>
            </div>
          </div>
          <div style="margin-bottom:20px">
            <label class="mode-stat-label">Notas / Aprendizaje</label>
            <textarea name="notas" class="form-input" rows="3" placeholder="¿Qué aprendiste? ¿Qué mejorarías?">${escAttr(src.notas)}</textarea>
          </div>
          <div id="challenge-form-error" style="color:var(--red);margin-bottom:10px"></div>
          <button type="submit" class="btn-enter-mode">${isEdit ? 'Actualizar Challenge' : 'Registrar Challenge'}</button>
          ${isEdit ? '<button type="button" id="ch-cancel-edit" class="tab-btn" style="width:100%;margin-top:12px">Cancelar edición</button>' : ''}
        </form>
      </div>
    </section>
  `;
  document.getElementById('challenge-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const errEl = document.getElementById('challenge-form-error');
    try {
      if (challengeState.editingId) {
        await updateChallenge(challengeState.editingId, data);
        challengeState.editingId = null;
        showToast('Challenge actualizado', 'success');
      } else {
        await addChallenge(data);
        showToast('Challenge registrado', 'success');
      }
      challengeState.prefill = null;
      form.reset();
      await loadChallenges();
      challengeState.currentTab = 'historial';
      document.querySelector('[data-challenge-tab="historial"]')?.click();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
  document.getElementById('ch-cancel-edit')?.addEventListener('click', () => {
    challengeState.editingId = null;
    renderChallengeForm(container);
  });
  document.getElementById('ch-clear-prefill')?.addEventListener('click', () => {
    challengeState.prefill = null;
    renderChallengeForm(container);
  });
}

// ── HISTORIAL (igual que antes) ──────────────────────────────────────────────
function renderChallengeHistory(container) {
  let filtered = [...challengeState.challenges];
  if (challengeState.filterType !== 'todos') {
    filtered = filtered.filter(c => c.type === challengeState.filterType);
  }
  if (challengeState.filterFirma !== 'Todas') {
    filtered = filtered.filter(c => c.firma === challengeState.filterFirma);
  }
  const statusLabels = {
    en_examen: 'En examen', pasado: 'Pasado', en_retiro: 'En fase retiro',
    retiro_logrado: 'Retiro logrado', perdido: 'Perdido', retiro_fallido: 'Retiro fallido',
  };
  const statusColors = {
    en_examen: 'background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)',
    pasado: 'background:rgba(76,175,80,.15);color:#81c784;border:1px solid rgba(76,175,80,.3)',
    en_retiro: 'background:rgba(156,39,176,.15);color:#ce93d8;border:1px solid rgba(156,39,176,.3)',
    retiro_logrado: 'background:rgba(215,201,174,.15);color:var(--accent);border:1px solid rgba(215,201,174,.3)',
    perdido: 'background:rgba(244,67,54,.15);color:#ef5350;border:1px solid rgba(244,67,54,.3)',
    retiro_fallido: 'background:rgba(255,152,0,.15);color:#ffb74d;border:1px solid rgba(255,152,0,.3)',
  };
  container.innerHTML = `
    <section class="tab-section active">
      <h2 style="margin-bottom:24px">Historial de Challenges</h2>
      ${filtered.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🏆</div>No hay challenges registrados</div>' : `
      <div style="display:flex;flex-direction:column;gap:12px">
        ${filtered.map(c => {
          const diasExamen = c.fechaFinExamen ? Math.ceil((new Date(c.fechaFinExamen).getTime() - new Date(c.fechaInicioExamen).getTime()) / 86400000) : '—';
          const disciplina = c.tradesTotales > 0 ? Math.round(((c.tradesTotales - c.tradesFueraDelPlan) / c.tradesTotales) * 100) : 0;
          const profitTotal = c.profitExamen + c.profitRetiro;
          return `
          <div class="trade-item" style="cursor:pointer">
            <div class="trade-item-header">
              <div style="display:flex;flex-wrap:wrap;gap:6px;flex:1;align-items:center">
                <strong>${c.firma}</strong>
                <span style="font-size:.7rem;padding:2px 8px;border-radius:4px;${c.type === 'simulado' ? 'background:rgba(59,130,246,.15);color:#60a5fa' : 'background:rgba(156,39,176,.15);color:#ce93d8'}">
                  ${c.type === 'simulado' ? '🎮 Sim' : '💰 Real'}
                </span>
                ${fasePillHtml(c)}
                <span style="font-size:.7rem;padding:2px 8px;border-radius:4px;${statusColors[c.status]}">
                  ${statusLabels[c.status]}
                </span>
              </div>
              <span class="trade-pnl ${profitTotal >= 0 ? 'positive' : 'negative'}">$${profitTotal.toLocaleString()}</span>
            </div>
            ${continuaLineHtml(c, challengeState.challenges)}
            <div class="trade-meta">
              <span>📅 ${c.fechaInicioExamen || '—'}</span>
              <span>⏱️ ${diasExamen} días examen</span>
              <span>📊 ${c.tradesTotales} trades</span>
              <span>✅ ${c.ganados ?? 0} ganados</span>
              <span>❌ ${c.perdidos ?? 0} perdidos</span>
              <span>⚖️ Breakeven: ${c.beTotal ?? 0} (${c.beHaciaTP ?? 0} - ${c.beHaciaSL ?? 0})</span>
              <span>🎯 Disciplina: ${disciplina}%</span>
              <span>💹 WR: ${c.winrate}%</span>
            </div>
            <div class="trade-actions">
              <button class="btn btn-edit" data-ch-id="${c.id}">Editar</button>
              <button class="btn btn-delete" data-ch-del-id="${c.id}">Borrar</button>
              ${canCreateFundedPhase(c) ? `<button class="btn" data-ch-fund-id="${c.id}">＋ Crear fase fondeada</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </section>
  `;
  container.querySelectorAll('[data-ch-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      challengeState.editingId = btn.dataset.chId;
      challengeState.prefill = null;
      challengeState.currentTab = 'registrar';
      document.querySelector('[data-challenge-tab="registrar"]')?.click();
    });
  });
  container.querySelectorAll('[data-ch-fund-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = challengeState.challenges.find(c => String(c.id) === String(btn.dataset.chFundId));
      const prefill = buildFundedPrefill(src);
      if (!prefill) return;
      challengeState.editingId = null;
      challengeState.prefill = prefill;
      challengeState.currentTab = 'registrar';
      document.querySelector('[data-challenge-tab="registrar"]')?.click();
    });
  });
  container.querySelectorAll('[data-ch-del-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Eliminar este challenge?')) {
        await deleteChallenge(btn.dataset.chDelId);
        showToast('Challenge eliminado', 'success');
        await loadChallenges();
        renderChallengeHistory(container);
      }
    });
  });
}

// ── ANALYTICS (con análisis de errores) ──────────────────────────────────────
function renderChallengeAnalytics(container) {
  const m = computeChallengeMetrics(challengeState.challenges);

  const totalOvertrades = challengeState.challenges.reduce((a, c) => a + (c.overtrades || 0), 0);
  const totalRevenge = challengeState.challenges.reduce((a, c) => a + (c.revengeTrades || 0), 0);
  const totalFueraDelPlan = challengeState.challenges.reduce((a, c) => a + (c.tradesFueraDelPlan || 0), 0);
  const totalTrades = challengeState.challenges.reduce((a, c) => a + (c.tradesTotales || 0), 0);
  const totalErrores = totalOvertrades + totalRevenge + totalFueraDelPlan;
  const pctErrores = totalTrades > 0 ? Math.round((totalErrores / totalTrades) * 100) : 0;

  const simOvertrades = m.simulados.reduce((a, c) => a + (c.overtrades || 0), 0);
  const simRevenge = m.simulados.reduce((a, c) => a + (c.revengeTrades || 0), 0);
  const simFueraPlan = m.simulados.reduce((a, c) => a + (c.tradesFueraDelPlan || 0), 0);
  const simTrades = m.simulados.reduce((a, c) => a + (c.tradesTotales || 0), 0);

  const realOvertrades = m.reales.reduce((a, c) => a + (c.overtrades || 0), 0);
  const realRevenge = m.reales.reduce((a, c) => a + (c.revengeTrades || 0), 0);
  const realFueraPlan = m.reales.reduce((a, c) => a + (c.tradesFueraDelPlan || 0), 0);
  const realTrades = m.reales.reduce((a, c) => a + (c.tradesTotales || 0), 0);

  container.innerHTML = `
    <section class="tab-section active">
      <h2 style="margin-bottom:24px">Analytics & Comparativa</h2>

      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">📊 Análisis de Errores</div>
        <div class="mode-stats-grid">
          <div class="card">
            <div class="card-label">Overtrades</div>
            <div class="card-value" style="color:#fb923c">${totalOvertrades}</div>
            <div class="card-sub">${simTrades > 0 ? Math.round((simOvertrades / simTrades) * 100) : 0}% en sim</div>
          </div>
          <div class="card">
            <div class="card-label">Revenge trades</div>
            <div class="card-value negative">${totalRevenge}</div>
            <div class="card-sub">${realTrades > 0 ? Math.round((realRevenge / realTrades) * 100) : 0}% en real</div>
          </div>
          <div class="card">
            <div class="card-label">Fuera del plan</div>
            <div class="card-value" style="color:#fbbf24">${totalFueraDelPlan}</div>
            <div class="card-sub">de ${totalTrades} trades</div>
          </div>
          <div class="card">
            <div class="card-label">% trades con error</div>
            <div class="card-value ${pctErrores <= 20 ? 'positive' : pctErrores <= 40 ? '' : 'negative'}">${pctErrores}%</div>
            <div class="card-sub">${totalErrores} errores totales</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
          <div style="padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div style="color:#60a5fa;font-weight:600;margin-bottom:12px">🎮 Errores en Simulados</div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:.9rem">
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Overtrades:</span><span style="color:#fb923c">${simOvertrades}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Revenge trades:</span><span class="negative">${simRevenge}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Fuera del plan:</span><span style="color:#fbbf24">${simFueraPlan}</span></div>
              <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)"><span style="color:var(--text-muted)">Total errores:</span><span style="font-weight:700">${simOvertrades + simRevenge + simFueraPlan}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">% trades con error:</span><span class="${simTrades > 0 && ((simOvertrades + simRevenge + simFueraPlan) / simTrades) <= 0.2 ? 'positive' : 'negative'}">${simTrades > 0 ? Math.round(((simOvertrades + simRevenge + simFueraPlan) / simTrades) * 100) : 0}%</span></div>
            </div>
          </div>
          <div style="padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div style="color:#ce93d8;font-weight:600;margin-bottom:12px">💰 Errores en Reales</div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:.9rem">
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Overtrades:</span><span style="color:#fb923c">${realOvertrades}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Revenge trades:</span><span class="negative">${realRevenge}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Fuera del plan:</span><span style="color:#fbbf24">${realFueraPlan}</span></div>
              <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)"><span style="color:var(--text-muted)">Total errores:</span><span style="font-weight:700">${realOvertrades + realRevenge + realFueraPlan}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">% trades con error:</span><span class="${realTrades > 0 && ((realOvertrades + realRevenge + realFueraPlan) / realTrades) <= 0.2 ? 'positive' : 'negative'}">${realTrades > 0 ? Math.round(((realOvertrades + realRevenge + realFueraPlan) / realTrades) * 100) : 0}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">Challenge Simulado vs Challenge Real</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div style="padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div style="color:#60a5fa;font-weight:600;margin-bottom:12px">🎮 Simulados (FX Replay)</div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:.9rem">
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Total:</span><span>${m.simulados.length}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Aprobados:</span><span class="positive">${m.simPassed} (${m.simulados.length > 0 ? Math.round((m.simPassed / m.simulados.length) * 100) : 0}%)</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Retiros:</span><span style="color:var(--accent)">${m.simWithdrawals}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Winrate prom.:</span><span>${m.simulados.length > 0 ? Math.round(m.simulados.reduce((a, c) => a + c.winrate, 0) / m.simulados.length) : 0}%</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">RR prom.:</span><span>${m.simulados.length > 0 ? (m.simulados.reduce((a, c) => a + c.rrPromedio, 0) / m.simulados.length).toFixed(1) : '0'}R</span></div>
            </div>
          </div>
          <div style="padding:16px;background:var(--bg-input);border-radius:var(--radius)">
            <div style="color:#ce93d8;font-weight:600;margin-bottom:12px">💰 Reales (Firmas)</div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:.9rem">
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Total:</span><span>${m.reales.length}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Aprobados:</span><span class="positive">${m.realPassed} (${m.reales.length > 0 ? Math.round((m.realPassed / m.reales.length) * 100) : 0}%)</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Retiros:</span><span style="color:var(--accent)">${m.realWithdrawals}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Winrate prom.:</span><span>${m.reales.length > 0 ? Math.round(m.reales.reduce((a, c) => a + c.winrate, 0) / m.reales.length) : 0}%</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">RR prom.:</span><span>${m.reales.length > 0 ? (m.reales.reduce((a, c) => a + c.rrPromedio, 0) / m.reales.length).toFixed(1) : '0'}R</span></div>
              <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)"><span style="color:var(--text-muted)">ROI real:</span><span class="${m.roi >= 0 ? 'positive' : 'negative'}" style="font-weight:700">${m.roi >= 0 ? '+' : ''}${m.roi}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">Performance por Firma</div>
        ${m.byFirma.length === 0 ? '<div class="card-sub">Sin datos</div>' : `
        <table style="width:100%;font-size:.9rem">
          <thead><tr style="border-bottom:1px solid var(--border);color:var(--text-muted)"><th style="text-align:left;padding:8px">Firma</th><th style="text-align:left;padding:8px">Pruebas</th><th style="text-align:left;padding:8px">Pasadas</th><th style="text-align:left;padding:8px">Retiros</th><th style="text-align:left;padding:8px">ROI</th></tr></thead>
          <tbody>
            ${m.byFirma.map(f => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px;font-weight:600">${f.firma}</td>
                <td style="padding:8px">${f.total}</td>
                <td style="padding:8px" class="positive">${f.pasadas}</td>
                <td style="padding:8px" style="color:var(--accent)">${f.retiros}</td>
                <td style="padding:8px;font-weight:700" class="${f.roi >= 0 ? 'positive' : 'negative'}">${f.roi >= 0 ? '+' : ''}${f.roi}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>

      <div class="mode-stats-grid">
        <div class="card"><div class="card-label">Winrate promedio</div><div class="card-value">${m.avgWinrate}%</div></div>
        <div class="card"><div class="card-label">RR promedio</div><div class="card-value">${m.avgRR}R</div></div>
        <div class="card"><div class="card-label">Disciplina prom.</div><div class="card-value ${m.avgDisciplina >= 80 ? 'positive' : m.avgDisciplina >= 60 ? '' : 'negative'}">${m.avgDisciplina}%</div></div>
        <div class="card"><div class="card-label">Break-even</div><div class="card-value">${m.withdrawals > 0 ? Math.ceil(m.totalInvested / 500) : '—'} retiros</div></div>
      </div>
    </section>
  `;
}

// ── INSIGHTS (NUEVO) ─────────────────────────────────────────────────────────
async function renderChallengeInsights(container) {
  container.innerHTML = `
    <section class="tab-section active">
      <h2 style="margin-bottom:24px">🤖 Insights Automáticos</h2>
      <div class="mode-stat-card" style="text-align:center;padding:40px">
        <div style="font-size:3rem;margin-bottom:16px">🔍</div>
        <p style="color:var(--text-muted)">Analizando tus datos...</p>
      </div>
    </section>
  `;

  const { insights, warnings, strengths, verifications } = await generateInsights();

  let html = `
    <section class="tab-section active">
      <h2 style="margin-bottom:24px">🤖 Insights Automáticos</h2>
  `;

  // Verificaciones de cálculos
  if (verifications.length > 0) {
    html += `
      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">✅ Verificación de Cálculos</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${verifications.map(v => `
            <div style="padding:12px;background:var(--bg-input);border-radius:var(--radius);border-left:4px solid ${v.type === 'error' ? 'var(--red)' : v.type === 'warning' ? '#fbbf24' : 'var(--green)'}">
              <div style="display:flex;align-items:start;gap:8px">
                <span style="font-size:1.2rem">${v.type === 'error' ? '❌' : v.type === 'warning' ? '⚠️' : '✅'}</span>
                <div style="flex:1">
                  <div style="font-weight:600;margin-bottom:4px">${v.challenge}</div>
                  <div style="font-size:.9rem;color:var(--text-muted)">${v.message}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Fortalezas
  if (strengths.length > 0) {
    html += `
      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">💪 Fortalezas Identificadas</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${strengths.map(s => `
            <div style="padding:16px;background:rgba(76,175,80,.05);border-radius:var(--radius);border-left:4px solid var(--green)">
              <div style="display:flex;align-items:start;gap:12px">
                <span style="font-size:1.5rem">${s.icon}</span>
                <div style="flex:1">
                  <div style="font-weight:600;margin-bottom:8px;font-size:1.05rem">${s.title}</div>
                  <div style="font-size:.9rem;color:var(--text);margin-bottom:8px">${s.message}</div>
                  <div style="font-size:.85rem;color:var(--green);font-style:italic">💡 ${s.recommendation}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Warnings
  if (warnings.length > 0) {
    html += `
      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">⚠️ Áreas de Mejora</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${warnings.map(w => `
            <div style="padding:16px;background:rgba(244,67,54,.05);border-radius:var(--radius);border-left:4px solid var(--red)">
              <div style="display:flex;align-items:start;gap:12px">
                <span style="font-size:1.5rem">${w.icon}</span>
                <div style="flex:1">
                  <div style="font-weight:600;margin-bottom:8px;font-size:1.05rem">${w.title}</div>
                  <div style="font-size:.9rem;color:var(--text);margin-bottom:8px">${w.message}</div>
                  <div style="font-size:.85rem;color:#fbbf24;font-style:italic">💡 ${w.recommendation}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Insights generales
  if (insights.length > 0) {
    html += `
      <div class="mode-stat-card" style="margin-bottom:24px">
        <div class="card-label" style="text-align:left;margin-bottom:16px">📊 Insights Detectados</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${insights.map(i => `
            <div style="padding:16px;background:var(--bg-input);border-radius:var(--radius);border-left:4px solid ${i.type === 'warning' ? '#fbbf24' : 'var(--blue)'}">
              <div style="display:flex;align-items:start;gap:12px">
                <span style="font-size:1.5rem">${i.icon}</span>
                <div style="flex:1">
                  <div style="font-weight:600;margin-bottom:8px;font-size:1.05rem">${i.title}</div>
                  <div style="font-size:.9rem;color:var(--text);margin-bottom:8px">${i.message}</div>
                  <div style="font-size:.85rem;color:var(--text-muted);font-style:italic">💡 ${i.recommendation}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Si no hay nada
  if (insights.length === 0 && warnings.length === 0 && strengths.length === 0) {
    html += `
      <div class="mode-stat-card" style="text-align:center;padding:40px">
        <div style="font-size:3rem;margin-bottom:16px">📝</div>
        <p style="color:var(--text-muted);margin-bottom:8px">No hay suficientes datos para generar insights</p>
        <p style="color:var(--text-muted);font-size:.9rem">Registrá más challenges para obtener análisis personalizados</p>
      </div>
    `;
  }

  html += `</section>`;
  container.innerHTML = html;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.classList.remove('show'); }, 3000);
}
