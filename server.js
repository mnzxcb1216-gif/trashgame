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
  res.json(readRankings().slice(0, 50));
});

app.post("/api/rankings", (req, res) => {
  const id = sanitizePlayerId(req.body?.id);
  const score = Number(req.body?.score);
  const grade = sanitizeGrade(req.body?.grade);

  if (!id || !Number.isFinite(score) || score < 0) {
    res.status(400).json({ error: "Invalid ranking payload" });
    return;
  }

  const record = {
    id,
    score: Math.round(score),
    grade,
    date: new Date().toISOString()
  };
  const records = [...readRankings(), record]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, 200);

  writeRankings(records);

  const rank = records.findIndex((entry) => entry.date === record.date && entry.id === record.id) + 1;
  res.json({ rank, records: records.slice(0, 50), source: "CSV" });
});

app.listen(port, () => {
  console.log(`Slime rhythm game server running on port ${port}`);
});

function ensureRankFile() {
  if (!fs.existsSync(rankFile)) {
    fs.writeFileSync(rankFile, "id,score,grade,date\n", "utf8");
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
      date: row.date || ""
    }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
}

function writeRankings(records) {
  const csv = stringify(records, {
    header: true,
    columns: ["id", "score", "grade", "date"]
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
