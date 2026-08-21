import * as cheerio from "cheerio";
import { Book, getBook } from "./books.js";

const BSKOREA_URL = "https://www.bskorea.or.kr/bible/korbibReadpage.php";

export interface VersionInfo {
  id: string;
  label: string;
  source: "bskorea" | "bolls" | null;
  bskorea?: string;
  bolls?: string;
  pane: "left" | "right";
  available: boolean;
  note: string;
}

export interface Verse {
  number: number;
  text: string;
}

export interface ChapterData {
  version: string;
  versionLabel: string;
  book: string;
  bookName: string;
  bookNameEn: string;
  chapter: number;
  verses: Verse[];
  source: string;
  note: string;
}

export const VERSIONS: Record<string, VersionInfo> = {
  kor: {
    id: "kor",
    label: "개역한글",
    source: "bskorea",
    bskorea: "HAN",
    pane: "left",
    available: true,
    note: "대한성서공회 (비공식 조회)",
  },
  saenew: {
    id: "saenew",
    label: "새번역",
    source: "bskorea",
    bskorea: "SAENEW",
    pane: "right",
    available: true,
    note: "대한성서공회 (비공식 조회)",
  },
  gae: {
    id: "gae",
    label: "개역개정",
    source: "bskorea",
    bskorea: "GAE",
    pane: "right",
    available: true,
    note: "대한성서공회 (비공식 조회)",
  },
  common: {
    id: "common",
    label: "공동번역",
    source: "bskorea",
    bskorea: "COG",
    pane: "right",
    available: true,
    note: "대한성서공회 (비공식 조회)",
  },
  niv: {
    id: "niv",
    label: "NIV",
    source: "bolls",
    bolls: "NIV",
    pane: "right",
    available: true,
    note: "bolls.life · © Biblica",
  },
  living: {
    id: "living",
    label: "현대인의 성경",
    source: null,
    pane: "right",
    available: false,
    note: "생명의말씀사 저작권으로 무료 API 없음",
  },
};

const cache = new Map<string, { timestamp: number; data: ChapterData }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function cacheGet(key: string): ChapterData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key: string, data: ChapterData): void {
  if (cache.size > 500) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100 && i < sorted.length; i++) {
      cache.delete(sorted[i][0]);
    }
  }
  cache.set(key, { timestamp: Date.now(), data });
}

export function listVersions(pane?: string): Array<{
  id: string;
  label: string;
  available: boolean;
  note: string;
  pane: string;
}> {
  let items = Object.values(VERSIONS);
  if (pane) {
    items = items.filter((v) => v.pane === pane);
  }
  return items.map((v) => ({
    id: v.id,
    label: v.label,
    available: v.available,
    note: v.note,
    pane: v.pane,
  }));
}

const HTML_TAG_RE = /<[^>]+>/g;

async function fetchBolls(
  translation: string,
  book: Book,
  chapter: number,
  version: VersionInfo
): Promise<ChapterData> {
  const url = `https://bolls.life/get-text/${translation}/${book.id}/${chapter}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; bible-study/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`외부 API 응답 오류 (${res.status})`);
  }

  const payload = await res.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`${version.label} ${book.name_ko} ${chapter}장을 가져오지 못했습니다.`);
  }

  const verses: Verse[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const number = item.verse;
    const raw = String(item.text ?? "");
    let text = raw.replace(HTML_TAG_RE, " ");
    text = text.replace(/\s+/g, " ").trim();
    if (number == null || !text) continue;
    verses.push({ number: Number(number), text });
  }

  if (verses.length === 0) {
    throw new Error(`${version.label} ${book.name_ko} ${chapter}장을 파싱하지 못했습니다.`);
  }

  return {
    version: version.id,
    versionLabel: version.label,
    book: book.slug,
    bookName: book.name_ko,
    bookNameEn: book.name_en,
    chapter,
    verses,
    source: "bolls",
    note: version.note,
  };
}

function parseBskoreaHtml(html: string): Verse[] {
  const $ = cheerio.load(html);
  const container = $("#tdBible1, .bible_read").first();
  if (!container.length) return [];

  const verses: Verse[] = [];
  const seen = new Set<number>();

  container.find("span").each((_, el) => {
    const span = $(el);
    const numEl = span.find("span.number").first();
    if (!numEl.length) return;

    const numText = numEl.text();
    const numMatch = numText.match(/(\d+)/);
    if (!numMatch) return;

    const verseNum = parseInt(numMatch[1], 10);
    if (seen.has(verseNum)) return;

    const cloned = span.clone();
    cloned.find("div.D2, a.comment, span.number").remove();

    let text = cloned.text();
    text = text.replace(/^\d+\s+/, "");
    text = text.replace(/\d+\)/g, "");
    text = text.replace(/[\xa0\u200b\u3000]+/g, " ");
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/\s*\n\s*/g, " ").trim();

    if (!text) return;

    seen.add(verseNum);
    verses.push({ number: verseNum, text });
  });

  verses.sort((a, b) => a.number - b.number);
  return verses;
}

async function fetchBskorea(
  bskVersion: string,
  book: Book,
  chapter: number,
  version: VersionInfo
): Promise<ChapterData> {
  const params = new URLSearchParams({
    version: bskVersion,
    book: book.bsk,
    chap: String(chapter),
  });
  const url = `${BSKOREA_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; bible-study/1.0; +local)",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`대한성서공회 응답 오류 (${res.status})`);
  }

  const html = await res.text();
  const verses = parseBskoreaHtml(html);

  if (!verses || verses.length === 0) {
    throw new Error(`${version.label} ${book.name_ko} ${chapter}장을 파싱하지 못했습니다.`);
  }

  return {
    version: version.id,
    versionLabel: version.label,
    book: book.slug,
    bookName: book.name_ko,
    bookNameEn: book.name_en,
    chapter,
    verses,
    source: "bskorea",
    note: version.note,
  };
}

export async function fetchChapter(
  versionId: string,
  bookSlug: string,
  chapter: number
): Promise<ChapterData> {
  const version = VERSIONS[versionId];
  if (!version) {
    throw new Error(`알 수 없는 역본: ${versionId}`);
  }
  if (!version.available) {
    throw new Error(version.note);
  }

  const book = getBook(bookSlug);
  if (!book) {
    throw new Error(`알 수 없는 책: ${bookSlug}`);
  }
  if (chapter < 1 || chapter > book.chapters) {
    throw new Error(`${book.name_ko}는 ${book.chapters}장까지입니다.`);
  }

  const cacheKey = `${versionId}:${bookSlug}:${chapter}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  let data: ChapterData;
  if (version.source === "bskorea" && version.bskorea) {
    data = await fetchBskorea(version.bskorea, book, chapter, version);
  } else if (version.source === "bolls" && version.bolls) {
    data = await fetchBolls(version.bolls, book, chapter, version);
  } else {
    throw new Error("이 역본은 조회할 수 없습니다.");
  }

  cacheSet(cacheKey, data);
  return data;
}
