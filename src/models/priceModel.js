import { connectDB } from '../db/database.js';

export class PriceModel {
    constructor() {
        this.db = connectDB();
    }

    async getPrice(grade){
        // Retorna o preço de um nível escolar específico
        const response = await (await this.db).get("SELECT price, description FROM prices WHERE grade = ?", [grade]);
        return response || null;
    }

    async getAllPrices(){
        // Retorna todos os preços cadastrados
        const response = await (await this.db).all("SELECT grade, price, description FROM prices");
        return response || null;
    }
}