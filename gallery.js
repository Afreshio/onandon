/**
 * Gallery effects — dim non-focused poems while scrolling
 */

const SAVED_POEMS_KEY = 'onandon_saved_poems';
const LAST_UPLOADED_POEM_KEY = 'onandon_last_uploaded_poem';
const ADMIN_TOKEN_KEY = 'onandon_admin_delete_token';
const API_POEMS_ENDPOINT = '/api/poems';
const API_ADMIN_CONFIG_ENDPOINT = '/api/admin/config';
let adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
let deleteConfigured = false;

initGallery();

async function initGallery() {
  await initAdminControls();
  await hydrateSavedPoems();
  const poemBlocks = Array.from(document.querySelectorAll('[data-poem]'));
  const refreshActivePoem = initScrollDimming(poemBlocks);
  const applySearch = initSeedSearch(poemBlocks, refreshActivePoem);
  initDeletePoems(poemBlocks, refreshActivePoem, applySearch);
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
    const article = buildPoemBlock(entry, true);
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
  return applySearch;
}

function initDeletePoems(blocks, refreshActivePoem, applySearch) {
  const stack = document.querySelector('.poem-stack');
  if (!stack) return;

  stack.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const deleteBtn = target.closest('[data-delete-poem]');
    if (!deleteBtn) return;

    const article = deleteBtn.closest('[data-poem]');
    if (!article) return;
    const poemId = String(article.dataset.poemId || '').trim();
    if (!poemId) return;
    if (!isAdminUnlocked()) {
      window.alert('Unlock admin mode before deleting poems.');
      return;
    }

    const confirmed = window.confirm('Remove this poem from the gallery?');
    if (!confirmed) return;

    deleteBtn.setAttribute('disabled', 'true');
    try {
      await deletePoem(poemId);
      removeLocalPoem(poemId);

      const idx = blocks.indexOf(article);
      if (idx >= 0) blocks.splice(idx, 1);
      article.remove();

      if (typeof applySearch === 'function') applySearch();
      if (typeof refreshActivePoem === 'function') refreshActivePoem();
    } catch (err) {
      if (err && err.status === 404) {
        // If the poem is already absent from server storage, remove stale local UI entry.
        removeLocalPoem(poemId);
        const idx = blocks.indexOf(article);
        if (idx >= 0) blocks.splice(idx, 1);
        article.remove();
        if (typeof applySearch === 'function') applySearch();
        if (typeof refreshActivePoem === 'function') refreshActivePoem();
        return;
      }

      deleteBtn.removeAttribute('disabled');
      if (err && err.status === 403) {
        window.alert('Admin token is invalid. Unlock admin again and retry.');
        return;
      }
      window.alert('Could not delete poem right now. Please try again.');
    }
  });
}

function buildPoemBlock(entry, isDeletable) {
  const remainder = Array.isArray(entry.words)
    ? entry.words.slice(1).join(' ')
    : entry.text.split(/\s+/).slice(1).join(' ');
  const article = document.createElement('article');
  article.className = isDeletable ? 'poem-block poem-block--deletable' : 'poem-block';
  article.setAttribute('data-poem', '');
  article.dataset.seed = normalizeSeed(entry.seedWord);
  if (entry.id) article.dataset.poemId = String(entry.id);
  article.innerHTML = `<p><span class="seed-word">${escapeHtml(entry.seedWord)}</span>${remainder ? ` ${escapeHtml(remainder)}` : ''}</p>`;

  if (isDeletable && entry.id) {
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'poem-delete-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('data-delete-poem', '');
    deleteButton.setAttribute('aria-label', `Delete poem starting with ${entry.seedWord}`);
    article.appendChild(deleteButton);
  }

  return article;
}

function normalizeSeed(value) {
  return String(value || '').toLowerCase().replace(/[^\w]/g, '');
}

