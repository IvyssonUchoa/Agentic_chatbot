import "dotenv/config"; // Carrega as variáveis do arquivo .env

import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal'
import express from 'express';

import {chatController} from './controller/chatController.js';
import {initializeDB} from './db/database.js';

// Inicializa o cliente do whatsapp web
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ],
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Use essa opção caso dê erro ao procurar pelo Chrome
  },
});

// Inicializa o banco de dados, controlador de chat e o webhook do chatwoot
await initializeDB();
const chat = new chatController(client);

const app = express();
app.use(express.json());


// Lida com os eventos do Whatsapp Web
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log("Escaneie o QR Code acima com seu WhatsApp:");
})

client.on('ready', () => {
    console.log('O bot está online e pronto para receber mensagens!');
});

client.on("disconnected", (reason) => {
  console.log("Desconectado:", reason);
});

client.on('message', async (msg) => {
    
  await chat.handleMessage(msg);
  // console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);
  return;

});


// Lida com os eventos do Chatwoot
app.post('/chatwoot-webhook', async (req, res) => {
  const data = req.body;

  res.sendStatus(200);

  try {
      await chat.handleChatwootMessage(data);
  } catch (error) {
      console.error("Erro ao enviar mensagem via WhatsApp:", error);
  }
})

client.initialize();

app.listen(4000, () => {
    console.log('Servidor webhook rodando na porta 4000');
});