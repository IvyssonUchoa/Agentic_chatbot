import {connectDB} from '../db/database.js';


export class StateModel {
    constructor() {
        this.db = connectDB();
    }

    async getState(id){
        // Retorna o estado atual do usuário a partir do banco de dados

        const response = (await this.db).get("SELECT state, date_modified FROM states WHERE id = ?", [id]);

        if (response) return response;

        return null;
    }

    async createState(id){
        // Cria um registro no banco do estado atual do usuário
        // Caso o usuário já exista não faz nada

        const existing = await this.getState(id);

        if (existing) return true;

        const result = (await this.db).run("INSERT INTO states (id, date_modified) VALUES (?, ?)", [id, new Date().toISOString()]);

        if (result) return true;

        return false;
    }

    async setState(id, state){
        // Atualiza o estado do usuário no banco de dados
        // Os estados disponíveis são "Agentic" e "Human", referentes a quem está fazendo o atendimento do usuário

        const existing = await this.getState(id);

        if (!existing) return false;

        const result = (await this.db).run("UPDATE states SET state = ?, date_modified = ? WHERE id = ?", [state, new Date().toISOString(), id]);

        if (result) return true;

        return false;
    }
}