// Файл: /api/server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;

// --- Кэширование подключения для Serverless ---
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log('=> Использую кэшированное подключение к БД');
    return { client: cachedClient, db: cachedDb, collection: cachedDb.collection('questions') };
  }

  console.log('=> Создаю новое подключение к БД');
  const client = await MongoClient.connect(MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });

  const db = client.db(); // Имя БД берется из строки подключения
  const questionsCollection = db.collection('questions');

  cachedClient = client;
  cachedDb = db;

  return { client, db, collection: questionsCollection };
}

// --- Middleware, который добавляет коллекцию в каждый запрос ---
app.use(async (req, res, next) => {
  try {
    const { collection } = await connectToDatabase();
    req.questionsCollection = collection;
    next();
  } catch (error) {
    console.error('Ошибка подключения к БД:', error);
    res.status(503).json({ error: 'База данных недоступна', details: error.message });
  }
});

app.use(express.json());
// Для Vercel: путь к статике нужно считать относительно корня проекта
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- МАРШРУТ ДИАГНОСТИКИ (первым делом!) ---
app.get('/debug', async (req, res) => {
  const report = {
    status: 'Диагностика Vercel + Express',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    MONGODB_URI_SET: !!process.env.MONGODB_URI,
    MONGODB_URI_PREVIEW: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 25) + '...' : 'НЕТ',
  };
  res.json(report);
});

// --- ВАШИ API МАРШРУТЫ (пример для /api/questions) ---
// Теперь используем req.questionsCollection из middleware
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await req.questionsCollection.find({}).sort({ id: 1 }).toArray();
    res.json(questions);
  } catch (err) {
    console.error('Ошибка в /api/questions:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ... ОСТАВЬТЕ ВСЕ ОСТАЛЬНЫЕ ВАШИ API МАРШРУТЫ (/api/questions/random, POST, PUT, DELETE, /api/stats)
// ИЗМЕНИТЕ ИХ, ЧТОБЫ ОНИ ТАКЖЕ ИСПОЛЬЗОВАЛИ req.questionsCollection

// --- Маршруты для HTML-страниц ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'game.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Обработчик 404 для API (если маршрут не найден среди вышеперечисленных)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint не найден' });
});

// ВАЖНО: Не используем app.listen для Vercel!
// Экспортируем приложение как Serverless Function
module.exports = app;