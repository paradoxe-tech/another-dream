import express from "express";
import fs from "fs";
const app = express();

app.use(express.static("public"));
app.use("/assets", express.static("assets"));

app.get("/level/:i", (req, res) => {
    const path = `/home/runner/workspace/assets/levels/level${req.params.i}.json`;
    const maxWidth = 10;

    try {
        const data = JSON.parse(fs.readFileSync(path, "utf-8"));
        const paddedData = data.map((layer: string[][]) => {
            return layer.map((row: string[]) => {
                const paddingSize = maxWidth - row.length;
                const padding = " ".repeat(Math.floor(paddingSize / 2)).split("");
                return [...padding, ...row, ...padding];
            })
        });

        res.json(paddedData);
        
    } catch (error) {
        res.status(500).json({ error: "Failed to load level" });
        console.error(error)
    }
    
});

app.listen(3000, () => {
    console.log("Server running on :3000");
});
