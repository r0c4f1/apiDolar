import express from 'express';
import { chromium } from 'playwright'; // Importa específicamente chromium

const app = express();

app.get('/scraping', async (req, res) => {
  let browser = null;
  try {
    // Configuración específica para entornos serverless
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Tu lógica de scraping aquí
    await page.goto('https://ejemplo.com');
    const title = await page.title();
    
    await browser.close();
    
    res.json({ 
      success: true, 
      data: { title } 
    });
    
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      error: error.message 
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

module.exports = app;