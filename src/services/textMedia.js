import "dotenv/config";


export class TextMediaService {
    constructor() {

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

                if (type.includes("image") || type.includes("pdf")){
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