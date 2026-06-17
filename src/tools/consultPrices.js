import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { PriceModel } from "../models/priceModel.js";

async function getSchoolPrices(grade) {
    try {
        const pm = new PriceModel();
        
        if (grade === "todos") {
            const allPrices = await pm.getAllPrices();
            
            if (allPrices && allPrices.length > 0) {
                let responseString = "Valores das mensalidades encontrados:\n";
                for (const p of allPrices) {
                    responseString += `* ${p.description}: R$ ${p.price.toFixed(2)}\n`;
                }
                console.log("Resposta da ferramenta:", responseString);
                return responseString;
            }
            return "Nenhum valor de mensalidade está cadastrado no sistema no momento.";
        }

        const priceData = await pm.getPrice(grade);
        
        if (priceData) {
            return `O valor da mensalidade para ${priceData.description} é de R$ ${priceData.price.toFixed(2)}.`;
        }

        return `Não encontrei valores cadastrados para o nível: ${grade}. Os níveis válidos são infantil, fundamental_1 e fundamental_2.`;
        
    } catch(error) {
        console.error("Erro ao consultar preços: ", error);
        return `Falha ao consultar a tabela de mensalidades.`;
    }    
}

export const consult_prices = tool(
    async ({ grade }) => {
        return await getSchoolPrices(grade);
    },
    {
        name: "consult_prices",
        description: "Consulta os valores atuais das mensalidades da escola. Use essa ferramenta SEMPRE que o usuário perguntar sobre preços, valores, ou custos de mensalidade.",
        schema: z.object({
            grade: z.enum(["infantil", "fundamental_1", "fundamental_2", "todos"])
                .describe("O nível escolar para o qual o usuário quer saber o preço. Se o usuário perguntar o preço de forma genérica sem especificar a série, ou se quiser saber de todos, passe 'todos'."),
        }),
    }
);