import "dotenv/config";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { AIMessage, ToolMessage, HumanMessage } from "@langchain/core/messages";

import {forward_to_human } from "../tools/forwardToHuman.js"
import { consult_events } from "../tools/consultEvents.js";


export class LLMService {
    constructor() {
        try {
            const tools = [forward_to_human, consult_events]

            const llm = new ChatGoogleGenerativeAI({
                apiKey: process.env.GOOGLE_API_KEY,
                model: "gemini-2.5-flash-lite", 
                maxOutputTokens: 2048, 
                temperature: 0.7, // Ajuste para equilíbrio entre foco e naturalidade
            });

            this.llmWithTools = llm.bindTools(tools, { toolChoice: "auto" }); // conecta as tools ao modelo e permite chamadas automáticas

            this.promptTemplate = ChatPromptTemplate.fromMessages([
                [
                    "system", 
                    `Você é Aninha, a assistente virtual da secretaria da escola Instituto Ana Nery.

                    # Identidade e Contexto
                    - A dona e diretora da escola se chama Ana Neri. É normal que os pais e responsáveis chamem você por esse nome querendo falar com ela. Se isso acontecer, seja gentil, explique que você é a assistente virtual e pergunte como pode ajudar.
                    
                    # Regras de Atendimento
                    - Se for o primeiro contato do usuário, apresente-se de forma amigável como Aninha.
                    - As conversas acontecem via WhatsApp, portanto, suas respostas devem ser estritamente curtas, claras e concisas.
                    - Responda APENAS sobre assuntos da secretaria: matrículas, horários, eventos escolares e contatos.
                    - Se o usuário perguntar sobre qualquer outro assunto, recuse educadamente, informando que você só tem acesso às informações da secretaria.
                    - Caso o usuário expresse querer falar diretamente com a diretora Ana Neri, encerre o atendimento educadamente e alterne para o atendimento humano por meio do uso da ferramenta "forward_to_human". Não insista em manter a conversa após o pedido do usuário.
                    - Caso o usuário encaminhe uma imagem ou PDF, analise o conteúdo do arquivo e verifique se trata-se de um documento relacionado à secretaria (ex: comprovante de pagamento, atestado médico, documento de matrícula, etc). Se for um documento relacionado à secretaria, responda de acordo. Consulte o usuário para mais informações sobre o documento, caso necessário mais informações para a análise.

                    # Tom de Voz
                    - Prestativo, amigável, objetivo e profissional. Seu objetivo é manter o cliente engajado e confortável.No 
                    
                    # Informações Importantes
                    - A escola funciona de segunda a sexta, das 7:00 às 12:30 e das 13:00 às 18:00.
                    - No turno da manhã, as aulas são para alunos do fundamental 2 (6º ao 9º ano). No turno da tarde, as aulas são para os alunos do fundamental 1 (1º ao 5º anos) e infantil.
                    - Aos fins de semana a escola não funciona, porem os pais podem marcar um horário para falar com a diretora Ana Neri, caso seja necessário.
                    - Normalmente a diretora está mais disponível para responder a perguntas por mensagem ou falar com os pais durante o turno da manhã, mas isso pode variar.
                    - O ID do usuário está no campo "sessionId" das informações da sessão. NUNCA solicite essa informação diretamente do usuário, use os dados presentes nesse prompt para obter essa informação quando necessário.
                    
                    # Uso obrigatório de ferramentas
                    - Quando o usuário pedir para falar com a diretora e não expressar qualquer vontade de ser atendido pelo agente, você DEVE chamar a ferramenta "forward_to_human". Nunca apenas diga que encaminhou ou vai encaminhar sem ter executado a ferramenta antes. A ação precisa ser executada pela ferramenta.
                    Após executar a ferramenta, informe ao usuário que o contato foi encaminhado.
                    - Quando o usuário solicitar informaçõe sobre eventos escolares que estão por vir, você DEVE usar a ferramenta "consult_events" passando uma data no formato 'DD/MM/YYYY' para consulta do calendário de eventos da escola.
                    - Quando o usuário solicitar informações sobre os dias e horários de funcionamento da escola, você DEVE usar a ferramenta "consult_events" passando uma data no formato 'DD/MM/YYYY' para consultar se há eventos que afetam o funcionamento da escola naquele dia.
                    - Puxe a informação da data atual do proprio prompt usando a variável 'current_datetime'. Evite perguntar a data para o usuário a menos que seja necessário e você não tenha essa informação.
                    - Caso o usuário lhe peça para procurar algo em uma data específica e não lhe passar mês ou ano, use a informação de data atual para preencher os dados faltantes. Por exemplo, se hoje é 10/04/2026 e o usuário pedir "Quais eventos tem no dia 15?", entenda que ele está se referindo ao dia 15/04/2026. Se ele pedir "E no dia 20 de maio?", entenda que ele está se referindo ao dia 20/05/2026.
                    - Se uma ferramenta existir para executar uma ação, utilize-a.

                    # Informações da Sessão
                    - Id / SessionId do usuário atual é {sessionId}
                    - Data e hora atuais: {current_datetime}
                    `
                ],
                new MessagesPlaceholder("historico_chat"),
                // ["human", "{input}"]
                new MessagesPlaceholder("input")
            ]);

            const chain = this.promptTemplate.pipe(this.llmWithTools);

            this.agent = new RunnableWithMessageHistory({
                runnable: chain,
                getMessageHistory: this.getMessageHistoryForSession,
                inputMessagesKey: "input",
                historyMessagesKey: "historico_chat",
            });

            this.tools = tools;

            this.messageHistories = {};
            this.tempoDeVida = 3 * 60 * 60 * 1000; // 3 horas em milissegundos

            console.log("Gemini Inicializado");
        
        } catch (error) {
            console.error("erro ao inicializar o GeminiService: ", error);
        }
    }


