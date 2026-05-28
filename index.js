const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('WhatsApp bot is running. Check Render logs for QR code.');
});

let sock;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        usePairingCode: false,
        logger: pino({ level: 'silent' }),
        browser: ['Render-Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR RECEIVED. Open this link in browser to see QR image:');
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnect:', shouldReconnect);
            if (shouldReconnect) {
                startSock();
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
