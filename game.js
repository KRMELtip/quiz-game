class QuizGame {
    // Конструктор класса - инициализация основных свойств
    constructor() {
        this.questions = [];           // Массив вопросов из базы данных
        this.currentQuestionIndex = 0; // Индекс текущего вопроса
        this.score = 0;                // Текущий счет игрока
        this.totalQuestions = 0;       // Общее количество вопросов
        this.timer = 10;               // Время на ответ (в секундах)
        this.timerInterval = null;     // Идентификатор интервала таймера
        this.gameStarted = false;      // Флаг начала игры
        
        // Запускаем инициализацию при создании объекта
        this.init();
    }
    
    // Инициализация игры
    async init() {
        this.bindEvents(); // Привязываем обработчики событий
    }
    
    // Привязка обработчиков событий к элементам интерфейса
    bindEvents() {
        // Обработчик для кнопки "Начать игру"
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Обработчик для кнопки "Следующий вопрос"
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Обработчик для кнопки "Главная" в левом верхнем углу
        document.querySelector('.home-button').addEventListener('click', (e) => {
            // Если игра начата, спрашиваем подтверждение выхода
            if (this.gameStarted) {
                if (!confirm('Вы уверены, что хотите выйти в главное меню? Текущий прогресс будет потерян.')) {
                    e.preventDefault(); // Отменяем переход, если пользователь отказался
                }
            }
        });
    }
    
    // Начало новой игры
    async startGame() {
        try {
            this.gameStarted = true; // Устанавливаем флаг начала игры
            document.getElementById('startBtn').disabled = true; // Блокируем кнопку старта
            document.getElementById('result').innerHTML = ''; // Очищаем блок с результатом
            
            // Загружаем случайные вопросы с сервера (10 вопросов)
            const response = await fetch('/api/questions/random?count=10');
            
            // Проверяем успешность запроса
            if (!response.ok) {
                throw new Error('Не удалось загрузить вопросы');
            }
            
            // Преобразуем ответ в JSON и сохраняем вопросы
            this.questions = await response.json();
            this.totalQuestions = this.questions.length; // Сохраняем общее количество
            this.currentQuestionIndex = 0; // Сбрасываем индекс текущего вопроса
            this.score = 0; // Сбрасываем счет
            
            // Проверяем, есть ли вопросы в базе данных
            if (this.questions.length === 0) {
                alert('В базе данных нет вопросов. Добавьте вопросы в админ-панели.');
                document.getElementById('startBtn').disabled = false; // Разблокируем кнопку
                return; // Прерываем выполнение
            }
            
            // Обновляем отображение счета и счетчика вопросов
            this.updateScore();
            this.updateQuestionCounter();
            
            // Показываем первый вопрос
            this.showQuestion();
            
        } catch (error) {
            // Обработка ошибок при загрузке вопросов
            console.error('Ошибка загрузки вопросов:', error);
            alert('Ошибка загрузки вопросов. Проверьте подключение к серверу.');
            document.getElementById('startBtn').disabled = false; // Разблокируем кнопку
        }
    }
    
// Отображение текущего вопроса
showQuestion() {
    // Проверяем, не закончились ли вопросы
    if (this.currentQuestionIndex >= this.questions.length) {
        this.endGame(); // Завершаем игру
        return;
    }
    
    // Получаем текущий вопрос из массива
    const question = this.questions[this.currentQuestionIndex];
    
    // Отображаем текст вопроса
    document.getElementById('question-text').textContent = question.question;
    
    // Очищаем контейнер с вариантами ответов
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    // Создаем массив вариантов ответов из свойств вопроса
    const options = [question.option1, question.option2, question.option3, question.option4];
    
    // Создаем кнопки для каждого варианта ответа
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn'; // Базовый класс для стилизации
        button.innerHTML = option; // Текст варианта ответа
        button.dataset.index = index + 1; // Сохраняем индекс (1-4)
        
        // Добавляем обработчик клика на кнопку
        button.addEventListener('click', () => {
            this.checkAnswer(index + 1, question.correct_answer);
        });
        
        // Добавляем кнопку в контейнер
        optionsContainer.appendChild(button);
    });
    
    // Обновляем счетчик вопросов (например: "1/10")
    this.updateQuestionCounter();
    
    // Меняем текст кнопки "Следующий вопрос" на "Закончить игру" для последнего вопроса
    const nextBtn = document.getElementById('nextBtn');
    if (this.currentQuestionIndex === this.questions.length - 1) {
        nextBtn.textContent = 'Закончить игру';
        nextBtn.className = 'btn btn-finish'; // Добавляем специальный класс
    } else {
        nextBtn.textContent = 'Следующий вопрос';
        nextBtn.className = 'btn btn-secondary'; // Возвращаем обычный класс
    }
    
    // Сбрасываем и запускаем таймер для нового вопроса
    this.resetTimer();
    this.startTimer();
    
    // Блокируем кнопку "Следующий вопрос" до выбора ответа
    nextBtn.disabled = true;
}
    
    // Проверка выбранного ответа
    checkAnswer(selectedAnswer, correctAnswer) {
        // Останавливаем таймер (время вышло или ответ выбран)
        this.stopTimer();
        
        // Блокируем все кнопки с вариантами ответов
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(btn => {
            btn.disabled = true; // Запрещаем дальнейшие клики
            
            // Подсвечиваем правильный ответ зеленым цветом
            if (parseInt(btn.dataset.index) === correctAnswer) {
                btn.classList.add('correct');
            } 
            // Подсвечиваем выбранный неправильный ответ красным цветом
            else if (parseInt(btn.dataset.index) === selectedAnswer) {
                btn.classList.add('wrong');
            }
        });
        
        // Получаем текст правильного ответа для отображения
        const question = this.questions[this.currentQuestionIndex];
        const options = [question.option1, question.option2, question.option3, question.option4];
        const correctAnswerText = options[correctAnswer - 1]; // correctAnswer - номер от 1 до 4
        
        // Проверяем, правильный ли ответ выбрал пользователь
        if (selectedAnswer === correctAnswer) {
            this.score += 10; // Добавляем 10 очков за правильный ответ
            document.getElementById('result').innerHTML = `
                <div class="result-message correct">
                    <i class="fas fa-check-circle"></i>
                    Правильно! +10 очков
                </div>`;
        } else {
            // Показываем неправильный ответ и правильный вариант
            document.getElementById('result').innerHTML = `
                <div class="result-message wrong">
                    <i class="fas fa-times-circle"></i>
                    Неправильно! Правильный ответ: ${correctAnswerText}
                </div>`;
        }
        
        // Обновляем отображение счета на экране
        this.updateScore();
        
        // Разблокируем кнопку "Следующий вопрос"
        document.getElementById('nextBtn').disabled = false;
    }
    
    // Переход к следующему вопросу
    nextQuestion() {
        this.currentQuestionIndex++; // Увеличиваем индекс вопроса
        
        // Проверяем, есть ли еще вопросы
        if (this.currentQuestionIndex < this.questions.length) {
            this.showQuestion(); // Показываем следующий вопрос
            document.getElementById('result').innerHTML = ''; // Очищаем блок результата
        } else {
            this.endGame(); // Завершаем игру, если вопросы закончились
        }
    }
    
    // Запуск таймера для текущего вопроса
    startTimer() {
        this.timer = 10; // Устанавливаем начальное время (10 секунд)
        document.getElementById('timer').textContent = this.timer; // Отображаем время
        
        // Запускаем интервал, который уменьшает время каждую секунду
        this.timerInterval = setInterval(() => {
            this.timer--; // Уменьшаем время на 1 секунду
            document.getElementById('timer').textContent = this.timer; // Обновляем отображение
            
            // Если время вышло
            if (this.timer <= 0) {
                this.stopTimer(); // Останавливаем таймер
                this.handleTimeout(); // Обрабатываем ситуацию с истекшим временем
            }
        }, 1000); // Интервал в 1000 мс (1 секунда)
    }
    
    // Обработка ситуации, когда время на ответ вышло
    handleTimeout() {
        // Блокируем все кнопки с вариантами ответов
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(btn => {
            btn.disabled = true;
        });
        
        // Получаем текст правильного ответа для отображения
        const question = this.questions[this.currentQuestionIndex];
        const options = [question.option1, question.option2, question.option3, question.option4];
        const correctAnswerText = options[question.correct_answer - 1];
        
        // Показываем сообщение о том, что время вышло
        document.getElementById('result').innerHTML = `
            <div>
                <div style="font-size: 1.5em; margin-bottom: 10px;">
                    <i class="fas fa-clock"></i> Время вышло!
                </div>
                <div>Правильный ответ: ${correctAnswerText}</div>
                <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    Будьте быстрее в следующий раз!
                </div>
            </div>`;
        
        // Разблокируем кнопку "Следующий вопрос"
        document.getElementById('nextBtn').disabled = false;
    }
    
    // Остановка таймера
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval); // Очищаем интервал
            this.timerInterval = null; // Сбрасываем идентификатор
        }
    }
    
    // Сброс таймера к начальному значению
    resetTimer() {
        this.stopTimer(); // Останавливаем текущий таймер
        this.timer = 10; // Сбрасываем время
        document.getElementById('timer').textContent = this.timer; // Обновляем отображение
    }
    
    // Обновление отображения счета на экране
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    // Обновление счетчика вопросов (например: "3/10")
    updateQuestionCounter() {
        document.getElementById('question-counter').textContent = 
            `${this.currentQuestionIndex + 1}/${this.totalQuestions}`;
    }
    
// Завершение игры
endGame() {
    this.stopTimer(); // Останавливаем таймер
    this.gameStarted = false; // Сбрасываем флаг игры
    
    // Показываем сообщение о завершении игры
    document.getElementById('question-text').textContent = 'Игра завершена!';
    document.getElementById('options-container').innerHTML = ''; // Очищаем варианты ответов
    
    // Показываем финальный результат
    document.getElementById('result').innerHTML = `
        <div class="game-over">
            <p>Ваш результат: <strong>${this.score} очков</strong></p>
            <p>Правильных ответов: <strong>${Math.floor(this.score / 10)}/${this.totalQuestions}</strong></p>
        </div>`;
    
    // Возвращаем исходный текст и класс кнопке
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.textContent = 'Следующий вопрос';
    nextBtn.className = 'btn btn-secondary';
    nextBtn.disabled = true;
    
    // Разблокируем кнопку "Начать игру"
    document.getElementById('startBtn').disabled = false;
    }
}

// Инициализация игры при полной загрузке DOM-дерева
document.addEventListener('DOMContentLoaded', () => {
    new QuizGame(); // Создаем экземпляр игры
});