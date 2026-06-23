import { Router } from "express";
import { findBusinessesWithoutWebsite } from "../services/scraper.js";

const router = Router();

router.get("/leads", async (req, res) => {
  const { location } = req.query;

  if (!location || typeof location !== "string" || !location.trim()) {
    return res.status(400).json({ message: "A location query parameter is required." });
  }

  try {
    const leads = await findBusinessesWithoutWebsite(location.trim());
    res.json(leads);
  } catch (err) {
    console.error("Failed to scan", location, err);
    res.status(502).json({ message: "Could not reach Google Maps for that search. Try again shortly." });
  }
});

export default router;
