from __future__ import annotations

from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.bible import fetch_chapter, list_versions, search_bible
from app.books import BOOKS

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Bible Study", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/books")
async def books() -> dict:
    return {"data": BOOKS}


@app.get("/api/versions")
async def versions(pane: str | None = Query(default=None)) -> dict:
    return {"data": list_versions(pane=pane)}


@app.get("/api/chapter")
async def get_chapter(
    version: str = Query(..., description="역본 id"),
    book: str = Query(..., description="책 slug (예: john)"),
    chap: int = Query(..., ge=1, description="장 번호"),
) -> dict:
    try:
        data = await fetch_chapter(version, book, chap)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"외부 API 오류: {exc}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"data": data}


@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1, description="검색어"),
    version: str = Query("kor", description="역본 id"),
    limit: int = Query(40, ge=1, le=80),
    page: int = Query(1, ge=1),
) -> dict:
    try:
        data = await search_bible(version, q, limit=limit, page=page)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"외부 검색 API 오류: {exc}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"data": data}
