import axios from 'axios';
import {LLMService} from '../services/gemini.js';
import { TextMediaService} from '../services/textMedia.js';
import { delay, typing, setHumanState, setAgenticState} from '../utils/functions.js';
import { isValidateAll, isAgenticService } from '../utils/validator.js';

const CHATWOOT_URL = process.env.CHATWOOT_URL;
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN;
const ACCOUNT_ID = process.env.ACCOUNT_ID || 1;
const INBOX_ID = process.env.INBOX_ID || 1;

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

            const chat = await msg.getChat();

            if (! await isAgenticService(msg)){ // Verifica se o atedimento é direcionado ao agente
                const contato = await msg.getContact();
                const nomeContato = contato.pushname || contato.number;

                const numeroWhatsApp = msg.from;
                const mensagemApp = msg.body;

                await this.sendToAttendant(mensagemApp, numeroWhatsApp, nomeContato);
                return;
            }

            const texto = await tms.processTextMedia(msg);            
            const from = msg.from;

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
                // if (! await isAgenticService(msg)){
                //     const serviceContact = '@g.us';
                //     const msgService = await this.client.getChatById(serviceContact);

                //     console.log(msgService);
                //     await typing(msgService);

                //     await this.client.sendMessage( 
                //         serviceContact, // Apenas um teste
                //         "Nova interação processada"
                //     );
                // }

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

            let response = await llm.getResponse(message, from, this); // manda para a LLM
            
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

    async handleChatwootMessage(data) {
        // Transfere a mensagem do atendente no Chatwoot para o cliente no Whatsapp

        if (data.event === 'message_created' && data.message_type === 'outgoing'){
            const content = data.content;
            const from = data.conversation.meta.sender.identifier;

            if (from){
                if (content === '/finish'){
                    await setAgenticState(from);
                    console.log(`Atendimento finalizado. Agente reativado para ${from}`);

                } else {
                    await setHumanState(from);

                    console.log(`Enviando mensagem do atendente para ${from}`);
                
                    await this.client.sendMessage(
                        from,
                        content
                    );
                }
            }
        }
    }

    async sendToAttendant(mensagemApp, numeroWhatsApp, nomeContato){
        // Encaminha a mensagem do cliente no Whatsapp para o atendente no Chatwoot
        try {
            const headers = { 'api_access_token': CHATWOOT_TOKEN };

            let contactId;
            const searchRes = await axios.get(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${numeroWhatsApp}`, { headers });

            if (searchRes.data.payload.length > 0) {
                contactId = searchRes.data.payload[0].id;
            } else {
                const createRes = await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`, {
                    name: numeroWhatsApp,
                    identifier: numeroWhatsApp // Fundamental para usarmos de volta no webhook
                }, { headers });
                contactId = createRes.data.payload.contact.id;
            }

            // Procurar uma conversa aberta para este contato ou criar uma nova
            let conversationId;
            const convRes = await axios.get(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/${contactId}/conversations`, { headers });
            
            const openConversation = convRes.data.payload.find(c => c.status === 'open');
            
            if (openConversation) {
                conversationId = openConversation.id;
            } else {
                const newConvRes = await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`, {
                    inbox_id: INBOX_ID,
                    contact_id: contactId
                }, { headers });
                conversationId = newConvRes.data.id;
            }

            // Inserir a mensagem na conversa do Chatwoot
            await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`, {
                content: mensagemApp,
                message_type: 'incoming', // Identifica que veio do cliente
                private: false
            }, { headers });

            console.log("Mensagem injetada no Chatwoot com sucesso!");

        } catch (error) {
            console.error("Erro na integração com Chatwoot:", error.response?.data || error.message);
        }
    }

}