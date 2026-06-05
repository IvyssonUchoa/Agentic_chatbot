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
    // Converte "DD/MM/YYYY HH:mm" em um formato local seguro para armazenamento.
    // Não usa toISOString() para evitar conversão automática para UTC e mudança de dia.
    try {
        const partes = dateTime.split(" ");
        const stringData = partes[0];
        const stringHora = partes[1];

        const [dia, mes, ano] = stringData.split("/");
        const [horas, minutos] = stringHora.split(":");

        const diaFormatado = dia.padStart(2, "0");
        const mesFormatado = mes.padStart(2, "0");
        const horaFormatada = horas.padStart(2, "0");
        const minutoFormatado = minutos.padStart(2, "0");

        return `${ano}-${mesFormatado}-${diaFormatado} ${horaFormatada}:${minutoFormatado}:00`;

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