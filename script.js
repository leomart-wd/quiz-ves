document.addEventListener('DOMContentLoaded', function() {

    // -------------------------------------------
    // 1. RIFERIMENTI AGLI ELEMENTI DEL DOM
    // -------------------------------------------
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const historyContainer = document.getElementById('history-container');
    const numQuestionsInput = document.getElementById('num-questions');
    
    // Pulsanti statici
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const backToMenuFromHistoryBtn = document.getElementById('back-to-menu-from-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyContent = document.getElementById('history-content');
    
    // Elementi per la ricerca
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');

    // Elementi del Tutor
    const tutorButton = document.getElementById('tutor-button');

    // Variabili di stato globali
    let allQuestionsData = {};
    let searchIndex = [];
    let currentTestId = '';
    let currentTestQuestions = [];
    let chartInstances = {};

    // -------------------------------------------
    // 2. FUNZIONI PRINCIPALI
    // -------------------------------------------

    // Funzione per mescolare un array (algoritmo di Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Funzione per caricare i dati e inizializzare l'app
    async function initializeApp() {
        try {
            const response = await fetch('quiz.json');
            if (!response.ok) throw new Error(`Network response was not ok. Status: ${response.status}`);
            allQuestionsData = await response.json();
            
            buildSearchIndex(); 

            // Aggiunge gli event listener ai pulsanti del menù
            document.querySelectorAll('.menu-btn').forEach(button => {
                button.addEventListener('click', () => startQuiz(button.dataset.testid));
            });
        } catch (error) {
            console.error('Failed to fetch and initialize app:', error);
            menuContainer.innerHTML = '<h1>Errore di Caricamento</h1><p>Impossibile caricare le domande dal file quiz.json. Controlla che il file sia presente e non contenga errori.</p>';
        }
    }

    // Funzione per costruire l'indice di ricerca
    function buildSearchIndex() {
        searchIndex = [];
        Object.keys(allQuestionsData).forEach(testId => {
            const testTitle = document.querySelector(`[data-testid="${testId}"]`)?.textContent || testId;
            allQuestionsData[testId].forEach(q => {
                if (q.type !== 'header') {
                    let answerText = q.explanation || (q.model_answer ? (q.model_answer.summary + ' ' + q.model_answer.keywords.map(kw => kw.keyword + ' ' + kw.explanation).join(' ')) : '');
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
    
    // Funzione per avviare un quiz
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

    // Funzione per mostrare l'interfaccia del quiz
    function renderQuizUI(title) {
        const quizHeaderHTML = `
            <div class="card-body p-md-5 p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="quiz-title-text">${title}</h2>
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
    
    // Funzione per mostrare le domande nel form
    function renderQuestions() {
        const quizForm = quizContainer.querySelector('#quiz-form');
        let formHTML = '';
        let questionCounter = 0;
        
        // Determina se mostrare i titoli di sezione (solo per test fissi)
        const showHeaders = (currentTestId === 'test3' || currentTestId === 'test4');
        const questionsToRender = showHeaders ? allQuestionsData[currentTestId] : currentTestQuestions;

        questionsToRender.forEach((q, index) => {
            if (q.type === 'header' && showHeaders) {
                formHTML += `<h3 class="section-header">${q.text}</h3>`;
                return;
            }
            if (q.type === 'header' && !showHeaders) return;

            questionCounter++;
            const originalIndex = allQuestionsData[currentTestId].indexOf(q);

            formHTML += `<div class="question-block" id="q-block-${originalIndex}"><p class="question-text">${questionCounter}. ${q.question}</p><div class="options-container">`;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    options.forEach(option => {
                        const optionId = `q-${originalIndex}-${option.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        formHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="q-${originalIndex}" id="${optionId}" value="${optionValue}" required><label class="form-check-label" for="${optionId}">${option}</label></div>`;
                    });
                    break;
                case 'short_answer':
                    formHTML += `<input type="text" class="form-control" name="q-${originalIndex}" placeholder="La tua risposta..." required>`;
                    break;
                case 'open_ended':
                    formHTML += `<textarea class="form-control" name="q-${originalIndex}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                    break;
            }
            formHTML += '</div></div>';
        });
        quizForm.innerHTML = formHTML;
        updateProgress();
    }
    
    // Funzione per aggiornare la barra di progresso
    function updateProgress() {
        const totalQuestions = currentTestQuestions.length;
        const quizForm = quizContainer.querySelector('#quiz-form');
        if (!quizForm) return;

        const inputs = quizForm.querySelectorAll('input, textarea');
        const answeredNames = new Set();
        
        inputs.forEach(input => {
            if (input.name && ((input.type === 'radio' && input.checked) || (input.type !== 'radio' && input.value.trim() !== ''))) {
                answeredNames.add(input.name);
            }
        });
        
        const answeredCount = answeredNames.size;
        quizContainer.querySelector('#progress-text').textContent = `Domande risposte: ${answeredCount} di ${totalQuestions}`;
        const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
        quizContainer.querySelector('#progress-bar-inner').style.width = `${progressPercentage}%`;
    }

    // Funzione per gestire l'invio e la correzione
    function handleSubmit(e) {
        e.preventDefault();
        let score = 0;
        let resultsHTML = '';
        let questionCounter = 0;
        const gradableCount = currentTestQuestions.filter(q => q.type !== 'open_ended').length;

        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            const originalIndex = allQuestionsData[currentTestId].indexOf(q);
            const inputElement = document.querySelector(`[name="q-${originalIndex}"]:checked`) || document.querySelector(`[name="q-${originalIndex}"]`);
            const userAnswer = inputElement ? inputElement.value.trim() : "";

            if (q.type !== 'open_ended') {
                const isCorrect = userAnswer.toLowerCase() === q.answer.toString().toLowerCase();
                let resultClass = isCorrect ? 'correct' : 'incorrect';
                if (isCorrect) score++;
                
                resultsHTML += `
                    <div class="result-item ${resultClass}">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <p><strong>La tua risposta:</strong> ${userAnswer.replace(/</g, "<").replace(/>/g, ">") || "<em>Nessuna risposta</em>"}</p>
                        ${!isCorrect ? `<p class="result-explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>` : ''}
                    </div>`;
            } else {
                let keywordsHTML = '';
                if (q.model_answer && q.model_answer.keywords) {
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
                }

                resultsHTML += `
                    <div class="result-item open">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <div class="row">
                            <div class="col-md-6 mb-3 mb-md-0">
                                <strong>La tua risposta:</strong>
                                <div class="user-answer-box">${userAnswer.replace(/</g, "<").replace(/>/g, ">") || "<em>Nessuna risposta</em>"}</div>
                            </div>
                            <div class="col-md-6">
                                <strong>Concetti Chiave (autovalutazione):</strong>
                                <div class="keyword-summary">${q.model_answer ? q.model_answer.summary : ''}</div>
                                <div id="checklist-${index}">${keywordsHTML}</div>
                                <div class="progress mt-2" style="height: 10px;">
                                    <div class="progress-bar bg-success" id="progress-open-${index}" role="progressbar" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }
        });
        
        if (gradableCount > 0 && currentTestId !== 'test4') {
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

        new bootstrap.Tooltip(document.body, { selector: '[data-bs-toggle="tooltip"]', html: true });

        currentTestQuestions.forEach((q, index) => {
            if (q.type === 'open_ended') {
                const checklist = document.getElementById(`checklist-${index}`);
                if(checklist) {
                    checklist.addEventListener('change', () => {
                        const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
                        const checkedCount = checklist.querySelectorAll('input[type="checkbox"]:checked').length;
                        const progressPercentage = (checkedCount / checkboxes.length) * 100;
                        document.getElementById(`progress-open-${index}`).style.width = `${progressPercentage}%`;
                    });
                }
            }
        });

        quizContainer.classList.add('d-none');
        resultsContainer.classList.remove('d-none');
    }
    
    function saveResult(testId, score, total) { /* ... */ }
    function viewHistory() { /* ... */ }
    function renderChart(testId, data) { /* ... */ }
    function clearHistory() { /* ... */ }

    function resetToMenu() {
        quizContainer.classList.add('d-none');
        resultsContainer.classList.add('d-none');
        historyContainer.classList.add('d-none');
        menuContainer.classList.remove('d-none');
        const quizForm = quizContainer.querySelector('#quiz-form');
        if (quizForm) quizForm.reset();
    }
    
    function handleBackToMenuDuringQuiz() {
        if (confirm("Sei sicuro di voler tornare al menù principale? Perderai i progressi di questo test.")) {
            resetToMenu();
        }
    }

    // --- Funzioni per la Ricerca Istantanea ---
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 3) {
            searchResultsContainer.innerHTML = '<p class="no-results p-3">Scrivi almeno 3 caratteri per iniziare la ricerca.</p>';
            return;
        }

        const results = searchIndex.filter(item => item.text_to_search.includes(query));

        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p class="no-results p-3">Nessun risultato trovato.</p>';
        } else {
            let resultsHTML = '';
            results.slice(0, 50).forEach(res => { // Limita a 50 risultati per performance
                const highlightedExplanation = res.explanation.replace(
                    new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), // Escape caratteri speciali per la regex
                    '<span class="highlight">$&</span>'
                );
                resultsHTML += `
                    <div class="search-result-item">
                        <div class="search-result-question">${res.question}</div>
                        <div class="search-result-answer">${highlightedExplanation}</div>
                        <div class="search-result-source">Fonte: ${res.test}</div>
                    </div>`;
            });
            searchResultsContainer.innerHTML = resultsHTML;
        }
    }
    
    function openSearch() {
        searchOverlay.classList.remove('d-none');
        document.body.style.overflow = 'hidden'; 
        searchInput.focus();
    }

    function closeSearch() {
        searchOverlay.classList.add('d-none');
        document.body.style.overflow = ''; 
        searchInput.value = '';
        searchResultsContainer.innerHTML = '';
    }

    // Event Listeners statici
    viewHistoryBtn.addEventListener('click', viewHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    backToMenuFromHistoryBtn.addEventListener('click', resetToMenu);
    searchToggleBtn.addEventListener('click', openSearch);
    searchCloseBtn.addEventListener('click', closeSearch);
    searchInput.addEventListener('input', performSearch);
    searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearch(); });

    if(tutorButton) {
        tutorButton.addEventListener('click', () => {
            window.open('https://chatgpt.com/g/g-68778387b31081918d876453face6087-tutor-ves', 'TutorVES', 'width=500,height=700,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
        });
    }

    initializeApp();
});
