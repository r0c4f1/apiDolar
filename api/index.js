const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'API funcionando con puppeteer-core!',
    endpoints: ['/scraping', '/health', '/test']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/test', async (req, res) => {
  let browser = null;
  
  try {
    console.log('🚀 Iniciando test...');
    
    const executablePath = await chromium.executablePath;
    console.log('Chromium path:', executablePath);
    
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    const title = await page.title();
    
    await browser.close();
    
    res.json({
      success: true,
      message: '✅ Test exitoso!',
      data: { title }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/scraping', async (req, res) => {
  let browser = null;
  
  try {
    const url = req.query.url || 'https://example.com';
    
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el?.content || 'No description').catch(() => 'No description');
    
    await browser.close();
    
    res.json({
      success: true,
      data: {
        url: url,
        title: title,
        description: description,
        scrapedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local en puerto ${PORT}`);
  });
}