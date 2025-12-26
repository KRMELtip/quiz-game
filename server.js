const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

// Инициализация Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к MongoDB Atlas
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/quiz-db";
let client = null;
let db = null;
let questionsCollection = null;

// Функция подключения к БД
async function connectDB() {
    try {
        console.log('🔄 Попытка подключения к MongoDB...');
        
        if (!uri) {
            console.error('❌ MONGODB_URI не установлена');
            return false;
        }
        
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        
        await client.connect();
        db = client.db('quiz-db');
        questionsCollection = db.collection('questions');
        
        await db.command({ ping: 1 });
        console.log('✅ Успешно подключено к MongoDB');
        
        const count = await questionsCollection.countDocuments();
        console.log(`📊 Вопросов в базе: ${count}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message);
        return false;
    }
}

// Подключаемся при старте
connectDB().then(connected => {
    if (connected) {
        console.log('✅ База данных готова');
    } else {
        console.log('⚠️ База данных недоступна');
    }
});

// Middleware для проверки подключения БД
app.use('/api/*', async (req, res, next) => {
    if (!questionsCollection) {
        const connected = await connectDB();
        if (!connected) {
            return res.status(503).json({ 
                error: 'База данных недоступна',
                details: 'Проверьте подключение к MongoDB'
            });
        }
    }
    next();
});

// API маршруты
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await questionsCollection
            .find({})
            .sort({ id: 1 })
            .toArray();
        
        res.json(questions);
        
    } catch (err) {
        console.error('❌ Ошибка загрузки вопросов:', err);
        res.status(500).json({ 
            error: 'Ошибка сервера',
            message: err.message
        });
    }
});

app.get('/api/questions/random', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;
        
        const allQuestions = await questionsCollection.find({}).toArray();
        
        if (allQuestions.length === 0) {
            return res.json([]);
        }
        
        const shuffled = [...allQuestions]
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(count, allQuestions.length));
        
        res.json(shuffled);
        
    } catch (err) {
        console.error('❌ Ошибка загрузки случайных вопросов:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions', async (req, res) => {
    try {
        const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
        
        // Валидация
        const errors = [];
        if (!question?.trim()) errors.push('question');
        if (!option1?.trim()) errors.push('option1');
        if (!option2?.trim()) errors.push('option2');
        if (!option3?.trim()) errors.push('option3');
        if (!option4?.trim()) errors.push('option4');
        
        if (errors.length > 0) {
            return res.status(400).json({ 
                error: 'Все поля обязательны для заполнения',
                missing_fields: errors
            });
        }
        
        // Получаем максимальный ID
        const lastQuestion = await questionsCollection
            .find({})
            .sort({ id: -1 })
            .limit(1)
            .toArray();
        
        const newId = lastQuestion.length > 0 ? lastQuestion[0].id + 1 : 1;
        
        // Создаем новый вопрос
        const newQuestion = {
            id: newId,
            question: question.trim(),
            option1: option1.trim(),
            option2: option2.trim(),
            option3: option3.trim(),
            option4: option4.trim(),
            correct_answer: parseInt(correct_answer) || 1,
            difficulty: parseInt(difficulty) || 2,
            created_at: new Date().toISOString()
        };
        
        const result = await questionsCollection.insertOne(newQuestion);
        
        res.json({
            success: true,
            id: newId,
            _id: result.insertedId,
            message: 'Вопрос успешно добавлен'
        });
        
    } catch (err) {
        console.error('❌ Ошибка добавления вопроса:', err);
        res.status(500).json({ 
            error: 'Ошибка при сохранении вопроса',
            details: err.message
        });
    }
});

app.put('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (req.body.question !== undefined) updateData.question = req.body.question.trim();
        if (req.body.option1 !== undefined) updateData.option1 = req.body.option1.trim();
        if (req.body.option2 !== undefined) updateData.option2 = req.body.option2.trim();
        if (req.body.option3 !== undefined) updateData.option3 = req.body.option3.trim();
        if (req.body.option4 !== undefined) updateData.option4 = req.body.option4.trim();
        if (req.body.correct_answer !== undefined) updateData.correct_answer = parseInt(req.body.correct_answer);
        if (req.body.difficulty !== undefined) updateData.difficulty = parseInt(req.body.difficulty);
        
        const result = await questionsCollection.updateOne(
            { id: parseInt(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Вопрос не найден' });
        }
        
        res.json({ 
            success: true,
            message: 'Вопрос обновлен'
        });
        
    } catch (err) {
        console.error('❌ Ошибка обновления вопроса:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await questionsCollection.deleteOne({ id: parseInt(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Вопрос не найден' });
        }
        
        res.json({ 
            success: true,
            message: 'Вопрос удален'
        });
        
    } catch (err) {
        console.error('❌ Ошибка удаления вопроса:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const total = await questionsCollection.countDocuments();
        const easy = await questionsCollection.countDocuments({ difficulty: 1 });
        const medium = await questionsCollection.countDocuments({ difficulty: 2 });
        const hard = await questionsCollection.countDocuments({ difficulty: 3 });
        
        const stats = {
            total_questions: total,
            easy_count: easy,
            medium_count: medium,
            hard_count: hard
        };
        
        res.json(stats);
        
    } catch (err) {
        console.error('❌ Ошибка загрузки статистики:', err);
        res.status(500).json({ error: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: questionsCollection ? 'connected' : 'disconnected'
    });
});

// Статические файлы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Обработчик 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// Запуск сервера
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`🌐 Откройте http://localhost:${PORT}`);
    });
}

// Экспорт для Vercel
module.exports = app;