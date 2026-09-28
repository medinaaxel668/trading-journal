// trade-insights.js — Insights para trades (Backtesting + Live)
import { getAllTrades, getAllLiveTrades } from './db.js';

function computeTradeMetrics(trades) {
  if (!trades.length) return null;

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalCount = trades.length;
  const decisive = trades.filter(t => t.result === 'TP' || t.result === 'SL');
  const wins = decisive.filter(t => t.result === 'TP');
  const losses = decisive.filter(t => t.result === 'SL');
  const bes = trades.filter(t => t.result === 'BE');
  const winRate = decisive.length > 0 ? (wins.length / decisive.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const ev = winRate > 0 ? ((winRate / 100) * avgWin) - ((1 - winRate / 100) * avgLoss) : 0;
  const profitFactor = avgLoss > 0 && wins.length > 0
    ? wins.reduce((s, t) => s + t.pnl, 0) / Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    : null;

  const rrValues = trades.filter(t => t.rrPlanned).map(t => t.rrPlanned);
  const avgRR = rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null;
  const bestTrade = Math.max(...trades.map(t => t.pnl));
  const worstTrade = Math.min(...trades.map(t => t.pnl));

  let bestStreak = 0, worstStreak = 0, curTP = 0, curSL = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const t of sorted) {
    if (t.result === 'TP') { curTP++; curSL = 0; bestStreak = Math.max(bestStreak, curTP); }
    else if (t.result === 'SL') { curSL++; curTP = 0; worstStreak = Math.max(worstStreak, curSL); }
    else { curTP = 0; curSL = 0; }
  }

  // Drawdown
  let peak = 0, maxDD = 0, inDD = false, ddStart = null, eq = 0;
  for (const t of sorted) {
    eq += t.pnl;
    if (eq > peak) { peak = eq; inDD = false; ddStart = null; }
    else if (eq < peak) { if (!inDD) { inDD = true; ddStart = new Date(t.date); } maxDD = Math.min(maxDD, eq - peak); }
  }

  return {
    totalPnl, totalCount, winRate, avgWin, avgLoss, ev, profitFactor,
    avgRR, bestTrade, worstTrade, bestStreak, worstStreak,
    maxDD, decisiveCount: decisive.length, winCount: wins.length, lossCount: losses.length, beCount: bes.length
  };
}

function groupByTags(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = (t.tags || []).sort().join('+') || 'SIN_TAGS';
    if (!map.has(key)) map.set(key, { tags: t.tags || [], trades: [], count: 0, totalPnl: 0, wins: 0, losses: 0, bes: 0 });
    const g = map.get(key);
    g.trades.push(t);
    g.count++;
    g.totalPnl += t.pnl;
    if (t.result === 'TP') g.wins++;
    else if (t.result === 'SL') g.losses++;
    else if (t.result === 'BE') g.bes++;
  }
  return map;
}

function groupBySingleTag(trades) {
  const map = new Map();
  for (const t of trades) {
    const tags = t.tags || ['SIN_TAGS'];
    for (const tag of tags) {
      if (!map.has(tag)) map.set(tag, { trades: [], count: 0, totalPnl: 0, wins: 0, losses: 0, bes: 0, rrSum: 0, rrCount: 0 });
      const g = map.get(tag);
      g.trades.push(t);
      g.count++;
      g.totalPnl += t.pnl;
      if (t.rrPlanned) { g.rrSum += t.rrPlanned; g.rrCount++; }
      if (t.result === 'TP') g.wins++;
      else if (t.result === 'SL') g.losses++;
      else if (t.result === 'BE') g.bes++;
    }
  }
  return map;
}

function groupByKillZone(trades) {
  const map = new Map();
  for (const t of trades) {
    const kz = t.killZone || 'SIN_KZ';
    if (!map.has(kz)) map.set(kz, { trades: [], count: 0, totalPnl: 0, wins: 0, losses: 0, bes: 0 });
    const g = map.get(kz);
    g.trades.push(t);
    g.count++;
    g.totalPnl += t.pnl;
    if (t.result === 'TP') g.wins++;
    else if (t.result === 'SL') g.losses++;
    else if (t.result === 'BE') g.bes++;
  }
  return map;
}

