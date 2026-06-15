import "dotenv/config";
import axios from 'axios';

export class TextMediaService {
    constructor() {
        this.googleApiKey = process.env.GOOGLE_API_KEY;
    }

    async processTextMedia(msg){
        // Função que processa o conteudo da mensagem
        // Caso seja um arquivo de midia PDF ou Imagem, baixa o conteúdo do arquivo e formata a resposta para a llm
        // Caso seja um texto, trata o texto e formata a resposta para a llm
        // Retorna null caso haja algum erro no processamento, não exista texto na mensagem ou a mídia não possa ser processada
        
        try {

            let messageContent = null;

            if (await this.isMediaMessage(msg)) {
                console.log("Tem midia na mensagem");
                // console.log(msg);

                const messageMedia = await msg.downloadMedia(); // Baixa o conteudo da midia da mensagem
                const type = messageMedia.mimetype; // Tipo de arquivo

                if (type.includes("audio") || type.includes("ptt")) {
                    console.log(`Processando áudio (${type})...`);
                    
                    const transcript = await this.transcribeAudio(messageMedia.data, type);
                    
                    if (transcript) {
                        // Retorna o texto transcrito de forma clara para a LLM entender a origem
                        messageContent = `[Áudio enviado pelo usuário transcrito]: ${transcript}`;
                        return messageContent;
                    } else {
                        messageContent = "[Falha ao processar a mensagem de áudio do usuário]";
                        return messageContent;
                    }
                }

                else if (type.includes("image") || type.includes("pdf")){
                    const filesize = messageMedia.filesize || 0;
                    console.log(`É um ${type} e o tamanho é ${filesize} bytes`);

                    const data = messageMedia.data; // dados em base64
                    const body = msg.body || "Analise este arquivo para mim."; // Texto da mensagem caso haja
        
                    messageContent = [
                        {
                            type: "text",
                            text: body
                        },
                        {
                            type: "image_url", 
                            image_url: `data:${type};base64,${data}`
                        }
                    ];
                }

                else {
                    console.log("Tipo de mídia não suportada");
                    console.log(type);
                }

                return messageContent;

            }

            if (this.isTextMessage(msg)) {
                messageContent = msg.body ? msg.body.trim() : "";
                return messageContent;
            }

            return messageContent;

        }catch (error) {
            console.log(error);
            return null;
        }
    
    }

    async transcribeAudio(base64Data, mimeType) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.googleApiKey}`;
            
            // O WhatsApp-web.js costuma enviar o mimetype como 'audio/ogg; codecs=opus'
            // O Gemini prefere a string limpa (ex: 'audio/ogg')
            const cleanMimeType = mimeType.split(';')[0];

            const payload = {
                contents: [{
                    parts: [
                        { text: "Transcreva exatamente o que é dito neste áudio. Retorne APENAS a transcrição direta, sem comentários, sem aspas e sem formatação extra." },
                        {
                            inline_data: {
                                mime_type: cleanMimeType, 
                                data: base64Data
                            }
                        }
                    ]
                }]
            };

            const response = await axios.post(url, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Navega pelo JSON de resposta da API do Google para pegar o texto
            const transcript = response.data.candidates[0].content.parts[0].text;
            console.log("Áudio transcrito com sucesso:", transcript.trim());
            
            return transcript.trim();

        } catch (error) {
            console.error("Erro ao transcrever áudio no Gemini:", error.response?.data || error.message);
            return null;
        }
    }

    async isMediaMessage(msg){
        // Valida se a mensagem contem Mída
        // Retorna True se conter e for válida ou False caso contrário

        if (msg.hasMedia) {
            return true;
        }

        return false;
    }

    isTextMessage(msg){
        // Valida se a mensagem contém texto e como o texto é
        // Retorna True se for válido ou False caso contrário

        if (!msg.body || msg.body.trim() === "") return false;

        return true;
    }
}