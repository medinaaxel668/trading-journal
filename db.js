// ── IMPORTS PINNEADOS ─────────────────────────────────────────────────────────
// El 2026-10-19 la app dejó de arrancar con:
//   "Two different versions of Dexie loaded in the same app: 4.4.7 and 4.4.6"
// Causa: 'https://esm.sh/dexie' sin versión fija resolvía a 4.4.7 mientras el
// addon por dentro traía 4.4.6 (la caché del CDN resolvía distinto cada URL).
// El especificador de Dexie de abajo es EXACTAMENTE el mismo que usa el addon
// por dentro (ver el shim de https://esm.sh/dexie-cloud-addon), así el navegador
// carga una sola copia del módulo, siempre, sin importar qué versión resuelva el
// rango. NO volver a imports de esm.sh sin versión.
import Dexie from 'https://esm.sh/dexie@^4.4.5?target=es2022';
import dexieCloud from 'https://esm.sh/dexie-cloud-addon@4.4.15';
const DB_NAME  = 'tradingAppDB';
const CLOUD_URL = 'https://zo8mhffzq.dexie.cloud';


export let db;

export async function initDB() {
  let cloudAddon = null;
  try {
    cloudAddon = dexieCloud;
  } catch (e) {
    console.warn('[initDB] dexie-cloud-addon no disponible, modo local:', e.message);
  }

  if (cloudAddon) {
    try {
      db = new Dexie(DB_NAME, { addons: [cloudAddon] });
      db.cloud.configure({
        databaseUrl: CLOUD_URL,
        requireAuth: false
      });
    } catch (e) {
      console.warn('[initDB] Cloud init falló, usando solo local:', e.message);
      db = new Dexie(DB_NAME);
    }
  } else {
    db = new Dexie(DB_NAME);
  }

  // ── Schema v4/v5: el histórico ──────────────────────────────────────────────
  db.version(4).stores({
    trades:     'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt,[date+strategyName],challengeId',
    notes:      'id,date,createdAt',
    liveTrades: 'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt,challengeId',
    liveNotes:  'id,date,createdAt',
    challenges: 'id,type,firma,status,createdAt,fechaInicioExamen'
  });

  db.version(5).stores({
    trades:     'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt,[date+strategyName],challengeId',
    notes:      'id,date,createdAt',
    liveTrades: 'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt,challengeId',
    liveNotes:  'id,date,createdAt',
    challenges: 'id,type,firma,status,createdAt,fechaInicioExamen'
  });

  // ── Schema v6 (rediseño 2026-11): estrategias y etiquetas como entidades ────
  // - strategies:    una estrategia es una entidad con nombre propio; ya NO se
  //                  deriva del primer tag del trade.
  // - strategyTags:  el registro de etiquetas DE cada estrategia (compartido
  //                  entre backtesting y live: la taxonomía es de la estrategia).
  //                  deleted=1 → la etiqueta ya no se ofrece en el formulario,
  //                  pero los trades que la tienen la conservan (se muestra en
  //                  amarillo en el historial, "a revisar").
  // - trades/liveTrades suman strategyId (la fuente de verdad). strategyName se
  //   mantiene como copia de lectura rápida y se sincroniza con la estrategia.
  // - Imágenes subidas: los trades pueden guardar Blobs (tradingViewBlob,
  //   imageM3Blob, imageM15Blob) y una lista extraImages [{id,title,url,blob}].
  //   Los campos *Url siguen existiendo para links, como hasta ahora.
  db.version(6).stores({
    trades:     'id,date,strategyName,strategyId,symbol,killZone,side,result,smt,tags,createdAt,[date+strategyName],challengeId',
    notes:      'id,date,createdAt',
    liveTrades: 'id,date,strategyName,strategyId,symbol,killZone,side,result,smt,tags,createdAt,challengeId',
    liveNotes:  'id,date,createdAt',
    challenges: 'id,type,firma,status,createdAt,fechaInicioExamen',
    strategies: 'id,name,createdAt',
    strategyTags: 'id,strategyId,name,deleted,createdAt'
  });


  // ── Schema v7 (corrección 2026-11-02): las "estrategias" NO salen de los tags ──
  // La migración v6 creaba estrategias desde el strategyName histórico, que en
  // realidad era el primer TAG del trade. El usuario no tiene estrategias
  // cargadas: las crea él a mano ("+ Nueva estrategia"). Esta versión borra
  // las estrategias y el registro de etiquetas creados automáticamente y deja
  // todos los trades SIN estrategia (strategyId null, strategyName '').
  // Ningún trade se borra ni pierde sus etiquetas.
  db.version(7).stores({
    trades:     'id,date,strategyName,strategyId,symbol,killZone,side,result,smt,tags,createdAt,[date+strategyName],challengeId',
    notes:      'id,date,createdAt',
    liveTrades: 'id,date,strategyName,strategyId,symbol,killZone,side,result,smt,tags,createdAt,challengeId',
    liveNotes:  'id,date,createdAt',
    challenges: 'id,type,firma,status,createdAt,fechaInicioExamen',
    strategies: 'id,name,createdAt',
    strategyTags: 'id,strategyId,name,deleted,createdAt'
  }).upgrade(async tx => {
    await tx.table('strategies').clear();
    await tx.table('strategyTags').clear();
    for (const tableName of ['trades', 'liveTrades']) {
      const table = tx.table(tableName);
      const all = await table.toArray();
      for (const t of all) {
        if (t.strategyId || t.strategyName) {
          await table.update(t.id, { strategyId: null, strategyName: '' });
        }
      }
    }
  });

  await db.open();
  console.log('[initDB] db.cloud:', db.cloud ? 'disponible ✓' : 'no disponible (solo local)');
  return db;
}

