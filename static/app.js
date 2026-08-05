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
  allVersions: [],
  bookSlug: "john",
  chapter: 3,
  compareVersion: "saenew",
  leftVerses: [],
  rightVerses: [],
  font: "serif",
  size: "md",
  searchQuery: "",
  searchHitIndex: 0,
  globalSearchVersion: "kor",
  globalSearchResults: [],
  pendingJumpVerse: null,
};

const els = {
  bookSelect: document.getElementById("book-select"),
  chapterSelect: document.getElementById("chapter-select"),
  versionSelect: document.getElementById("version-select"),
  fontSelect: document.getElementById("font-select"),
  sizeSelect: document.getElementById("size-select"),
  globalSearchVersion: document.getElementById("global-search-version"),
  globalSearchInput: document.getElementById("global-search-input"),
  globalSearchBtn: document.getElementById("global-search-btn"),
  globalSearchResults: document.getElementById("global-search-results"),
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
  sharedScroll: document.getElementById("shared-scroll"),
  scrollTrack: document.getElementById("shared-scroll-track"),
  scrollThumb: document.getElementById("shared-scroll-thumb"),
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

function fillGlobalSearchVersions() {
  const byId = new Map();
  for (const v of state.allVersions.length ? state.allVersions : state.versions) {
    if (v.available && v.searchable) byId.set(v.id, v);
  }
  if (!byId.has("kor")) {
    byId.set("kor", { id: "kor", label: "개역한글" });
  }
  els.globalSearchVersion.innerHTML = "";
  for (const v of byId.values()) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    els.globalSearchVersion.appendChild(opt);
  }
  if (!byId.has(state.globalSearchVersion)) {
    state.globalSearchVersion = "kor";
  }
  els.globalSearchVersion.value = state.globalSearchVersion;
}

function hideGlobalSearchResults() {
  els.globalSearchResults.hidden = true;
  els.globalSearchResults.innerHTML = "";
}

function renderGlobalSearchResults(data) {
  const results = data.results || [];
  state.globalSearchResults = results;
  if (!results.length) {
    els.globalSearchResults.innerHTML = `<p class="global-search-empty">「${escapeHtml(data.query)}」 검색 결과가 없습니다.</p>`;
    els.globalSearchResults.hidden = false;
    return;
  }

  const totalLabel = data.total > results.length ? `${results.length}/${data.total}` : String(results.length);
  const items = results
    .map((item, index) => {
      const ref = `${item.bookName} ${item.chapter}:${item.verse}`;
      return `
        <button type="button" class="global-search-item" data-index="${index}">
          <span class="global-search-ref">${escapeHtml(ref)}</span>
          <span class="global-search-text">${escapeHtml(item.text)}</span>
        </button>
      `;
    })
    .join("");

  els.globalSearchResults.innerHTML = `
    <div class="global-search-meta">${escapeHtml(data.versionLabel)} · ${totalLabel}건</div>
    <div class="global-search-list">${items}</div>
  `;
  els.globalSearchResults.hidden = false;
  els.globalSearchResults.querySelectorAll(".global-search-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.globalSearchResults[Number(btn.dataset.index)];
      if (item) jumpToSearchResult(item, data.query);
    });
  });
}

async function runGlobalSearch() {
  const q = els.globalSearchInput.value.trim();
  state.globalSearchVersion = els.globalSearchVersion.value;
  if (!q) {
    hideGlobalSearchResults();
    els.globalSearchInput.focus();
    return;
  }

  els.globalSearchResults.hidden = false;
  els.globalSearchResults.innerHTML = `<p class="global-search-empty">검색 중…</p>`;
  els.globalSearchBtn.disabled = true;
  try {
    const res = await api(
      `/api/search?q=${encodeURIComponent(q)}&version=${encodeURIComponent(state.globalSearchVersion)}&limit=40`,
    );
    renderGlobalSearchResults(res.data);
  } catch (err) {
    els.globalSearchResults.innerHTML = `<p class="global-search-empty error">${escapeHtml(err.message)}</p>`;
    els.globalSearchResults.hidden = false;
  } finally {
    els.globalSearchBtn.disabled = false;
  }
}