function groupBySMT(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = t.smt ? 'CON_SMT' : 'SIN_SMT';
    if (!map.has(key)) map.set(key, { trades: [], count: 0, totalPnl: 0, wins: 0, losses: 0, bes: 0, avgRR: 0, rrSum: 0, rrCount: 0 });
    const g = map.get(key);
    g.trades.push(t);
    g.count++;
    g.totalPnl += t.pnl;
    if (t.rrPlanned) { g.rrSum += t.rrPlanned; g.rrCount++; }
    if (t.result === 'TP') g.wins++;
    else if (t.result === 'SL') g.losses++;
    else if (t.result === 'BE') g.bes++;
  }
  if (map.has('CON_SMT')) map.get('CON_SMT').avgRR = map.get('CON_SMT').rrCount > 0 ? map.get('CON_SMT').rrSum / map.get('CON_SMT').rrCount : 0;
  if (map.has('SIN_SMT')) map.get('SIN_SMT').avgRR = map.get('SIN_SMT').rrCount > 0 ? map.get('SIN_SMT').rrSum / map.get('SIN_SMT').rrCount : 0;
  return map;
}

function groupBySymbol(trades) {
  const map = new Map();
  for (const t of trades) {
    const sym = t.symbol || 'SIN_SYMBOL';
    if (!map.has(sym)) map.set(sym, { trades: [], count: 0, totalPnl: 0, wins: 0, losses: 0, bes: 0 });
    const g = map.get(sym);
    g.trades.push(t);
    g.count++;
    g.totalPnl += t.pnl;
    if (t.result === 'TP') g.wins++;
    else if (t.result === 'SL') g.losses++;
    else if (t.result === 'BE') g.bes++;
  }
  return map;
}

function groupByDayOfWeek(trades) {
  const map = new Map();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  for (const t of trades) {
    let d;
    if (t.date.includes('T')) {
      d = new Date(t.date).getDay();
    } else {
      const p = t.date.split('-');
      d = p.length === 3 ? new Date(p[0], p[1] - 1, p[2]).getDay() : new Date(t.date).getDay();
    }
    const key = days[d];
    if (!map.has(key)) map.set(key, { trades: [], count: 0, totalPnl: 0, wins: 0, losses: 0, bes: 0 });
    const g = map.get(key);
    g.trades.push(t);
    g.count++;
    g.totalPnl += t.pnl;
    if (t.result === 'TP') g.wins++;
    else if (t.result === 'SL') g.losses++;
    else if (t.result === 'BE') g.bes++;
  }
  return map;
}

function analyzeTagCombinations(trades, minCount = 3) {
  const comboMap = groupByTags(trades);
  const results = [];
  for (const [combo, data] of comboMap) {
    if (data.count < minCount) continue;
    const decisive = data.count - data.bes;
    const wr = decisive > 0 ? (data.wins / decisive) * 100 : 0;
    const avgPnl = data.totalPnl / data.count;
    results.push({
      combo,
      tags: data.tags,
      count: data.count,
      totalPnl: data.totalPnl,
      avgPnl,
      winRate: wr,
      wins: data.wins,
      losses: data.losses,
      bes: data.bes,
      decisive
    });
  }
  return results.sort((a, b) => b.totalPnl - a.totalPnl);
}

function analyzeTagSynergies(trades, minCount = 3) {
  // Buscar pares de tags que aparecen juntos y funcionan mejor que por separado
  const singleMap = groupBySingleTag(trades);
  const comboMap = groupByTags(trades);

  const synergies = [];
  for (const [combo, data] of comboMap) {
    if (data.count < minCount) continue;
    const tags = data.tags;
    if (tags.length < 2) continue;

    // Calcular WR esperado si fueran independientes
    let expectedWins = 0, expectedLosses = 0;
    for (const tag of tags) {
      const s = singleMap.get(tag);
      if (s && s.count > 0) {
        const wr = (s.wins / (s.wins + s.losses)) || 0;
        expectedWins += wr * data.count / tags.length;
        expectedLosses += (1 - wr) * data.count / tags.length;
      }
    }
    const expectedWR = (expectedWins + expectedLosses) > 0 ? expectedWins / (expectedWins + expectedLosses) * 100 : 0;
    const comboDecisive = data.wins + data.losses;
    const actualWR = comboDecisive > 0 ? (data.wins / comboDecisive) * 100 : 0;
    const diff = actualWR - expectedWR;

    synergies.push({
      combo,
      tags,
      count: data.count,
      totalPnl: data.totalPnl,
      actualWR,
      expectedWR: Math.round(expectedWR * 100) / 100,
      synergy: Math.round(diff * 100) / 100,
      isPositive: diff > 2
    });
  }
  return synergies.filter(s => s.isPositive).sort((a, b) => b.synergy - a.synergy);
}

