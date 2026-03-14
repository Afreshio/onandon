/**
 * Gallery effects — dim non-focused poems while scrolling
 */

const SAVED_POEMS_KEY = 'onandon_saved_poems';
const API_POEMS_ENDPOINT = '/api/poems';

initGallery();

async function initGallery() {
  await hydrateSavedPoems();
  const poemBlocks = Array.from(document.querySelectorAll('[data-poem]'));
  const refreshActivePoem = initScrollDimming(poemBlocks);
  initSeedSearch(poemBlocks, refreshActivePoem);
}

async function hydrateSavedPoems() {
  const stack = document.querySelector('.poem-stack');
  if (!stack) return;

  const saved = await loadPoems();
  if (saved.length === 0) return;

  // Show newest saved poems at the top of the gallery.
  const fragment = document.createDocumentFragment();
  saved.forEach((entry) => {
    if (!entry || !entry.seedWord || !entry.text) return;
    const remainder = Array.isArray(entry.words)
      ? entry.words.slice(1).join(' ')
      : entry.text.split(/\s+/).slice(1).join(' ');
    const article = document.createElement('article');
    article.className = 'poem-block';
    article.setAttribute('data-poem', '');
    article.dataset.seed = normalizeSeed(entry.seedWord);
    article.innerHTML = `<p><span class="seed-word">${escapeHtml(entry.seedWord)}</span>${remainder ? ` ${escapeHtml(remainder)}` : ''}</p>`;
    fragment.appendChild(article);
  });

  stack.prepend(fragment);
}

function initScrollDimming(blocks) {
  if (blocks.length === 0) return;

  blocks.forEach((block) => {
    block.classList.add('is-dimmed');
    block.classList.remove('is-active');
  });

  function updateActivePoem() {
    const visibleBlocks = blocks.filter((block) => !block.classList.contains('is-hidden'));
    if (visibleBlocks.length === 0) {
      blocks.forEach((block) => {
        block.classList.remove('is-active');
        block.classList.add('is-dimmed');
      });
      return;
    }

    const viewportCenter = window.innerHeight * 0.5;
    let visibleClosest = null;
    let visibleClosestDistance = Number.POSITIVE_INFINITY;
    let fallbackClosest = null;
    let fallbackClosestDistance = Number.POSITIVE_INFINITY;

    visibleBlocks.forEach((block) => {
      const rect = block.getBoundingClientRect();
      const center = rect.top + (rect.height / 2);
      const distance = Math.abs(center - viewportCenter);
      const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;

      if (distance < fallbackClosestDistance) {
        fallbackClosestDistance = distance;
        fallbackClosest = block;
      }

      if (isVisible && distance < visibleClosestDistance) {
        visibleClosestDistance = distance;
        visibleClosest = block;
      }
    });

    const activeBlock = visibleClosest || fallbackClosest;

    blocks.forEach((block) => {
      const shouldBeActive = block === activeBlock;
      block.classList.toggle('is-active', shouldBeActive);
      block.classList.toggle('is-dimmed', !shouldBeActive);
    });
  }

  let rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      updateActivePoem();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateActivePoem);
  updateActivePoem();
  return updateActivePoem;
}

function initSeedSearch(blocks, refreshActivePoem) {
  const searchInput = document.getElementById('seed-search');
  const searchStatus = document.getElementById('seed-search-status');
  if (!searchInput || !searchStatus || blocks.length === 0) return;

  blocks.forEach((block) => {
    const existing = normalizeSeed(block.dataset.seed || '');
    if (existing) {
      block.dataset.seed = existing;
      return;
    }

    const seedText = block.querySelector('.seed-word')?.textContent || '';
    block.dataset.seed = normalizeSeed(seedText);
  });

  function applySearch() {
    const query = normalizeSeed(searchInput.value);
    let visibleCount = 0;

    blocks.forEach((block) => {
      const seed = block.dataset.seed || '';
      const isMatch = query.length === 0 || seed.includes(query);
      block.classList.toggle('is-hidden', !isMatch);
      if (isMatch) visibleCount += 1;
    });

    searchStatus.textContent = query
      ? `${visibleCount} poem${visibleCount === 1 ? '' : 's'} matching "${searchInput.value.trim()}".`
      : `${visibleCount} poem${visibleCount === 1 ? '' : 's'} total.`;

    if (typeof refreshActivePoem === 'function') {
      refreshActivePoem();
    }
  }

  searchInput.addEventListener('input', applySearch);
  applySearch();
}

function normalizeSeed(value) {
  return String(value || '').toLowerCase().replace(/[^\w]/g, '');
}

async function loadPoems() {
  const local = loadSavedPoems();

  try {
    const response = await fetch(API_POEMS_ENDPOINT);
    if (!response.ok) throw new Error('Request failed');
    const remote = await response.json();
    if (!Array.isArray(remote)) return local;
    return mergePoems(remote, local);
  } catch {
    return local;
  }
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

function mergePoems(remote, local) {
  const combined = [...remote, ...local];
  const deduped = [];
  const seen = new Set();

  combined.forEach((entry) => {
    if (!entry || !entry.text) return;
    const key = `${entry.id || ''}|${entry.createdAt || ''}|${entry.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(entry);
  });

  return deduped
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 100);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
