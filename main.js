import puppeteer from "puppeteer-core";
import { launch } from "chrome-launcher";

async function getExchangeRates() {
  // 1️⃣ Lanzar Chrome usando chrome-launcher
  const chrome = await launch({
    chromeFlags: ["--headless", "--no-sandbox"],
  });

  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${chrome.port}`,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // 2️⃣ Ir al sitio
  await page.goto("https://exchangemonitor.net/dolar-venezuela", {
    waitUntil: "networkidle2",
  });

  // 3️⃣ Esperar a que aparezcan los elementos cargados por JS
  await page.waitForSelector(".rates-list .rate-container-parent");

  // 4️⃣ Extraer la información
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

  // 5️⃣ Cerrar
  await browser.disconnect();
  await chrome.kill();

  return rates;
}

// 6️⃣ Ejecutar y mostrar resultado
getExchangeRates()
  .then((data) => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error("❌ Error al obtener tasas:", err);
  });