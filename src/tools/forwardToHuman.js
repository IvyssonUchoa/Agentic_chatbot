import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { StateModel } from "../models/stateModel.js";

// Adicionar alguma forma de apagar os dados de memoria após algumas horas

async function toggleState(id) {
    // Função que altera o estado de atendimento do chatbot do agente ("Agentic") para uo atendimento humano ("Human")
    try{
        const st = new StateModel();

        let currentState = await st.getState(id); // Pega o state atual do usuário

        if (!currentState){
            // Se não houver estado, cria um novo estado
            await st.createState(id);
            currentState = await st.getState(id)
        }

        // Alterna o estado entre "Agentic" e "Human" 
        const newState = currentState.state === "Agentic" ? "Human" : "Agentic";

        const status = await st.setState(id, newState);

        if (status) {
            return `Estado alternado de ${currentState.state} para ${newState}`;             
        }

        return `Falha ao alternar estado de ${currentState.state} para ${newState}`;
    
    } catch(error) {
        console.error("Erro ao alternar estado: ", error);
        return `Falha ao alternar estado.`;
    }    
}


export const forward_to_human = tool(
    async ({ id }) => {
        return await toggleState(id);
    },
    {
        name: "forward_to_human",
        description: "Use esta ferramenta SEMPRE que for necessário trocar o atendimento do usuário do Agente para o atendimento Humano. Utilizar essa ferramenta encerra o atendimento do Agente e coloca o usuário em espera para o atendimento por um humano",
        schema: z.object({
            id: z.string().describe("O número de ID fornecido pela biblioteca whatsapp-web.js, vindo de msg.from, como identificador único do número de telefone do usuário"),
        }),
    }
);