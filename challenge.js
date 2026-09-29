// challenge.js — Módulo Challenge (simulados y reales)
import { db } from './db.js';

export async function ensureChallengeTable() {
  if (db.challenges) return;
  try {
    await db.close();
    db.version(4).stores({
      trades:     'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt,[date+strategyName]',
      notes:      'id,date,createdAt',
      liveTrades: 'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt',
      liveNotes:  'id,date,createdAt',
      challenges: 'id,type,firma,status,createdAt,fechaInicioExamen'
    });
    await db.open();
    console.log('[challenge] Tabla challenges creada ✓');
  } catch(e) {
    console.warn('[challenge] Error al crear tabla:', e.message);
    try { await db.open(); } catch(_) {}
  }
}

function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}

function nowISO() { return new Date().toISOString(); }


export async function getAllChallenges() {
  const challenges = await db.challenges.orderBy('createdAt').reverse().toArray();
  const allTrades = await db.trades.toArray();
  const allLiveTrades = await db.liveTrades.toArray();
  const all = [...allTrades, ...allLiveTrades];
  
  for (const c of challenges) {
    const linked = all.filter(t => t.challengeId === c.id);
    c.tradesTotales = linked.length;
    c.overtrades = linked.filter(t => t.isOvertrade).length;
    c.revengeTrades = linked.filter(t => t.isRevengeTrade).length;
    c.tradesFueraDelPlan = linked.filter(t => t.isFueraDelPlan).length;
    c.profitCalculado = linked.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const decisive = linked.filter(t => t.result === 'TP' || t.result === 'SL');
    const wins = decisive.filter(t => t.result === 'TP');
    c.winrate = decisive.length > 0 ? (wins.length / decisive.length) * 100 : 0;
    const rrs = linked.filter(t => t.rrPlanned).map(t => t.rrPlanned);
    c.rrPromedio = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  }
  return challenges;
}


