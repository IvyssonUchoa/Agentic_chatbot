import {LLMService} from '../services/gemini.js';
import { TextMediaService} from '../services/textMedia.js';
import { delay, typing } from '../utils/functions.js';
import { isValidateAll, isAgenticService } from '../utils/validator.js';

const llm = new LLMService();
const tms = new TextMediaService();

export class chatController {
    constructor(client) {
        this.client = client;

        this.messageBuffers = new Map(); // Guarda os textos: { 'numero@c.us': ['Oi', 'Tudo bem?', 'Preciso de ajuda'] }
        this.messageTimers = new Map();  // Guarda os cronômetros de cada usuário
        this.waitTime = 10000; // Tempo de estouro do buffer
    }

    async handleMessage(msg) {
        try {
            ////// Validações e Filtros //////
            if (! await isValidateAll(msg)) {
                return;
            }
    
            if (! await isAgenticService(msg)){ // Verifica se o atedimento é direcionado ao agente
                console.log("mnensagem ignorada pelo agente");
                return;
            }

            ////// Tratamento da mensagem ////// 
            // const texto = msg.body ? msg.body.trim() : "";
            const texto = await tms.processTextMedia(msg);            
            const from = msg.from;

            const chat = await msg.getChat();


            ////// Buffer de mensagens //////
            if (!this.messageBuffers.has(from)) {
                this.messageBuffers.set(from, []);
            }

            this.messageBuffers.get(from).push(texto);

            // Se já existe um cronômetro rodando para esse usuário, cancelamos ele
            if (this.messageTimers.has(from)) {  
                clearTimeout(this.messageTimers.get(from)); 
            }

            const timer = setTimeout(async () => { // Cria um novo cronômetro
                const buffer = this.messageBuffers.get(from);

                // Limpa a memória para as próximas interações deste usuário
                this.messageBuffers.delete(from);
                this.messageTimers.delete(from);

                let textoConcatenado = "";
                let midiaConcatenada = [];

                // Percorre o buffer para unificar os textos e midias
                for (const item of buffer) {
                    if (typeof item === 'string') {
                        textoConcatenado += (item.trim()) + '; ';
                    }

                    if (Array.isArray(item)){
                        midiaConcatenada.push(...item);
                    }
                }

                let inputParaLLM = [];
        
                // Construi a resposta final para a LLM
                if (textoConcatenado.length > 0) {
                    inputParaLLM.push({
                        type: "text",
                        text: textoConcatenado
                    });
                }

                if (midiaConcatenada.length > 0) {
                    inputParaLLM.push(...midiaConcatenada);
                }

                //// Processamento da LLM ////
                let response = await this.processLLM(chat, from, inputParaLLM); 
                
                await this.client.sendMessage(
                    from,
                    response
                );

                //// Gera uma notificação ////
                // Caso o atendimento mude para humano após a resposta do agente, notifica ao atendente 
                if (! await isAgenticService(msg)){
                    const serviceContact = '';
                    const msgService = await this.client.getChatById(serviceContact);

                    console.log(msgService);
                    await typing(msgService);

                    await this.client.sendMessage( 
                        serviceContact, // Apenas um teste
                        "Nova interação processada"
                    );
                }

            }, this.waitTime);

            // Salva o ID do cronômetro para podermos cancelá-lo se chegar nova mensagem
            this.messageTimers.set(from, timer);

            return;

        } catch (error) {
            console.error("erro ao processar mensagem:", error);
            return;
        }

    }


    async processLLM(chat, from, message){
        // Envia a mensagem para a LLM e aguarda sua resposta
        try {
            await typing(chat); // Simula a digitação

            let response = await llm.getResponse(message, from); // manda para a LLM
            
            if (!response){
                return "Desculpe, não consegui obter sua resposta. Poderia manda-la novamente?";
            }
            
            console.log(`Resposta da LLM Obtida`);
            return response;

        } catch (error) {
            // Log de erro
            return "Desculpe, ocorreu um erro ao processar sua mensagem.";
        }
    }
}