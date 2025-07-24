document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi del DOM
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const historyContainer = document.getElementById('history-container');
    const numQuestionsInput = document.getElementById('num-questions');
    
    // Pulsanti e contenitori statici
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const backToMenuFromHistoryBtn = document.getElementById('back-to-menu-from-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyContent = document.getElementById('history-content');
    const homeButton = document.getElementById('home-button');
    
    // Elementi per la ricerca
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');

    // Elementi del Tutor
    const tutorButton = document.getElementById('tutor-button');

    let allQuestionsData = {};
    let searchIndex = [];
    let currentTestId = '';
    let currentTestQuestions = [];
    let chartInstances = {};
    let reflectionModal;

    // Funzione per mescolare un array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function initializeApp() {
        try {
            const response = await fetch('quiz.json');
            if (!response.ok) throw new Error('Network response was not ok');
            allQuestionsData = await response.json();
            
            buildSearchIndex(); 

            document.querySelectorAll('.menu-btn').forEach(button => {
                if (button) button.addEventListener('click', () => startQuiz(button.dataset.testid));
            });

            reflectionModal = new bootstrap.Modal(document.getElementById('reflection-modal'));

            // Add home button event listener
            if (homeButton) {
                homeButton.addEventListener('click', resetToMenu);
            }

        } catch (error) {
            console.error('Failed to fetch questions:', error);
            menuContainer.innerHTML = '<h1>Errore</h1><p>Impossibile caricare il test. Riprova più tardi.</p>';
        }
    }

    function buildSearchIndex() {
        searchIndex = [];
        Object.keys(allQuestionsData).forEach(testId => {
            if (!allQuestionsData[testId] || allQuestionsData[testId].length === 0) return;
            const testTitleButton = document.querySelector(`[data-testid="${testId}"]`);
            const testTitle = testTitleButton ? testTitleButton.textContent : 'Test Generico';
            
            allQuestionsData[testId].forEach(q => {
                if (q.type !== 'header') {
                    let answerText = '';
                    if (q.type === 'open_ended' && q.model_answer) {
                        if (typeof q.model_answer === 'string') {
                            answerText = q.model_answer;
                        } else {
                            answerText = q.model_answer.summary + ' ' + 
                                (q.model_answer.keywords ? 
                                    q.model_answer.keywords.map(kw => 
                                        kw.keyword + ' ' + kw.explanation
                                    ).join(' ') : 
                                '');
                        }
                    } else {
                        answerText = q.explanation || q.answer || '';
                    }
                    searchIndex.push({
                        question: q.question,
                        text_to_search: `${q.question} ${answerText}`.toLowerCase(),
                        explanation: answerText,
                        test: testTitle
                    });
                }
            });
        });
    }

    function startQuiz(testId) {
        currentTestId = testId;
        const questionPool = allQuestionsData[testId] ? allQuestionsData[testId].filter(q => q.type !== 'header') : [];
        
        if (questionPool.length === 0 && testId) {
            alert(`Attenzione: non ci sono domande disponibili per il test '${testId}'. Controlla il file quiz.json.`);
            return;
        }

        const isRandomTest = ['test1', 'test2', 'test5'].includes(testId);

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
                <div class="mb-4">
                    <h2 class="quiz-title-text">${title}</h2>
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
        
        quizContainer.querySelector('#submit-btn').addEventListener('click', handleSubmit);
        quizContainer.querySelector('#quiz-form').addEventListener('input', updateProgress);
    }

        function renderQuestions() {
        const quizForm = quizContainer.querySelector('#quiz-form');
        let formHTML = '';
        let questionCounter = 0;
        
        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            let helpButtonsHTML = '';
            
            // Add answer button with proper model answer content
            const answerText = q.type === 'open_ended' ? 
                (q.model_answer ? 
                    (typeof q.model_answer === 'string' ? 
                        q.model_answer : 
                        q.model_answer.summary
                    ) : ''
                ) : 
                (q.answer || '');
                
            helpButtonsHTML += `
                <button type="button" class="help-btn show-answer-btn" data-answer="${answerText}">
                    <i class="bi bi-check-circle-fill answer-icon"></i>
                </button>`;

            // Add reflection button if prompt exists
            if (q.reflection_prompt) {
                helpButtonsHTML += `
                    <button type="button" class="help-btn" data-reflection="${q.reflection_prompt}">
                        <i class="bi bi-question-circle-fill question-icon"></i>
                    </button>`;
            }
            
            formHTML += `
                <div class="question-block" id="q-block-${index}">
                    <p class="question-text">
                        <span>${questionCounter}. ${q.question}</span>
                        <span class="help-buttons">${helpButtonsHTML}</span>
                    </p>
                    <div class="options-container">`;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    options.forEach(option => {
                        const optionId = `q-${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        formHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="q-${index}" id="${optionId}" value="${optionValue}"><label class="form-check-label" for="${optionId}">${option}</label></div>`;
                    });
                    break;
                case 'short_answer':
                    formHTML += `<input type="text" class="form-control" name="q-${index}" placeholder="La tua risposta...">`;
                    break;
                case 'open_ended':
                    formHTML += `<textarea class="form-control" name="q-${index}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                    break;
            }
            formHTML += '</div></div>';
        });
        
        quizForm.innerHTML = formHTML;

        // Add event listeners for all help buttons
        quizForm.querySelectorAll('.help-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const reflectionPrompt = btn.dataset.reflection;
                const answer = btn.dataset.answer;
                
                document.getElementById('modal-title-text').textContent = 
                    reflectionPrompt ? 'Spunto di Riflessione' : 'Risposta Corretta';
                    
                document.getElementById('reflection-modal-body').textContent = 
                    reflectionPrompt || answer;
                    
                reflectionModal.show();
            });
        });

        updateProgress();
    }
    
    function updateProgress() {
        const totalQuestions = currentTestQuestions.length;
        const quizForm = quizContainer.querySelector('#quiz-form');
        if (!quizForm) return;

        const inputs = quizForm.querySelectorAll('input[type=text], input[type=radio], textarea');
        const answeredNames = new Set();
        
        inputs.forEach(input => {
            if ((input.type === 'radio' && input.checked) || 
                (input.type !== 'radio' && input.value.trim() !== '')) {
                answeredNames.add(input.name);
            }
        });
        
        const answeredCount = answeredNames.size;
        quizContainer.querySelector('#progress-text').textContent = 
            `Domande risposte: ${answeredCount} di ${totalQuestions}`;
        const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
        quizContainer.querySelector('#progress-bar-inner').style.width = `${progressPercentage}%`;
    }

    function handleSubmit(e) {
        e.preventDefault();
        let score = 0;
        let resultsHTML = '';
        let questionCounter = 0;
        const gradableCount = currentTestQuestions.filter(q => q.type !== 'open_ended').length;

        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            const inputElement = document.querySelector(`[name="q-${index}"]:checked`) || 
                               document.querySelector(`[name="q-${index}"]`);
            const userAnswer = inputElement ? inputElement.value.trim() : "";

            if (q.type !== 'open_ended') {
                const isCorrect = userAnswer.toLowerCase() === (q.answer || '').toString().toLowerCase();
                let resultClass = isCorrect ? 'correct' : 'incorrect';
                if (isCorrect) score++;
                
                resultsHTML += `
                    <div class="result-item ${resultClass}">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <p><strong>La tua risposta:</strong> ${userAnswer || "<em>Nessuna risposta</em>"}</p>
                        <p class="result-explanation"><strong>Risposta corretta:</strong> ${q.answer}</p>
                        ${q.explanation ? `<p class="result-explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>` : ''}
                    </div>`;
            } else {
                let modelAnswerHTML = '';
                if (q.model_answer) {
                    if (typeof q.model_answer === 'string') {
                        modelAnswerHTML = `
                            <div class="model-answer-section mt-3">
                                <strong>Risposta corretta:</strong>
                                <div class="model-answer-summary">${q.model_answer}</div>
                            </div>`;
                    } else {
                        modelAnswerHTML = `
                            <div class="model-answer-section mt-3">
                                <strong>Risposta corretta:</strong>
                                <div class="model-answer-summary">${q.model_answer.summary || ""}</div>`;
                        
                        if (q.model_answer.keywords && q.model_answer.keywords.length > 0) {
                            modelAnswerHTML += `
                                <div class="mt-2">
                                    <strong>Concetti chiave:</strong>
                                    <ul class="model-answer-keywords">`;
                            q.model_answer.keywords.forEach(kw => {
                                modelAnswerHTML += `
                                    <li><strong>${kw.keyword}</strong>: ${kw.explanation}</li>`;
                            });
                            modelAnswerHTML += `</ul></div>`;
                        }
                        modelAnswerHTML += `</div>`;
                    }
                }

                resultsHTML += `
                    <div class="result-item open">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <div class="row">
                            <div class="col-12">
                                <strong>La tua risposta:</strong>
                                <div class="user-answer-box">
                                    ${userAnswer ? userAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<em>Nessuna risposta</em>"}
                                </div>
                                ${modelAnswerHTML}
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
                <h2 class="text-center">${quizContainer.querySelector('.quiz-title-text').textContent} - Risultati</h2>
                <p class="text-center display-5 fw-bold my-4">${scoreDisplay}</p>
                <div class="mt-4">${resultsHTML}</div>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center mt-5">
                    <button id="save-pdf-btn" class="btn btn-lg btn-danger">
                        <i class="bi bi-file-earmark-pdf-fill"></i> Salva Risultati in PDF
                    </button>
                </div>
            </div>`;
        
        resultsContainer.innerHTML = resultsPageHTML;
        resultsContainer.querySelector('#save-pdf-btn').addEventListener('click', generatePdf);

        quizContainer.classList.add('d-none');
        resultsContainer.classList.remove('d-none');
    }


