
const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let isConnected = false;
let pairingRequested = false;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnect:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startSock, 5000); // Attend 5s avant de retry
      }
    } else if (connection === 'open') {
      isConnected = true;
      pairingRequested = false;
      console.log('Connecté à WhatsApp ✅');
    }

    // Demande le code une seule fois
    if (!sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true;
      await new Promise(resolve => setTimeout(resolve, 3000));
      const phoneNumber = process.env.PHONE_NUMBER;
      if (phoneNumber) {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log(`\n========== CODE DE COUPLAGE ==========\n${code}\n======================================\n`);
        } catch (e) {
          console.log('Erreur pairing:', e.message);
          pairingRequested = false;
        }
      } else {
        console.log('PHONE_NUMBER manquant dans les variables d’environnement');
      }
    }
  });
}

startSock();

app.get('/', (req, res) => {
  res.send(`Statut: ${isConnected ? 'Connecté ✅' : 'Déconnecté ❌'}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
