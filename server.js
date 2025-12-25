const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Простая база данных в памяти
let questions = [
    {
        id: 1,
        question: "Столица России?",
        option1: "Москва", option2: "Лондон", option3: "Париж", option4: "Берлин",
        correct_answer: 1, difficulty: 1
    },
    {
        id: 2,
        question: "Сколько будет 2+2?",
        option1: "3", option2: "4", option3: "5", option4: "6",
        correct_answer: 2, difficulty: 1
    }
];

// API маршруты
app.get('/api/questions', (req, res) => {
    res.json(questions);
});

app.get('/api/questions/random', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count);
    res.json(shuffled);
});

app.post('/api/questions', (req, res) => {
    const newQuestion = {
        id: questions.length + 1,
        ...req.body,
        created_at: new Date().toISOString()
    };
    questions.push(newQuestion);
    res.json(newQuestion);
});

// Статические маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`👉 Главная: https://localhost:${PORT}/`);
    console.log(`👉 Игра: https://localhost:${PORT}/game`);
    console.log(`👉 API: https://localhost:${PORT}/api/questions`);
});