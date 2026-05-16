import Dexie from 'https://esm.sh/dexie';
import dexieCloud from 'https://esm.sh/dexie-cloud-addon';
const DB_NAME  = 'tradingAppDB';
const CLOUD_URL = 'https://zs0gyiyrz.dexie.cloud';


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

  // ── Schema completo: incluye liveTrades y liveNotes ──────────────────────────
  db.version(3).stores({
    trades:     'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt,[date+strategyName]',
    notes:      'id,date,createdAt',
    liveTrades: 'id,date,strategyName,symbol,killZone,side,result,smt,tags,createdAt',
    liveNotes:  'id,date,createdAt'
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

// ── BACKTEST TRADES ───────────────────────────────────────────────────────────
export async function getAllTrades() {
  return db.trades.orderBy('createdAt').toArray();
}

export async function addTrade(data) {
  const trade = {
    id: uuid(),
    strategyName: String(data.strategyName || '').trim(),
    tags:         Array.isArray(data.tags) ? data.tags : [],
    date:         String(data.date).trim(),
    symbol:       String(data.symbol).trim().toUpperCase(),
    killZone:     String(data.killZone).trim(),
    side:         String(data.side).trim().toUpperCase(),
    result:       String(data.result).trim().toUpperCase(),
    smt:          Boolean(data.smt) || false,
    pnl:          Number(data.pnl),
    rrPlanned:    data.rrPlanned !== '' && data.rrPlanned !== undefined ? Number(data.rrPlanned) : null,
    tradingViewUrl: String(data.tradingViewUrl || '').trim(),
    imageM3Url:   String(data.imageM3Url  || '').trim(),
    imageM15Url:  String(data.imageM15Url || '').trim(),
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
    strategyName: String(data.strategyName || '').trim(),
    tags:         Array.isArray(data.tags) ? data.tags : [],
    date:         String(data.date).trim(),
    symbol:       String(data.symbol).trim().toUpperCase(),
    killZone:     String(data.killZone).trim(),
    side:         String(data.side).trim().toUpperCase(),
    result:       String(data.result).trim().toUpperCase(),
    smt:          Boolean(data.smt) || false,
    pnl:          Number(data.pnl),
    rrPlanned:    data.rrPlanned !== '' && data.rrPlanned !== undefined ? Number(data.rrPlanned) : null,
    tradingViewUrl: String(data.tradingViewUrl || '').trim(),
    imageM3Url:   String(data.imageM3Url  || '').trim(),
    imageM15Url:  String(data.imageM15Url || '').trim(),
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
    strategyName: String(data.strategyName || '').trim(),
    tags:         Array.isArray(data.tags) ? data.tags : [],
    date:         String(data.date).trim(),
    symbol:       String(data.symbol).trim().toUpperCase(),
    killZone:     String(data.killZone).trim(),
    side:         String(data.side).trim().toUpperCase(),
    result:       String(data.result).trim().toUpperCase(),
    beOutcome:    data.result === 'BE' ? (String(data.beOutcome || '').trim() || null) : null,
    smt:          Boolean(data.smt) || false,
    pnl:          Number(data.pnl),
    rrPlanned:    data.rrPlanned !== '' && data.rrPlanned !== undefined ? Number(data.rrPlanned) : null,
    tradingViewUrl: String(data.tradingViewUrl || '').trim(),
    imageM3Url:   String(data.imageM3Url  || '').trim(),
    imageM15Url:  String(data.imageM15Url || '').trim(),
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
    strategyName: String(data.strategyName || '').trim(),
    tags:         Array.isArray(data.tags) ? data.tags : [],
    date:         String(data.date).trim(),
    symbol:       String(data.symbol).trim().toUpperCase(),
    killZone:     String(data.killZone).trim(),
    side:         String(data.side).trim().toUpperCase(),
    result:       String(data.result).trim().toUpperCase(),
    beOutcome:    data.result === 'BE' ? (String(data.beOutcome || '').trim() || null) : null,
    smt:          Boolean(data.smt) || false,
    pnl:          Number(data.pnl),
    rrPlanned:    data.rrPlanned !== '' && data.rrPlanned !== undefined ? Number(data.rrPlanned) : null,
    tradingViewUrl: String(data.tradingViewUrl || '').trim(),
    imageM3Url:   String(data.imageM3Url  || '').trim(),
    imageM15Url:  String(data.imageM15Url || '').trim(),
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
