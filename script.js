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
