const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // <-- Импортируем SQLite
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Подключаемся к базе данных
const db = new sqlite3.Database('./quiz.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
    } else {
        console.log('Подключено к SQLite базе данных');
    }
});

// API маршруты
app.get('/api/questions', (req, res) => {
    db.all('SELECT * FROM questions ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/questions/random', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    db.all('SELECT * FROM questions ORDER BY RANDOM() LIMIT ?', [count], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/questions', (req, res) => {
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    if (!question || !option1 || !option2 || !option3 || !option4) {
        res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        return;
    }
    
    db.run(`
        INSERT INTO questions (question, option1, option2, option3, option4, correct_answer, difficulty)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [question, option1, option2, option3, option4, correct_answer, difficulty || 2], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            id: this.lastID, 
            message: 'Вопрос успешно добавлен' 
        });
    });
});
// Обновление вопроса (PUT)
app.put('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    const { question, option1, option2, option3, option4, correct_answer, difficulty } = req.body;
    
    db.run(`
        UPDATE questions 
        SET question = ?, option1 = ?, option2 = ?, option3 = ?, option4 = ?, correct_answer = ?, difficulty = ?
        WHERE id = ?
    `, [question, option1, option2, option3, option4, correct_answer, difficulty, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Вопрос обновлен' });
    });
});

// Удаление вопроса (DELETE)
app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Вопрос удален' });
    });
});

// Статистика (GET)
app.get('/api/stats', (req, res) => {
    db.all(`
        SELECT 
            COUNT(*) as total_questions,
            SUM(CASE WHEN difficulty = 1 THEN 1 ELSE 0 END) as easy_count,
            SUM(CASE WHEN difficulty = 2 THEN 1 ELSE 0 END) as medium_count,
            SUM(CASE WHEN difficulty = 3 THEN 1 ELSE 0 END) as hard_count
        FROM questions
    `, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row[0]);
    });
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

// Обработчик 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

module.exports = app;