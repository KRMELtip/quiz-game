const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // <-- Заменяем SQLite на MongoDB
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Подключение к MongoDB Atlas
const uri = process.env.MONGODB_URI; // Vercel добавит эту переменную автоматически
const client = new MongoClient(uri);
let db, questionsCollection;

// Подключаемся к БД при старте
async function connectDB() {
    try {
        await client.connect();
        db = client.db('quiz_app'); // Название базы данных (можно изменить)
        questionsCollection = db.collection('questions'); // Название коллекции
        console.log('✅ Подключено к MongoDB Atlas');
        
        // Создаём индекс для быстрого поиска по ID
        await questionsCollection.createIndex({ id: 1 });
    } catch (err) {
        console.error('❌ Ошибка подключения к MongoDB:', err);
        process.exit(1);
    }
}

connectDB();

// API маршруты
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await questionsCollection
            .find({})
            .sort({ id: -1 }) // Сортировка по ID (обратный порядок)
            .toArray();
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/questions/random', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;
        
        // Используем агрегацию для получения случайных вопросов
        const questions = await questionsCollection
            .aggregate([{ $sample: { size: count } }])
            .toArray();
        
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions', async (req, res) => {
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    // Валидация
    if (!question || !option1 || !option2 || !option3 || !option4) {
        res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        return;
    }
    
    try {
        // Находим максимальный ID, чтобы создать новый
        const lastQuestion = await questionsCollection
            .find({})
            .sort({ id: -1 })
            .limit(1)
            .toArray();
        
        const newId = lastQuestion.length > 0 ? lastQuestion[0].id + 1 : 1;
        
        // Создаём новый вопрос
        const newQuestion = {
            id: newId,
            question,
            option1,
            option2,
            option3,
            option4,
            correct_answer: parseInt(correct_answer),
            difficulty: difficulty || 2,
            created_at: new Date().toISOString()
        };
        
        const result = await questionsCollection.insertOne(newQuestion);
        
        res.json({
            id: newId,
            _id: result.insertedId,
            message: 'Вопрос успешно добавлен в MongoDB'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    try {
        const result = await questionsCollection.updateOne(
            { id: parseInt(id) }, // Ищем по числовому ID
            {
                $set: {
                    question,
                    option1,
                    option2,
                    option3,
                    option4,
                    correct_answer: parseInt(correct_answer),
                    difficulty: difficulty || 2
                }
            }
        );
        
        if (result.matchedCount === 0) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        
        res.json({ message: 'Вопрос обновлен' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await questionsCollection.deleteOne({ id: parseInt(id) });
        
        if (result.deletedCount === 0) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        
        res.json({ message: 'Вопрос удален' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await questionsCollection.aggregate([
            {
                $group: {
                    _id: null,
                    total_questions: { $sum: 1 },
                    easy_count: {
                        $sum: { $cond: [{ $eq: ['$difficulty', 1] }, 1, 0] }
                    },
                    medium_count: {
                        $sum: { $cond: [{ $eq: ['$difficulty', 2] }, 1, 0] }
                    },
                    hard_count: {
                        $sum: { $cond: [{ $eq: ['$difficulty', 3] }, 1, 0] }
                    }
                }
            }
        ]).toArray();
        
        res.json(stats[0] || {
            total_questions: 0,
            easy_count: 0,
            medium_count: 0,
            hard_count: 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Статические маршруты (оставляем без изменений)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Обработчик 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Экспортируем для Vercel
module.exports = app;