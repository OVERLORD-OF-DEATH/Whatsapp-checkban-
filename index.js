const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

let sock;
const PHONE_NUMBER = 'TON_NUMERO_ICI'; // Ex: 33612345678 sans + ni espaces

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '22.04.4']
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(PHONE_NUMBER);
            console.log('\n========== TON CODE PAIRING ==========');
            console.log(code.match(/.{1,4}/g).join('-'));
            console.log('======================================\n');
            console.log('Va dans WhatsApp > Appareils connectés > Lier avec un numéro');
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnect:', shouldReconnect);
            if (shouldReconnect) setTimeout(startSock, 5000);
        }
        
        if (connection === 'open') {
            console.log('Connecté avec succès !');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startSock();

app.get('/', (req, res) => res.send('Bot running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
