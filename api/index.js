const express = require('express');
const { chromium } = require('playwright');

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Dólar Venezuela - Exchange Monitor',
    endpoints: {
      dolar: '/dolar',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK ✅',
    timestamp: new Date().toISOString()
  });
});

// Ruta principal de scraping
app.get('/dolar', async (req, res) => {
  let browser = null;
  
  try {
    console.log('🚀 Iniciando scraping con Playwright...');
    
    const url = 'https://exchangemonitor.net/dolar-venezuela';
    
    // Configuración para Vercel
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
    
    // Configurar timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Navegar a la página y esperar a que cargue el contenido dinámico
    console.log('🌐 Navegando a la página...');
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Esperar a que los elementos de tasas estén cargados
    console.log('⏳ Esperando a que carguen las tasas...');
    await page.waitForSelector('.rate-container', { timeout: 15000 });
    
    // Extraer todos los datos de las tasas
    console.log('📊 Extrayendo datos...');
    const dolares = await page.evaluate(() => {
      const rates = [];
      
      // Seleccionar todos los contenedores de tasas
      const rateElements = document.querySelectorAll('.rate-container-parent');
      
      rateElements.forEach((element) => {
        const title = element.querySelector('.text-title')?.textContent?.trim() || 'Sin nombre';
        const rate = element.querySelector('.data-rate')?.textContent?.trim() || 'Sin precio';
        const change = element.querySelector('.data-change')?.textContent?.trim() || 'Sin cambio';
        const date = element.querySelector('.rate-date')?.textContent?.trim() || 'Sin fecha';
        const subtitle = element.querySelector('.text-subtitle')?.textContent?.trim() || '';
        
        rates.push({
          nombre: title,
          precio: rate,
          cambio: change,
          fecha: date,
          moneda: subtitle,
          timestamp: new Date().toISOString()
        });
      });
      
      return rates;
    });
    
    await browser.close();
    
    console.log(`✅ Encontrados ${dolares.length} tipos de dólar`);
    
    res.json({
      success: true,
      data: {
        fuente: 'Exchange Monitor Venezuela',
        url: url,
        total_tipos: dolares.length,
        dolares: dolares,
        scrapedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error en scraping:', error.message);
    
    if (browser) {
      await browser.close().catch(e => console.error('Error cerrando browser:', e));
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'El contenido puede estar cargando dinámicamente'
    });
  }
});

// Ruta específica para un tipo de dólar
app.get('/dolar/:tipo', async (req, res) => {
  let browser = null;
  
  try {
    const tipo = req.params.tipo.toLowerCase();
    const url = 'https://exchangemonitor.net/dolar-venezuela';
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.rate-container', { timeout: 15000 });
    
    const dolarEspecifico = await page.evaluate((tipoBuscado) => {
      const rateElements = document.querySelectorAll('.rate-container-parent');
      
      for (let element of rateElements) {
        const title = element.querySelector('.text-title')?.textContent?.trim().toLowerCase() || '';
        
        if (title.includes(tipoBuscado)) {
          return {
            nombre: element.querySelector('.text-title')?.textContent?.trim(),
            precio: element.querySelector('.data-rate')?.textContent?.trim(),
            cambio: element.querySelector('.data-change')?.textContent?.trim(),
            fecha: element.querySelector('.rate-date')?.textContent?.trim(),
            moneda: element.querySelector('.text-subtitle')?.textContent?.trim()
          };
        }
      }
      return null;
    }, tipo);
    
    await browser.close();
    
    if (dolarEspecifico) {
      res.json({
        success: true,
        data: dolarEspecifico
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Tipo de dólar '${tipo}' no encontrado`,
        sugerencias: ['bcv', 'binance', 'banesco', 'promedio', 'em']
      });
    }
    
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;

// Desarrollo local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ API Dólar Venezuela en: http://localhost:${PORT}`);
    console.log(`📊 Endpoint principal: http://localhost:${PORT}/dolar`);
    console.log(`🎯 Ejemplo específico: http://localhost:${PORT}/dolar/bcv`);
  });
}