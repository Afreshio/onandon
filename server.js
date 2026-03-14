const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 8000);
const DATA_DIR = path.join(__dirname, 'data');
const POEMS_PATH = path.join(DATA_DIR, 'poems.json');
const ADMIN_DELETE_TOKEN = String(process.env.ADMIN_DELETE_TOKEN || '').trim();

fs.mkdirSync(DATA_DIR, { recursive: true });
const poemsStore = loadPoemsStore();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/poems', (_req, res) => {
  const poems = poemsStore
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 100);
  res.json(poems);
});

app.get('/api/admin/config', (_req, res) => {
  res.json({ deleteConfigured: Boolean(ADMIN_DELETE_TOKEN) });
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
  const existingIndex = poemsStore.findIndex((p) => p.id === id);
  if (existingIndex >= 0) poemsStore.splice(existingIndex, 1);
  poemsStore.unshift(entry);

  const didPersist = persistPoemsStore(poemsStore.slice(0, 1000));
  if (!didPersist) {
    res.status(500).json({ error: 'Failed to save poem.' });
    return;
  }

  res.status(201).json(entry);
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

  const existingIndex = poemsStore.findIndex((poem) => String(poem.id || '') === id);
  if (existingIndex < 0) {
    res.status(404).json({ error: 'Poem not found.' });
    return;
  }

  poemsStore.splice(existingIndex, 1);
  const didPersist = persistPoemsStore(poemsStore.slice(0, 1000));
  if (!didPersist) {
    res.status(500).json({ error: 'Failed to delete poem.' });
    return;
  }

  res.json({ ok: true, id });
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
