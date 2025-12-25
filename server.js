const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Для TimeWeb используем порт из переменных окружения или 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Путь к базе данных - в корне проекта
const db = new sqlite3.Database(path.join(__dirname, 'quiz.db'), (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
    } else {
        console.log('Подключено к SQLite базе данных');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                option1 TEXT NOT NULL,
                option2 TEXT NOT NULL,
                option3 TEXT NOT NULL,
                option4 TEXT NOT NULL,
                correct_answer INTEGER NOT NULL,
                difficulty INTEGER DEFAULT 2,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Ошибка создания таблицы:', err);
            } else {
                console.log('Таблица questions готова');
                addDefaultQuestions();
            }
        });
    });
}

function addDefaultQuestions() {
    db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
        if (err) return;
        
        if (row.count === 0) {
            const testQuestions = [
                {
                    question: "Столица России?",
                    option1: "Москва",
                    option2: "Лондон", 
                    option3: "Париж",
                    option4: "Берлин",
                    correct_answer: 1,
                    difficulty: 1
                },
                {
                    question: "Сколько будет 2+2?",
                    option1: "3",
                    option2: "4",
                    option3: "5",
                    option4: "6",
                    correct_answer: 2,
                    difficulty: 1
                },
                {
                    question: "Какой язык программирования используется для веб-страниц?",
                    option1: "Python",
                    option2: "Java",
                    option3: "JavaScript",
                    option4: "C++",
                    correct_answer: 3,
                    difficulty: 2
                }
            ];
            
            const stmt = db.prepare(`
                INSERT INTO questions (question, option1, option2, option3, option4, correct_answer, difficulty)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            testQuestions.forEach(q => {
                stmt.run(q.question, q.option1, q.option2, q.option3, q.option4, q.correct_answer, q.difficulty);
            });
            
            stmt.finalize();
            console.log('Добавлены тестовые вопросы');
        }
    });
}

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
        if (this.changes === 0) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        res.json({ 
            message: 'Вопрос успешно обновлен', 
            changes: this.changes 
        });
    });
});

app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        res.json({ 
            message: 'Вопрос успешно удален', 
            changes: this.changes 
        });
    });
});

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
        res.json(row[0] || { total_questions: 0, easy_count: 0, medium_count: 0, hard_count: 0 });
    });
});

// Статические файлы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 404 страница
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Для TimeWeb часто требуется запуск через сокет
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
    });
}

module.exports = app;