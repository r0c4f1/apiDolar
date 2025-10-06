import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

export async function getExchangeRates() {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto("https://exchangemonitor.net/dolar-venezuela", {
    waitUntil: "networkidle0",
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