async function loadPoems() {
  const lastUploaded = loadLastUploadedPoem();
  try {
    const response = await fetch(API_POEMS_ENDPOINT);
    if (!response.ok) throw new Error('Request failed');
    const remote = await response.json();
    if (!Array.isArray(remote)) return [];
    const deduped = dedupePoems(lastUploaded ? [lastUploaded, ...remote] : remote);
    const remoteHasLastUploaded = Boolean(
      lastUploaded && remote.some((entry) => String(entry?.id || '') === String(lastUploaded.id || '')),
    );
    if (remoteHasLastUploaded) clearLastUploadedPoem();
    return deduped
      .filter((entry) => entry && entry.text)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 100);
  } catch {
    const local = loadSavedPoems();
    return dedupePoems(lastUploaded ? [lastUploaded, ...local] : local)
      .filter((entry) => entry && entry.text)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 100);
  }
}

async function deletePoem(id) {
  if (!isAdminUnlocked()) throw new Error('Admin authorization required');
  const response = await fetch(`${API_POEMS_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'x-admin-token': adminToken,
    },
  });
  if (response.ok) return;

  let errorBody = null;
  try {
    errorBody = await response.json();
  } catch {
    // Ignore parse errors and use status code.
  }

  const err = new Error((errorBody && errorBody.error) || 'Request failed');
  err.status = response.status;
  throw err;
}

async function initAdminControls() {
  const adminButton = document.getElementById('admin-toggle');
  const adminStatus = document.getElementById('admin-status');
  if (!adminButton || !adminStatus) return;

  deleteConfigured = await fetchDeleteConfig();
  applyAdminUiState(adminButton, adminStatus);

  adminButton.addEventListener('click', () => {
    if (!deleteConfigured) {
      window.alert('Admin delete token is not configured on the server yet.');
      return;
    }

    if (isAdminUnlocked()) {
      adminToken = '';
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      applyAdminUiState(adminButton, adminStatus);
      return;
    }

    const value = window.prompt('Enter admin delete token');
    if (!value) return;
    adminToken = value.trim();
    sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    applyAdminUiState(adminButton, adminStatus);
  });
}

async function fetchDeleteConfig() {
  try {
    const response = await fetch(API_ADMIN_CONFIG_ENDPOINT);
    if (!response.ok) return false;
    const payload = await response.json();
    return Boolean(payload && payload.deleteConfigured);
  } catch {
    return false;
  }
}

function isAdminUnlocked() {
  return Boolean(adminToken);
}

function applyAdminUiState(adminButton, adminStatus) {
  const unlocked = isAdminUnlocked();
  document.body.classList.toggle('is-admin-unlocked', unlocked);
  adminButton.textContent = unlocked ? 'Admin lock' : 'Admin unlock';
  if (!deleteConfigured) {
    adminStatus.textContent = 'Admin delete not configured';
    return;
  }
  adminStatus.textContent = unlocked ? 'Admin unlocked' : 'Admin locked';
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

function removeLocalPoem(id) {
  const poems = loadSavedPoems();
  const nextPoems = poems.filter((entry) => String(entry?.id || '') !== String(id));
  localStorage.setItem(SAVED_POEMS_KEY, JSON.stringify(nextPoems));
  const lastUploaded = loadLastUploadedPoem();
  if (lastUploaded && String(lastUploaded.id || '') === String(id)) {
    clearLastUploadedPoem();
  }
}

function loadLastUploadedPoem() {
  try {
    const raw = sessionStorage.getItem(LAST_UPLOADED_POEM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id || !parsed.text) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearLastUploadedPoem() {
  try {
    sessionStorage.removeItem(LAST_UPLOADED_POEM_KEY);
  } catch {
    // no-op
  }
}

function dedupePoems(list) {
  const deduped = [];
  const seen = new Set();
  list.forEach((entry) => {
    if (!entry || !entry.text) return;
    const id = String(entry.id || '');
    const key = id || `${entry.createdAt || ''}|${entry.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(entry);
  });
  return deduped;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
