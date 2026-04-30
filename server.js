const express = require("express");
const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;
const gameFile = path.join(rootDir, "똥냄새리듬게임.html");
const rankFile = path.join(rootDir, "rank.csv");

app.use(express.json({ limit: "16kb" }));

app.use(express.static(rootDir, {
  extensions: ["html"],
  index: false
}));

app.get("/", (req, res) => {
  res.sendFile(gameFile);
});

app.get("/game", (req, res) => {
  res.sendFile(gameFile);
});

app.get("/api/rankings", (req, res) => {
  const mode = sanitizeMode(req.query?.mode);
  const rankings = readRankings()
    .filter((record) => !mode || record.mode === mode)
    .slice(0, 50);
  res.json(rankings);
});

app.post("/api/rankings", (req, res) => {
  const id = sanitizePlayerId(req.body?.id);
  const score = Number(req.body?.score);
  const grade = sanitizeGrade(req.body?.grade);
  const mode = sanitizeMode(req.body?.mode);

  if (!id || !Number.isFinite(score) || score < 0 || !mode) {
    res.status(400).json({ error: "Invalid ranking payload" });
    return;
  }

  const record = {
    id,
    score: Math.round(score),
    grade,
    mode,
    date: new Date().toISOString()
  };
  const allRecords = [...readRankings(), record]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, 200);
  const modeRecords = allRecords.filter((entry) => entry.mode === mode);

  writeRankings(allRecords);

  const rank = modeRecords.findIndex((entry) => entry.date === record.date && entry.id === record.id) + 1;
  res.json({ rank, records: modeRecords.slice(0, 50), source: "CSV", mode });
});

app.listen(port, () => {
  console.log(`Slime rhythm game server running on port ${port}`);
});

function ensureRankFile() {
  if (!fs.existsSync(rankFile)) {
    fs.writeFileSync(rankFile, "id,score,grade,mode,date\n", "utf8");
  }
}

function readRankings() {
  ensureRankFile();
  const content = fs.readFileSync(rankFile, "utf8");
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return rows
    .map((row) => ({
      id: sanitizePlayerId(row.id) || "PLAYER",
      score: Number(row.score) || 0,
      grade: sanitizeGrade(row.grade),
      mode: sanitizeMode(row.mode) || "x1",
      date: row.date || ""
    }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
}

function writeRankings(records) {
  const csv = stringify(records, {
    header: true,
    columns: ["id", "score", "grade", "mode", "date"]
  });
  fs.writeFileSync(rankFile, csv, "utf8");
}

function sanitizePlayerId(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w가-힣-]/g, "")
    .slice(0, 16);
}

function sanitizeGrade(value) {
  const grade = String(value || "F").trim().toUpperCase();
  return /^(SSS|S|A|B|F)$/.test(grade) ? grade : "F";
}

function sanitizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return /^(x1|x2|x5)$/.test(mode) ? mode : "";
}
