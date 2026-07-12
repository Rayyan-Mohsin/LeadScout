import "dotenv/config";
import express from "express";
import cors from "cors";
import leadsRouter from "./routes/leads.js";
import { verifyBrowserLaunch } from "./services/scraper.js";

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", leadsRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Leadscout API listening on port ${PORT}`);
  verifyBrowserLaunch().then((ok) => {
    if (ok) console.log("[leadscout] Chromium OK — scraper ready");
  });
});