export function getDB() { return db; }

// ── UTILS ─────────────────────────────────────────────────────────────────────
function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}

function nowISO() { return new Date().toISOString(); }

function validateTrade(t) {
  const required = ['date','symbol','killZone','side','result'];
  for (const f of required) {
    if (!t[f] || String(t[f]).trim() === '') throw new Error(`Campo requerido: ${f}`);
  }
  if (t.pnl === '' || t.pnl === null || t.pnl === undefined || isNaN(Number(t.pnl)))
    throw new Error('P&L debe ser un número válido');
  if (!['BUY','SELL'].includes(t.side))   throw new Error('side debe ser BUY o SELL');
  if (!['TP','SL','BE'].includes(t.result)) throw new Error('result debe ser TP, SL o BE');
}

// Normaliza los campos de imágenes de un trade (links + blobs + extras).
// - Los 3 campos clásicos aceptan link (…Url) O archivo subido (…Blob).
// - extraImages: [{ id, title, url, blob }] — apartados extra con título libre.
function normalizeImages(data) {
  const extra = Array.isArray(data.extraImages) ? data.extraImages
    .filter(x => x && (String(x.url || '').trim() || x.blob))
    .map(x => ({
      id: String(x.id || uuid()),
      title: String(x.title || '').trim() || 'Imagen',
      url: String(x.url || '').trim(),
      blob: x.blob || null
    })) : [];
  return {
    tradingViewUrl: String(data.tradingViewUrl || '').trim(),
    imageM3Url:     String(data.imageM3Url  || '').trim(),
    imageM15Url:    String(data.imageM15Url || '').trim(),
    tradingViewBlob: data.tradingViewBlob || null,
    imageM3Blob:     data.imageM3Blob || null,
    imageM15Blob:    data.imageM15Blob || null,
    extraImages: extra
  };
}

