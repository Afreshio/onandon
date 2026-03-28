/**
 * Upload-based poetry app.
 * Users submit full text poems that are saved to the gallery.
 */

const uploadForm = document.getElementById('upload-form');
const poemTextInput = document.getElementById('poem-text');
const poemHighlight = document.getElementById('poem-highlight');
const uploadStatus = document.getElementById('upload-status');
const btnGallery = document.getElementById('btn-gallery');

const SAVED_POEMS_KEY = 'onandon_saved_poems';
const API_POEMS_ENDPOINT = '/api/poems';

if (poemTextInput && poemHighlight) {
  poemTextInput.addEventListener('input', handlePoemInput);
  poemTextInput.addEventListener('scroll', syncPoemHighlightScroll);
  ensureSeedWordCapitalized();
  syncPoemHighlight();
}

uploadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const poemText = normalizePoemText(poemTextInput.value);
  const words = splitWords(poemText);

  if (words.length < 2) {
    setStatus('Please enter at least two words.', true);
    return;
  }

  savePoem(poemText, words)
    .then((result) => {
      poemTextInput.value = '';
      syncPoemHighlight();
      btnGallery.classList.remove('hidden');
      if (result && result.synced) {
        setStatus('Poem uploaded. You can view it in the gallery.', false);
      } else {
        setStatus('Saved only on this device. Server storage is currently unavailable.', true);
      }
    })
    .catch(() => {
      setStatus('Could not upload poem. Please try again.', true);
    });
});

async function savePoem(poemText, words) {
  const seedWord = deriveSeedWord(words[0]);
  const newEntry = {
    id: Date.now().toString(),
    seedWord,
    words: [...words],
    text: poemText,
    createdAt: Date.now(),
  };

  try {
    const response = await fetch(API_POEMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    });
    if (!response.ok) throw new Error('Request failed');
    return { synced: true };
  } catch {
    // Fallback so users keep their poem locally even if server is unavailable.
    savePoemToLocal(newEntry);
    return { synced: false };
  }
}

function normalizePoemText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitWords(text) {
  return String(text || '').split(/\s+/).filter(Boolean);
}

function handlePoemInput() {
  ensureSeedWordCapitalized();
  syncPoemHighlight();
}

function ensureSeedWordCapitalized() {
  if (!poemTextInput) return;
  const value = poemTextInput.value || '';
  const nextValue = value.replace(/^(\s*)(\S)/, (_match, leading, firstChar) => `${leading}${firstChar.toUpperCase()}`);
  if (nextValue === value) return;

  const start = poemTextInput.selectionStart;
  const end = poemTextInput.selectionEnd;
  poemTextInput.value = nextValue;
  poemTextInput.setSelectionRange(start, end);
}

function deriveSeedWord(firstWord) {
  const cleaned = String(firstWord || 'Poem').replace(/[^\w]/g, '') || 'Poem';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function setStatus(message, isError) {
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle('error', Boolean(isError));
}

function savePoemToLocal(entry) {
  const poems = loadSavedPoems();
  poems.unshift(entry);
  localStorage.setItem(SAVED_POEMS_KEY, JSON.stringify(poems.slice(0, 100)));
}

function loadSavedPoems() {
  try {
    const raw = localStorage.getItem(SAVED_POEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function syncPoemHighlight() {
  if (!poemHighlight || !poemTextInput) return;
  const value = poemTextInput.value || '';
  if (!value) {
    poemHighlight.textContent = '';
    return;
  }

  const escaped = escapeHtml(value);
  const highlighted = escaped.replace(/^(\s*)(\S+)/, '$1<span class="seed-word">$2</span>');
  poemHighlight.innerHTML = highlighted.replace(/\n/g, '<br>');
  syncPoemHighlightScroll();
}

function syncPoemHighlightScroll() {
  if (!poemHighlight || !poemTextInput) return;
  poemHighlight.scrollTop = poemTextInput.scrollTop;
  poemHighlight.scrollLeft = poemTextInput.scrollLeft;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