export async function generateTradeInsights(mode = 'backtest') {
  const getTrades = mode === 'live' ? getAllLiveTrades : getAllTrades;
  const trades = await getTrades().catch(() => []);
  const label = mode === 'live' ? 'Live' : 'Backtesting';

  if (!trades.length) {
    return {
      mode: label,
      insights: [{ type: 'info', title: 'Sin datos', message: `No hay trades registrados en ${label}.`, recommendation: 'Registra trades para ver insights.' }],
      warnings: [],
      strengths: [],
      metrics: null,
      tagCombos: [],
      tagSynergies: [],
      singleTags: [],
      killZones: [],
      smt: [],
      symbols: [],
      daysOfWeek: []
    };
  }

  const metrics = computeTradeMetrics(trades);
  const tagCombos = analyzeTagCombinations(trades, 3);
  const tagSynergies = analyzeTagSynergies(trades, 3);
  const singleTags = Array.from(groupBySingleTag(trades).entries())
    .map(([tag, d]) => ({
      tag,
      count: d.count,
      totalPnl: d.totalPnl,
      avgPnl: d.totalPnl / d.count,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 10000) / 100 : 0,
      avgRR: d.rrCount > 0 ? Math.round((d.rrSum / d.rrCount) * 100) / 100 : null,
      wins: d.wins, losses: d.losses, bes: d.bes
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  const killZones = Array.from(groupByKillZone(trades).entries())
    .map(([kz, d]) => ({
      killZone: kz,
      count: d.count,
      totalPnl: d.totalPnl,
      avgPnl: d.totalPnl / d.count,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 10000) / 100 : 0,
      wins: d.wins, losses: d.losses, bes: d.bes
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  const smt = Array.from(groupBySMT(trades).entries())
    .map(([k, d]) => ({
      type: k,
      count: d.count,
      totalPnl: d.totalPnl,
      avgPnl: d.totalPnl / d.count,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 10000) / 100 : 0,
      avgRR: d.avgRR,
      wins: d.wins, losses: d.losses, bes: d.bes
    }));

  const symbols = Array.from(groupBySymbol(trades).entries())
    .map(([sym, d]) => ({
      symbol: sym,
      count: d.count,
      totalPnl: d.totalPnl,
      avgPnl: d.totalPnl / d.count,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 10000) / 100 : 0,
      wins: d.wins, losses: d.losses, bes: d.bes
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  const daysOfWeek = Array.from(groupByDayOfWeek(trades).entries())
    .map(([day, d]) => ({
      day,
      count: d.count,
      totalPnl: d.totalPnl,
      avgPnl: d.totalPnl / d.count,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 10000) / 100 : 0,
      wins: d.wins, losses: d.losses, bes: d.bes
    }));

  // ── GENERAR INSIGHTS ──────────────────────────────────────────────
  const insights = [];
  const warnings = [];
  const strengths = [];

  // 1. Mejor combinación de tags
  if (tagCombos.length > 0) {
    const best = tagCombos[0];
    if (best.winRate >= 55 && best.count >= 5) {
      strengths.push({
        icon: '🎯',
        title: `Mejor combinación: ${best.combo.replace(/\+/g, ' + ')}`,
        message: `WR ${best.winRate.toFixed(1)}% en ${best.count} trades. P&L total: $${best.totalPnl.toFixed(2)}.`,
        recommendation: 'Esta es tu combinación estrella. Prioriza setups que la cumplan.'
      });
    }
  }

  // 2. Sinergias positivas
  if (tagSynergies.length > 0) {
    const bestSynergy = tagSynergies[0];
    strengths.push({
      icon: '🔗',
      title: `Sinergia detectada: ${bestSynergy.tags.join(' + ')}`,
      message: `Juntos rinden ${bestSynergy.synergy}% mejor en WR que por separado (Actual: ${bestSynergy.actualWR}% vs Esperado: ${bestSynergy.expectedWR}%).`,
      recommendation: 'Busca setups donde coincidan estas confluencias simultáneamente.'
    });
  }

  // 3. Tag individual más rentable
  if (singleTags.length > 0) {
    const best = singleTags[0];
    if (best.totalPnl > 0 && best.count >= 3) {
      strengths.push({
        icon: '🏷️',
        title: `Tag más rentable: ${best.tag}`,
        message: `$${best.totalPnl.toFixed(2)} en ${best.count} trades (WR ${best.winRate}%, RR avg ${best.avgRR || 'N/A'}R).`,
        recommendation: 'Marca este tag en tus setups prioritarios.'
      });
    }
    // Tag perdedor
    const worst = singleTags[singleTags.length - 1];
    if (worst.totalPnl < 0 && worst.count >= 3) {
      warnings.push({
        icon: '⚠️',
        title: `Tag perdedor: ${worst.tag}`,
        message: `$${worst.totalPnl.toFixed(2)} en ${worst.count} trades (WR ${worst.winRate}%).`,
        recommendation: 'Revisa por qué este tag falla. ¿Es el setup, la ejecución, o el contexto?'
      });
    }
  }

  // 4. Kill Zone analysis
  if (killZones.length > 1) {
    const bestKZ = killZones[0];
    const worstKZ = killZones[killZones.length - 1];
    if (bestKZ.totalPnl > 0 && bestKZ.count >= 3) {
      strengths.push({
        icon: '🕐',
        title: `Mejor Kill Zone: ${bestKZ.killZone}`,
        message: `$${bestKZ.totalPnl.toFixed(2)} en ${bestKZ.count} trades (WR ${bestKZ.winRate}%).`,
        recommendation: 'Enfoca tu operación en esta sesión.'
      });
    }
    if (worstKZ.totalPnl < 0 && worstKZ.count >= 3) {
      warnings.push({
        icon: '🕐',
        title: `Peor Kill Zone: ${worstKZ.killZone}`,
        message: `$${worstKZ.totalPnl.toFixed(2)} en ${worstKZ.count} trades (WR ${worstKZ.winRate}%).`,
        recommendation: 'Evita operar en esta sesión o reduce tamaño drásticamente.'
      });
    }
  }

  // 5. SMT analysis
  if (smt.length === 2) {
    const withSMT = smt.find(s => s.type === 'CON_SMT');
    const withoutSMT = smt.find(s => s.type === 'SIN_SMT');
    if (withSMT && withoutSMT && withSMT.count >= 5 && withoutSMT.count >= 5) {
      const wrDiff = withSMT.winRate - withoutSMT.winRate;
      const pnlDiff = withSMT.avgPnl - withoutSMT.avgPnl;
      if (wrDiff > 5 || pnlDiff > 0) {
        strengths.push({
          icon: '🧠',
          title: 'SMT mejora tu rendimiento',
          message: `Con SMT: WR ${withSMT.winRate}%, P&L/trade $${withSMT.avgPnl.toFixed(2)}. Sin SMT: WR ${withoutSMT.winRate}%, P&L/trade $${withoutSMT.avgPnl.toFixed(2)}.`,
          recommendation: 'Sigue usando SMT como filtro de confirmación.'
        });
      } else if (wrDiff < -5 || pnlDiff < 0) {
        warnings.push({
          icon: '🧠',
          title: 'SMT no está ayudando',
          message: `Con SMT rinde peor que sin él. Diferencia WR: ${wrDiff.toFixed(1)}%.`,
          recommendation: 'Revisa tu uso de SMT. ¿Estás forzando confluencias que no existen?'
        });
      }
    }
  }

  // 6. Símbolos
  if (symbols.length > 1) {
    const bestSym = symbols[0];
    const worstSym = symbols[symbols.length - 1];
    if (bestSym.totalPnl > 0 && bestSym.count >= 5) {
      strengths.push({
        icon: '📈',
        title: `Mejor activo: ${bestSym.symbol}`,
        message: `$${bestSym.totalPnl.toFixed(2)} en ${bestSym.count} trades (WR ${bestSym.winRate}%).`,
        recommendation: 'Especialízate en este activo.'
      });
    }
    if (worstSym.totalPnl < 0 && worstSym.count >= 5) {
      warnings.push({
        icon: '📉',
        title: `Activo problemático: ${worstSym.symbol}`,
        message: `$${worstSym.totalPnl.toFixed(2)} en ${worstSym.count} trades (WR ${worstSym.winRate}%).`,
        recommendation: 'Deja de operar este activo hasta encontrar edge claro.'
      });
    }
  }

  // 7. Días de la semana
  const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const orderedDays = daysOfWeek.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
  const profitableDays = orderedDays.filter(d => d.totalPnl > 0 && d.count >= 3);
  const losingDays = orderedDays.filter(d => d.totalPnl < 0 && d.count >= 3);
  if (profitableDays.length > 0) {
    const bestDay = profitableDays.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b);
    insights.push({
      type: 'info',
      icon: '📅',
      title: `Mejor día: ${bestDay.day}`,
      message: `$${bestDay.totalPnl.toFixed(2)} (WR ${bestDay.winRate}%) en ${bestDay.count} trades.`,
      recommendation: 'Aumenta actividad este día si el setup aparece.'
    });
  }
  if (losingDays.length > 0) {
    const worstDay = losingDays.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b);
    warnings.push({
      icon: '📅',
      title: `Peor día: ${worstDay.day}`,
      message: `$${worstDay.totalPnl.toFixed(2)} (WR ${worstDay.winRate}%) en ${worstDay.count} trades.`,
      recommendation: 'Considera no operar este día o reducir tamaño al mínimo.'
    });
  }

  // 9. Métricas globales
  if (metrics.winRate < 40 && (metrics.avgRR || 0) < 1.5) {
    warnings.push({
      icon: '📉',
      title: 'Winrate y RR bajos',
      message: `WR ${metrics.winRate.toFixed(1)}% con RR ${metrics.avgRR?.toFixed(2) || 'N/A'}R. No es rentable a largo plazo.`,
      recommendation: 'Mejora calidad de entradas (subir WR) o busca targets más amplios (subir RR).'
    });
  } else if (metrics.winRate >= 50 && (metrics.avgRR || 0) >= 2) {
    strengths.push({
      icon: '🏆',
      title: 'Edge estadístico sólido',
      message: `WR ${metrics.winRate.toFixed(1)}% con RR ${metrics.avgRR?.toFixed(2) || 'N/A'}R. Ventaja clara.`,
      recommendation: 'Mantén disciplina y consistencia. El edge está probado.'
    });
  }

  if (metrics.maxDD < -500) {
    warnings.push({
      icon: '📉',
      title: 'Drawdown significativo',
      message: `Máximo drawdown: $${Math.abs(metrics.maxDD).toFixed(2)}.`,
      recommendation: 'Reduce riesgo por trade a 0.5-1% de capital. Implementa stop diario.'
    });
  }

  if (metrics.bestStreak >= 5) {
    strengths.push({
      icon: '🔥',
      title: `Racha ganadora de ${metrics.bestStreak}`,
      message: 'Sabes aprovechar las rachas positivas.',
      recommendation: 'Durante rachas, mantén tamaño, no lo aumentes por euforia.'
    });
  }

  if (metrics.worstStreak >= 4) {
    warnings.push({
      icon: '❄️',
      title: `Racha perdedora de ${metrics.worstStreak}`,
      message: 'Rachas largas de SL indican problema de ejecución o mercado adverso.',
      recommendation: 'Regla: tras 3 SL seguidos, parar 1 hora y revisar plan.'
    });
  }

  // 10. Profit Factor
  if (metrics.profitFactor && metrics.profitFactor < 1.2) {
    warnings.push({
      icon: '⚖️',
      title: 'Profit Factor bajo',
      message: `PF = ${metrics.profitFactor.toFixed(2)}. Por cada $1 perdido, ganas $${metrics.profitFactor.toFixed(2)}.`,
      recommendation: 'Objetivo PF > 1.5. Mejora selección de trades o gestión de salidas.'
    });
  } else if (metrics.profitFactor && metrics.profitFactor >= 2) {
    strengths.push({
      icon: '⚖️',
      title: 'Excelente Profit Factor',
      message: `PF = ${metrics.profitFactor.toFixed(2)}. Sistema muy robusto.`,
      recommendation: 'El sistema funciona. Enfócate en escalar con disciplina.'
    });
  }

  // 11. EV
  if (metrics.ev <= 0) {
    warnings.push({
      icon: '📊',
      title: 'Expected Value negativo o neutro',
      message: `EV = $${metrics.ev.toFixed(2)} por trade. A largo plazo pierdes dinero.`,
      recommendation: 'URGENTE: Cambia estrategia, reduce riesgo, o para y backtestea más.'
    });
  } else if (metrics.ev > 50) {
    strengths.push({
      icon: '💰',
      title: `EV excelente: $${metrics.ev.toFixed(2)}/trade`,
      message: 'Cada trade suma valor esperado significativo.',
      recommendation: 'Más trades = más ganancia (si mantienes calidad).'
    });
  }

  return {
    mode: label,
    insights,
    warnings,
    strengths,
    metrics,
    tagCombos: tagCombos.slice(0, 10),
    tagSynergies: tagSynergies.slice(0, 5),
    singleTags: singleTags.slice(0, 15),
    killZones,
    smt,
    symbols: symbols.slice(0, 10),
    daysOfWeek: orderedDays
  };
}