import express from "express";
import path from "path";
import { BOOKS } from "./src/books.js";
import { listVersions, fetchChapter } from "./src/bible.js";

const app = express();
const PORT = 3000;
const STATIC_DIR = path.join(process.cwd(), "static");

app.use(express.json());

// Serve static directory
app.use("/static", express.static(STATIC_DIR));

// Index route
app.get("/", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Books list
app.get("/api/books", (_req, res) => {
  res.json({ data: BOOKS });
});

// Versions list
app.get("/api/versions", (req, res) => {
  const pane = typeof req.query.pane === "string" ? req.query.pane : undefined;
  res.json({ data: listVersions(pane) });
});

// Chapter fetch
app.get("/api/chapter", async (req, res) => {
  const version = typeof req.query.version === "string" ? req.query.version : "";
  const book = typeof req.query.book === "string" ? req.query.book : "";
  const chapStr = typeof req.query.chap === "string" ? req.query.chap : "";
  const chap = parseInt(chapStr, 10);

  if (!version || !book || isNaN(chap) || chap < 1) {
    res.status(400).json({ detail: "version, book, chap 파라미터가 올바르지 않습니다." });
    return;
  }

  try {
    const data = await fetchChapter(version, book, chap);
    res.json({ data });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (
      msg.includes("알 수 없는") ||
      msg.includes("장까지입니다") ||
      msg.includes("저작권")
    ) {
      res.status(400).json({ detail: msg });
    } else {
      res.status(502).json({ detail: msg });
    }
  }
});

// Fallback for any other route
app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
