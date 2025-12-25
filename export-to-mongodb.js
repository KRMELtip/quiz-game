const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrate() {
    // Подключаемся к SQLite
    const sqliteDb = new sqlite3.Database('./quiz.db');
    
    // Подключаемся к MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const collection = client.db('quiz-db').collection('questions');
    
    // Получаем данные из SQLite
    sqliteDb.all('SELECT * FROM questions', [], async (err, rows) => {
        if (err) throw err;
        
        // Вставляем в MongoDB
        if (rows.length > 0) {
            await collection.insertMany(rows);
            console.log(`✅ Перенесено ${rows.length} вопросов в MongoDB`);
        }
        
        await client.close();
        sqliteDb.close();
    });
}

migrate();