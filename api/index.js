const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

// Middleware
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de scraping con Puppeteer funcionando!',
    endpoints: {
      scraping: '/scraping',
      health: '/health',
      test: '/test'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ruta de TEST
app.get('/test', async (req, res) => {
  let browser = null;
  
  try {
    console.log('🚀 Iniciando test con Puppeteer...');
    
    // Configuración para Vercel
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    const title = await page.title();
    
    await browser.close();
    
    res.json({
      success: true,
      message: '✅ Puppeteer funcionando correctamente!',
      data: {
        title: title,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta principal de scraping
app.get('/scraping', async (req, res) => {
  let browser = null;
  
  try {
    const url = req.query.url || 'https://example.com';
    console.log(`🔍 Scraping: ${url}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el?.content || 'No description').catch(() => 'No description');
    const h1 = await page.$eval('h1', el => el?.textContent?.trim() || 'No H1').catch(() => 'No H1');
    
    await browser.close();
    
    res.json({
      success: true,
      data: {
        url: url,
        title: title,
        description: description,
        h1: h1,
        scrapedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = app;

// Desarrollo local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
  });
}