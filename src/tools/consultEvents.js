import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { EventModel } from "../models/eventModel.js";


async function consultEvents(date) {
    // Função que consulta o calendário de eventos da escola e retorna os eventos do dia solicitado no parâmetro "date"
    try{
        const ev = new EventModel();

        // const response = await ev.getEvent(date);
        const response = await ev.getMonthEvent(date);

        if (response && response.length > 0) {
            // let responseString = `Evento(s) encontrado(s) para a data ${date}:`;
            let responseString = `Evento(s) encontrado(s) para o mesmo mês da data ${date}:`;

            for (const event of response){
                responseString += ` * Evento do tipo ${event.type}| Descrição do evento: ${event.description}| Inicio em ${event.start_date} e fim em ${event.end_date}.`
            }

            console.log("Resposta da ferramenta: ", responseString);
            return responseString;
        }

        // return `Nenhum evento encontrado para a data ${date}`;
        return `Nenhum evento encontrado para o mês da data ${date}`;
        
    } catch(error) {
        console.error("Erro : ", error);
        return `Falha ao consultar calendário.`;
    }    
}


export const consult_events = tool(
    async ({ date }) => {
        return await consultEvents(date);
    },
    {
        name: "consult_events",
        description: "Consulta o calendário de eventos da escola e retorna os eventos do mês solicitado no parâmetro 'date'. Esses eventos podem ser de vários tipos, afetando o funcionamento da escola. Use esse ferramenta SEMPRE que o usuário solicitar informações sobre eventos ou os dias de funcionamento da escola",
        schema: z.object({
            date: z.string().describe("string EXCLUSIVAMENTE no formato 'DD/MM/YYYY', representando a data para qual o usuário deseja consultar os eventos escolares. O parâmetro mais importante é o mês e ano contido na string, mas ainda é ncessário passar um dia válido"),
        }),
    }
);