import "dotenv/config"; // Carrega as variáveis do arquivo .env

import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal'

import {chatController} from './controller/chatController.js';
import {initializeDB} from './db/database.js';


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
    // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Use essa opção caso dê erro ao procurar pelo Chrome
  },
});


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


await initializeDB();
const chat = new chatController(client);

client.on('message', async (msg) => {
    
  await chat.handleMessage(msg);
  // console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);
  return;

});

client.initialize();