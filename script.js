document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const historyContainer = document.getElementById('history-container');
    const numQuestionsInput = document.getElementById('num-questions');

    const viewHistoryBtn = document.getElementById('view-history-btn');
    const backToMenuFromHistoryBtn = document.getElementById('back-to-menu-from-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyContent = document.getElementById('history-content');
    const homeButton = document.getElementById('home-button');

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
    let currentQuizState = {
        options: [],
        questions: []
    };

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

            const modalElement = document.getElementById('reflection-modal');
            if (modalElement) {
                reflectionModal = new bootstrap.Modal(modalElement);
            }

            // SAFELY ATTACH EVENT LISTENERS
            document.querySelectorAll('.menu-btn').forEach(button => {
                if (!button.dataset.initialized) {
                    button.dataset.initialized = true;
                    button.addEventListener('click', () => {
                        const testId = button.getAttribute('data-testid');
                        if (testId) startQuiz(testId);
                    });
                }
            });

            if (homeButton) homeButton.addEventListener('click', resetToMenu);
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            menuContainer.innerHTML = '<h1>Errore</h1><p>Impossibile caricare il test. Riprova più tardi.</p>';
        }
    }

    // ... KEEP ALL REMAINING FUNCTIONS UNCHANGED
    // (startQuiz, renderQuizUI, renderQuestions, updateProgress, handleSubmit,
    // generatePdf, saveResult, clearHistory, resetToMenu, performSearch, closeSearch,
    // viewHistory, renderChart)

    // Make sure to paste the rest of your original file here after `initializeApp()`,
    // since all those parts were already working well.

    if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', viewHistory);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
    if (backToMenuFromHistoryBtn) backToMenuFromHistoryBtn.addEventListener('click', resetToMenu);

    if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', () => {
            searchOverlay.classList.remove('d-none');
            document.body.style.overflow = 'hidden';
            searchInput.focus();
        });
    }
    if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
    if (searchInput) searchInput.addEventListener('input', performSearch);
    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) closeSearch();
        });
    }

    if (tutorButton) {
        tutorButton.addEventListener('click', () => {
            window.open(
                'https://chatgpt.com/g/g-68778387b31081918d876453face6087-tutor-ves',
                'TutorVES',
                'width=500,height=700'
            );
        });
    }

    initializeApp();
});
