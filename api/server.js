const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Подключение к MongoDB Atlas
const uri = process.env.MONGODB_URI;
let client = null;
let db = null;
let questionsCollection = null;

// Функция подключения к БД
async function connectDB() {
    try {
        console.log('🔄 Попытка подключения к MongoDB Atlas...');
        
        if (!uri) {
            console.error('❌ MONGODB_URI не установлена в переменных окружения');
            return false;
        }
        
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        
        await client.connect();
        db = client.db('quiz-db'); // ← Исправлено на quiz-db
        questionsCollection = db.collection('questions');
        
        // Проверяем подключение
        await db.command({ ping: 1 });
        console.log('✅ Успешно подключено к MongoDB Atlas');
        console.log(`📊 База данных: ${db.databaseName}`);
        console.log(`📄 Коллекция: questions`);
        
        // Проверяем, есть ли документы
        const count = await questionsCollection.countDocuments();
        console.log(`📊 Количество вопросов в базе: ${count}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message);
        console.error('❌ Полная ошибка:', error);
        
        if (client) {
            try {
                await client.close();
            } catch (e) {
                console.error('Ошибка при закрытии клиента:', e.message);
            }
        }
        
        return false;
    }
}

// Подключаемся при старте
connectDB().then(connected => {
    if (connected) {
        console.log('✅ MongoDB инициализирована');
    } else {
        console.log('⚠️ Не удалось подключиться к MongoDB');
    }
});

// Middleware для проверки подключения
app.use('/api/*', async (req, res, next) => {
    if (!questionsCollection) {
        console.log('🔄 Попытка переподключения для API запроса...');
        const connected = await connectDB();
        if (!connected) {
            return res.status(503).json({ 
                error: 'База данных недоступна',
                details: 'Проверьте подключение к MongoDB Atlas',
                env_check: {
                    mongodb_uri_set: !!process.env.MONGODB_URI,
                    uri_length: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0
                }
            });
        }
    }
    next();
});

// API маршруты
app.get('/api/questions', async (req, res) => {
    try {
        console.log('📥 GET /api/questions');
        
        const questions = await questionsCollection
            .find({})
            .sort({ id: 1 })
            .toArray();
        
        console.log(`📊 Возвращено вопросов: ${questions.length}`);
        res.json(questions);
        
    } catch (err) {
        console.error('❌ Ошибка в /api/questions:', err);
        res.status(500).json({ 
            error: 'Ошибка сервера',
            message: err.message
        });
    }
});

app.get('/api/questions/random', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;
        console.log(`🎲 GET /api/questions/random?count=${count}`);
        
        // Сначала получаем все вопросы
        const allQuestions = await questionsCollection.find({}).toArray();
        
        if (allQuestions.length === 0) {
            console.log('📭 Нет вопросов в базе');
            return res.json([]);
        }
        
        // Перемешиваем и берем нужное количество
        const shuffled = [...allQuestions]
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(count, allQuestions.length));
        
        console.log(`🎲 Возвращено случайных вопросов: ${shuffled.length}`);
        res.json(shuffled);
        
    } catch (err) {
        console.error('❌ Ошибка в /api/questions/random:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions', async (req, res) => {
    try {
        console.log('➕ POST /api/questions', req.body);
        
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
        
        console.log('💾 Сохранение вопроса с ID:', newId);
        const result = await questionsCollection.insertOne(newQuestion);
        
        console.log('✅ Вопрос сохранен, insertedId:', result.insertedId);
        res.json({
            success: true,
            id: newId,
            _id: result.insertedId,
            message: 'Вопрос успешно добавлен'
        });
        
    } catch (err) {
        console.error('❌ Ошибка в POST /api/questions:', err);
        res.status(500).json({ 
            error: 'Ошибка при сохранении вопроса',
            details: err.message
        });
    }
});

app.put('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`✏️ PUT /api/questions/${id}`, req.body);
        
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        // Добавляем только те поля, которые были переданы
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
        
        console.log(`✅ Вопрос ${id} обновлен`);
        res.json({ 
            success: true,
            message: 'Вопрос обновлен'
        });
        
    } catch (err) {
        console.error('❌ Ошибка в PUT /api/questions/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ DELETE /api/questions/${id}`);
        
        const result = await questionsCollection.deleteOne({ id: parseInt(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Вопрос не найден' });
        }
        
        console.log(`✅ Вопрос ${id} удален`);
        res.json({ 
            success: true,
            message: 'Вопрос удален'
        });
        
    } catch (err) {
        console.error('❌ Ошибка в DELETE /api/questions/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        console.log('📈 GET /api/stats');
        
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
        
        console.log('📊 Статистика:', stats);
        res.json(stats);
        
    } catch (err) {
        console.error('❌ Ошибка в /api/stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// Тестовый эндпоинт для диагностики
app.get('/api/debug', async (req, res) => {
    try {
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        const stats = {
            connected: !!questionsCollection,
            database: db.databaseName,
            collections: collectionNames,
            questions_count: await questionsCollection?.countDocuments() || 0,
            env: {
                mongodb_uri_exists: !!process.env.MONGODB_URI,
                node_env: process.env.NODE_ENV || 'development',
                port: PORT
            }
        };
        
        res.json(stats);
        
    } catch (error) {
        res.json({
            connected: false,
            error: error.message,
            env: {
                mongodb_uri_exists: !!process.env.MONGODB_URI,
                node_env: process.env.NODE_ENV
            }
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: questionsCollection ? 'connected' : 'disconnected',
        database_name: 'quiz-db'
    });
});

// Статические файлы
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
    res.status(404).json({ error: 'API endpoint not found' });
});

// Обработчик 404 для статических файлов
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Для локального запуска
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`🌐 Доступно по адресу: http://localhost:${PORT}`);
        console.log(`📁 Статические файлы из: public/`);
        console.log(`🗄️  База данных: quiz-db`);
    });
}

// Экспорт для Vercel
module.exports = app;