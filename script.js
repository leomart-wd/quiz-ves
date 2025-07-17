document.addEventListener('DOMContentLoaded', function() {

    // -------------------------------------------
    // 1. RIFERIMENTI AGLI ELEMENTI DEL DOM
    // -------------------------------------------
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const historyContainer = document.getElementById('history-container');
    const numQuestionsInput = document.getElementById('num-questions');
    
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const backToMenuFromHistoryBtn = document.getElementById('back-to-menu-from-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyContent = document.getElementById('history-content');
    
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');

    const tutorButton = document.getElementById('tutor-button');

    let allQuestionsData = {};
    let searchIndex = [];
    let currentTestId = '';
    let currentTestQuestions = [];
    let chartInstances = {};

    // -------------------------------------------
    // 2. FUNZIONI
    // -------------------------------------------

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    function switchView(viewToShow) {
        [menuContainer, quizContainer, resultsContainer, historyContainer].forEach(container => {
            container.classList.add('d-none');
        });
        if (viewToShow) {
            viewToShow.classList.remove('d-none');
        }
    }

    async function initializeApp() {
        try {
            const response = await fetch('quiz.json');
            if (!response.ok) throw new Error(`Errore di rete: ${response.status}`);
            allQuestionsData = await response.json();
            buildSearchIndex();
        } catch (error) {
            console.error('Impossibile caricare il quiz:', error);
            menuContainer.innerHTML = '<h1>Errore</h1><p>Impossibile caricare i dati del test. Controlla il file quiz.json e la connessione.</p>';
        }
    }

    function buildSearchIndex() {
        searchIndex = [];
        Object.keys(allQuestionsData).forEach(testId => {
            const testTitle = document.querySelector(`[data-testid="${testId}"]`)?.textContent || testId;
            allQuestionsData[testId].forEach(q => {
                if (q.type !== 'header') {
                    let answerText = q.explanation || (q.model_answer && q.model_answer.summary ? (q.model_answer.summary + ' ' + q.model_answer.keywords.map(kw => kw.keyword + ' ' + kw.explanation).join(' ')) : '');
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
        switchView(quizContainer);
    }
    
    function renderQuizUI(title) {
        const quizHTML = `
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
        quizContainer.innerHTML = quizHTML;
        renderQuestions();
    }

    function renderQuestions() {
        const quizForm = quizContainer.querySelector('#quiz-form');
        let formHTML = '';
        let questionCounter = 0;
        
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

    function updateProgress() { /* ... Logica identica a prima ... */ }
    function handleSubmit(e) { /* ... Logica identica a prima, con la parte per le domande aperte ... */ }
    function saveResult(testId, score, total) { /* ... Logica identica a prima ... */ }
    function viewHistory() { /* ... Logica identica a prima ... */ }
    function renderChart(testId, data) { /* ... Logica identica a prima ... */ }
    function clearHistory() { /* ... Logica identica a prima ... */ }
    
    function resetToMenu() {
        switchView(menuContainer);
        const quizForm = quizContainer.querySelector('#quiz-form');
        if (quizForm) quizForm.reset();
    }
    
    function handleBackToMenuDuringQuiz() {
        if (confirm("Sei sicuro di voler tornare al menù principale? Perderai i progressi di questo test.")) {
            resetToMenu();
        }
    }

    // --- Funzioni di Ricerca (invariate) ---
    function performSearch() { /* ... Logica identica a prima ... */ }
    function openSearch() { /* ... Logica identica a prima ... */ }
    function closeSearch() { /* ... Logica identica a prima ... */ }
    
    // -------------------------------------------
    // 3. EVENT LISTENERS
    // -------------------------------------------
    
    // Aggiungo gli event listener agli elementi statici della pagina
    document.querySelectorAll('.menu-btn').forEach(button => {
        button.addEventListener('click', () => startQuiz(button.dataset.testid));
    });
    viewHistoryBtn.addEventListener('click', viewHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    backToMenuFromHistoryBtn.addEventListener('click', resetToMenu);

    searchToggleBtn.addEventListener('click', openSearch);
    searchCloseBtn.addEventListener('click', closeSearch);
    searchInput.addEventListener('input', performSearch); // 'input' è meglio di 'keyup' per la ricerca live
    searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearch(); });

    if(tutorButton) {
        tutorButton.addEventListener('click', () => {
            window.open('https://chatgpt.com/g/g-68778387b31081918d876453face6087-tutor-ves', 'TutorVES', 'width=500,height=700,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
        });
    }

    // Aggiungo gli event listener agli elementi che vengono creati dinamicamente (delega di eventi)
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'back-to-menu-during-quiz-btn') {
            handleBackToMenuDuringQuiz();
        }
        if (e.target && e.target.id === 'submit-btn') {
            handleSubmit(e);
        }
        if (e.target && e.target.id === 'back-to-menu-from-results-btn') {
            resetToMenu();
        }
    });

    document.body.addEventListener('input', function(e){
        if(e.target.closest('#quiz-form')){
            updateProgress();
        }
    });

    // Avvio dell'applicazione
    initializeApp();
});
