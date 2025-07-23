// Inizio script.js corretto

document.addEventListener('DOMContentLoaded', () => {
  const menuContainer = document.getElementById('menu-container');
  const quizContainer = document.getElementById('quiz-container');
  const resultsContainer = document.getElementById('results-container');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const historyContainer = document.getElementById('history-container');
  const searchInput = document.getElementById('search-input');
  const quizTitle = document.getElementById('quiz-title');
  const questionContainer = document.getElementById('question-container');
  const verifyButton = document.getElementById('verify-button');
  const backToMenuBtn = document.getElementById('back-to-menu-btn');
  const downloadPDFBtn = document.getElementById('download-pdf-btn');
  let currentQuiz = [];
  let currentAnswers = [];
  let currentIndex = 0;
  let quizData = {};
  let quizHistory = [];

  function initializeApp() {
    fetch('quiz.json')
      .then(response => response.json())
      .then(data => {
        quizData = data;
        document.querySelectorAll('.menu-btn').forEach(button => {
          button.addEventListener('click', () => {
            const testId = button.getAttribute('data-testid');
            startQuiz(testId);
          });
        });
      });
  }

  function startQuiz(testId) {
    currentQuiz = quizData[testId] || [];
    currentAnswers = new Array(currentQuiz.length).fill(null);
    currentIndex = 0;
    menuContainer.classList.add('d-none');
    quizContainer.classList.remove('d-none');
    resultsContainer.classList.add('d-none');
    showQuestion();
  }

  function showQuestion() {
    const question = currentQuiz[currentIndex];
    questionContainer.innerHTML = `<p>${question.domanda}</p>`;
    // altre logiche per il rendering (vero/falso, multiple, aperta)
  }

  function clearHistory() {
    quizHistory = [];
    historyContainer.innerHTML = '';
  }

  if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

  initializeApp();
});

// Fine script.js corretto