async function jumpToSearchResult(item, query) {
  hideGlobalSearchResults();
  state.bookSlug = item.book;
  state.chapter = item.chapter;
  state.pendingJumpVerse = item.verse;
  state.searchQuery = query;
  els.searchInput.value = query;
  state.searchHitIndex = 0;

  // If searching a compare version, switch the right pane to it
  if (item && state.globalSearchVersion !== "kor") {
    const meta = state.versions.find((v) => v.id === state.globalSearchVersion && v.available);
    if (meta) {
      state.compareVersion = state.globalSearchVersion;
      els.versionSelect.value = state.compareVersion;
    }
  }

  els.bookSelect.value = state.bookSlug;
  fillChapters();
  els.chapterSelect.value = String(state.chapter);
  await loadPanes();
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
    updateSharedScrollbar();
    return;
  }

  if (total === 0) {
    els.searchStatus.textContent = "없음";
    els.searchNav.hidden = true;
    updateSharedScrollbar();
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
  const verse = current?.closest(".verse");
  if (verse?.dataset.verse) {
    scrollToSharedVerse(verse.dataset.verse);
  } else {
    updateSharedScrollbar();
  }
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

function getScrollMax(container) {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

function getSharedMax() {
  return Math.max(getScrollMax(els.leftBody), getScrollMax(els.rightBody));
}

function getSharedRatio() {
  const leftMax = getScrollMax(els.leftBody);
  const rightMax = getScrollMax(els.rightBody);
  if (leftMax >= rightMax && leftMax > 0) return els.leftBody.scrollTop / leftMax;
  if (rightMax > 0) return els.rightBody.scrollTop / rightMax;
  return 0;
}

function updateSharedScrollbar(ratio = getSharedRatio()) {
  const track = els.scrollTrack;
  const thumb = els.scrollThumb;
  const bar = els.sharedScroll;
  if (!track || !thumb || !bar) return;

  const max = getSharedMax();
  const trackH = track.clientHeight;
  if (trackH <= 0) return;

  if (max <= 0) {
    bar.classList.add("is-disabled");
    bar.setAttribute("aria-valuenow", "0");
    thumb.style.height = "100%";
    thumb.style.transform = "translateY(0)";
    return;
  }

  bar.classList.remove("is-disabled");
  const contentH = Math.max(els.leftBody.scrollHeight, els.rightBody.scrollHeight);
  const viewH = Math.min(els.leftBody.clientHeight, els.rightBody.clientHeight) || trackH;
  const thumbH = Math.min(trackH, Math.max(36, (viewH / Math.max(contentH, 1)) * trackH));
  const travel = Math.max(0, trackH - thumbH);
  const clamped = Math.min(1, Math.max(0, ratio));
  thumb.style.height = `${thumbH}px`;
  thumb.style.transform = `translateY(${clamped * travel}px)`;
  bar.setAttribute("aria-valuenow", String(Math.round(clamped * 100)));
}

function applySharedRatio(ratio) {
  const clamped = Math.min(1, Math.max(0, ratio));
  scrollSyncLock = true;
  for (const body of [els.leftBody, els.rightBody]) {
    const max = getScrollMax(body);
    body.scrollTop = clamped * max;
  }
  updateSharedScrollbar(clamped);
  requestAnimationFrame(() => {
    scrollSyncLock = false;
  });
}

function scrollToSharedVerse(verseNumber) {
  const leftVerse = els.leftBody.querySelector(`.verse[data-verse="${verseNumber}"]`);
  const rightVerse = els.rightBody.querySelector(`.verse[data-verse="${verseNumber}"]`);
  scrollSyncLock = true;
  if (leftVerse) {
    els.leftBody.scrollTop = Math.max(0, leftVerse.offsetTop - els.leftBody.clientHeight * 0.35);
  }
  if (rightVerse) {
    els.rightBody.scrollTop = Math.max(0, rightVerse.offsetTop - els.rightBody.clientHeight * 0.35);
  }
  updateSharedScrollbar(getSharedRatio());
  requestAnimationFrame(() => {
    scrollSyncLock = false;
  });
}

function bindSharedScroll() {
  const onWheel = (event) => {
    if (getSharedMax() <= 0) return;
    event.preventDefault();
    const primary =
      getScrollMax(els.leftBody) >= getScrollMax(els.rightBody) ? els.leftBody : els.rightBody;
    const max = getScrollMax(primary);
    if (max <= 0) return;
    applySharedRatio((primary.scrollTop + event.deltaY) / max);
  };

  for (const body of [els.leftBody, els.rightBody]) {
    body.addEventListener("wheel", onWheel, { passive: false });
    body.addEventListener(
      "scroll",
      () => {
        if (scrollSyncLock) return;
        const max = getScrollMax(body);
        if (max <= 0) return;
        applySharedRatio(body.scrollTop / max);
      },
      { passive: true },
    );
  }

  let dragging = false;
  let dragOffsetY = 0;

  const ratioFromPointer = (clientY) => {
    const rect = els.scrollTrack.getBoundingClientRect();
    const thumbH = els.scrollThumb.offsetHeight;
    const travel = Math.max(1, rect.height - thumbH);
    const y = clientY - rect.top - dragOffsetY;
    return Math.min(1, Math.max(0, y / travel));
  };

  els.scrollThumb.addEventListener("pointerdown", (event) => {
    if (els.sharedScroll.classList.contains("is-disabled")) return;
    dragging = true;
    dragOffsetY = event.clientY - els.scrollThumb.getBoundingClientRect().top;
    els.scrollThumb.setPointerCapture(event.pointerId);
    els.scrollThumb.classList.add("is-dragging");
    event.preventDefault();
  });

  els.scrollThumb.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    applySharedRatio(ratioFromPointer(event.clientY));
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    dragOffsetY = 0;
    els.scrollThumb.classList.remove("is-dragging");
    try {
      els.scrollThumb.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  els.scrollThumb.addEventListener("pointerup", endDrag);
  els.scrollThumb.addEventListener("pointercancel", endDrag);

  els.scrollTrack.addEventListener("pointerdown", (event) => {
    if (event.target === els.scrollThumb) return;
    if (els.sharedScroll.classList.contains("is-disabled")) return;
    dragOffsetY = els.scrollThumb.offsetHeight / 2;
    applySharedRatio(ratioFromPointer(event.clientY));
  });

  window.addEventListener("resize", () => updateSharedScrollbar());

  const observer = new ResizeObserver(() => updateSharedScrollbar());
  observer.observe(els.leftBody);
  observer.observe(els.rightBody);
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
      updateSharedScrollbar();
      finishPendingJump();
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
  updateSharedScrollbar();
  if (state.pendingJumpVerse != null) {
    const verse = state.pendingJumpVerse;
    state.pendingJumpVerse = null;
    syncHighlight(verse);
    scrollToSharedVerse(String(verse));
  }
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
  els.globalSearchBtn.addEventListener("click", () => {
    runGlobalSearch();
  });
  els.globalSearchVersion.addEventListener("change", () => {
    state.globalSearchVersion = els.globalSearchVersion.value;
  });
  els.globalSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runGlobalSearch();
    }
    if (e.key === "Escape") {
      hideGlobalSearchResults();
      els.globalSearchInput.blur();
    }
  });
  document.addEventListener("click", (e) => {
    const root = e.target.closest(".global-search");
    if (!root) hideGlobalSearchResults();
  });
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
  bindSharedScroll();
  const [booksRes, versionsRes] = await Promise.all([
    api("/api/books"),
    api("/api/versions"),
  ]);
  state.books = booksRes.data;
  state.allVersions = versionsRes.data;
  state.versions = versionsRes.data.filter((v) => v.pane === "right");
  fillBooks();
  fillChapters();
  fillVersions();
  fillGlobalSearchVersions();
  await loadPanes();
}

init().catch((err) => {
  els.leftBody.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  els.rightBody.innerHTML = `<p class="error">초기화에 실패했습니다.</p>`;
});
