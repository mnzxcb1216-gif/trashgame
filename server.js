const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;
const gameFile = path.join(rootDir, "똥냄새리듬게임.html");

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

app.listen(port, () => {
  console.log(`Slime rhythm game server running on port ${port}`);
});