// Campos comunes de un trade (sin las preguntas extra de live).
function tradeCore(data) {
  return {
    strategyId:   String(data.strategyId || '').trim() || null,
    strategyName: String(data.strategyName || '').trim(),
    tags:         Array.isArray(data.tags) ? data.tags : [],
    date:         String(data.date).trim(),
    symbol:       String(data.symbol).trim().toUpperCase(),
    killZone:     String(data.killZone).trim(),
    side:         String(data.side).trim().toUpperCase(),
    result:       String(data.result).trim().toUpperCase(),
    beOutcome:    data.result === 'BE' ? (String(data.beOutcome || '').trim() || null) : null,
    smt:          Boolean(data.smt) || false,

    challengeId:  String(data.challengeId || '').trim() || null,
    isOvertrade:  Boolean(data.isOvertrade) || false,
    isRevengeTrade: Boolean(data.isRevengeTrade) || false,
    isFueraDelPlan: Boolean(data.isFueraDelPlan) || false,
    errorType:    String(data.errorType || '').trim() || null,
    pnl:          Number(data.pnl),
    rrPlanned:    data.rrPlanned !== '' && data.rrPlanned !== undefined ? Number(data.rrPlanned) : null,
    ...normalizeImages(data)
  };
}

// ── BACKTEST TRADES ───────────────────────────────────────────────────────────
export async function getAllTrades() {
  return db.trades.orderBy('createdAt').toArray();
}

export async function addTrade(data) {
  const trade = {
    id: uuid(),
    ...tradeCore(data),
    notes:        String(data.notes || '').trim(),
    createdAt: nowISO(), updatedAt: nowISO()
  };
  validateTrade(trade);
  await db.trades.add(trade);
  return trade;
}

export async function updateTrade(id, data) {
  const existing = await db.trades.get(id);
  if (!existing) throw new Error('Trade no encontrado');
  const updated = {
    ...existing,
    ...tradeCore(data),
    notes:        String(data.notes || '').trim(),
    updatedAt: nowISO()
  };
  validateTrade(updated);
  await db.trades.put(updated);
  return updated;
}

export async function deleteTrade(id) { await db.trades.delete(id); }

// ── BACKTEST NOTES ────────────────────────────────────────────────────────────
export async function getAllNotes() {
  return db.notes.orderBy('createdAt').reverse().toArray();
}

export async function addNote(data) {
  const note = {
    id: uuid(),
    text:  String(data.text || '').trim(),
    links: Array.isArray(data.links) ? data.links.filter(l => l.trim() !== '') : [],
    date: nowISO(), createdAt: nowISO(), updatedAt: nowISO()
  };
  if (!note.text) throw new Error('La nota no puede estar vacía');
  await db.notes.add(note);
  return note;
}

export async function deleteNote(id) { await db.notes.delete(id); }

// ── LIVE TRADES ───────────────────────────────────────────────────────────────
export async function getAllLiveTrades() {
  return db.liveTrades.orderBy('createdAt').toArray();
}

export async function addLiveTrade(data) {
  const trade = {
    id: uuid(), mode: 'live',
    ...tradeCore(data),
    setup:        String(data.setup       || '').trim(),
    fomo:         String(data.fomo        || '').trim(),
    aprendizaje:  String(data.aprendizaje || '').trim(),
    createdAt: nowISO(), updatedAt: nowISO()
  };
  validateTrade(trade);
  await db.liveTrades.add(trade);
  return trade;
}

export async function updateLiveTrade(id, data) {
  const existing = await db.liveTrades.get(id);
  if (!existing) throw new Error('Trade no encontrado');
  const updated = {
    ...existing,
    ...tradeCore(data),
    setup:        String(data.setup       || '').trim(),
    fomo:         String(data.fomo        || '').trim(),
    aprendizaje:  String(data.aprendizaje || '').trim(),
    updatedAt: nowISO()
  };
  validateTrade(updated);
  await db.liveTrades.put(updated);
  return updated;
}

export async function deleteLiveTrade(id) { await db.liveTrades.delete(id); }

// ── LIVE NOTES ────────────────────────────────────────────────────────────────
export async function getAllLiveNotes() {
  return db.liveNotes.orderBy('createdAt').reverse().toArray();
}

export async function addLiveNote(data) {
  const note = {
    id: uuid(),
    text:  String(data.text || '').trim(),
    links: Array.isArray(data.links) ? data.links.filter(l => l.trim() !== '') : [],
    date: nowISO(), createdAt: nowISO(), updatedAt: nowISO()
  };
  if (!note.text) throw new Error('La nota no puede estar vacía');
  await db.liveNotes.add(note);
  return note;
}

