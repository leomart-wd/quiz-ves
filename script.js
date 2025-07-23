document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi del DOM (quelli sempre presenti)
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const historyContainer = document.getElementById('history-container');
    const numQuestionsInput = document.getElementById('num-questions');

    const viewHistoryBtn = document.getElementById('view-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
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
    let reflectionModal;

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
                button.addEventListener('click', () => startQuiz(button.dataset.testid));
            });

            reflectionModal = new bootstrap.Modal(document.getElementById('reflection-modal'));
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            menuContainer.innerHTML = '<h1>Errore</h1><p>Impossibile caricare il test. Riprova più tardi.</p>';
        }
    }

    function buildSearchIndex() {
        // TODO: Implement search index build logic if needed
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

        // Defensive: handle testTitleText if element missing
        const testTitleElem = document.querySelector(`[data-testid="${testId}"]`);
        const testTitleText = testTitleElem ? testTitleElem.textContent : '';

        renderQuizUI(testTitleText);

        menuContainer.classList.add('d-none');
        resultsContainer.classList.add('d-none');
        historyContainer.classList.add('d-none');
        quizContainer.classList.remove('d-none');
    }

    function renderQuizUI(title) {
        // TODO: Implement render logic
    }

    function renderQuestions() {
        // TODO: Implement questions rendering
    }

    function updateProgress() {
        // TODO: Implement progress update
    }

    function handleSubmit(e) {
        // TODO: Implement submit handler
    }

    function generatePdf() {
        // TODO: Implement PDF generation
    }

    function saveResult(testId, score, total) {
        // TODO: Implement saving result
    }

    function viewHistory() {
        // TODO: Implement history view
    }

    function renderChart(testId, data) {
        // TODO: Implement chart rendering
    }

    function clearHistory() {
        // TODO: Implement history clear logic
    }

    function resetToMenu() {
        // TODO: Implement reset logic
    }

    function handleBackToMenuDuringQuiz() {
        // TODO: Implement back to menu logic during quiz
    }

    function performSearch() {
        // TODO: Implement search logic
    }

    function closeSearch() {
        if (searchOverlay) searchOverlay.classList.add('d-none');
        document.body.style.overflow = '';
        if (searchInput) searchInput.value = '';
        if (searchResultsContainer) searchResultsContainer.innerHTML = '';
    }

    // Event Listeners
    if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', viewHistory);
    const backBtnHistory = document.getElementById('back-to-menu-from-history-btn');
    if (backBtnHistory) backBtnHistory.addEventListener('click', resetToMenu);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    if (searchToggleBtn) searchToggleBtn.addEventListener('click', () => {
        if (searchOverlay) searchOverlay.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
        if (searchInput) searchInput.focus();
    });
    if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
    if (searchInput) searchInput.addEventListener('input', performSearch);
    if (searchOverlay) searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearch();
    });

    if (tutorButton) {
        tutorButton.addEventListener('click', () => {
            window.open('https://chatgpt.com/g/g-68778387b31081918d876453face6087-tutor-ves', 'TutorVES', 'width=500,height=700');
        });
    }

    initializeApp();
});
