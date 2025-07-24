document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const menuContainer = document.getElementById('menu-container');
  const quizContainer = document.getElementById('quiz-container');
  const resultsContainer = document.getElementById('results-container');
  const historyContainer = document.getElementById('history-container');
  const historyContent = document.getElementById('history-content');
  const viewHistoryBtn = document.getElementById('view-history-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const homeFab = document.getElementById('home-fab');
  const searchToggleBtn = document.getElementById('search-toggle-btn');
  const tutorButton = document.getElementById('tutor-button');
  const answerModal = new bootstrap.Modal(document.getElementById('answerModal'));
  const answerModalContent = document.getElementById('answer-modal-content');
  const reflectionModal = new bootstrap.Modal(document.getElementById('reflectionModal'));
  const reflectionModalContent = document.getElementById('reflection-modal-content');

  let allQuestionsData = {};
  let currentTestId = '';
  let currentTestQuestions = [];

  // Load quiz.json and build menu
  fetch('quiz.json')
    .then(r => r.json())
    .then(data => {
      allQuestionsData = data;
      buildMenu();
    });

  function buildMenu() {
    const testList = document.getElementById('test-list');
    testList.innerHTML = '';
    Object.keys(allQuestionsData).forEach(testId => {
      const btn = document.createElement('button');
      btn.className = 'menu-btn btn btn-outline-primary col-12 col-md-6';
      btn.textContent = `Test ${testId.replace(/test/i, '').toUpperCase()}`;
      btn.dataset.testid = testId;
      btn.onclick = () => startQuiz(testId);
      testList.appendChild(btn);
    });
  }

  // Floating Home FAB
  homeFab.addEventListener('click', () => {
    showMenu();
  });

  function showMenu() {
    menuContainer.classList.remove('d-none');
    quizContainer.classList.add('d-none');
    resultsContainer.classList.add('d-none');
    historyContainer.classList.add('d-none');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  // History
  viewHistoryBtn.addEventListener('click', () => {
    menuContainer.classList.add('d-none');
    quizContainer.classList.add('d-none');
    resultsContainer.classList.add('d-none');
    historyContainer.classList.remove('d-none');
    showHistory();
  });

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('quiz-history');
    showHistory();
  });

  function showHistory() {
    const history = JSON.parse(localStorage.getItem('quiz-history') || '[]');
    if (history.length === 0) {
      historyContent.innerHTML = '<p class="text-center text-muted">Nessun risultato precedente.</p>';
      return;
    }
    historyContent.innerHTML = history.map(h =>
      `<div class="card mb-2">
        <div class="card-body">
          <h5 class="card-title">${h.testName}</h5>
          <small class="text-muted">${h.date}</small>
          <div>${h.score !== undefined ? `Punteggio: <strong>${h.score}</strong>` : ''}</div>
          <details class="mt-2">
            <summary>Dettagli</summary>
            ${h.details}
          </details>
        </div>
      </div>`
    ).join('');
  }

  // Start Quiz
  function startQuiz(testId) {
    currentTestId = testId;
    currentTestQuestions = allQuestionsData[testId] || [];
    menuContainer.classList.add('d-none');
    quizContainer.classList.remove('d-none');
    resultsContainer.classList.add('d-none');
    historyContainer.classList.add('d-none');
    renderQuiz();
  }

  // Render Quiz
  function renderQuiz() {
    let html = '';
    currentTestQuestions.forEach((q, idx) => {
      if (q.type === 'header') {
        html += `<h2 class="mb-3">${q.question}</h2>`;
        return;
      }
      html += `<div class="card mb-4 question-block">
        <div class="card-body">
          <h5 class="card-title">${idx+1}. ${q.question}</h5>
          ${renderAnswerInput(q, idx)}
          <div class="d-flex align-items-center mt-3 gap-2">
            <button class="brain-btn quick-btn" data-index="${idx}" title="Risposta corretta">
              <img src="brain-help.jpg" alt="Brain Help">
            </button>
            <button class="help-btn quick-btn btn btn-outline-warning btn-sm" data-index="${idx}" title="Consiglio">
              <i class="bi bi-question-circle-fill"></i>
            </button>
          </div>
        </div>
      </div>`;
    });
    html += `<button id="submit-btn" class="btn btn-success btn-lg mt-3">Verifica le Risposte</button>`;
    quizContainer.innerHTML = html;

    // Attach brain-btn for correct answer modal
    document.querySelectorAll('.brain-btn').forEach(b => {
      b.addEventListener('click', e => {
        const idx = e.currentTarget.dataset.index;
        showCorrectAnswer(currentTestQuestions[idx]);
      });
    });

    // Attach help-btn for reflection/help modal
    document.querySelectorAll('.help-btn').forEach(b => {
      b.addEventListener('click', e => {
        const idx = e.currentTarget.dataset.index;
        showReflectionPrompt(currentTestQuestions[idx]);
      });
    });

    document.getElementById('submit-btn').addEventListener('click', handleSubmit);
  }

  function renderAnswerInput(q, idx) {
    if (q.type === 'open_ended') {
      return `<textarea class="form-control answer-input" data-index="${idx}" rows="3"></textarea>`;
    } else if (q.type === 'multiple_choice' && q.choices) {
      return q.choices.map((choice, ci) =>
        `<div class="form-check">
          <input class="form-check-input answer-input" type="radio" name="q${idx}" id="q${idx}c${ci}" value="${choice}" data-index="${idx}">
          <label class="form-check-label" for="q${idx}c${ci}">${choice}</label>
        </div>`).join('');
    } else {
      return '';
    }
  }

  function showReflectionPrompt(q) {
    let msg = q.reflection_prompt || "Nessun consiglio disponibile.";
    reflectionModalContent.innerHTML = `<div>${msg}</div>`;
    reflectionModal.show();
  }

  function showCorrectAnswer(q) {
    let html = '';
    if (q.model_answer) {
      if (typeof q.model_answer === 'object') {
        html += `<div><strong>Risposta corretta:</strong> ${q.model_answer.summary || ''}</div>`;
        if (q.model_answer.keywords && q.model_answer.keywords.length) {
          html += "<ul>";
          q.model_answer.keywords.forEach(kw =>
            html += `<li><strong>${kw.keyword}</strong>: ${kw.explanation}</li>`
          );
          html += "</ul>";
        }
      } else {
        html += `<div><strong>Risposta corretta:</strong> ${q.model_answer}</div>`;
      }
    } else if (q.explanation) {
      html += `<div>${q.explanation}</div>`;
    } else {
      html += `<div class="text-muted">Risposta non disponibile</div>`;
    }
    answerModalContent.innerHTML = html;
    answerModal.show();
  }

  function handleSubmit() {
    // Gather user answers
    const userAnswers = [];
    document.querySelectorAll('.answer-input').forEach(input => {
      const idx = input.dataset.index;
      if (!userAnswers[idx]) userAnswers[idx] = '';
      if (input.type === 'radio') {
        if (input.checked) userAnswers[idx] = input.value;
      } else {
        userAnswers[idx] = input.value;
      }
    });
    renderResults(userAnswers);
    saveHistory(userAnswers);
  }

  function renderResults(userAnswers) {
    let html = '<h2 class="mb-4">Risultati</h2>';
    let score = 0;
    currentTestQuestions.forEach((q, idx) => {
      if (q.type === 'header') return;
      let isCorrect = checkAnswer(q, userAnswers[idx]);
      if (isCorrect) score++;
      html += `<div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${idx+1}. ${q.question}</h5>
          <div><strong>La tua risposta:</strong> ${userAnswers[idx] ? userAnswers[idx] : '<em>Non risposto</em>'}</div>
          <div class="mt-2"><strong>Risposta corretta:</strong> ${formatCorrectAnswer(q)}</div>
          ${q.explanation ? `<div class="mt-2 text-muted">${q.explanation}</div>` : ''}
          ${isCorrect !== null ? `<div class="mt-2"><span class="badge bg-${isCorrect ? 'success' : 'danger'}">${isCorrect ? 'Corretto' : 'Errato'}</span></div>` : ''}
        </div>
      </div>`;
    });
    html += `<button class="btn btn-primary btn-lg mt-3" id="repeat-btn">Riprova Test</button>`;
    resultsContainer.innerHTML = html;
    quizContainer.classList.add('d-none');
    resultsContainer.classList.remove('d-none');
    document.getElementById('repeat-btn').addEventListener('click', () => startQuiz(currentTestId));
  }

  // Save History
  function saveHistory(userAnswers) {
    let details = '';
    let score = 0;
    currentTestQuestions.forEach((q, idx) => {
      if (q.type === 'header') return;
      let isCorrect = checkAnswer(q, userAnswers[idx]);
      if (isCorrect) score++;
      details += `<div><strong>${idx+1}. ${q.question}</strong><br>
        <span>Risposta: ${userAnswers[idx] ? userAnswers[idx] : '<em>Non risposto</em>'}</span><br>
        <span>Corretta: ${formatCorrectAnswer(q)}</span><br>
        <span>${isCorrect !== null ? (isCorrect ? 'Corretto' : 'Errato') : ''}</span></div><hr>`;
    });
    const histObj = {
      testName: `Test ${currentTestId.replace(/test/i,'').toUpperCase()}`,
      date: new Date().toLocaleString(),
      score,
      details
    };
    const history = JSON.parse(localStorage.getItem('quiz-history') || '[]');
    history.unshift(histObj);
    localStorage.setItem('quiz-history', JSON.stringify(history));
  }

  // Check correctness for MC questions
  function checkAnswer(q, userAns) {
    if (q.type === 'multiple_choice' && q.model_answer) {
      return userAns?.trim().toLowerCase() === q.model_answer.trim().toLowerCase();
    }
    if (q.type === 'open_ended' && q.model_answer && q.model_answer.keywords) {
      // Check if at least one keyword is present
      const answerText = userAns?.toLowerCase() || '';
      return q.model_answer.keywords.some(kw => answerText.includes(kw.keyword.toLowerCase()));
    }
    return null;
  }

  function formatCorrectAnswer(q) {
    if (q.model_answer) {
      if (typeof q.model_answer === 'object') {
        let html = `${q.model_answer.summary || ''}`;
        if (q.model_answer.keywords) {
          html += "<ul>";
          q.model_answer.keywords.forEach(kw =>
            html += `<li><strong>${kw.keyword}</strong>: ${kw.explanation}</li>`
          );
          html += "</ul>";
        }
        return html;
      } else {
        return q.model_answer;
      }
    }
    return '<em>Non disponibile</em>';
  }

  // Search & Tutor buttons (stub, for extension)
  searchToggleBtn.addEventListener('click', () => {
    alert('Funzione di ricerca non implementata in questa demo.');
  });

  tutorButton.addEventListener('click', () => {
    alert('Funzione Tutor non implementata in questa demo.');
  });

  // Initial state: show menu
  showMenu();
});
