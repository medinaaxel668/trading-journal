// insights.js — Sistema de Insights Automáticos y Verificación de Datos
import { getAllChallenges, computeChallengeMetrics } from './challenge.js';

export async function generateInsights() {
  const challenges = await getAllChallenges().catch(() => []);
  if (challenges.length === 0) {
    return { insights: [], warnings: [], strengths: [], verifications: [] };
  }

  const m = computeChallengeMetrics(challenges);
  const insights = [];
  const warnings = [];
  const strengths = [];
  const verifications = [];

  // ── VERIFICACIÓN DE CÁLCULOS ─────────────────────────────────────────────
  challenges.forEach(c => {
    // Verificar que payoutAmount sea correcto
    const expectedPayout = c.profitTargetRetiro * (c.payoutPercent / 100);
    if (Math.abs(c.payoutAmount - expectedPayout) > 0.01) {
      verifications.push({
        type: 'error',
        challenge: c.firma,
        message: `Payout incorrecto en ${c.firma}: debería ser $${expectedPayout}, tiene $${c.payoutAmount}`
      });
    }

    // Verificar que profit no exceda target (si está completado)
    if (c.status === 'retiro_logrado' && c.profitRetiro > 0) {
      if (c.profitRetiro < c.profitTargetRetiro * 0.9) {
        verifications.push({
          type: 'warning',
          challenge: c.firma,
          message: `Profit de retiro ($${c.profitRetiro}) es menor al 90% del target ($${c.profitTargetRetiro})`
        });
      }
    }

    // Verificar consistencia de fechas
    if (c.fechaFinExamen && c.fechaInicioExamen) {
      const dias = Math.ceil((new Date(c.fechaFinExamen).getTime() - new Date(c.fechaInicioExamen).getTime()) / 86400000);
      if (dias < 0) {
        verifications.push({
          type: 'error',
          challenge: c.firma,
          message: `Fechas inconsistentes: fin de examen (${c.fechaFinExamen}) es antes del inicio (${c.fechaInicioExamen})`
        });
      }
    }

    // Verificar que trades fuera del plan no exceda trades totales
    if (c.tradesFueraDelPlan > c.tradesTotales) {
      verifications.push({
        type: 'error',
        challenge: c.firma,
        message: `Trades fuera del plan (${c.tradesFueraDelPlan}) excede trades totales (${c.tradesTotales})`
      });
    }
  });

  // Verificar ROI global
  const expectedROI = m.totalInvested > 0 ? Math.round(((m.totalWithdrawn - m.totalInvested) / m.totalInvested) * 100) : 0;
  if (Math.abs(m.roi - expectedROI) > 1) {
    verifications.push({
      type: 'error',
      challenge: 'Global',
      message: `ROI calculado (${m.roi}%) no coincide con el esperado (${expectedROI}%)`
    });
  } else {
    verifications.push({
      type: 'success',
      challenge: 'Global',
      message: '✓ Todos los cálculos de ROI son consistentes'
    });
  }

  // ── ANÁLISIS DE PATRONES ─────────────────────────────────────────────────

  // 1. Análisis de errores por tipo de challenge
  const simErrores = m.simulados.reduce((a, c) => a + c.overtrades + c.revengeTrades + c.tradesFueraDelPlan, 0);
  const simTrades = m.simulados.reduce((a, c) => a + c.tradesTotales, 0);
  const realErrores = m.reales.reduce((a, c) => a + c.overtrades + c.revengeTrades + c.tradesFueraDelPlan, 0);
  const realTrades = m.reales.reduce((a, c) => a + c.tradesTotales, 0);

  const simErrorRate = simTrades > 0 ? (simErrores / simTrades) * 100 : 0;
  const realErrorRate = realTrades > 0 ? (realErrores / realTrades) * 100 : 0;

  if (realErrorRate > simErrorRate * 1.5 && realTrades > 0 && simTrades > 0) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Mayor presión en challenges reales',
      message: `Tus errores en challenges reales (${Math.round(realErrorRate)}%) son ${Math.round(realErrorRate / simErrorRate * 100) / 100}x mayores que en simulados (${Math.round(simErrorRate)}%). Esto sugiere que la presión del dinero real afecta tu ejecución.`,
      recommendation: 'Practicá más simulados antes de tomar challenges reales. Enfocate en mantener la misma disciplina que tenés en FX Replay.'
    });
  }

  // 2. Análisis de revenge trades
  const totalRevenge = challenges.reduce((a, c) => a + c.revengeTrades, 0);
  if (totalRevenge > 0) {
    const challengesConRevenge = challenges.filter(c => c.revengeTrades > 0);
    const perdidosConRevenge = challengesConRevenge.filter(c => c.status === 'perdido').length;
    const pctPerdidos = challengesConRevenge.length > 0 ? (perdidosConRevenge / challengesConRevenge.length) * 100 : 0;

    if (pctPerdidos > 60) {
      warnings.push({
        icon: '🔥',
        title: 'Revenge trades = pérdidas',
        message: `El ${Math.round(pctPerdidos)}% de los challenges donde tuviste revenge trades terminaron perdidos.`,
        recommendation: 'Implementá una regla: después de 2 losses seguidos, parar por 30 minutos mínimo.'
      });
    }
  }

  // 3. Análisis de overtrades
  const totalOvertrades = challenges.reduce((a, c) => a + c.overtrades, 0);
  if (totalOvertrades > 0) {
    const avgOvertrades = totalOvertrades / challenges.length;
    if (avgOvertrades > 2) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Overtrading frecuente',
        message: `Promedio de ${avgOvertrades.toFixed(1)} overtrades por challenge. Esto diluye tu edge y aumenta comisiones/riesgo.`,
        recommendation: 'Limitá a máximo 3 trades por día. Calidad > cantidad.'
      });
    }
  }

  // 4. Análisis de disciplina
  if (m.avgDisciplina < 70) {
    warnings.push({
      icon: '📋',
      title: 'Disciplina baja',
      message: `Tu disciplina promedio es ${m.avgDisciplina}%. Esto significa que ${100 - m.avgDisciplina}% de tus trades no siguen tu plan.`,
      recommendation: 'Revisá tu plan de trading antes de cada sesión. Si no hay setup claro, no operes.'
    });
  } else if (m.avgDisciplina >= 85) {
    strengths.push({
      icon: '✅',
      title: 'Excelente disciplina',
      message: `Tu disciplina promedio es ${m.avgDisciplina}%. Estás siguiendo tu plan consistentemente.`,
      recommendation: 'Seguí así. La disciplina es la base del éxito a largo plazo.'
    });
  }

  // 5. Análisis de conversión
  if (m.totalConversion < 30 && m.total > 3) {
    insights.push({
      type: 'info',
      icon: '📊',
      title: 'Conversión baja',
      message: `Solo el ${m.totalConversion}% de tus challenges llegan a retiro. De ${m.total} intentos, solo ${m.withdrawals} generaron payout.`,
      recommendation: 'Analizá por qué no llegás a retiro. ¿Es problema de pasar el examen o de mantener la cuenta fondeada?'
    });
  } else if (m.totalConversion >= 50) {
    strengths.push({
      icon: '🏆',
      title: 'Alta tasa de conversión',
      message: `El ${m.totalConversion}% de tus challenges llegan a retiro. Excelente ratio de éxito.`,
      recommendation: 'Tu estrategia y ejecución están alineadas. Seguí refinando los detalles.'
    });
  }

  // 6. Análisis de ROI
  if (m.roi < 0 && m.total > 2) {
    warnings.push({
      icon: '💸',
      title: 'ROI negativo',
      message: `Tu ROI es ${m.roi}%. Invertiste $${m.totalInvested} y retiraste $${m.totalWithdrawn}.`,
      recommendation: `Necesitás ${Math.ceil(m.totalInvested / 500)} retiros para recuperar la inversión. Enfocate en mejorar la conversión antes de seguir comprando challenges.`
    });
  } else if (m.roi >= 100) {
    strengths.push({
      icon: '💰',
      title: 'ROI excelente',
      message: `Tu ROI es +${m.roi}%. Generaste ${m.roi / 100}x tu inversión.`,
      recommendation: 'Tu sistema es rentable. Considerá escalar a cuentas más grandes.'
    });
  }

  // 7. Análisis de tiempo
  if (m.avgDaysExam > 10 && m.passed > 0) {
    insights.push({
      type: 'info',
      icon: '⏱️',
      title: 'Exámenes lentos',
      message: `Promedio de ${m.avgDaysExam} días para aprobar. Esto puede indicar que estás forzando operaciones o no encontrás setups claros.`,
      recommendation: 'Si no hay setup en los primeros 5 días, considerá reducir el tamaño de cuenta o practicar más en simulado.'
    });
  } else if (m.avgDaysExam > 0 && m.avgDaysExam <= 5) {
    strengths.push({
      icon: '⚡',
      title: 'Aprobación rápida',
      message: `Promedio de ${m.avgDaysExam} días para aprobar. Encontrás setups rápidamente.`,
      recommendation: 'Asegurate de no estar forzando entradas por la presión del tiempo.'
    });
  }

  // 8. Análisis por firma
  if (m.byFirma.length > 1) {
    const bestFirma = m.byFirma.reduce((a, b) => a.roi > b.roi ? a : b);
    const worstFirma = m.byFirma.reduce((a, b) => a.roi < b.roi ? a : b);

    if (bestFirma.firma !== worstFirma.firma) {
      insights.push({
        type: 'info',
        icon: '🏢',
        title: `Mejor rendimiento en ${bestFirma.firma}`,
        message: `Tu ROI en ${bestFirma.firma} es ${bestFirma.roi}%, mientras que en ${worstFirma.firma} es ${worstFirma.roi}%.`,
        recommendation: `Considerá concentrarte en ${bestFirma.firma} o analizar qué está funcionando diferente ahí.`
      });
    }
  }

  // 9. Análisis de winrate vs RR
  if (m.avgWinrate < 40 && parseFloat(m.avgRR) < 1.5) {
    warnings.push({
      icon: '📉',
      title: 'Winrate y RR bajos',
      message: `Tu winrate promedio es ${m.avgWinrate}% con RR de ${m.avgRR}R. Esta combinación no es rentable a largo plazo.`,
      recommendation: 'Necesitás mejorar uno de los dos: buscá setups de mayor calidad (más RR) o refiná tus entradas (más winrate).'
    });
  } else if (m.avgWinrate >= 50 && parseFloat(m.avgRR) >= 2) {
    strengths.push({
      icon: '🎯',
      title: 'Edge estadístico sólido',
      message: `Winrate ${m.avgWinrate}% con RR ${m.avgRR}R. Tenés una ventaja estadística clara.`,
      recommendation: 'Tu edge es sólido. Enfocate en la ejecución consistente y gestión de riesgo.'
    });
  }

  // 10. Análisis de drawdown
  const avgDD = challenges.reduce((a, c) => a + c.drawdownExamen, 0) / challenges.length;
  if (avgDD > 1500) {
    warnings.push({
      icon: '⚠️',
      title: 'Drawdown alto',
      message: `Tu drawdown promedio en examen es $${Math.round(avgDD)}. Esto es alto para una cuenta de $50K.`,
      recommendation: 'Reducí el riesgo por trade. Máximo 1% de la cuenta por operación.'
    });
  }

  return { insights, warnings, strengths, verifications, metrics: m };
}
