const fs = require('fs');
const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = Number(process.env.PORT || 8000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'poems.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS poems (
      id TEXT PRIMARY KEY,
      seed_word TEXT NOT NULL,
      words_json TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/poems', (_req, res) => {
  const sql = `
    SELECT id, seed_word, words_json, text, created_at
    FROM poems
    ORDER BY created_at DESC
    LIMIT 100
  `;

  db.all(sql, (err, rows = []) => {
    if (err) {
      res.status(500).json({ error: 'Failed to load poems.' });
      return;
    }

    const poems = rows.map((row) => ({
      id: row.id,
      seedWord: row.seed_word,
      words: safeParseWords(row.words_json),
      text: row.text,
      createdAt: row.created_at,
    }));

    res.json(poems);
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

  const insertSql = `
    INSERT INTO poems (id, seed_word, words_json, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(insertSql, [id, seedWord, JSON.stringify(words), text, createdAt], (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to save poem.' });
      return;
    }

    res.status(201).json({
      id,
      seedWord,
      words,
      text,
      createdAt,
    });
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

function safeParseWords(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
