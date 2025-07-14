document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi del DOM
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    
    const quizTitle = document.getElementById('quiz-title');
    const quizForm = document.getElementById('quiz-form');
    
    const progressText = document.getElementById('progress-text');
    const progressBarInner = document.getElementById('progress-bar-inner');
    
    const submitBtn = document.getElementById('submit-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    
    const resultsTitle = document.getElementById('results-title');
    const scoreText = document.getElementById('score-text');
    const resultsDetails = document.getElementById('results-details');

    let allQuestionsData = {};
    let currentTestQuestions = [];
    let gradableQuestionsCount = 0;

    // Carica il file JSON con tutte le domande
    async function fetchQuestions() {
        try {
            const response = await fetch('quiz.json');
            if (!response.ok) throw new Error('Network response was not ok');
            allQuestionsData = await response.json();
            document.querySelectorAll('.menu-btn').forEach(button => {
                button.addEventListener('click', () => startQuiz(button.dataset.testid));
            });
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            menuContainer.innerHTML = '<h1>Errore</h1><p>Impossibile caricare il test. Riprova più tardi.</p>';
        }
    }

    // Inizia un quiz specifico
    function startQuiz(testId) {
        currentTestQuestions = allQuestionsData[testId];
        gradableQuestionsCount = currentTestQuestions.filter(q => q.type !== 'header' && q.type !== 'open_ended').length;
        
        quizTitle.textContent = currentTestQuestions.find(q => q.type === 'header').text || `Test`;
        renderQuestions();

        menuContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        updateProgress(0);
    }

    // Renderizza le domande nel form
    function renderQuestions() {
        let formHTML = '';
        let questionCounter = 0;
        
        currentTestQuestions.forEach((q, index) => {
            if (q.type === 'header') {
                formHTML += `<h3 class="section-header">${q.text}</h3>`;
                return;
            }

            questionCounter++;
            formHTML += `
                <div class="question-block" id="q-block-${index}">
                    <p class="question-text">${q.question}</p>
                    <div class="options-container">
            `;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    options.forEach(option => {
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        formHTML += `
                            <div>
                                <input type="radio" name="q-${index}" id="q-${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}" value="${optionValue}" required>
                                <label for="q-${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}">${option}</label>
                            </div>
                        `;
                    });
                    break;
                case 'short_answer':
                    formHTML += `<input type="text" class="short-answer-input" name="q-${index}" placeholder="La tua risposta..." required>`;
                    break;
                case 'open_ended':
                    formHTML += `<textarea class="open-ended-input" name="q-${index}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                    break;
            }
            
            formHTML += '</div></div>';
        });

        quizForm.innerHTML = formHTML;
        
        // Aggiungi event listener per aggiornare la progress bar
        quizForm.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => {
                const answeredQuestions = Array.from(new Set(
                    Array.from(quizForm.querySelectorAll('input:checked, input[type=text][value!=""], textarea:not(:placeholder-shown)'))
                    .map(el => el.name)
                )).length;
                updateProgress(answeredQuestions);
            });
        });
    }

    function updateProgress(answeredCount) {
        const totalQuestions = currentTestQuestions.filter(q => q.type !== 'header').length;
        progressText.textContent = `Domanda ${answeredCount} di ${totalQuestions}`;
        const progressPercentage = (answeredCount / totalQuestions) * 100;
        progressBarInner.style.width = `${progressPercentage}%`;
    }

    // Controlla le risposte e mostra i risultati
    function handleSubmit() {
        let score = 0;
        let resultsHTML = '';

        currentTestQuestions.forEach((q, index) => {
            if (q.type === 'header') return;

            const questionBlock = document.getElementById(`q-block-${index}`);
            let userAnswer;
            const inputElement = document.querySelector(`[name="q-${index}"]:checked`) || document.querySelector(`[name="q-${index}"]`);
            userAnswer = inputElement ? inputElement.value.trim().toLowerCase() : "";

            let isCorrect = false;
            
            if (q.type !== 'open_ended') {
                isCorrect = userAnswer === q.answer.toString().toLowerCase();
                if (isCorrect) {
                    score++;
                }
            }

            // Prepara il HTML per i dettagli del risultato
            if(q.type !== 'open_ended'){
                resultsHTML += `
                    <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                        <p class="result-question">${q.question}</p>
                        <p><strong>La tua risposta:</strong> ${userAnswer || "<em>Nessuna risposta</em>"}</p>
                        ${!isCorrect ? `<p class="result-explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>` : ''}
                    </div>
                `;
            } else {
                 resultsHTML += `
                    <div class="result-item">
                        <p class="result-question">${q.question}</p>
                        <p><strong>La tua risposta:</strong> ${userAnswer || "<em>Nessuna risposta</em>"}</p>
                        <p class="result-explanation"><strong>Risposta Modello:</strong> ${q.model_answer}</p>
                    </div>
                `;
            }
        });

        resultsTitle.textContent = 'Riepilogo del Tuo Test';
        scoreText.textContent = `Punteggio: ${score} su ${gradableQuestionsCount}`;
        resultsDetails.innerHTML = resultsHTML;

        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    }

    function resetToMenu() {
        resultsContainer.classList.add('hidden');
        menuContainer.classList.remove('hidden');
    }
    
    // Event Listeners
    submitBtn.addEventListener('click', handleSubmit);
    backToMenuBtn.addEventListener('click', resetToMenu);

    // Inizia l'applicazione
    fetchQuestions();
});