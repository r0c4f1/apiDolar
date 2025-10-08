const express = require('express');
const { chromium } = require('playwright-core');

const app = express();

// Middleware básico
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de scraping funcionando!',
    endpoints: {
      scraping: '/scraping',
      health: '/health'
    }
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta principal de scraping
app.get('/scraping', async (req, res) => {
  let browser = null;
  
  try {
    console.log('🔍 Iniciando scraping...');
    
    // Configuración optimizada para Vercel
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
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
    
    // Configurar timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Ir a la página
    const url = req.query.url || 'https://example.com';
    console.log(`🌐 Navegando a: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Ejemplo de scraping - extraer título y meta description
    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el?.content || 'No description');
    
    // También puedes extraer otros datos
    const h1 = await page.$eval('h1', el => el?.textContent || 'No H1').catch(() => 'No H1');
    
    await browser.close();
    
    console.log('✅ Scraping completado exitosamente');
    
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
    
    // Cerrar browser si existe
    if (browser) {
      await browser.close().catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'Verifica que la URL sea accesible y prueba nuevamente'
    });
  }
});

// Ruta de scraping con parámetros personalizados
app.post('/scraping/custom', async (req, res) => {
  let browser = null;
  
  try {
    const { url, selector, action = 'text' } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL es requerida'
      });
    }
    
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    let data = {};
    
    if (selector) {
      switch (action) {
        case 'text':
          data.selectedText = await page.$eval(selector, el => el.textContent);
          break;
        case 'html':
          data.selectedHtml = await page.$eval(selector, el => el.innerHTML);
          break;
        case 'attributes':
          data.attributes = await page.$eval(selector, el => {
            const attrs = {};
            for (let attr of el.attributes) {
              attrs[attr.name] = attr.value;
            }
            return attrs;
          });
          break;
      }
    }
    
    // Datos básicos de la página
    data.title = await page.title();
    data.url = await page.url();
    
    await browser.close();
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error en scraping personalizado:', error);
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Error interno del servidor' 
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Ruta no encontrada' 
  });
});

// Export para Vercel (IMPORTANTE)
module.exports = app;

// Solo ejecutar localmente si no estamos en Vercel
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Express corriendo en puerto ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Scraping: http://localhost:${PORT}/scraping`);
  });
}