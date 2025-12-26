class AdminPanel {
    constructor() {
        this.questions = [];
       this.baseUrl = window.location.origin;
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadQuestions();
        this.renderQuestions();
        this.updateStats();
    }
    
    bindEvents() {
        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });
        
        // Форма добавления вопроса
        document.getElementById('add-question-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveQuestion();
        });
        
        // Очистка формы
        document.getElementById('clear-form').addEventListener('click', () => {
            this.clearForm();
        });
        
        // Поиск
        document.getElementById('search-questions').addEventListener('input', (e) => {
            this.filterQuestions(e.target.value);
        });
        
        // Фильтр по сложности
        document.getElementById('filter-difficulty').addEventListener('change', (e) => {
            this.filterByDifficulty(e.target.value);
        });
        
        // Кнопка обновления вопросов
        document.getElementById('refresh-questions').addEventListener('click', async () => {
            await this.loadQuestions();
            this.renderQuestions();
            alert('Список вопросов обновлен!');
        });
        
        // Проверка соединения
        document.getElementById('test-connection').addEventListener('click', async () => {
            await this.testConnection();
        });
        
        // Обновление данных
        document.getElementById('reload-data').addEventListener('click', async () => {
            await this.loadQuestions();
            this.renderQuestions();
            this.updateStats();
            alert('Данные обновлены!');
        });
    }
    
    switchSection(section) {
        // Скрыть все секции
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        
        // Убрать активный класс у всех кнопок
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Показать выбранную секцию
        document.getElementById(`${section}-section`).classList.add('active');
        
        // Активировать кнопку навигации
        document.querySelector(`.nav-btn[data-section="${section}"]`).classList.add('active');
        
        // Обновить заголовок формы
        if (section === 'add') {
            document.getElementById('form-title').textContent = 'Добавить новый вопрос';
        }
    }
    
    async loadQuestions() {
        try {
            console.log('Загрузка вопросов...');
            const response = await fetch('/api/questions');
            
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            
            this.questions = await response.json();
            console.log('Загружено вопросов:', this.questions.length);
            
        } catch (error) {
            console.error('Ошибка загрузки вопросов:', error);
            this.questions = [];
            alert('Ошибка загрузки вопросов. Проверьте подключение к серверу.');
        }
    }
    
    renderQuestions() {
        const container = document.getElementById('questions-list');
        container.innerHTML = '';
        
        if (this.questions.length === 0) {
            container.innerHTML = `
                <div class="no-questions">
                    <i class="fas fa-question-circle fa-3x"></i>
                    <h3>Нет вопросов в базе данных</h3>
                    <p>Добавьте первый вопрос в секции "Добавить вопрос"</p>
                </div>`;
            return;
        }
        
        this.questions.forEach(question => {
            const questionElement = this.createQuestionElement(question);
            container.appendChild(questionElement);
        });
    }
    
    createQuestionElement(question) {
        const element = document.createElement('div');
        element.className = 'question-item';
        element.innerHTML = `
            <div class="question-header">

                <h3>${question.question}</h3>
                <div class="question-meta">
                    <span class="difficulty level-${question.difficulty}">
                        ${this.getDifficultyText(question.difficulty)}
                    </span>
                </div>
            </div>
            <div class="question-options">
                <div class="option ${question.correct_answer === 1 ? 'correct' : ''}">
                    <strong>1.</strong> ${question.option1}
                </div>
                <div class="option ${question.correct_answer === 2 ? 'correct' : ''}">
                    <strong>2.</strong> ${question.option2}
                </div>
                <div class="option ${question.correct_answer === 3 ? 'correct' : ''}">
                    <strong>3.</strong> ${question.option3}
                </div>
                <div class="option ${question.correct_answer === 4 ? 'correct' : ''}">
                    <strong>4.</strong> ${question.option4}
                </div>
            </div>
            <div class="question-actions">
                <button class="action-btn edit-btn" data-id="${question.id}">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="action-btn delete-btn" data-id="${question.id}">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>`;
        
        // Добавляем обработчики для кнопок
        element.querySelector('.edit-btn').addEventListener('click', () => {
            this.editQuestion(question.id);
        });
        
        element.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteQuestion(question.id);
        });
        
        return element;
    }
    
    getDifficultyText(level) {
        const levels = {
            1: 'Легкий',
            2: 'Средний',
            3: 'Сложный'
        };
        return levels[level] || 'Неизвестно';
    }
    
    async saveQuestion() {
        const questionId = document.getElementById('question-id').value;
        const questionText = document.getElementById('question-text').value.trim();
        const option1 = document.getElementById('option1').value.trim();
        const option2 = document.getElementById('option2').value.trim();
        const option3 = document.getElementById('option3').value.trim();
        const option4 = document.getElementById('option4').value.trim();
        const correctAnswer = parseInt(document.getElementById('correct-answer').value);
        const difficulty = parseInt(document.getElementById('difficulty').value);
        
        // Валидация
        if (!questionText || !option1 || !option2 || !option3 || !option4) {
            alert('Заполните все поля!');
            return;
        }
        
        if (correctAnswer < 1 || correctAnswer > 4) {
            alert('Правильный ответ должен быть от 1 до 4');
            return;
        }
        
        const questionData = {
            question: questionText,
            option1: option1,
            option2: option2,
            option3: option3,
            option4: option4,
            correct_answer: correctAnswer,
            difficulty: difficulty || 2
        };
        
        try {
            let response;
            let method;
            let url;
            
            if (questionId) {
                // Редактирование
                url = `/api/questions/${questionId}`;
                method = 'PUT';
            } else {
                // Добавление
                url = '/api/questions';
                method = 'POST';
            }
            
            console.log('Отправка запроса:', { url, method, data: questionData });
            
            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(questionData)
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }
            
            const result = await response.json();
            alert(questionId ? 'Вопрос успешно обновлен!' : 'Вопрос успешно добавлен!');
            
            // Очищаем форму и обновляем список
            this.clearForm();
            await this.loadQuestions();
            this.renderQuestions();
            this.updateStats();
            this.switchSection('questions');
            
        } catch (error) {
            console.error('Ошибка сохранения вопроса:', error);
            alert(`Ошибка: ${error.message}`);
        }
    }
    
    async deleteQuestion(id) {
        if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/questions/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Ошибка удаления вопроса');
            }
            
            alert('Вопрос успешно удален!');
            await this.loadQuestions();
            this.renderQuestions();
            this.updateStats();
            
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert('Ошибка удаления вопроса');
        }
    }
    
    editQuestion(id) {
        const question = this.questions.find(q => q.id == id);
        if (!question) {
            alert('Вопрос не найден');
            return;
        }
        
        // Заполняем форму
        document.getElementById('question-id').value = question.id;
        document.getElementById('question-text').value = question.question;
        document.getElementById('option1').value = question.option1;
        document.getElementById('option2').value = question.option2;
        document.getElementById('option3').value = question.option3;
        document.getElementById('option4').value = question.option4;
        document.getElementById('correct-answer').value = question.correct_answer;
        document.getElementById('difficulty').value = question.difficulty;
        
        // Меняем заголовок
        document.getElementById('form-title').textContent = 'Редактировать вопрос';
        
        // Переходим к форме
        this.switchSection('add');
    }
    
    clearForm() {
        document.getElementById('add-question-form').reset();
        document.getElementById('question-id').value = '';
        document.getElementById('form-title').textContent = 'Добавить новый вопрос';
        document.getElementById('correct-answer').value = '1';
        document.getElementById('difficulty').value = '2';
    }
    
    filterQuestions(searchTerm) {
        const container = document.getElementById('questions-list');
        const allQuestions = container.querySelectorAll('.question-item');
        
        allQuestions.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    filterByDifficulty(difficulty) {
        const container = document.getElementById('questions-list');
        const allQuestions = container.querySelectorAll('.question-item');
        if (!difficulty) {
            allQuestions.forEach(item => {
                item.style.display = 'block';
            });
            return;
        }
        allQuestions.forEach(item => {
            const difficultyEl = item.querySelector('.difficulty');
            if (difficultyEl && difficultyEl.classList.contains(`level-${difficulty}`)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    async updateStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) {
                throw new Error('Ошибка загрузки статистики');
            }
            const stats = await response.json();
            document.getElementById('total-questions').textContent = stats.total_questions || 0;
            document.getElementById('easy-count').textContent = stats.easy_count || 0;
            document.getElementById('medium-count').textContent = stats.medium_count || 0;
            document.getElementById('hard-count').textContent = stats.hard_count || 0;    
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }   
    async testConnection() {
        try {
            const response = await fetch('/api/questions');
            if (response.ok) {
                alert('✅ Соединение с сервером установлено!');
            } else {
                alert('⚠️ Сервер отвечает с ошибкой');
            }
        } catch (error) {
            alert('❌ Не удалось подключиться к серверу');
        }
    }
}
// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});