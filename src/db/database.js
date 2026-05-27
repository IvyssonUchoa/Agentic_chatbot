import sqlite3 from 'sqlite3';
import {open} from 'sqlite';

export async function connectDB() {
    return (open({
        // filename: `./src/db/${process.env.DB_FILE}`,
        filename: `./src/db/database.sqlite`,
        driver: sqlite3.Database
    }));
}

export async function initializeDB() {
    const db = await connectDB();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS states (
            id TEXT PRIMARY KEY,
            state TEXT DEFAULT "Agentic",
            date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )    
    `)

    await db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            description TEXT,
            type TEXT,
            creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )    
    `)

    console.log(`Banco de dados inicializado com sucesso!`);
}
