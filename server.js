const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Вопросы хранятся в памяти
let questions = [];
let nextId = 1;

// Начальные вопросы для демонстрации
const initialQuestions = [
    {
        id: 1,
        question: "Сколько планет в Солнечной системе?",
        option1: "7",
        option2: "8",
        option3: "9",
        option4: "10",
        correct_answer: 2,
        difficulty: 1,
        created_at: "2024-01-01T10:00:00.000Z"
    },
    {
        id: 2,
        question: "Какая самая длинная река в мире?",
        option1: "Амазонка",
        option2: "Нил",
        option3: "Янцзы",
        option4: "Миссисипи",
        correct_answer: 1,
        difficulty: 2,
        created_at: "2024-01-01T10:00:00.000Z"
    },
    {
        id: 3,
        question: "Кто написал 'Войну и мир'?",
        option1: "Ф. Достоевский",
        option2: "А. Чехов",
        option3: "Л. Толстой",
        option4: "И. Тургенев",
        correct_answer: 3,
        difficulty: 2,
        created_at: "2024-01-01T10:00:00.000Z"
    }
];

// Инициализация данных при запуске
function initializeData() {
    questions = [...initialQuestions];
    nextId = questions.length + 1;
    console.log(`📊 Инициализировано ${questions.length} вопросов`);
}

// Инициализируем данные
initializeData();

// API для работы с вопросами

// Получить все вопросы
app.get('/api/questions', (req, res) => {
    console.log(`📥 GET /api/questions (возвращено: ${questions.length})`);
    res.json(questions);
});

// Получить случайные вопросы
app.get('/api/questions/random', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    console.log(`🎲 GET /api/questions/random?count=${count}`);
    
    if (questions.length === 0) {
        return res.json([]);
    }
    
    // Создаем копию и перемешиваем
    const shuffled = [...questions]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(count, questions.length));
    
    console.log(`🎲 Возвращено случайных вопросов: ${shuffled.length}`);
    res.json(shuffled);
});

// Добавить новый вопрос
app.post('/api/questions', (req, res) => {
    console.log('➕ POST /api/questions', req.body);
    
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    // Валидация
    const errors = [];
    if (!question?.trim()) errors.push('Текст вопроса обязателен');
    if (!option1?.trim()) errors.push('Вариант 1 обязателен');
    if (!option2?.trim()) errors.push('Вариант 2 обязателен');
    if (!option3?.trim()) errors.push('Вариант 3 обязателен');
    if (!option4?.trim()) errors.push('Вариант 4 обязателен');
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Ошибка валидации',
            details: errors
        });
    }
    
    // Создаем новый вопрос
    const newQuestion = {
        id: nextId++,
        question: question.trim(),
        option1: option1.trim(),
        option2: option2.trim(),
        option3: option3.trim(),
        option4: option4.trim(),
        correct_answer: parseInt(correct_answer) || 1,
        difficulty: parseInt(difficulty) || 2,
        created_at: new Date().toISOString()
    };
    
    questions.push(newQuestion);
    
    console.log(`✅ Вопрос добавлен с ID: ${newQuestion.id}`);
    res.json({
        success: true,
        id: newQuestion.id,
        message: 'Вопрос успешно добавлен',
        question: newQuestion
    });
});

// Обновить вопрос
app.put('/api/questions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`✏️ PUT /api/questions/${id}`, req.body);
    
    const questionIndex = questions.findIndex(q => q.id === id);
    
    if (questionIndex === -1) {
        return res.status(404).json({ error: 'Вопрос не найден' });
    }
    
    // Обновляем поля
    const question = questions[questionIndex];
    if (req.body.question !== undefined) question.question = req.body.question.trim();
    if (req.body.option1 !== undefined) question.option1 = req.body.option1.trim();
    if (req.body.option2 !== undefined) question.option2 = req.body.option2.trim();
    if (req.body.option3 !== undefined) question.option3 = req.body.option3.trim();
    if (req.body.option4 !== undefined) question.option4 = req.body.option4.trim();
    if (req.body.correct_answer !== undefined) question.correct_answer = parseInt(req.body.correct_answer);
    if (req.body.difficulty !== undefined) question.difficulty = parseInt(req.body.difficulty);
    
    console.log(`✅ Вопрос ${id} обновлен`);
    res.json({ 
        success: true,
        message: 'Вопрос успешно обновлен',
        question
    });
});

// Удалить вопрос
app.delete('/api/questions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`🗑️ DELETE /api/questions/${id}`);
    
    const initialLength = questions.length;
    questions = questions.filter(q => q.id !== id);
    
    if (questions.length === initialLength) {
        return res.status(404).json({ error: 'Вопрос не найден' });
    }
    
    console.log(`✅ Вопрос ${id} удален`);
    res.json({ 
        success: true,
        message: 'Вопрос успешно удален'
    });
});

// Статистика
app.get('/api/stats', (req, res) => {
    console.log('📈 GET /api/stats');
    
    const stats = {
        total_questions: questions.length,
        easy_count: questions.filter(q => q.difficulty === 1).length,
        medium_count: questions.filter(q => q.difficulty === 2).length,
        hard_count: questions.filter(q => q.difficulty === 3).length
    };
    
    console.log('📊 Статистика:', stats);
    res.json(stats);
});

// Проверка здоровья
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        questions_count: questions.length,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Информация для отладки
app.get('/api/debug', (req, res) => {
    res.json({
        app: 'Quiz Game Memory',
        version: '1.0.0',
        questions_in_memory: questions.length,
        next_id: nextId,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        node_version: process.version
    });
});

// Сброс данных (только для отладки)
app.post('/api/reset', (req, res) => {
    console.log('🔄 Сброс данных к начальному состоянию');
    initializeData();
    res.json({
        success: true,
        message: 'Данные сброшены к начальному состоянию',
        questions_count: questions.length
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

// Обработка 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Обработка 404 для статики
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// Экспорт для Vercel
module.exports = app;

// Локальный запуск
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`📊 Загружено вопросов: ${questions.length}`);
        console.log(`👉 Главная страница: http://localhost:${PORT}`);
        console.log(`🎮 Игра: http://localhost:${PORT}/game`);
        console.log(`⚙️ Админка: http://localhost:${PORT}/admin`);
    });
}