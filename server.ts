import express from "express";
import fs from "fs";
const app = express();

import { Map4, Map3, State } from "./source/shared/types";
import { levelShape, levelMapShape, padLevel } from "./source/shared/utils";

const PORT = 8080;

app.use("/", express.static("public"));
app.use("/", express.static("dist"));

app.use("/assets", express.static("assets"));

app.get("/level/:i", (req: express.Request, res: express.Response) => {
  const path = `/home/runner/workspace/assets/levels/`;

  const filename = "level" + String(parseInt(req.params.i)) + ".json";
  let data: Map4 = [];

  try {
    data = JSON.parse(fs.readFileSync(path + filename, "utf-8"));
  } catch (e) {
    res.status(500).json({ error: "Failed to load level, file doesn't exist" });
    console.error(e);
  }

  try {
    let paddedData: Map4;
    if (parseInt(req.params.i) == 0) {
      paddedData = padLevel(data, levelMapShape);
    } else {
      paddedData = padLevel(data, levelShape);
    }
    res.json(paddedData);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Level file found, but failed to parse level" });
    console.error(e);
  }
});

app.get("/levels", (_req: express.Request, res: express.Response) => {
  const path = `/home/runner/workspace/assets/levels`;
  const dir = fs.readdirSync(path);
  res.json({
    n: dir.length,
    list: dir,
  });
});

app.get("/trailer1", (_req: express.Request, res: express.Response) => {
  res.redirect("https://youtube.com");
});

app.get("/trailer2", (_req: express.Request, res: express.Response) => {
  res.redirect("https://youtube.com");
});

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
});