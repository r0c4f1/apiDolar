const playwright = require('playwright-core');

module.exports = async (req, res) => {
  // Configuración específica para serverless
  let browser = null;
  
  try {
    console.log('Iniciando browser...');
    
    // Usar chromium del sistema en lugar de descargado
    browser = await playwright.chromium.launch({
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
    
    // Configurar timeout
    page.setDefaultTimeout(30000);
    
    console.log('Navegando a la página...');
    await page.goto('https://example.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log('Título obtenido:', title);
    
    await browser.close();
    
    res.status(200).json({
      success: true,
      data: {
        title: title,
        message: 'Scraping exitoso!'
      }
    });
    
  } catch (error) {
    console.error('Error durante el scraping:', error);
    
    if (browser) {
      await browser.close().catch(e => console.error('Error cerrando browser:', e));
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'El entorno puede no tener Chromium disponible'
    });
  }
};