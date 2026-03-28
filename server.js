const fs = require('fs');
const path = require('path');
const express = require('express');
const { kv } = require('@vercel/kv');
const { get, put } = require('@vercel/blob');

const app = express();
const PORT = Number(process.env.PORT || 8000);
const DATA_DIR = path.join(__dirname, 'data');
const POEMS_PATH = path.join(DATA_DIR, 'poems.json');
const ADMIN_DELETE_TOKEN = String(process.env.ADMIN_DELETE_TOKEN || '').trim();
const USE_KV = Boolean(
  process.env.KV_REST_API_URL
  && process.env.KV_REST_API_TOKEN
);
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const KV_INDEX_KEY = 'poems:index';
const BLOB_POEMS_PATH = 'poems-store.json';
const IS_VERCEL_RUNTIME = Boolean(process.env.VERCEL);
const DURABLE_STORAGE_READY = USE_KV || USE_BLOB || !IS_VERCEL_RUNTIME;

fs.mkdirSync(DATA_DIR, { recursive: true });
const poemsStore = loadPoemsStore();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/poems', (_req, res) => {
  listPoems()
    .then((poems) => res.json(poems))
    .catch(() => {
      res.status(500).json({ error: 'Failed to load poems.' });
    });
});

app.get('/api/admin/config', (_req, res) => {
  res.json({
    deleteConfigured: Boolean(ADMIN_DELETE_TOKEN),
    storageConfigured: DURABLE_STORAGE_READY,
  });
});

app.post('/api/poems', (req, res) => {
  const payload = req.body || {};
  const text = normalizeText(payload.text);
  const words = Array.isArray(payload.words) ? payload.words.map((w) => String(w || '').trim()).filter(Boolean) : [];
  const seedWord = String(payload.seedWord || deriveSeedWord(words[0] || text.split(/\s+/)[0] || 'Poem')).trim();
  const createdAt = Number(payload.createdAt || Date.now());
  const id = String(payload.id || `${createdAt}_${Math.random().toString(36).slice(2, 8)}`);

  if (text.split(/\s+/).filter(Boolean).length < 2) {
    res.status(400).json({ error: 'Poem must contain at least two words.' });
    return;
  }

  const entry = { id, seedWord, words, text, createdAt };
  upsertPoem(entry)
    .then(() => {
      res.status(201).json(entry);
    })
    .catch((err) => {
      if (err && err.code === 'STORAGE_NOT_CONFIGURED') {
        res.status(503).json({ error: 'Poem storage is not configured on the server.' });
        return;
      }
      res.status(500).json({ error: 'Failed to save poem.' });
    });
});

