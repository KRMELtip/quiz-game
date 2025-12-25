const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Подключение к MongoDB Atlas
const uri = process.env.MONGODB_URI || "mongodb+srv://ваш_пользователь:ваш_пароль@ваш_кластер.mongodb.net/quiz_app?retryWrites=true&w=majority";
let client;
let db, questionsCollection;

// Подключаемся к БД при старте
async function connectDB() {
    try {
        console.log('🔄 Попытка подключения к MongoDB...');
        console.log('URI:', uri ? 'Установлено' : 'Не установлено');
        
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('quiz_app');
        questionsCollection = db.collection('questions');
        
        console.log('✅ Подключено к MongoDB Atlas');
        
        // Создаём индекс для быстрого поиска
        await questionsCollection.createIndex({ id: 1 });
        
    } catch (err) {
        console.error('❌ Ошибка подключения к MongoDB:', err.message);
        // Не завершаем процесс, чтобы приложение могло работать в режиме без БД
    }
}

// Инициализация подключения
connectDB();

// Middleware для проверки подключения к БД
app.use('/api/*', async (req, res, next) => {
    if (!questionsCollection) {
        try {
            await connectDB();
        } catch (err) {
            console.error('❌ Ошибка переподключения к БД:', err.message);
        }
    }
    next();
});

// API маршруты
app.get('/api/questions', async (req, res) => {
    try {
        if (!questionsCollection) {
            return res.status(500).json({ error: 'База данных не подключена' });
        }
        
        const questions = await questionsCollection
            .find({})
            .sort({ id: -1 })
            .toArray();
        res.json(questions);
    } catch (err) {
        console.error('❌ Ошибка получения вопросов:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/questions/random', async (req, res) => {
    try {
        if (!questionsCollection) {
            return res.status(500).json({ error: 'База данных не подключена' });
        }
        
        const count = parseInt(req.query.count) || 10;
        const totalQuestions = await questionsCollection.countDocuments();
        
        // Если вопросов меньше запрошенного количества, берем все
        if (totalQuestions <= count) {
            const allQuestions = await questionsCollection.find({}).toArray();
            // Перемешиваем вопросы
            const shuffled = allQuestions.sort(() => 0.5 - Math.random());
            return res.json(shuffled);
        }
        
        // Иначе используем агрегацию для случайных вопросов
        const questions = await questionsCollection
            .aggregate([
                { $sample: { size: count } }
            ])
            .toArray();
        
        res.json(questions);
    } catch (err) {
        console.error('❌ Ошибка получения случайных вопросов:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions', async (req, res) => {
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    if (!questionsCollection) {
        return res.status(500).json({ error: 'База данных не подключена' });
    }
    
    // Валидация
    if (!question || !option1 || !option2 || !option3 || !option4) {
        res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        return;
    }
    
    try {
        // Находим максимальный ID
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
            message: 'Вопрос успешно добавлен'
        });
    } catch (err) {
        console.error('❌ Ошибка добавления вопроса:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    if (!questionsCollection) {
        return res.status(500).json({ error: 'База данных не подключена' });
    }
    
    try {
        const result = await questionsCollection.updateOne(
            { id: parseInt(id) },
            {
                $set: {
                    question,
                    option1,
                    option2,
                    option3,
                    option4,
                    correct_answer: parseInt(correct_answer),
                    difficulty: difficulty || 2,
                    updated_at: new Date().toISOString()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        
        res.json({ message: 'Вопрос обновлен' });
    } catch (err) {
        console.error('❌ Ошибка обновления вопроса:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!questionsCollection) {
        return res.status(500).json({ error: 'База данных не подключена' });
    }
    
    try {
        const result = await questionsCollection.deleteOne({ id: parseInt(id) });
        
        if (result.deletedCount === 0) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        
        res.json({ message: 'Вопрос удален' });
    } catch (err) {
        console.error('❌ Ошибка удаления вопроса:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        if (!questionsCollection) {
            return res.status(500).json({ error: 'База данных не подключена' });
        }
        
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
        console.error('❌ Ошибка получения статистики:', err);
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        if (questionsCollection) {
            const count = await questionsCollection.countDocuments();
            res.json({ 
                status: 'healthy', 
                database: 'connected',
                questions_count: count
            });
        } else {
            res.status(500).json({ 
                status: 'unhealthy', 
                database: 'disconnected'
            });
        }
    } catch (err) {
        res.status(500).json({ 
            status: 'error', 
            error: err.message 
        });
    }
});

// Маршруты для статических файлов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Обработчик 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API маршрут не найден' });
});

// Обработчик 404 для статических файлов
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Для локального запуска
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`📁 Статические файлы из: ${path.join(__dirname, '../public')}`);
    });
}

// Экспортируем для Vercel
module.exports = app;