export async function addChallenge(data) {
  const challenge = {
    id: uuid(),
    nombre: String(data.nombre || '').trim(),
    type: String(data.type || 'simulado').trim(),
    firma: String(data.firma || '').trim(),
    cuentaSize: Number(data.cuentaSize) || 50000,
    costo: Number(data.costo) || 100,
    profitTargetExamen: Number(data.profitTargetExamen) || 3000,
    profitTargetRetiro: Number(data.profitTargetRetiro) || 1000,
    payoutPercent: Number(data.payoutPercent) || 50,
    payoutAmount: (Number(data.profitTargetRetiro) || 1000) * ((Number(data.payoutPercent) || 50) / 100),
    status: String(data.status || 'en_examen').trim(),
    fechaInicioExamen: String(data.fechaInicioExamen || '').trim(),
    fechaFinExamen: String(data.fechaFinExamen || '').trim(),
    fechaInicioRetiro: String(data.fechaInicioRetiro || '').trim(),
    fechaFinRetiro: String(data.fechaFinRetiro || '').trim(),
    profitExamen: Number(data.profitExamen) || 0,
    profitRetiro: Number(data.profitRetiro) || 0,
    drawdownExamen: Number(data.drawdownExamen) || 0,
    drawdownRetiro: Number(data.drawdownRetiro) || 0,
    tradesTotales: Number(data.tradesTotales) || 0,
    tradesFueraDelPlan: Number(data.tradesFueraDelPlan) || 0,
    overtrades: Number(data.overtrades) || 0,
    revengeTrades: Number(data.revengeTrades) || 0,
    winrate: Number(data.winrate) || 0,
    rrPromedio: Number(data.rrPromedio) || 0,
    notas: String(data.notas || '').trim(),
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  if (!challenge.firma) throw new Error('La firma es requerida');
  if (!challenge.fechaInicioExamen) throw new Error('La fecha de inicio es requerida');
  await db.challenges.add(challenge);
  return challenge;
}

export async function updateChallenge(id, data) {
  const existing = await db.challenges.get(id);
  if (!existing) throw new Error('Challenge no encontrado');
  const updated = {
    ...existing,
    nombre: String(data.nombre || existing.nombre).trim(),
    type: String(data.type || existing.type).trim(),
    firma: String(data.firma || existing.firma).trim(),
    cuentaSize: Number(data.cuentaSize ?? existing.cuentaSize),
    costo: Number(data.costo ?? existing.costo),
    profitTargetExamen: Number(data.profitTargetExamen ?? existing.profitTargetExamen),
    profitTargetRetiro: Number(data.profitTargetRetiro ?? existing.profitTargetRetiro),
    payoutPercent: Number(data.payoutPercent ?? existing.payoutPercent),
    payoutAmount: (Number(data.profitTargetRetiro ?? existing.profitTargetRetiro)) * ((Number(data.payoutPercent ?? existing.payoutPercent)) / 100),
    status: String(data.status || existing.status).trim(),
    fechaInicioExamen: String(data.fechaInicioExamen ?? existing.fechaInicioExamen).trim(),
    fechaFinExamen: String(data.fechaFinExamen ?? existing.fechaFinExamen).trim(),
    fechaInicioRetiro: String(data.fechaInicioRetiro ?? existing.fechaInicioRetiro).trim(),
    fechaFinRetiro: String(data.fechaFinRetiro ?? existing.fechaFinRetiro).trim(),
    profitExamen: Number(data.profitExamen ?? existing.profitExamen),
    profitRetiro: Number(data.profitRetiro ?? existing.profitRetiro),
    drawdownExamen: Number(data.drawdownExamen ?? existing.drawdownExamen),
    drawdownRetiro: Number(data.drawdownRetiro ?? existing.drawdownRetiro),
    tradesTotales: Number(data.tradesTotales ?? existing.tradesTotales),
    tradesFueraDelPlan: Number(data.tradesFueraDelPlan ?? existing.tradesFueraDelPlan),
    overtrades: Number(data.overtrades ?? existing.overtrades),
    revengeTrades: Number(data.revengeTrades ?? existing.revengeTrades),
    winrate: Number(data.winrate ?? existing.winrate),
    rrPromedio: Number(data.rrPromedio ?? existing.rrPromedio),
    notas: String(data.notas ?? existing.notas).trim(),
    updatedAt: nowISO()
  };
  await db.challenges.put(updated);
  return updated;
}

export async function deleteChallenge(id) {
  await db.challenges.delete(id);
}

export function computeChallengeMetrics(challenges) {
  const total = challenges.length;
  const passed = challenges.filter(c => ['pasado','en_retiro','retiro_logrado'].includes(c.status)).length;
  const lost = challenges.filter(c => c.status === 'perdido').length;
  const withdrawals = challenges.filter(c => c.status === 'retiro_logrado').length;
  const enCurso = challenges.filter(c => ['en_examen','en_retiro'].includes(c.status)).length;
  const conversionFromPassed = passed > 0 ? Math.round((withdrawals / passed) * 100) : 0;
  const totalConversion = total > 0 ? Math.round((withdrawals / total) * 100) : 0;
  const totalInvested = total * 100;
  const totalWithdrawn = withdrawals * 500;
  const netProfit = totalWithdrawn - totalInvested;
  const roi = totalInvested > 0 ? Math.round((netProfit / totalInvested) * 100) : 0;
  const passedChallenges = challenges.filter(c => c.fechaFinExamen && c.fechaInicioExamen && ['pasado','en_retiro','retiro_logrado'].includes(c.status));
  const avgDaysExam = passedChallenges.length > 0
    ? Math.round(passedChallenges.reduce((a, c) => {
        const days = Math.ceil((new Date(c.fechaFinExamen).getTime() - new Date(c.fechaInicioExamen).getTime()) / 86400000);
        return a + days;
      }, 0) / passedChallenges.length)
    : 0;
  const withdrawalChallenges = challenges.filter(c => c.fechaFinRetiro && c.fechaInicioRetiro && c.status === 'retiro_logrado');
  const avgDaysRetiro = withdrawalChallenges.length > 0
    ? Math.round(withdrawalChallenges.reduce((a, c) => {
        const days = Math.ceil((new Date(c.fechaFinRetiro).getTime() - new Date(c.fechaInicioRetiro).getTime()) / 86400000);
        return a + days;
      }, 0) / withdrawalChallenges.length)
    : 0;
  const simulados = challenges.filter(c => c.type === 'simulado');
  const reales = challenges.filter(c => c.type === 'real');
  const simPassed = simulados.filter(c => ['pasado','en_retiro','retiro_logrado'].includes(c.status)).length;
  const realPassed = reales.filter(c => ['pasado','en_retiro','retiro_logrado'].includes(c.status)).length;
  const simWithdrawals = simulados.filter(c => c.status === 'retiro_logrado').length;
  const realWithdrawals = reales.filter(c => c.status === 'retiro_logrado').length;
  const firmas = [...new Set(challenges.map(c => c.firma))];
  const byFirma = firmas.map(firma => {
    const fc = challenges.filter(c => c.firma === firma);
    const fTotal = fc.length;
    const fPassed = fc.filter(c => ['pasado','en_retiro','retiro_logrado'].includes(c.status)).length;
    const fWithdrawals = fc.filter(c => c.status === 'retiro_logrado').length;
    const fInvested = fTotal * 100;
    const fWithdrawn = fWithdrawals * 500;
    const fRoi = fInvested > 0 ? Math.round(((fWithdrawn - fInvested) / fInvested) * 100) : 0;
    return { firma, total: fTotal, pasadas: fPassed, retiros: fWithdrawals, roi: fRoi };
  });
  const avgWinrate = challenges.length > 0
    ? Math.round(challenges.reduce((a, c) => a + (c.winrate || 0), 0) / challenges.length)
    : 0;
  const avgRR = challenges.length > 0
    ? (challenges.reduce((a, c) => a + (c.rrPromedio || 0), 0) / challenges.length).toFixed(1)
    : '0';
  const avgDisciplina = challenges.length > 0
    ? Math.round(challenges.reduce((a, c) => {
        const d = c.tradesTotales > 0 ? ((c.tradesTotales - c.tradesFueraDelPlan) / c.tradesTotales) * 100 : 0;
        return a + d;
      }, 0) / challenges.length)
    : 0;
  return {
    total, passed, lost, withdrawals, enCurso,
    conversionFromPassed, totalConversion,
    totalInvested, totalWithdrawn, netProfit, roi,
    avgDaysExam, avgDaysRetiro,
    simulados, reales,
    simPassed, realPassed, simWithdrawals, realWithdrawals,
    byFirma,
    avgWinrate, avgRR, avgDisciplina
  };
}