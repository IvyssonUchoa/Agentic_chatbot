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

    await db.exec(`
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grade TEXT UNIQUE NOT NULL,
            price REAL NOT NULL,
            description TEXT NOT NULL
        )    
    `);

    const count = await db.get("SELECT COUNT(*) as count FROM prices");
    if (count.count === 0) {
        await db.run("INSERT INTO prices (grade, price, description) VALUES ('infantil', 650.00, 'Educação Infantil')");
        await db.run("INSERT INTO prices (grade, price, description) VALUES ('fundamental_1', 750.00, 'Ensino Fundamental 1 (1º ao 5º ano)')");
        await db.run("INSERT INTO prices (grade, price, description) VALUES ('fundamental_2', 850.00, 'Ensino Fundamental 2 (6º ao 9º ano)')");
        console.log("Valores iniciais de mensalidade inseridos no banco.");
    }

    console.log(`Banco de dados inicializado com sucesso!`);
}
