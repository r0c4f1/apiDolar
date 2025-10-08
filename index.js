const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/rates', async (req, res) => {
  let browser;
  try {
    console.log('🚀 Iniciando scraping en Railway...');
    
    // Configuración específica para Railway
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
    
    console.log('🌐 Navegando a la página...');
    await page.goto('https://exchangemonitor.net/dolar-venezuela', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('🔍 Buscando contenedores...');
    
    await page.waitForSelector('.rates-list .rate-container-parent', { 
      timeout: 10000 
    });

    console.log('✅ Contenedores encontrados, extrayendo datos...');

    const rates = await page.evaluate(() => {
      const data = {};
      const containers = document.querySelectorAll('.rates-list .rate-container-parent');
      
      console.log(`Encontrados ${containers.length} contenedores`);
      
      containers.forEach(container => {
        try {
          const title = container.querySelector('.text-title')?.textContent?.trim();
          const rate = container.querySelector('.data-rate')?.textContent?.trim();
          const change = container.querySelector('.data-change')?.textContent?.trim();
          const date = container.querySelector('.rate-date')?.textContent?.trim();
          
          if (title && rate) {
            data[title] = {
              nombre: title,
              tasa: rate,
              cambio: change || '0%',
              fecha: date || 'N/A'
            };
          }
        } catch (error) {
          console.log('Error en contenedor:', error);
        }
      });
      
      return data;
    });

    console.log(`📊 ${Object.keys(rates).length} tasas extraídas`);
    
    res.json({
      success: true,
      rates: rates,
      total: Object.keys(rates).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      errorType: error.name
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Navegador cerrado');
    }
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Ir a /api/rates para ver las tasas de cambio',
    platform: 'Railway'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/rates`);
});