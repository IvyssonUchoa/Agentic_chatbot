import { StateModel } from '../models/stateModel.js'

async function validateBlackListNumbers(msg){
    // Retorna True se o número de parametro estiver na blacklist (Lista de numeros indesejados)
    const contact = await msg.getContact();
    const from = msg.from;

    const blackList = [
                        '558387218118', // Mainha
                        // '558391726331', // Gabriel
                        // '177013100929051@lid' // Letícia
                    ];

    // console.log(`${contact.number}`);
    if (blackList.includes(from) || blackList.includes(`${contact.number}`)) return true;

    return false;
}

async function validateOriginMessage(msg){
    // Valida a origem da mensagem, por exemplo grupos, número privado ou comercial
    // Retorna True se a origem for válida ou False caso contrário

    if (!msg.from || msg.from.endsWith("@g.us")) return false; // Valida se a mensagem é de um número privado (não termina com @g.us) e se o campo "from" existe

    if (msg.from === 'status@broadcast' || msg.from.endsWith('@broadcast')) return false; // Bloqueia Status/Stories e Listas de Transmissão

    if (msg.from.endsWith('@newsletter')) return false; // Bloqueia Canais do WhatsApp

    const chat = await msg.getChat();
    if (chat.isGroup) return false;// blindagem extra para não responder em grupos


    return true;
}


// async function validadeMediaMessage(msg){
//     // Valida se a mensagem contem Mída
//     // Retorna True se conter e for válida ou False caso contrário

//     if (msg.hasMedia) {
//         console.log("Tem midia na mensagem");

//         const messageMedia = await msg.downloadMedia();

//         const filename = messageMedia.filename || "";
//         console.log(messageMedia);

//         return true;
//     }

//     return false;
// }

// function validateTextMessage(msg){
//     // Valida se a mensagem contém texto e como o texto é
//     // Retorna True se for válido ou False caso contrário

//     if (!msg.body || msg.body.trim() === "") return false;

//     return true;
// }



export async function isValidateAll(msg){
    // Validador para mensagens, utilizando as funções d evalidação anteriores
    // Returna True se passar em todas as verificações ou False caso contrário

    // Valida a origem da mensagem
    if (! await validateOriginMessage(msg)) {
        // const contact = await msg.getContact();
        // console.log(`Numero ${msg.from} de origem indesejada`);
        return false;
    };

    // Valida a blacklist de contatos
    if (! await validateBlackListNumbers(msg)){
        const contact = await msg.getContact();
        console.log(`Numero ${msg.from} não autorizado | ${contact.number}`);

        return false;
    };
    
    // // Valida a media da mensagem
    // if (await validadeMediaMessage(msg)) {
    //     console.log("Desculpe, ainda não consigo processar mensagens com mídia. \nPoderia mandar apenas mensagens de texto, por favor?");
    //     return false;
    // }

    // // Valida o texto da mensagem
    // if (!validateTextMessage(msg)) {
    //     return false;
    // }

    return true;
}


export async function isAgenticService(msg){
    // Verifica se o atendimento é realizado por um humano ou pelo bot
    // Retorna False se o atendimento for Human, ou True caso seja Agentic

    const from = msg.from;
    const st = new StateModel();

    const currentState = await st.getState(from);

    if (!currentState) {
        await st.createState(from);
        return true; // Retorna true se não houver registro do estado 
    }

    if (currentState.state === "Human"){
        if ((new Date() - new Date(currentState.date_modified)) > 3*60*60*1000) { 
            // Após 3 horas do atendimento humano, o chat volta ao estado de atendimento pelo agente
            await st.setState(from, "Agentic");

            console.log("Alterando para atendimento Agentic");
            return true;
        }
    }

    return currentState.state === "Agentic" ? true : false;
}