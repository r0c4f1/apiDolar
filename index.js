import { chromium } from "playwright-core";

async function getExchangeRates() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  });

  const page = await browser.newPage();

  await page.goto("https://exchangemonitor.net/dolar-venezuela", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForSelector(".rates-list .rate-container-parent");

  const rates = await page.$$eval(".rate-container-parent", (elements) =>
    elements.map((el) => ({
      nombre: el.querySelector(".text-title")?.innerText.trim() || "",
      tasa: el.querySelector(".data-rate")?.innerText.trim() || "",
      cambio: el.querySelector(".data-change")?.innerText.trim() || "",
      fecha: el.querySelector(".rate-date")?.innerText.trim() || "",
    }))
  );

  await browser.close();
  return rates;
}

// Ejecutar script directamente
getExchangeRates()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((err) => console.error("❌ Error al obtener tasas:", err));

export default getExchangeRates;