import express from "express";
import getExchangeRates from "./index.js";

const app = express();
app.get("/rates", async (req, res) => {
  try {
    const data = await getExchangeRates();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));