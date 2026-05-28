const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let isConnected = false;

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
      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      isConnected = true;
      console.log('Connecté à WhatsApp');
    }
  });

  // Si pas encore connecté, demande le code de couplage
  if (!sock.authState.creds.registered) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const phoneNumber = process.env.PHONE_NUMBER; // Mets ton numéro dans Render
    if (phoneNumber) {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`Code de couplage: ${code}`);
    } else {
      console.log('Ajoute PHONE_NUMBER dans les variables d’environnement Render');
    }
  }
}

startSock();

app.get('/', (req, res) => {
  res.send(`Statut: ${isConnected ? 'Connecté ✅' : 'Déconnecté ❌'}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
