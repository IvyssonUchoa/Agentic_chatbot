import {connectDB} from '../db/database.js';
import { getTimestamp } from '../utils/functions.js';


export class EventModel {
    constructor() {
        this.db = connectDB();
    }

    async getEvent(date){
        // Retorna os eventos que ocorrem no dia solicitado no parâmetro date

        const [day, month, year] = date.split('/');
        const targetDate = `${year}-${month}-${day}`;
        const response = (await this.db).all("SELECT * FROM events WHERE substr(start_date, 1, 10) <= ? AND substr(end_date, 1, 10) >= ?", [targetDate, targetDate]);

        if (response) return response;

        return null;
    }

   async getMonthEvent(date) {
        // Retorna os eventos que ocorrem no mês solicitado no parâmetro date

        const [, month, year] = date.split('/');
        
        const targetMonth = `${year}-${month}`;
        
        const response = await (await this.db).all(
            "SELECT * FROM events WHERE substr(start_date, 1, 7) <= ? AND substr(end_date, 1, 7) >= ?", 
            [targetMonth, targetMonth]
        );

        if (response) return response;
        
        return null;
    }

    async createEvent(start, end, description, type){
        // Cria um registro de envento no banco de dados

        start = getTimestamp(start);
        end = getTimestamp(end);

        const result = (await this.db).run("INSERT INTO events (start_date, end_date, description, type, creation_date) VALUES (?, ?, ?, ?, ?)", [start, end, description, type, new Date().toISOString()]);

        if (result) return true;

        return false;
    }

    async deleteEvent(id){
        // Deleta um evento do banco de dados

        const response = (await this.db).run("DELETE FROM events WHERE id = ?", [id]);

        if (response) return true;

        return false;
    }
}