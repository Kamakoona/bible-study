from __future__ import annotations

import json
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.bible import fetch_chapter, list_versions
from app.books import BOOKS, get_book

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
LAST_READ_PATH = BASE_DIR / "data" / "last_read.json"

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


class LastRead(BaseModel):
    bookSlug: str
    chapter: int


@app.get("/api/last-read")
async def get_last_read() -> dict:
    if not LAST_READ_PATH.exists():
        return {"data": None}
    try:
        return {"data": json.loads(LAST_READ_PATH.read_text())}
    except (OSError, json.JSONDecodeError):
        return {"data": None}


@app.post("/api/last-read")
async def set_last_read(payload: LastRead) -> dict:
    book = get_book(payload.bookSlug)
    if not book:
        raise HTTPException(status_code=400, detail=f"알 수 없는 책: {payload.bookSlug}")
    if payload.chapter < 1 or payload.chapter > book["chapters"]:
        raise HTTPException(status_code=400, detail=f"{book['name_ko']}는 {book['chapters']}장까지입니다.")

    data = {"bookSlug": payload.bookSlug, "chapter": payload.chapter}
    LAST_READ_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAST_READ_PATH.write_text(json.dumps(data))
    return {"data": data}


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