app.delete('/api/poems/:id', (req, res) => {
  if (!ADMIN_DELETE_TOKEN) {
    res.status(503).json({ error: 'Admin delete token is not configured on the server.' });
    return;
  }
  if (!isAdminAuthorized(req)) {
    res.status(403).json({ error: 'Admin authorization required.' });
    return;
  }

  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Poem id is required.' });
    return;
  }

  deletePoem(id)
    .then((deleted) => {
      if (!deleted) {
        res.status(404).json({ error: 'Poem not found.' });
        return;
      }
      res.json({ ok: true, id });
    })
    .catch((err) => {
      if (err && err.code === 'STORAGE_NOT_CONFIGURED') {
        res.status(503).json({ error: 'Poem storage is not configured on the server.' });
        return;
      }
      res.status(500).json({ error: 'Failed to delete poem.' });
    });
});

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`on&on server running at http://127.0.0.1:${PORT}`);
});

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function deriveSeedWord(firstWord) {
  const cleaned = String(firstWord || 'Poem').replace(/[^\w]/g, '') || 'Poem';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function loadPoemsStore() {
  try {
    if (!fs.existsSync(POEMS_PATH)) return [];
    const raw = fs.readFileSync(POEMS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistPoemsStore(poems) {
  try {
    fs.writeFileSync(POEMS_PATH, JSON.stringify(poems, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function isAdminAuthorized(req) {
  const suppliedToken = String(req.get('x-admin-token') || '').trim();
  return suppliedToken.length > 0 && suppliedToken === ADMIN_DELETE_TOKEN;
}

async function listPoems() {
  if (USE_BLOB) {
    const poems = await loadPoemsFromBlob();
    return poems
      .filter((entry) => entry && entry.text)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 100);
  }

  if (!USE_KV) {
    return poemsStore
      .slice()
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 100);
  }

  const ids = await kv.get(KV_INDEX_KEY);
  const normalizedIds = Array.isArray(ids) ? ids.map((v) => String(v || '')).filter(Boolean) : [];
  if (normalizedIds.length === 0) return [];

  const keys = normalizedIds.slice(0, 100).map((id) => `poems:data:${id}`);
  const rows = await kv.mget(...keys);
  return rows
    .filter((row) => row && typeof row === 'object')
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 100);
}

async function upsertPoem(entry) {
  if (!DURABLE_STORAGE_READY) {
    throw storageNotConfiguredError();
  }

  if (USE_BLOB) {
    const poems = await loadPoemsFromBlob();
    const existingIndex = poems.findIndex((p) => String(p.id || '') === String(entry.id || ''));
    if (existingIndex >= 0) poems.splice(existingIndex, 1);
    poems.unshift(entry);
    await persistPoemsToBlob(poems.slice(0, 1000));
    return;
  }

  if (!USE_KV) {
    const nextPoems = poemsStore.slice();
    const existingIndex = nextPoems.findIndex((p) => String(p.id || '') === String(entry.id || ''));
    if (existingIndex >= 0) nextPoems.splice(existingIndex, 1);
    nextPoems.unshift(entry);
    const trimmedPoems = nextPoems.slice(0, 1000);
    const didPersist = persistPoemsStore(trimmedPoems);
    if (!didPersist) throw new Error('Persist failed');
    poemsStore.splice(0, poemsStore.length, ...trimmedPoems);
    return;
  }

  const id = String(entry.id || '').trim();
  if (!id) throw new Error('Invalid id');

  await kv.set(`poems:data:${id}`, entry);
  const ids = await kv.get(KV_INDEX_KEY);
  const normalizedIds = Array.isArray(ids) ? ids.map((v) => String(v || '')).filter(Boolean) : [];
  const nextIds = [id, ...normalizedIds.filter((existingId) => existingId !== id)].slice(0, 1000);
  await kv.set(KV_INDEX_KEY, nextIds);
}

async function deletePoem(id) {
  if (!DURABLE_STORAGE_READY) {
    throw storageNotConfiguredError();
  }

  if (USE_BLOB) {
    const poems = await loadPoemsFromBlob();
    const existingIndex = poems.findIndex((poem) => String(poem.id || '') === String(id));
    if (existingIndex < 0) return false;
    poems.splice(existingIndex, 1);
    await persistPoemsToBlob(poems.slice(0, 1000));
    return true;
  }

  if (!USE_KV) {
    const nextPoems = poemsStore.slice();
    const existingIndex = nextPoems.findIndex((poem) => String(poem.id || '') === String(id));
    if (existingIndex < 0) return false;

    nextPoems.splice(existingIndex, 1);
    const trimmedPoems = nextPoems.slice(0, 1000);
    const didPersist = persistPoemsStore(trimmedPoems);
    if (!didPersist) throw new Error('Persist failed');
    poemsStore.splice(0, poemsStore.length, ...trimmedPoems);
    return true;
  }

  const key = `poems:data:${id}`;
  const existing = await kv.get(key);
  if (!existing) return false;

  await kv.del(key);
  const ids = await kv.get(KV_INDEX_KEY);
  const normalizedIds = Array.isArray(ids) ? ids.map((v) => String(v || '')).filter(Boolean) : [];
  const nextIds = normalizedIds.filter((existingId) => existingId !== id).slice(0, 1000);
  await kv.set(KV_INDEX_KEY, nextIds);
  return true;
}

function storageNotConfiguredError() {
  const err = new Error('Durable poem storage is not configured.');
  err.code = 'STORAGE_NOT_CONFIGURED';
  return err;
}

async function loadPoemsFromBlob() {
  let response;
  try {
    response = await get(BLOB_POEMS_PATH, { access: 'public' });
  } catch (err) {
    const message = String(err && err.message ? err.message : '');
    if (message.toLowerCase().includes('not found')) return [];
    throw err;
  }
  if (!response || response.statusCode !== 200 || !response.stream) return [];

  const raw = await readReadableStream(response.stream);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persistPoemsToBlob(poems) {
  await put(BLOB_POEMS_PATH, JSON.stringify(poems), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
}

async function readReadableStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    out += decoder.decode(chunk.value, { stream: true });
  }
  out += decoder.decode();
  return out;
}
