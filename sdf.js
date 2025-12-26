const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// Загрузка данных
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    questions = JSON.parse(data);
    currentId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    console.log(`📂 Данные загружены из файла, вопросов: ${questions.length}`);
  } catch (err) {
    console.log('📂 Файл данных не найден, используем начальные вопросы');
    questions = [...initialQuestions];
    currentId = questions.length + 1;
    await saveData();
  }
}

// Сохранение данных
async function saveData() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(questions, null, 2));
    console.log('💾 Данные сохранены в файл');
  } catch (err) {
    console.error('❌ Ошибка сохранения данных:', err);
  }
}

// В каждом POST/PUT/DELETE вызывайте saveData()