const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Вопросы хранятся в памяти
let questions = [
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

let nextId = 4;

// Включить CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// API маршруты

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        questions: questions.length 
    });
});

// Получить все вопросы
app.get('/api/questions', (req, res) => {
    res.json(questions);
});

// Получить случайные вопросы
app.get('/api/questions/random', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    
    if (questions.length === 0) {
        return res.json([]);
    }
    
    // Перемешиваем массив
    const shuffled = [...questions]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(count, questions.length));
    
    res.json(shuffled);
});

// Добавить вопрос
app.post('/api/questions', (req, res) => {
    try {
        const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
        
        // Простая валидация
        if (!question || !option1 || !option2 || !option3 || !option4) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
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
        
        res.json({
            success: true,
            id: newQuestion.id,
            message: 'Вопрос добавлен'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить вопрос
app.put('/api/questions/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
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
        
        res.json({ 
            success: true,
            message: 'Вопрос обновлен'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить вопрос
app.delete('/api/questions/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const initialLength = questions.length;
        questions = questions.filter(q => q.id !== id);
        
        if (questions.length === initialLength) {
            return res.status(404).json({ error: 'Вопрос не найден' });
        }
        
        res.json({ 
            success: true,
            message: 'Вопрос удален'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Статистика
app.get('/api/stats', (req, res) => {
    const stats = {
        total_questions: questions.length,
        easy_count: questions.filter(q => q.difficulty === 1).length,
        medium_count: questions.filter(q => q.difficulty === 2).length,
        hard_count: questions.filter(q => q.difficulty === 3).length
    };
    
    res.json(stats);
});

// Статические маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// Экспорт для Vercel
module.exports = app;

// Локальный запуск (если не Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}