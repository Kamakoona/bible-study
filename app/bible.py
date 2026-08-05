"""Fetch Bible chapters from Midvash and Korean Bible Society."""

from __future__ import annotations

import re
import time
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.books import Book, get_book

MIDVASH_BASE = "https://api.midvash.com/v1"
BSKOREA_URL = "https://www.bskorea.or.kr/bible/korbibReadpage.php"

# Local API version ids → fetch strategy
VERSIONS: dict[str, dict[str, Any]] = {
    "kor": {
        "id": "kor",
        "label": "개역한글",
        "source": "midvash",
        "midvash": "kor",
        "pane": "left",
        "available": True,
        "note": "퍼블릭 도메인",
    },
    "saenew": {
        "id": "saenew",
        "label": "새번역",
        "source": "bskorea",
        "bskorea": "SAENEW",
        "pane": "right",
        "available": True,
        "note": "대한성서공회 (비공식 조회)",
    },
    "gae": {
        "id": "gae",
        "label": "개역개정",
        "source": "bskorea",
        "bskorea": "GAE",
        "pane": "right",
        "available": True,
        "note": "대한성서공회 (비공식 조회)",
    },
    "common": {
        "id": "common",
        "label": "공동번역",
        "source": "bskorea",
        "bskorea": "KOR",
        "pane": "right",
        "available": True,
        "note": "대한성서공회 (비공식 조회)",
    },
    "niv": {
        "id": "niv",
        "label": "NIV",
        "source": "midvash",
        "midvash": "niv",
        "pane": "right",
        "available": True,
        "note": "© Biblica",
    },
    "living": {
        "id": "living",
        "label": "현대인의 성경",
        "source": None,
        "pane": "right",
        "available": False,
        "note": "생명의말씀사 저작권으로 무료 API 없음",
    },
}

_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_TTL = 30 * 60


def list_versions(*, pane: str | None = None) -> list[dict[str, Any]]:
    items = list(VERSIONS.values())
    if pane:
        items = [v for v in items if v["pane"] == pane]
    return [
        {
            "id": v["id"],
            "label": v["label"],
            "available": v["available"],
            "note": v["note"],
            "pane": v["pane"],
        }
        for v in items
    ]


def _cache_get(key: str) -> dict[str, Any] | None:
    entry = _cache.get(key)
    if not entry:
        return None
    ts, data = entry
    if time.time() - ts > _CACHE_TTL:
        _cache.pop(key, None)
        return None
    return data


def _cache_set(key: str, data: dict[str, Any]) -> None:
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda x: x[1][0])[:100]
        for k, _ in oldest:
            _cache.pop(k, None)
    _cache[key] = (time.time(), data)


async def fetch_chapter(version_id: str, book_slug: str, chapter: int) -> dict[str, Any]:
    version = VERSIONS.get(version_id)
    if not version:
        raise ValueError(f"알 수 없는 역본: {version_id}")
    if not version["available"]:
        raise ValueError(version["note"])

    book = get_book(book_slug)
    if not book:
        raise ValueError(f"알 수 없는 책: {book_slug}")
    if chapter < 1 or chapter > book["chapters"]:
        raise ValueError(f"{book['name_ko']}는 {book['chapters']}장까지입니다.")

    cache_key = f"{version_id}:{book_slug}:{chapter}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    if version["source"] == "midvash":
        data = await _fetch_midvash(version["midvash"], book, chapter, version)
    elif version["source"] == "bskorea":
        data = await _fetch_bskorea(version["bskorea"], book, chapter, version)
    else:
        raise ValueError("이 역본은 조회할 수 없습니다.")

    _cache_set(cache_key, data)
    return data


async def _fetch_midvash(
    midvash_slug: str,
    book: Book,
    chapter: int,
    version: dict[str, Any],
) -> dict[str, Any]:
    url = f"{MIDVASH_BASE}/{midvash_slug}/{book['slug']}/{chapter}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        payload = resp.json()

    body = payload.get("data") or {}
    raw_verses = body.get("verses") or []
    verses = [
        {"number": i + 1, "text": text.strip()}
        for i, text in enumerate(raw_verses)
        if isinstance(text, str) and text.strip()
    ]
    return {
        "version": version["id"],
        "versionLabel": version["label"],
        "book": book["slug"],
        "bookName": book["name_ko"],
        "bookNameEn": book["name_en"],
        "chapter": chapter,
        "verses": verses,
        "source": "midvash",
        "note": version["note"],
    }


async def _fetch_bskorea(
    bsk_version: str,
    book: Book,
    chapter: int,
    version: dict[str, Any],
) -> dict[str, Any]:
    params = {"version": bsk_version, "book": book["bsk"], "chap": chapter}
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; bible-study/1.0; +local)",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(BSKOREA_URL, params=params, headers=headers)
        resp.raise_for_status()
        html = resp.text

    verses = _parse_bskorea_html(html)
    if not verses:
        raise RuntimeError(f"{version['label']} {book['name_ko']} {chapter}장을 파싱하지 못했습니다.")

    return {
        "version": version["id"],
        "versionLabel": version["label"],
        "book": book["slug"],
        "bookName": book["name_ko"],
        "bookNameEn": book["name_en"],
        "chapter": chapter,
        "verses": verses,
        "source": "bskorea",
        "note": version["note"],
    }


_FOOTNOTE_RE = re.compile(r"\d+\)")
_VERSE_NUM_RE = re.compile(r"^(\d+)\s+(.*)$", re.DOTALL)


def _parse_bskorea_html(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    container = soup.select_one("#tdBible1") or soup.select_one(".bible_read")
    if not container:
        return []

    verses: list[dict[str, Any]] = []
    seen: set[int] = set()

    for span in container.find_all("span", recursive=True):
        # Prefer spans that contain a .number child (verse rows)
        num_el = span.find("span", class_="number", recursive=False)
        if not num_el:
            continue
        num_match = re.search(r"(\d+)", num_el.get_text())
        if not num_match:
            continue
        verse_num = int(num_match.group(1))
        if verse_num in seen:
            continue

        for junk in span.select("div.D2, a.comment"):
            junk.decompose()
        # Join inline name/font tags without extra spaces
        text = span.get_text("", strip=False)
        text = _VERSE_NUM_RE.sub(r"\2", text, count=1)
        text = _FOOTNOTE_RE.sub("", text)
        text = re.sub(r"[\xa0\u200b]+", " ", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\s*\n\s*", " ", text).strip()
        if not text:
            continue

        seen.add(verse_num)
        verses.append({"number": verse_num, "text": text})

    verses.sort(key=lambda v: v["number"])
    return verses
