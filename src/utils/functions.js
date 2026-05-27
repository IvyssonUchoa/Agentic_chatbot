import { StateModel } from '../models/stateModel.js'

export function delay(ms) {
    // Cria um delay em microssegundos
    
    return new Promise((res) => setTimeout(res, ms));
}

export async function typing(chat) {
    await delay(3000);
    await chat.sendStateTyping();
    await delay(1000);
}


export function getTimestamp(dateTime) {
    // Função que retorna o timestamp de uma string de data e hora no formato "DD/MM/YYYY HH:mm"
    try {
        const partes = dateTime.split(" ");
        const stringData = partes[0];
        const stringHora = partes[1]; 

        const [dia, mes, ano] = stringData.split("/");
        const [horas, minutos] = stringHora.split(":");

        const dataFormatada = new Date(ano, mes - 1, dia, horas, minutos).toISOString();

        return dataFormatada;

    } catch (error) {
        console.error("Erro ao formatar data: ", error);
        return null;
    }
}

// export async function returnToAgenticService(msg){
//     const from = msg.from;
//     const st = new StateModel();

//     const currentState = await st.getState(from);
//     console.log("current state: ", currentState);
//     console.log((new Date() - new Date(currentState.date_modified)));

//     if ((new Date() - new Date(currentState.date_modified)) > 3*60*1000) {
//         await st.setState(from, "Agentic");

//         return true;
//     }

//     return false;
// }