# Agentic Chatbot - Aninha

## Descrição do Agente

Aninha é uma assistente virtual desenvolvida para auxiliar na secretaria da escola Instituto Ana Nery. Ela responde a perguntas relacionadas a matrículas, horários escolares, eventos da escola e informações de contato. Aninha é projetada para ser prestativa, amigável e profissional, mantendo as conversas curtas e objetivas via WhatsApp.

## Fluxo de Interação

1. **Conexão**: O bot se conecta ao WhatsApp via QR Code e fica aguardando mensagens.
2. **Recebimento de Mensagem**: Quando uma mensagem é recebida, o sistema valida se é de um contato individual (não grupo), não está na blacklist e contém texto válido.
3. **Processamento**: A mensagem é enviada para o modelo de IA (Google Gemini) que, considerando o histórico da conversa, gera uma resposta apropriada.
4. **Resposta**: A resposta é enviada de volta ao usuário via WhatsApp, simulando digitação para uma experiência mais natural.

## O que já é executado

- **Validação de Mensagens**: Filtra mensagens de grupos, contatos na blacklist e mensagens sem texto ou com mídia.
- **Integração com WhatsApp**: Usa whatsapp-web.js para conectar e enviar/receber mensagens.
- **Processamento de IA**: Utiliza Google Gemini para gerar respostas contextuais baseadas em um prompt personalizado.
- **Histórico de Conversa**: Mantém o histórico de mensagens por sessão (por contato) por até 2 horas.
- **Simulação de Digitação**: Adiciona um efeito de "digitando..." para melhorar a experiência do usuário.

## Personalidade do Agente

Aninha é prestativa, amigável, objetiva e profissional. Ela se apresenta como assistente virtual da secretaria e mantém o foco em assuntos escolares. Respostas são curtas e claras, adequadas para comunicação via WhatsApp. Se o usuário perguntar sobre assuntos fora do escopo, ela recusa educadamente. Aninha também redireciona solicitações para falar diretamente com a diretora Ana Neri quando apropriado.

## Stack Tecnológica

- **Node.js**: Ambiente de execução JavaScript.
- **whatsapp-web.js**: Biblioteca para integração com WhatsApp Web.
- **LangChain**: Framework para construção de aplicações com LLMs.
- **Google Gemini (gemini-2.5-flash-lite)**: Modelo de IA para geração de respostas.
- **SQLite**: Banco de dados para armazenamento local (configurado, mas não utilizado nas funcionalidades atuais).
- **dotenv**: Gerenciamento de variáveis de ambiente.
- **qrcode-terminal**: Geração de QR Code para autenticação no WhatsApp.

## Como Executar

1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente no arquivo `.env` (adicione `GOOGLE_API_KEY` com sua chave da API do Google).
3. Execute o bot: `npm start`
4. Escaneie o QR Code exibido no terminal com seu WhatsApp.

## Autor

Ivysson Fernandes