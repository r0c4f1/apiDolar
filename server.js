import express from "express";
import { getExchangeRates } from "./scrape.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Scraper API funcionando. Usa /api/rates para obtener los datos.");
});

app.get("/api/rates", async (req, res) => {
  try {
    const data = await getExchangeRates();
    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener tasas:", error);
    res.status(500).json({ error: "No se pudieron obtener las tasas." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
