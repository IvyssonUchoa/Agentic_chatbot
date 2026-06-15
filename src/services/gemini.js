import "dotenv/config";
import { z } from "zod";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { AIMessage, ToolMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import {forward_to_human } from "../tools/forwardToHuman.js"
import { consult_events } from "../tools/consultEvents.js";


export class LLMService {
    constructor() {
        try {
            //// Criação do Agente principal ////
            const tools = [forward_to_human, consult_events]

            const llm = new ChatGoogleGenerativeAI({
                apiKey: process.env.GOOGLE_API_KEY,
                model: "gemini-2.5-flash", 
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
                    
                    # Interpretação de Eventos
                    - A ferramenta "consult_events" retorna eventos com períodos específicos (ex: "20/05/2026 a 22/05/2026" significa 20, 21 e 22 de maio, não mais).
                    - NUNCA infira ou presuma datas que NÃO estão explicitamente no período retornado pela ferramenta.
                    - Se há múltiplos eventos no mês (ex: 20-22/05 E 29/05), mencione cada um com seus períodos exatos.
                    - SEMPRE cite as datas exatas retornadas pela ferramenta, sem adicionar ou omitir dias.

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

            this.agent = new RunnableWithMessageHistory({ // Agente principal
                runnable: chain,
                getMessageHistory: this.getMessageHistoryForSession,
                inputMessagesKey: "input",
                historyMessagesKey: "historico_chat",
            });

            //// Roteador de intenções ////
            const schemaRoteador = z.object({
                intencao: z.enum(["MATRICULA", "GERAL"]).describe("Classifica a intenção. Retorne MATRICULA apenas para iniciar o cadastro. Retorne GERAL para dúvidas de preços, vagas e informações")
            });

            const llmRouterBase = new ChatGoogleGenerativeAI({ // LLM base para o roteamento
                apiKey: process.env.GOOGLE_API_KEY,
                model: "gemini-2.5-flash-lite", 
                temperature: 0,
            });

            // 2. Acoplamos o schema ao modelo para forçar a saída estruturada
            this.routerLlm = llmRouterBase.withStructuredOutput(schemaRoteador);

            //// Extrator de dados de Matrícula ////
            const schemaExtracao = z.object({
                nome: z.string().nullable().describe("Nome do aluno, se mencionado"),
                idade: z.string().nullable().describe("Idade do aluno, se mencionada"),
                turma: z.string().nullable().describe("Turma, série ou curso, se mencionado"),
                cpf: z.string().nullable().describe("CPF, se mencionado"),
            });

            // Criamos uma instância separada com temperatura 0 para extração precisa
            const llmExtratorBase = new ChatGoogleGenerativeAI({
                apiKey: process.env.GOOGLE_API_KEY,
                model: "gemini-2.5-flash-lite", 
                temperature: 0, 
            });

            // Guardamos o extrator estruturado na instância da classe
            this.extratorLlm = llmExtratorBase.withStructuredOutput(schemaExtracao);

            //// Outras ferramentas ////
            this.tools = tools;

            this.messageHistories = {};
            this.tempoDeVida = 3 * 60 * 60 * 1000; // 3 horas em milissegundos

            console.log("Gemini Inicializado");
        
        } catch (error) {
            console.error("erro ao inicializar o GeminiService: ", error);
        }
    }


    async roteador(humanMessage) {
        const systemMessage = new SystemMessage({
            content: `Você é um classificador de intenções extremamente rigoroso da secretaria da escola Instituto Ana Nery.
            Analise a mensagem enviada pelo usuário e classifique a intenção em APENAS uma destas opções do schema:

            - MATRICULA: USE APENAS quando o usuário expressar a AÇÃO DIRETA e clara de que deseja iniciar o cadastro/matrícula neste exato momento. 
              Exemplos de MATRICULA: "Quero matricular meu filho", "Como faço para me inscrever?", "Vamos fazer a matrícula".

            - GERAL: USE PARA TODO O RESTO. Isso inclui obrigatoriamente perguntas sobre PREÇOS, VALORES, disponibilidade de vagas, como funciona o processo, saudações, horários, eventos ou falar com a diretora. 
              Exemplos de GERAL: "Qual o valor da mensalidade?", "Quanto custa a matrícula?", "Tem vaga para o 6º ano?", "Bom dia".
              
            REGRA DE OURO: Se o usuário fez uma pergunta sobre vagas ou dinheiro, a intenção é GERAL, NUNCA matrícula.`
        });

        // Envia o array de mensagens diretamente para o modelo estruturado
        const resultado = await this.routerLlm.invoke([systemMessage, humanMessage]);

        return resultado.intencao;
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

                estadoAtual: "GERAL", // Pode ser 'GERAL' ou 'MATRICULA'
                dadosMatricula: { nome: null, idade: null, turma: null, cpf: null }
            };
        } else {
            this.messageHistories[sessionId].ultimoAcesso = agora;
        }

        return this.messageHistories[sessionId].history;
    };


    async pipelineMatricula(humanMessage, sessionId, controller) {
        const sessao = this.messageHistories[sessionId];
        
        // Criamos uma instrução de sistema para guiar a extração estruturada
        const systemMessage = new SystemMessage({
            content: "Analise a mensagem do usuário e extraia os dados solicitados para preenchimento do schema de matrícula."
        });

        // O extrator agora recebe a mensagem multimídia nativamente!
        const dadosExtraidos = await this.extratorLlm.invoke([systemMessage, humanMessage]);

        // Validação de strings vazias para evitar bugs de pulo de campos
        if (dadosExtraidos.nome && dadosExtraidos.nome.trim() !== "") sessao.dadosMatricula.nome = dadosExtraidos.nome;
        if (dadosExtraidos.idade && String(dadosExtraidos.idade).trim() !== "") sessao.dadosMatricula.idade = dadosExtraidos.idade;
        if (dadosExtraidos.turma && dadosExtraidos.turma.trim() !== "") sessao.dadosMatricula.turma = dadosExtraidos.turma;
        if (dadosExtraidos.cpf && dadosExtraidos.cpf.trim() !== "") sessao.dadosMatricula.cpf = dadosExtraidos.cpf;

        // Verifica o que falta
        const dados = sessao.dadosMatricula;
        if (!dados.nome) return "Que ótimo! Vou te ajudar com a matrícula. Para começar, qual é o nome completo do aluno?";
        if (!dados.idade) return `Certo, anotado o nome ${dados.nome}. Qual é a idade do aluno?`;
        if (!dados.turma) return "Perfeito. Em qual turma ou ano escolar você deseja realizar a matrícula?";
        if (!dados.cpf) return "Para finalizar o cadastro, por favor, me informe o CPF do responsável.";

        // Se todos os dados foram coletados, salva e encerra o pipeline
        console.log("DADOS COLETADOS PARA PLANILHA:", dados);
        if (controller){
            const matricula = `*Nova Solicitação de Pré-Matrícula recebida*\n\n*Nome do Aluno:* ${dados.nome}\n*Idade:* ${dados.idade}\n*Turma/Ano:* ${dados.turma}\n*CPF do Responsável:* ${dados.cpf}`;
            
            await controller.sendToAttendant(matricula, sessionId, dados.nome);
        }
        
        // Reseta o estado para voltar ao atendimento normal
        sessao.estadoAtual = "GERAL";
        sessao.dadosMatricula = { nome: null, idade: null, turma: null, cpf: null };

        return "Tudo certo! Os dados foram enviados para a secretaria e a pré-matrícula foi registrada com sucesso. Posso ajudar com mais alguma coisa?";
    }


    async processTools(aiMessage, sessionId, controller){
        const toolMessages = [];
        console.log(`O LLM solicitou ${aiMessage.tool_calls.length} ferramenta(s).`);

        for (const toolCall of aiMessage.tool_calls) {
            let resultadoDaTool;

            try {
                if (toolCall.name === 'forward_to_human') {
                    const id = toolCall.args.id;
                    resultadoDaTool = await forward_to_human.invoke({ id: id });

                    if (controller){
                        const messagem = "O usuário solicita o atendimento da Diretora. \nO atendimento com o agente foi encerrado";                    
                        await controller.sendToAttendant(messagem, sessionId, sessionId);
                    }
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


    async getResponse(prompt, sessionId, controller) {
        try {
            if (!sessionId) {
                throw new Error("É necessário fornecer um sessionId.");
            }

            this.getMessageHistoryForSession(sessionId);
            const sessao = this.messageHistories[sessionId];

            const humanMessage = new HumanMessage({ content: prompt });

            // 1. Se o usuário JÁ ESTÁ no processo de matrícula, envia direto pro pipeline
            if (sessao.estadoAtual === "MATRICULA") {
                await sessao.history.addMessage(humanMessage);
                const respostaPipeline = await this.pipelineMatricula(humanMessage, sessionId, controller);
                await sessao.history.addMessage(new AIMessage({ content: respostaPipeline }));
                return respostaPipeline;
            }

            // 2. Se está no atendimento GERAL, avalia se a intenção agora é Matrícula
            const intencao = await this.roteador(humanMessage);
            console.log(intencao);
            if (intencao === "MATRICULA") {
                sessao.estadoAtual = "MATRICULA";
                
                await sessao.history.addMessage(humanMessage);
                const respostaPipeline = await this.pipelineMatricula(humanMessage, sessionId, controller);
                await sessao.history.addMessage(new AIMessage({ content: respostaPipeline }));
                return respostaPipeline;
            }

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
                return this.processTools(response, sessionId, controller);
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

}