export async function deleteLiveNote(id) { await db.liveNotes.delete(id); }

// ── ESTRATEGIAS ───────────────────────────────────────────────────────────────
export async function getAllStrategies() {
  return db.strategies.orderBy('createdAt').toArray();
}

// Crea una estrategia pidiendo SOLO el nombre; arranca sin etiquetas.
export async function addStrategy(name) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('La estrategia necesita un nombre');
  const all = await db.strategies.toArray();
  const existing = all.find(s => (s.name || '').trim().toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  const strat = { id: uuid(), name: clean, createdAt: nowISO(), updatedAt: nowISO() };
  await db.strategies.add(strat);
  return strat;
}

// ── ETIQUETAS POR ESTRATEGIA ──────────────────────────────────────────────────
// Devuelve el registro completo (activas y eliminadas) de una estrategia.
export async function getStrategyTags(strategyId) {
  if (!strategyId) return [];
  return db.strategyTags.where('strategyId').equals(strategyId).toArray();
}

export async function getAllStrategyTags() {
  return db.strategyTags.toArray();
}

// Añade una etiqueta a la lista de la estrategia. Si existía y estaba
// eliminada, la reactiva (vuelve a ofrecerse; los trades la recuperan como
// etiqueta normal, ya no amarilla).
export async function addStrategyTag(strategyId, name) {
  const clean = String(name || '').trim();
  if (!strategyId || !clean) return null;
  const all = await db.strategyTags.where('strategyId').equals(strategyId).toArray();
  const existing = all.find(t => (t.name || '').trim().toLowerCase() === clean.toLowerCase());
  if (existing) {
    if (existing.deleted) {
      await db.strategyTags.update(existing.id, { deleted: 0, updatedAt: nowISO() });
      return { ...existing, deleted: 0 };
    }
    return existing;
  }
  const tag = { id: uuid(), strategyId, name: clean, deleted: 0, createdAt: nowISO(), updatedAt: nowISO() };
  await db.strategyTags.add(tag);
  return tag;
}

// Renombra una etiqueta SOLO dentro de su estrategia, pero en TODOS los
// trades (backtest y live) de esa estrategia que la tengan. Si el nombre nuevo
// ya existe en la lista, las etiquetas se fusionan.
export async function renameStrategyTag(strategyId, oldName, newName) {
  const oldClean = String(oldName || '').trim();
  const newClean = String(newName || '').trim();
  if (!strategyId || !oldClean || !newClean || oldClean === newClean) return;
  await addStrategyTag(strategyId, newClean); // asegura el registro destino (fusiona)
  const all = await db.strategyTags.where('strategyId').equals(strategyId).toArray();
  const rec = all.find(t => (t.name || '').trim().toLowerCase() === oldClean.toLowerCase());
  if (rec) await db.strategyTags.delete(rec.id);
  for (const table of [db.trades, db.liveTrades]) {
    const rows = await table.where('strategyId').equals(strategyId).toArray();
    for (const t of rows) {
      const tags = Array.isArray(t.tags) ? t.tags : [];
      if (!tags.some(x => String(x).trim().toLowerCase() === oldClean.toLowerCase())) continue;
      const replaced = tags.map(x => String(x).trim().toLowerCase() === oldClean.toLowerCase() ? newClean : x);
      const dedup = [...new Map(replaced.map(x => [String(x).trim().toLowerCase(), x])).values()];
      await table.update(t.id, { tags: dedup, updatedAt: nowISO() });
    }
  }
}

// Elimina una etiqueta de la lista de la estrategia: los trades que la tienen
// LA CONSERVAN (en el historial se muestra en amarillo, "a revisar").
export async function deleteStrategyTag(strategyId, name) {
  const clean = String(name || '').trim();
  if (!strategyId || !clean) return;
  const all = await db.strategyTags.where('strategyId').equals(strategyId).toArray();
  const rec = all.find(t => (t.name || '').trim().toLowerCase() === clean.toLowerCase());
  if (rec) await db.strategyTags.update(rec.id, { deleted: 1, updatedAt: nowISO() });
}

