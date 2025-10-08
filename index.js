const express = require('express');
const { chromium } = require('playwright');
const nodeCron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Datos en memoria
let exchangeData = {
    lastUpdate: null,
    rates: {},
    status: 'pending'
};

// Función principal de scraping con Playwright
async function scrapeExchangeRates() {
    let browser;
    try {
        console.log('🚀 Iniciando scraping con Playwright...');
        exchangeData.status = 'scraping';

        // Configuración optimizada para Railway
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
                '--disable-gpu',
                '--remote-debugging-port=9222'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true
        });

        const page = await context.newPage();
        
        // Configurar timeouts
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(60000);

        console.log('🌐 Navegando a la página...');
        
        // Navegar a la página
        await page.goto('https://exchangemonitor.net/dolar-venezuela', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Esperar a que cargue el contenido
        console.log('⏳ Esperando a que cargue el contenido...');
        
        // Intentar diferentes selectores para encontrar las tablas
        await page.waitForLoadState('networkidle');
        
        // Esperar por cualquier tabla o elemento que contenga los datos
        await page.waitForSelector('table, .table, [class*="table"], [class*="rate"], [class*="exchange"]', {
            timeout: 15000
        });

        console.log('🔍 Buscando datos de tasas de cambio...');

        // Extraer datos de la página
        const data = await page.evaluate(() => {
            const rates = {};
            let tableCount = 0;

            // Buscar todas las tablas en la página
            const tables = document.querySelectorAll('table');
            console.log(`Encontradas ${tables.length} tablas`);

            tables.forEach((table, tableIndex) => {
                const rows = table.querySelectorAll('tbody tr, tr');
                console.log(`Tabla ${tableIndex + 1}: ${rows.length} filas`);

                rows.forEach((row, rowIndex) => {
                    try {
                        const columns = row.querySelectorAll('td');
                        if (columns.length >= 3) {
                            const name = columns[0]?.textContent?.trim().replace(/\s+/g, ' ');
                            const buyPrice = columns[1]?.textContent?.trim();
                            const sellPrice = columns[2]?.textContent?.trim();

                            if (name && name.length > 1 && buyPrice && sellPrice) {
                                const key = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${tableIndex}`;
                                
                                rates[key] = {
                                    nombre: name,
                                    compra: buyPrice,
                                    venta: sellPrice,
                                    tabla: tableIndex + 1,
                                    fila: rowIndex + 1,
                                    timestamp: new Date().toISOString()
                                };
                                tableCount++;
                            }
                        }
                    } catch (error) {
                        console.log(`Error en fila ${rowIndex}:`, error);
                    }
                });
            });

            // Si no encontramos datos en tablas, buscar en otros elementos
            if (tableCount === 0) {
                console.log('Buscando en otros elementos...');
                const rateElements = document.querySelectorAll('[class*="rate"], [class*="exchange"], [class*="price"]');
                rateElements.forEach((element, index) => {
                    const text = element.textContent?.trim();
                    if (text && text.includes('USD') && text.length < 100) {
                        rates[`element_${index}`] = {
                            nombre: `Elemento ${index + 1}`,
                            compra: 'N/A',
                            venta: text,
                            tipo: 'texto',
                            timestamp: new Date().toISOString()
                        };
                    }
                });
            }

            return rates;
        });

        // Si no encontramos datos, intentar una estrategia alternativa
        if (Object.keys(data).length === 0) {
            console.log('⚠️ No se encontraron datos con el primer método, intentando alternativa...');
            
            const alternativeData = await page.evaluate(() => {
                const rates = {};
                const elements = document.querySelectorAll('*');
                let count = 0;

                elements.forEach(element => {
                    const text = element.textContent?.trim();
                    // Buscar patrones que parezcan tasas de cambio
                    if (text && text.match(/\d+\.\d+/) && text.length < 200) {
                        const lines = text.split('\n').filter(line => line.trim().length > 0);
                        if (lines.length >= 3) {
                            rates[`alt_${count}`] = {
                                nombre: lines[0].substring(0, 50),
                                compra: lines[1],
                                venta: lines[2],
                                fuente: 'texto_alternativo',
                                timestamp: new Date().toISOString()
                            };
                            count++;
                        }
                    }
                });

                return rates;
            });

            Object.assign(data, alternativeData);
        }

        // Actualizar datos en memoria
        exchangeData = {
            lastUpdate: new Date().toISOString(),
            rates: data,
            status: 'success',
            totalRates: Object.keys(data).length
        };

        console.log('✅ Scraping completado exitosamente');
        console.log(`📊 ${Object.keys(data).length} tasas de cambio obtenidas`);

        return data;

    } catch (error) {
        console.error('❌ Error en el scraping:', error);
        
        exchangeData.status = 'error';
        exchangeData.lastError = error.message;

        // Datos de ejemplo en caso de error (para desarrollo)
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔄 Usando datos de ejemplo para desarrollo');
            exchangeData = {
                lastUpdate: new Date().toISOString(),
                rates: {
                    'bcv_ejemplo': {
                        nombre: 'BCV (Ejemplo)',
                        compra: '35.50',
                        venta: '36.20',
                        timestamp: new Date().toISOString()
                    },
                    'paralelo_ejemplo': {
                        nombre: 'Paralelo (Ejemplo)',
                        compra: '38.75',
                        venta: '39.25',
                        timestamp: new Date().toISOString()
                    },
                    'enparalelovzla_ejemplo': {
                        nombre: 'EnParaleloVzla (Ejemplo)',
                        compra: '38.80',
                        venta: '39.30',
                        timestamp: new Date().toISOString()
                    }
                },
                status: 'demo',
                totalRates: 3
            };
        }
        
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Navegador cerrado');
        }
    }
}

// Endpoints de la API

// Obtener todas las tasas
app.get('/api/rates', async (req, res) => {
    try {
        const { refresh } = req.query;
        
        // Forzar actualización si se solicita
        if (refresh === 'true' || !exchangeData.lastUpdate || Object.keys(exchangeData.rates).length === 0) {
            await scrapeExchangeRates();
        }
        
        res.json({
            success: true,
            status: exchangeData.status,
            lastUpdate: exchangeData.lastUpdate,
            rates: exchangeData.rates,
            total: Object.keys(exchangeData.rates).length,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            status: exchangeData.status
        });
    }
});

// Obtener una tasa específica por nombre
app.get('/api/rates/:name', (req, res) => {
    try {
        const { name } = req.params;
        const searchTerm = name.toLowerCase();
        
        const filteredRates = Object.entries(exchangeData.rates).filter(([key, rate]) => 
            rate.nombre.toLowerCase().includes(searchTerm) || 
            key.toLowerCase().includes(searchTerm)
        ).reduce((acc, [key, rate]) => {
            acc[key] = rate;
            return acc;
        }, {});

        res.json({
            success: true,
            search: name,
            results: filteredRates,
            total: Object.keys(filteredRates).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Forzar actualización
app.post('/api/refresh', async (req, res) => {
    try {
        await scrapeExchangeRates();
        res.json({
            success: true,
            message: 'Datos actualizados correctamente',
            lastUpdate: exchangeData.lastUpdate,
            total: Object.keys(exchangeData.rates).length,
            status: exchangeData.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            status: exchangeData.status
        });
    }
});

// Estado del servicio
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Exchange Monitor Scraper',
        version: '2.0.0',
        lastUpdate: exchangeData.lastUpdate,
        totalRates: Object.keys(exchangeData.rates).length,
        scrapingStatus: exchangeData.status,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
});

// Endpoint principal
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Scraper de Exchange Monitor Venezuela',
        version: '2.0.0',
        engine: 'Playwright',
        endpoints: {
            '/api/rates': 'GET - Todas las tasas de cambio (?refresh=true para forzar actualización)',
            '/api/rates/:nombre': 'GET - Buscar tasas por nombre',
            '/api/refresh': 'POST - Forzar actualización manual',
            '/health': 'GET - Estado del servicio'
        },
        documentation: 'Usa /api/rates para obtener los datos actualizados de tasas de cambio'
    });
});

// Scraping programado cada 30 minutos
nodeCron.schedule('*/30 * * * *', async () => {
    console.log('🕒 Ejecutando scraping programado...');
    try {
        await scrapeExchangeRates();
        console.log('✅ Scraping programado completado');
    } catch (error) {
        console.error('❌ Error en scraping programado:', error);
    }
});

// Scraping programado cada 6 horas con más logs
nodeCron.schedule('0 */6 * * *', async () => {
    console.log('🕒 Ejecutando scraping programado (6 horas)...');
    try {
        const startTime = Date.now();
        await scrapeExchangeRates();
        const endTime = Date.now();
        console.log(`✅ Scraping programado completado en ${endTime - startTime}ms`);
    } catch (error) {
        console.error('❌ Error en scraping programado:', error);
    }
});

// Inicialización
async function initialize() {
    try {
        console.log('🔧 Inicializando scraper con Playwright...');
        console.log('📋 Configuración:');
        console.log(`   - Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   - Puerto: ${PORT}`);
        console.log(`   - Node.js: ${process.version}`);
        console.log(`   - Playwright: ${require('playwright').chromium.version()}`);

        // Iniciar servidor inmediatamente
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🌐 Servidor corriendo en http://0.0.0.0:${PORT}`);
            console.log(`📚 Endpoints disponibles:`);
            console.log(`   http://0.0.0.0:${PORT}/api/rates`);
            console.log(`   http://0.0.0.0:${PORT}/health`);
        });

        // Iniciar scraping en segundo plano después de 3 segundos
        setTimeout(async () => {
            try {
                console.log('🎯 Iniciando primer scraping...');
                await scrapeExchangeRates();
                console.log('🎉 Aplicación inicializada correctamente con datos reales');
            } catch (error) {
                console.log('⚠️ Aplicación iniciada con datos de respaldo');
                console.log('💡 Los endpoints están disponibles, pero con datos de ejemplo');
            }
        }, 3000);

    } catch (error) {
        console.error('💥 Error crítico en inicialización:', error);
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('🛑 Recibió SIGTERM, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recibió SIGINT, cerrando servidor...');
    process.exit(0);
});

// Iniciar aplicación
initialize();