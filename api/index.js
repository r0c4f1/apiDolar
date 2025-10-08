const express = require('express');
const { chromium } = require('playwright'); // Usar playwright completo, no core

const app = express();

// Middleware
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de scraping funcionando!',
    endpoints: {
      scraping: '/scraping',
      health: '/health',
      test: '/test-scraping'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Ruta de TEST simple
app.get('/test-scraping', async (req, res) => {
  let browser = null;
  
  try {
    console.log('🚀 Iniciando test de scraping...');
    
    // FORZAR la instalación de Chromium si no existe
    const playwright = require('playwright');
    try {
      // Verificar si chromium está instalado
      await playwright.chromium.launch({ headless: true }).then(browser => browser.close());
    } catch (e) {
      console.log('📥 Chromium no encontrado, instalando...');
      const { execSync } = require('child_process');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
    }

    // Lanzar chromium de Playwright
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    // Navegar a una página simple
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    const title = await page.title();
    const content = await page.content();
    
    await browser.close();
    
    res.json({
      success: true,
      message: '✅ Test de scraping exitoso!',
      data: {
        title: title,
        contentLength: content.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'Probando instalación alternativa...'
    });
  }
});

// Ruta de scraping principal
app.get('/scraping', async (req, res) => {
  let browser = null;
  
  try {
    const url = req.query.url || 'https://example.com';
    console.log(`🔍 Iniciando scraping de: ${url}`);
    
    // Configuración robusta para Vercel
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Extraer datos
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
    console.error('❌ Error en scraping:', error);
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export para Vercel
module.exports = app;

// Solo para desarrollo local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local en puerto ${PORT}`);
  });
}