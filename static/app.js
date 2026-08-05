const FONT_MAP = {
  serif: "var(--serif)",
  myeongjo: "var(--myeongjo)",
  sans: "var(--sans)",
  noto: "var(--noto)",
};

const SIZE_MAP = {
  sm: "0.95rem",
  md: "1.05rem",
  lg: "1.2rem",
  xl: "1.4rem",
};

const PREFS_KEY = "bible-study-reader-prefs";

const state = {
  books: [],
  versions: [],
  bookSlug: "john",
  chapter: 3,
  compareVersion: "saenew",
  leftVerses: [],
  rightVerses: [],
  font: "serif",
  size: "md",
  searchQuery: "",
  searchHitIndex: 0,
};

const els = {
  bookSelect: document.getElementById("book-select"),
  chapterSelect: document.getElementById("chapter-select"),
  versionSelect: document.getElementById("version-select"),
  fontSelect: document.getElementById("font-select"),
  sizeSelect: document.getElementById("size-select"),
  searchInput: document.getElementById("search-input"),
  searchStatus: document.getElementById("search-status"),
  searchNav: document.querySelector(".search-nav"),
  searchPrevBtn: document.getElementById("search-prev-btn"),
  searchNextBtn: document.getElementById("search-next-btn"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  leftBody: document.getElementById("left-body"),
  rightBody: document.getElementById("right-body"),
  leftMeta: document.getElementById("left-meta"),
  rightMeta: document.getElementById("right-meta"),
  rightTitle: document.getElementById("right-title"),
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    if (prefs.font && FONT_MAP[prefs.font]) state.font = prefs.font;
    if (prefs.size && SIZE_MAP[prefs.size]) state.size = prefs.size;
  } catch {
    /* ignore bad prefs */
  }
}

function savePrefs() {
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({ font: state.font, size: state.size }),
  );
}

function applyReaderStyle() {
  const root = document.documentElement;
  root.style.setProperty("--reader-font", FONT_MAP[state.font]);
  root.style.setProperty("--reader-size", SIZE_MAP[state.size]);
  els.fontSelect.value = state.font;
  els.sizeSelect.value = state.size;
}

async function api(path) {
  const res = await fetch(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.detail || `요청 실패 (${res.status})`);
  }
  return json;
}

function currentBook() {
  return state.books.find((b) => b.slug === state.bookSlug) || state.books[0];
}

function fillBooks() {
  els.bookSelect.innerHTML = "";
  for (const book of state.books) {
    const opt = document.createElement("option");
    opt.value = book.slug;
    opt.textContent = book.name_ko;
    els.bookSelect.appendChild(opt);
  }
  els.bookSelect.value = state.bookSlug;
}