    getMessageHistoryForSession = (sessionId) => {
        const agora = Date.now();
        const sessao = this.messageHistories[sessionId];

        if (sessao && (agora - sessao.ultimoAcesso > this.tempoDeVida)) {
            console.log(`[Memória] Sessão '${sessionId}' expirou e foi esquecida.`);
            delete this.messageHistories[sessionId];
        }

        if (!this.messageHistories[sessionId]) {
            this.messageHistories[sessionId] = {
                history: new InMemoryChatMessageHistory(),
                ultimoAcesso: agora,
            };
        } else {
            this.messageHistories[sessionId].ultimoAcesso = agora;
        }

        return this.messageHistories[sessionId].history;
    };


    async getResponse(prompt, sessionId) {
        try {
            if (!sessionId) {
                throw new Error("É necessário fornecer um sessionId.");
            }

            // let message = prompt; // Fazer tratamento do prompt aqui
            const humanMessage = new HumanMessage({ content: prompt });

            console.log("Enviando mensagem para Gemini");

            const response = await this.agent.invoke(
                { 
                    input: [humanMessage],
                    sessionId: sessionId,
                    current_datetime: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                },
                { configurable: { sessionId: sessionId } }
            );

            // console.log("resposta bruta obtida");
            // console.log(response);

            // Verifica se há chamadas de ferramentas
            if (response.tool_calls && response.tool_calls.length > 0) {
                return this.processTools(response, sessionId);
            }

            // Extrai o texto da resposta (pode ser string ou array de content blocks)
            const content = response.content;
            if (typeof content === 'string') {
                return content;
            }
            if (Array.isArray(content) && content.length > 0) {
                // Extrai o texto do primeiro bloco de conteúdo
                return typeof content[0] === 'string' ? content[0] : (content[0].text || "Desculpe, não consegui processar sua mensagem.");
            }
            return "Desculpe, não consegui processar sua mensagem.";

        } catch (error) {
            console.error("Erro ao obter resposta do Gemini: ", error);
            return "Desculpe, ocorreu um erro ao processar sua mensagem";
        }
    }


    async processTools(aiMessage, sessionId){
        const toolMessages = [];
        console.log(`O LLM solicitou ${aiMessage.tool_calls.length} ferramenta(s).`);

        for (const toolCall of aiMessage.tool_calls) {
            let resultadoDaTool;

            try {
                if (toolCall.name === 'forward_to_human') {
                    const id = toolCall.args.id;
                    resultadoDaTool = await forward_to_human.invoke({ id: id });
                } 

                if (toolCall.name === 'consult_events') {
                    const date = toolCall.args.date;
                    resultadoDaTool = await consult_events.invoke({ date: date });
                } 
                
                // Salva o resultado no formato esperado pelo LangChain
                toolMessages.push(new ToolMessage({
                    content: typeof resultadoDaTool === 'string' ? resultadoDaTool : JSON.stringify(resultadoDaTool),
                    tool_call_id: toolCall.id,
                    name: toolCall.name
                }));

            } catch (error) {
                console.error(`Erro ao executar a tool ${toolCall.name}:`, error);
                toolMessages.push(new ToolMessage({
                    content: "Erro interno ao executar a ferramenta.",
                    tool_call_id: toolCall.id,
                    name: toolCall.name
                }));
            }
        }

        const history = this.getMessageHistoryForSession(sessionId);
        await history.addMessages(toolMessages);
        
        // Usa this.agent com um input vazio para ele processar os resultados das tools
        const novaResposta = await this.agent.invoke(
            { 
                input: [],
                sessionId: sessionId,
                current_datetime: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
            },
            { configurable: { sessionId: sessionId } }
        );

        // Extrai o texto da resposta (pode ser string ou array de content blocks)
        const content = novaResposta.content;
        if (typeof content === 'string') {
            return content;
        }
        if (Array.isArray(content) && content.length > 0) {
            // Extrai o texto do primeiro bloco de conteúdo
            return typeof content[0] === 'string' ? content[0] : (content[0].text || "Desculpe, não consegui processar sua mensagem.");
        }
        return "Desculpe, não consegui processar sua mensagem.";
    }

}

