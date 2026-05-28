const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.get('/', (req, res) => {
    res.send('WhatsApp bot is running.');
});

let sock;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'info' }),
        browser: ['Ubuntu', 'Chrome', '22.04.4']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n========== SCAN THIS QR ==========');
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
            console.log('==================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnect:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(startSock, 3000);
            }
        }

        if (connection === 'open') {
            console.log('Connected successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startSock();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
