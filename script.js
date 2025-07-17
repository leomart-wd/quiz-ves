document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi del DOM (invariati)
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const historyContainer = document.getElementById('history-container');
    const numQuestionsInput = document.getElementById('num-questions');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const backToMenuFromHistoryBtn = document.getElementById('back-to-menu-from-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyContent = document.getElementById('history-content');

    let allQuestionsData = {};
    let currentTestId = '';
    let currentTestQuestions = [];
    let chartInstances = {};

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

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

    function startQuiz(testId) {
        currentTestId = testId;
        const questionPool = allQuestionsData[testId].filter(q => q.type !== 'header');
        
        const isRandomTest = (testId === 'test1' || testId === 'test2');
        if (isRandomTest) {
            const numQuestionsToSelect = parseInt(numQuestionsInput.value, 10);
            const maxQuestions = questionPool.length;
            if (numQuestionsToSelect > maxQuestions || numQuestionsToSelect < 1) {
                alert(`Per favore, scegli un numero di domande tra 1 e ${maxQuestions}.`);
                return;
            }
            const shuffledQuestions = shuffleArray([...questionPool]);
            currentTestQuestions = shuffledQuestions.slice(0, numQuestionsToSelect);
        } else {
            currentTestQuestions = questionPool; 
        }
        
        const testTitleText = document.querySelector(`[data-testid="${testId}"]`).textContent;
        renderQuizUI(testTitleText);

        menuContainer.classList.add('d-none');
        resultsContainer.classList.add('d-none');
        historyContainer.classList.add('d-none');
        quizContainer.classList.remove('d-none');
    }

    function renderQuizUI(title) {
        const quizHeaderHTML = `
            <div class="card-body p-md-5 p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="text-primary m-0">${title}</h2>
                    <button id="back-to-menu-during-quiz-btn" class="btn btn-sm btn-outline-secondary">Torna al Menù</button>
                </div>
                <div id="progress-container" class="mb-4">
                    <p id="progress-text" class="mb-1 text-center"></p>
                    <div class="progress" style="height: 10px;">
                        <div id="progress-bar-inner" class="progress-bar" role="progressbar"></div>
                    </div>
                </div>
                <form id="quiz-form"></form>
                <div class="d-grid mt-4">
                    <button id="submit-btn" class="btn btn-lg btn-warning">Verifica le Risposte</button>
                </div>
            </div>`;
            
        quizContainer.innerHTML = quizHeaderHTML;
        renderQuestions();
        
        quizContainer.querySelector('#back-to-menu-during-quiz-btn').addEventListener('click', handleBackToMenuDuringQuiz);
        quizContainer.querySelector('#submit-btn').addEventListener('click', handleSubmit);
        quizContainer.querySelector('#quiz-form').addEventListener('input', updateProgress);
    }
    
    function renderQuestions() {
        const quizForm = quizContainer.querySelector('#quiz-form');
        let formHTML = '';
        let questionCounter = 0;
        
        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            formHTML += `<div class="question-block" id="q-block-${index}"><p class="question-text">${questionCounter}. ${q.question}</p><div class="options-container">`;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    options.forEach(option => {
                        const optionId = `q-${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        formHTML += `
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="q-${index}" id="${optionId}" value="${optionValue}" required>
                                <label class="form-check-label" for="${optionId}">${option}</label>
                            </div>`;
                    });
                    break;
                case 'short_answer':
                    formHTML += `<input type="text" class="form-control" name="q-${index}" placeholder="La tua risposta..." required>`;
                    break;
                case 'open_ended':
                    formHTML += `<textarea class="form-control" name="q-${index}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                    break;
            }
            formHTML += '</div></div>';
        });
        quizForm.innerHTML = formHTML;
        updateProgress();
    }
    
    function updateProgress() {
        const totalQuestions = currentTestQuestions.length;
        const quizForm = quizContainer.querySelector('#quiz-form');
        if (!quizForm) return;

        const inputs = quizForm.querySelectorAll('input[type=text], input[type=radio], textarea');
        const answeredNames = new Set();
        
        inputs.forEach(input => {
            if ((input.type === 'radio' && input.checked) || (input.type !== 'radio' && input.value.trim() !== '')) {
                answeredNames.add(input.name);
            }
        });
        
        const answeredCount = answeredNames.size;
        quizContainer.querySelector('#progress-text').textContent = `Domande risposte: ${answeredCount} di ${totalQuestions}`;
        const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
        quizContainer.querySelector('#progress-bar-inner').style.width = `${progressPercentage}%`;
    }

    // ### NUOVA FUNZIONE HANDLESUBMIT ###
    function handleSubmit(e) {
        e.preventDefault();
        let score = 0;
        let resultsHTML = '';
        let questionCounter = 0;
        const gradableCount = currentTestQuestions.filter(q => q.type !== 'open_ended').length;

        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            const inputElement = document.querySelector(`[name="q-${index}"]:checked`) || document.querySelector(`[name="q-${index}"]`);
            const userAnswer = inputElement ? inputElement.value.trim() : "";

            if (q.type !== 'open_ended') {
                const isCorrect = userAnswer.toLowerCase() === q.answer.toString().toLowerCase();
                let resultClass = 'incorrect';
                if (isCorrect) {
                    score++;
                    resultClass = 'correct';
                }
                resultsHTML += `
                    <div class="result-item ${resultClass}">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <p><strong>La tua risposta:</strong> ${userAnswer || "<em>Nessuna risposta</em>"}</p>
                        ${!isCorrect ? `<p class="result-explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>` : ''}
                    </div>`;
            } else {
                // Nuova interfaccia per domande aperte
                let keywordsHTML = '';
                q.model_answer.keywords.forEach((kw, kw_index) => {
                    keywordsHTML += `
                        <div class="form-check keyword-checklist-item">
                            <input class="form-check-input" type="checkbox" id="kw-${index}-${kw_index}">
                            <label class="form-check-label" for="kw-${index}-${kw_index}">
                                ${kw.keyword}
                                <i class="bi bi-info-circle-fill" data-bs-toggle="tooltip" data-bs-placement="top" title="${kw.explanation}"></i>
                            </label>
                        </div>`;
                });

                resultsHTML += `
                    <div class="result-item open">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <div class="row">
                            <div class="col-md-6">
                                <strong>La tua risposta:</strong>
                                <div class="user-answer-box">${userAnswer || "<em>Nessuna risposta</em>"}</div>
                            </div>
                            <div class="col-md-6">
                                <strong>Concetti Chiave (autovalutazione):</strong>
                                <div class="keyword-summary">${q.model_answer.summary}</div>
                                <div id="checklist-${index}">${keywordsHTML}</div>
                                <div class="progress mt-2" style="height: 10px;">
                                    <div class="progress-bar bg-success" id="progress-open-${index}" role="progressbar" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }
        });
        
        if (gradableCount > 0) {
            saveResult(currentTestId, score, gradableCount);
        }

        const scoreDisplay = gradableCount > 0 ? `${score} / ${gradableCount}` : "Test di Autovalutazione";
        const resultsPageHTML = `
            <div class="card-body p-md-5 p-4">
                <h2 class="text-center">${quizContainer.querySelector('h2').textContent} - Risultati</h2>
                <p class="text-center display-5 fw-bold my-4">${scoreDisplay}</p>
                <div class="mt-4">${resultsHTML}</div>
                <div class="d-grid mt-5">
                    <button id="back-to-menu-from-results-btn" class="btn btn-lg btn-secondary">Torna al Menù</button>
                </div>
            </div>`;
        
        resultsContainer.innerHTML = resultsPageHTML;
        resultsContainer.querySelector('#back-to-menu-from-results-btn').addEventListener('click', resetToMenu);

        // Abilita i tooltip di Bootstrap
        const tooltipTriggerList = [].slice.call(resultsContainer.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Aggiungi event listener per le checklist di autovalutazione
        currentTestQuestions.forEach((q, index) => {
            if (q.type === 'open_ended') {
                const checklist = document.getElementById(`checklist-${index}`);
                checklist.addEventListener('change', () => {
                    const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
                    const checkedCount = checklist.querySelectorAll('input[type="checkbox"]:checked').length;
                    const progressPercentage = (checkedCount / checkboxes.length) * 100;
                    document.getElementById(`progress-open-${index}`).style.width = `${progressPercentage}%`;
                });
            }
        });

        quizContainer.classList.add('d-none');
        resultsContainer.classList.remove('d-none');
    }

    // Funzioni per lo storico (invariate)
    function saveResult(testId, score, total) { /* ... */ }
    function viewHistory() { /* ... */ }
    function renderChart(testId, data) { /* ... */ }
    function clearHistory() { /* ... */ }
    function resetToMenu() { /* ... */ }
    function handleBackToMenuDuringQuiz() { /* ... */ }

    // Event Listeners (invariati)
    viewHistoryBtn.addEventListener('click', viewHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    // Nota: gli altri event listener vengono aggiunti dinamicamente

    fetchQuestions();
});