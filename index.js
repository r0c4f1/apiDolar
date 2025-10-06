import puppeteer from "puppeteer";

async function getExchangeRates() {
  // Lanzar navegador headless compatible con Render
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "/usr/bin/chromium" || "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  });

  const page = await browser.newPage();

  // Ir al sitio
  await page.goto("https://exchangemonitor.net/dolar-venezuela", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Esperar a que carguen los elementos dinámicos
  await page.waitForSelector(".rates-list .rate-container-parent");

  // Extraer información
  const rates = await page.evaluate(() => {
    const data = [];
    document.querySelectorAll(".rate-container-parent").forEach((el) => {
      const nombre = el.querySelector(".text-title")?.innerText.trim() || "";
      const tasa = el.querySelector(".data-rate")?.innerText.trim() || "";
      const cambio = el.querySelector(".data-change")?.innerText.trim() || "";
      const fecha = el.querySelector(".rate-date")?.innerText.trim() || "";
      data.push({ nombre, tasa, cambio, fecha });
    });
    return data;
  });

  await browser.close();
  return rates;
}

// Ejecutar si es script directo
if (process.env.NODE_ENV !== "production") {
  getExchangeRates()
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((err) => console.error("❌ Error al obtener tasas:", err));
}

export default getExchangeRates;