// ── ETIQUETAS SIN ESTRATEGIA (sueltas) Y ORDEN DE LAS LISTAS ─────────────────
// Las etiquetas que no pertenecen a ninguna estrategia viven en el mismo
// registro (strategyTags) con un strategyId centinela. Así comparten
// comportamiento con las de las estrategias: renombrar, eliminar de la lista
// (los trades la conservan, amarillo en el historial), reactivar y ordenar.
// El registro es compartido entre backtesting y live, como el de estrategias.
export const LOOSE_TAGS_ID = '__none__';

// Renombra una etiqueta suelta en TODOS los trades SIN estrategia (backtest y
// live) que la tengan. Si el nombre nuevo ya existe entre las sueltas, fusiona.
export async function renameLooseTag(oldName, newName) {
  const oldClean = String(oldName || '').trim();
  const newClean = String(newName || '').trim();
  if (!oldClean || !newClean || oldClean === newClean) return;
  await addStrategyTag(LOOSE_TAGS_ID, newClean); // asegura el registro destino
  const all = await db.strategyTags.where('strategyId').equals(LOOSE_TAGS_ID).toArray();
  const rec = all.find(t => (t.name || '').trim().toLowerCase() === oldClean.toLowerCase());
  if (rec) await db.strategyTags.delete(rec.id);
  for (const table of [db.trades, db.liveTrades]) {
    const rows = await table.toArray();
    for (const t of rows) {
      if (t.strategyId) continue; // solo trades sin estrategia
      const tags = Array.isArray(t.tags) ? t.tags : [];
      if (!tags.some(x => String(x).trim().toLowerCase() === oldClean.toLowerCase())) continue;
      const replaced = tags.map(x => String(x).trim().toLowerCase() === oldClean.toLowerCase() ? newClean : x);
      const dedup = [...new Map(replaced.map(x => [String(x).trim().toLowerCase(), x])).values()];
      await table.update(t.id, { tags: dedup, updatedAt: nowISO() });
    }
  }
}

// Elimina una etiqueta suelta de la lista: crea el registro si la etiqueta
// solo existía en los trades, para que no vuelva a aparecer derivada de ellos.
// Los trades que la tienen LA CONSERVAN (amarillo en el historial).
export async function deleteLooseTag(name) {
  const clean = String(name || '').trim();
  if (!clean) return;
  await addStrategyTag(LOOSE_TAGS_ID, clean); // asegura que exista el registro
  await deleteStrategyTag(LOOSE_TAGS_ID, clean);
}

// Asigna una etiqueta suelta a una estrategia: entra en la lista de esa
// estrategia y sale de la lista de sueltas. Los trades sin estrategia que la
// tienen no cambian (la conservan como etiqueta).
export async function assignLooseTag(name, strategyId) {
  const clean = String(name || '').trim();
  if (!clean || !strategyId) return;
  await addStrategyTag(strategyId, clean);
  await deleteLooseTag(clean);
}

// Guarda el orden de una lista de etiquetas (de una estrategia o de las
// sueltas) en el campo sortOrder de cada registro. No reactiva etiquetas
// eliminadas: si el registro existe solo se le actualiza el orden; si no
// existe (etiqueta que solo vivía en los trades) se crea activo.
export async function setTagsOrder(scopeId, orderedNames) {
  if (!scopeId || !Array.isArray(orderedNames)) return;
  const all = await db.strategyTags.where('strategyId').equals(scopeId).toArray();
  for (let i = 0; i < orderedNames.length; i++) {
    const clean = String(orderedNames[i] || '').trim();
    if (!clean) continue;
    const rec = all.find(t => (t.name || '').trim().toLowerCase() === clean.toLowerCase());
    if (rec) {
      if (rec.sortOrder !== i) await db.strategyTags.update(rec.id, { sortOrder: i, updatedAt: nowISO() });
    } else {
      await db.strategyTags.add({ id: uuid(), strategyId: scopeId, name: clean, deleted: 0, sortOrder: i, createdAt: nowISO(), updatedAt: nowISO() });
    }
  }
}
