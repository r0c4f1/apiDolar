const express = require('express');
const puppeteer = require('puppeteer');
const nodeCron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Datos en memoria (puedes reemplazar con una base de datos)
let exchangeData = {
    lastUpdate: null,
    rates: {}
};

// Función principal de scraping
async function scrapeExchangeRates() {
    let browser;
    try {
        console.log('Iniciando scraping...');
        
        // Configuración de Puppeteer para Railway
        browser = await puppeteer.launch({
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
        
        // Configurar user agent y viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });
        
        // Navegar a la página
        await page.goto('https://exchangemonitor.net/dolar-venezuela', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Esperar a que cargue el contenido
        await page.waitForSelector('.table-responsive', { timeout: 10000 });

        // Extraer datos de la tabla
        const data = await page.evaluate(() => {
            const rates = {};
            const rows = document.querySelectorAll('table tbody tr');
            
            rows.forEach(row => {
                const columns = row.querySelectorAll('td');
                if (columns.length >= 3) {
                    const name = columns[0].textContent?.trim();
                    const buyPrice = columns[1].textContent?.trim();
                    const sellPrice = columns[2].textContent?.trim();
                    
                    if (name && buyPrice && sellPrice) {
                        rates[name] = {
                            compra: buyPrice,
                            venta: sellPrice,
                            timestamp: new Date().toISOString()
                        };
                    }
                }
            });
            
            return rates;
        });

        // Actualizar datos en memoria
        exchangeData = {
            lastUpdate: new Date().toISOString(),
            rates: data
        };

        console.log('Scraping completado exitosamente');
        console.log(`Datos obtenidos: ${Object.keys(data).length} tasas de cambio`);

        return data;

    } catch (error) {
        console.error('Error en el scraping:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Endpoint para obtener los datos
app.get('/api/rates', async (req, res) => {
    try {
        res.json({
            success: true,
            lastUpdate: exchangeData.lastUpdate,
            rates: exchangeData.rates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para forzar actualización
app.post('/api/refresh', async (req, res) => {
    try {
        await scrapeExchangeRates();
        res.json({
            success: true,
            message: 'Datos actualizados correctamente',
            lastUpdate: exchangeData.lastUpdate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        lastUpdate: exchangeData.lastUpdate,
        timestamp: new Date().toISOString()
    });
});

// Endpoint principal
app.get('/', (req, res) => {
    res.json({
        message: 'Scraper de Exchange Monitor Venezuela',
        endpoints: {
            '/api/rates': 'Obtener tasas de cambio',
            '/api/refresh': 'Forzar actualización',
            '/health': 'Estado del servicio'
        }
    });
});

// Programar scraping automático cada hora
nodeCron.schedule('0 * * * *', async () => {
    console.log('Ejecutando scraping programado...');
    try {
        await scrapeExchangeRates();
    } catch (error) {
        console.error('Error en scraping programado:', error);
    }
});

// Inicializar datos al iniciar
async function initialize() {
    try {
        console.log('Inicializando scraper...');
        await scrapeExchangeRates();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
            console.log(`Visita http://localhost:${PORT} para ver los endpoints`);
        });
    } catch (error) {
        console.error('Error al inicializar:', error);
        process.exit(1);
    }
}

// Manejar cierre graceful
process.on('SIGTERM', () => {
    console.log('Recibió SIGTERM, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Recibió SIGINT, cerrando servidor...');
    process.exit(0);
});

// Iniciar aplicación
initialize();