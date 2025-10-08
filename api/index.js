const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// Middleware
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de Scraping funcionando!',
    endpoints: {
      home: '/',
      health: '/health', 
      scraping: '/scraping?url=https://example.com'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/scraping', async (req, res) => {
  try {
    const url = req.query.url || 'https://example.com';
    
    console.log(`🔍 Scrapeando: ${url}`);
    
    // Hacer request
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Parsear HTML
    const $ = cheerio.load(response.data);
    
    // Extraer datos
    const title = $('title').text() || 'Sin título';
    const description = $('meta[name="description"]').attr('content') || 'Sin descripción';
    const h1 = $('h1').first().text().trim() || 'Sin H1';
    
    res.json({
      success: true,
      data: {
        url: url,
        title: title,
        description: description,
        h1: h1,
        status: response.status,
        scrapedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'Verifica que la URL sea correcta y accesible'
    });
  }
});

// Export para Vercel
module.exports = app;

// Solo para desarrollo local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Servidor local: http://localhost:${PORT}`);
  });
}