function fillChapters() {
  const book = currentBook();
  els.chapterSelect.innerHTML = "";
  for (let i = 1; i <= book.chapters; i += 1) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i}장`;
    els.chapterSelect.appendChild(opt);
  }
  if (state.chapter > book.chapters) state.chapter = 1;
  els.chapterSelect.value = String(state.chapter);
  updateNavButtons();
}

function fillVersions() {
  els.versionSelect.innerHTML = "";
  for (const v of state.versions) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.available ? v.label : `${v.label} (불가)`;
    opt.disabled = !v.available;
    els.versionSelect.appendChild(opt);
  }
  const preferred =
    state.versions.find((v) => v.id === state.compareVersion && v.available) ||
    state.versions.find((v) => v.available);
  state.compareVersion = preferred?.id || "niv";
  els.versionSelect.value = state.compareVersion;
}

function updateNavButtons() {
  const book = currentBook();
  const index = state.books.findIndex((b) => b.slug === state.bookSlug);
  els.prevBtn.disabled = state.chapter <= 1 && index <= 0;
  els.nextBtn.disabled =
    state.chapter >= book.chapters && index >= state.books.length - 1;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, query) {
  const escaped = escapeHtml(text);
  const q = query.trim();
  if (!q) return escaped;
  const pattern = new RegExp(escapeRegExp(escapeHtml(q)), "gi");
  return escaped.replace(pattern, (match) => `<mark class="search-hit">${match}</mark>`);
}

function getSearchHits() {
  return [
    ...els.leftBody.querySelectorAll("mark.search-hit"),
    ...els.rightBody.querySelectorAll("mark.search-hit"),
  ];
}

function updateSearchUI() {
  const hits = getSearchHits();
  const total = hits.length;
  const query = state.searchQuery.trim();

  if (!query) {
    els.searchStatus.textContent = "";
    els.searchNav.hidden = true;
    return;
  }

  if (total === 0) {
    els.searchStatus.textContent = "없음";
    els.searchNav.hidden = true;
    return;
  }

  if (state.searchHitIndex >= total) state.searchHitIndex = 0;
  if (state.searchHitIndex < 0) state.searchHitIndex = total - 1;

  els.searchStatus.textContent = `${state.searchHitIndex + 1}/${total}`;
  els.searchNav.hidden = false;

  hits.forEach((el, i) => {
    el.classList.toggle("is-current", i === state.searchHitIndex);
  });

  const current = hits[state.searchHitIndex];
  current?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function applySearch() {
  renderVerses(els.leftBody, state.leftVerses);
  if (state.rightVerses?.unavailable) {
    renderVerses(els.rightBody, state.rightVerses);
  } else if (state.rightVerses?.verses) {
    renderVerses(els.rightBody, state.rightVerses);
  }
  updateSearchUI();
}

function moveSearchHit(delta) {
  const hits = getSearchHits();
  if (!hits.length) return;
  state.searchHitIndex = (state.searchHitIndex + delta + hits.length) % hits.length;
  updateSearchUI();
}

function renderVerses(container, chapterData, emptyMessage) {
  container.innerHTML = "";
  if (!chapterData) {
    container.innerHTML = `<p class="placeholder">${emptyMessage}</p>`;
    return;
  }
  if (chapterData.unavailable) {
    container.innerHTML = `<p class="unavailable">${chapterData.message}</p>`;
    return;
  }
  if (!chapterData.verses?.length) {
    container.innerHTML = `<p class="placeholder">본문이 없습니다.</p>`;
    return;
  }

  const query = state.searchQuery.trim();
  const frag = document.createDocumentFragment();
  for (const verse of chapterData.verses) {
    const row = document.createElement("article");
    row.className = "verse";
    row.dataset.verse = String(verse.number);
    const highlighted = highlightText(verse.text, query);
    if (query && highlighted.includes("<mark")) {
      row.classList.add("has-hit");
    }
    row.innerHTML = `
      <span class="verse-num">${verse.number}</span>
      <p class="verse-text">${highlighted}</p>
    `;
    row.addEventListener("mouseenter", () => syncHighlight(verse.number));
    row.addEventListener("mouseleave", () => syncHighlight(null));
    row.addEventListener("focus", () => syncHighlight(verse.number));
    row.addEventListener("blur", () => syncHighlight(null));
    row.tabIndex = 0;
    frag.appendChild(row);
  }
  container.appendChild(frag);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

let scrollSyncLock = false;

function getAnchorVerse(container) {
  const verses = container.querySelectorAll(".verse");
  if (!verses.length) return null;
  const probe = container.scrollTop + Math.min(56, container.clientHeight * 0.18);
  let current = verses[0];
  for (const verse of verses) {
    if (verse.offsetTop <= probe) current = verse;
    else break;
  }
  return current;
}

function syncPaneScroll(source, target) {
  if (scrollSyncLock) return;
  if (!source.querySelector(".verse") || !target.querySelector(".verse")) return;

  const sourceVerse = getAnchorVerse(source);
  if (!sourceVerse) return;

  const match = target.querySelector(`.verse[data-verse="${sourceVerse.dataset.verse}"]`);
  scrollSyncLock = true;
  if (match) {
    const offset = sourceVerse.offsetTop - source.scrollTop;
    target.scrollTop = Math.max(0, match.offsetTop - offset);
  } else {
    const maxSource = source.scrollHeight - source.clientHeight;
    const maxTarget = target.scrollHeight - target.clientHeight;
    if (maxSource > 0 && maxTarget > 0) {
      target.scrollTop = (source.scrollTop / maxSource) * maxTarget;
    }
  }
  requestAnimationFrame(() => {
    scrollSyncLock = false;
  });
}

function bindScrollSync() {
  els.leftBody.addEventListener(
    "scroll",
    () => syncPaneScroll(els.leftBody, els.rightBody),
    { passive: true },
  );
  els.rightBody.addEventListener(
    "scroll",
    () => syncPaneScroll(els.rightBody, els.leftBody),
    { passive: true },
  );
}

function syncHighlight(verseNumber) {
  const active = verseNumber != null ? String(verseNumber) : null;
  for (const pane of [els.leftBody, els.rightBody]) {
    pane.querySelectorAll(".verse").forEach((el) => {
      const on = active != null && el.dataset.verse === active;
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });
  }
}

async function loadPanes() {
  const book = currentBook();
  const label = `${book.name_ko} ${state.chapter}장`;
  els.leftBody.innerHTML = `<p class="placeholder">${label} 불러오는 중…</p>`;
  els.rightBody.innerHTML = `<p class="placeholder">${label} 불러오는 중…</p>`;
  updateNavButtons();

  const versionMeta = state.versions.find((v) => v.id === state.compareVersion);
  if (versionMeta && !versionMeta.available) {
    els.rightTitle.textContent = versionMeta.label;
    els.rightMeta.textContent = versionMeta.note;
    renderVerses(els.rightBody, {
      unavailable: true,
      message: versionMeta.note,
    });
    try {
      const left = await api(
        `/api/chapter?version=kor&book=${encodeURIComponent(state.bookSlug)}&chap=${state.chapter}`,
      );
      state.leftVerses = left.data;
      els.leftMeta.textContent = `${left.data.bookName} ${left.data.chapter}장 · ${left.data.note}`;
      renderVerses(els.leftBody, left.data);
      state.searchHitIndex = 0;
      updateSearchUI();
    } catch (err) {
      els.leftBody.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
    return;
  }

  const [leftResult, rightResult] = await Promise.allSettled([
    api(`/api/chapter?version=kor&book=${encodeURIComponent(state.bookSlug)}&chap=${state.chapter}`),
    api(
      `/api/chapter?version=${encodeURIComponent(state.compareVersion)}&book=${encodeURIComponent(state.bookSlug)}&chap=${state.chapter}`,
    ),
  ]);

  if (leftResult.status === "fulfilled") {
    state.leftVerses = leftResult.value.data;
    els.leftMeta.textContent = `${leftResult.value.data.bookName} ${leftResult.value.data.chapter}장 · ${leftResult.value.data.note}`;
    renderVerses(els.leftBody, leftResult.value.data);
  } else {
    els.leftBody.innerHTML = `<p class="error">${escapeHtml(leftResult.reason.message)}</p>`;
  }

  if (rightResult.status === "fulfilled") {
    const data = rightResult.value.data;
    state.rightVerses = data;
    els.rightTitle.textContent = data.versionLabel;
    els.rightMeta.textContent = `${data.bookName} ${data.chapter}장 · ${data.note}`;
    renderVerses(els.rightBody, data);
  } else {
    els.rightBody.innerHTML = `<p class="error">${escapeHtml(rightResult.reason.message)}</p>`;
  }
  state.searchHitIndex = 0;
  updateSearchUI();
}

function goPrev() {
  if (state.chapter > 1) {
    state.chapter -= 1;
  } else {
    const index = state.books.findIndex((b) => b.slug === state.bookSlug);
    if (index > 0) {
      const prev = state.books[index - 1];
      state.bookSlug = prev.slug;
      state.chapter = prev.chapters;
      fillChapters();
      els.bookSelect.value = state.bookSlug;
    }
  }
  els.chapterSelect.value = String(state.chapter);
  loadPanes();
}

function goNext() {
  const book = currentBook();
  if (state.chapter < book.chapters) {
    state.chapter += 1;
  } else {
    const index = state.books.findIndex((b) => b.slug === state.bookSlug);
    if (index < state.books.length - 1) {
      const next = state.books[index + 1];
      state.bookSlug = next.slug;
      state.chapter = 1;
      fillChapters();
      els.bookSelect.value = state.bookSlug;
    }
  }
  els.chapterSelect.value = String(state.chapter);
  loadPanes();
}

function bindEvents() {
  els.bookSelect.addEventListener("change", () => {
    state.bookSlug = els.bookSelect.value;
    state.chapter = 1;
    fillChapters();
    loadPanes();
  });
  els.chapterSelect.addEventListener("change", () => {
    state.chapter = Number(els.chapterSelect.value);
    loadPanes();
  });
  els.versionSelect.addEventListener("change", () => {
    state.compareVersion = els.versionSelect.value;
    loadPanes();
  });
  els.fontSelect.addEventListener("change", () => {
    state.font = els.fontSelect.value;
    applyReaderStyle();
    savePrefs();
  });
  els.sizeSelect.addEventListener("change", () => {
    state.size = els.sizeSelect.value;
    applyReaderStyle();
    savePrefs();
  });
  els.prevBtn.addEventListener("click", goPrev);
  els.nextBtn.addEventListener("click", goNext);
  els.searchInput.addEventListener("input", () => {
    state.searchQuery = els.searchInput.value;
    state.searchHitIndex = 0;
    applySearch();
  });
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      moveSearchHit(e.shiftKey ? -1 : 1);
    }
    if (e.key === "Escape") {
      els.searchInput.value = "";
      state.searchQuery = "";
      state.searchHitIndex = 0;
      applySearch();
      els.searchInput.blur();
    }
  });
  els.searchPrevBtn.addEventListener("click", () => moveSearchHit(-1));
  els.searchNextBtn.addEventListener("click", () => moveSearchHit(1));
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    }
  });
}

async function init() {
  loadPrefs();
  applyReaderStyle();
  bindEvents();
  bindScrollSync();
  const [booksRes, versionsRes] = await Promise.all([
    api("/api/books"),
    api("/api/versions?pane=right"),
  ]);
  state.books = booksRes.data;
  state.versions = versionsRes.data;
  fillBooks();
  fillChapters();
  fillVersions();
  await loadPanes();
}

init().catch((err) => {
  els.leftBody.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  els.rightBody.innerHTML = `<p class="error">초기화에 실패했습니다.</p>`;
});
