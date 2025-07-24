document.addEventListener('DOMContentLoaded', () => {
  const menuContainer = document.getElementById('menu-container');
  const quizContainer = document.getElementById('quiz-container');
  const resultsContainer = document.getElementById('results-container');
  const historyContainer = document.getElementById('history-container');
  const historyContent = document.getElementById('history-content');
  const homeFab = document.getElementById('home-fab');
  const answerModal = new bootstrap.Modal(document.getElementById('answerModal'));
  const answerModalContent = document.getElementById('answer-modal-content');
  let allQuestionsData = {};
  let currentTestId = '';
  let currentTestQuestions = [];

  // Remove all "back to menu" buttons from the quiz/results/history pages in your HTML!

  // Home FAB always returns to menu
  homeFab.addEventListener('click', () => {
    quizContainer.classList.add('d-none');
    resultsContainer.classList.add('d-none');
    historyContainer.classList.add('d-none');
    menuContainer.classList.remove('d-none');
    window.scrollTo({top: 0, behavior: 'smooth'});
  });

  // Load questions
  fetch('quiz.json')
    .then(r => r.json())
    .then(data => {
      allQuestionsData = data;
      // ... your menu setup code ...
      // For each .menu-btn, add click handler to start quiz
      document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => startQuiz(btn.dataset.testid));
      });
    });

  // Start quiz
  function startQuiz(testId) {
    currentTestId = testId;
    currentTestQuestions = allQuestionsData[testId] || [];
    menuContainer.classList.add('d-none');
    quizContainer.classList.remove('d-none');
    historyContainer.classList.add('d-none');
    resultsContainer.classList.add('d-none');
    renderQuiz();
  }

  function renderQuiz() {
    // Build the quiz UI...
    let html = '';
    currentTestQuestions.forEach((q, idx) => {
      if (q.type === 'header') {
        html += `<h2 class="mb-3">${q.question}</h2>`;
        return;
      }
      html += `<div class="card mb-4 question-block">
        <div class="card-body">
          <h5 class="card-title">${idx+1}. ${q.question}</h5>
          <!-- Answer input: adapt for q.type -->
          ${renderAnswerInput(q, idx)}
          <div class="d-flex align-items-center mt-3 gap-2">
            <button class="help-btn btn btn-outline-info btn-sm" data-index="${idx}" title="Consiglio">
              <i class="bi bi-lightbulb"></i>
            </button>
            <button class="show-answer-btn btn btn-outline-warning btn-sm" data-index="${idx}" title="Risposta corretta">
              <i class="bi bi-question-lg"></i>
            </button>
          </div>
        </div>
      </div>`;
    });
    html += `<button id="submit-btn" class="btn btn-success btn-lg mt-3">Verifica le Risposte</button>`;
    quizContainer.innerHTML = html;

    // Attach help button (existing logic)
    document.querySelectorAll('.help-btn').forEach(b => {
      b.addEventListener('click', e => {
        const idx = e.currentTarget.dataset.index;
        showReflectionPrompt(currentTestQuestions[idx]);
      });
    });

    // Attach new show-answer button
    document.querySelectorAll('.show-answer-btn').forEach(b => {
      b.addEventListener('click', e => {
        const idx = e.currentTarget.dataset.index;
        showCorrectAnswer(currentTestQuestions[idx]);
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
    // Show the reflection prompt logic (existing)
    // Use a Bootstrap modal or styled alert
    // For demo purposes, replace with an alert
    alert(q.reflection_prompt || "Nessun consiglio disponibile.");
  }

  function showCorrectAnswer(q) {
    // Show correct answer in modal
    let html = '';
    if (q.model_answer) {
      if (typeof q.model_answer === 'object') {
        html += `<div><strong>Risposta corretta:</strong> ${q.model_answer.summary}</div>`;
        if (q.model_answer.keywords) {
          html += "<ul>";
          q.model_answer.keywords.forEach(kw =>
            html += `<li><strong>${kw.keyword}</strong>: ${kw.explanation}</li>`
          );
          html += "</ul>";
        }
      } else {
        html += `<div>${q.model_answer}</div>`;
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
      if (!userAnswers[idx]) userAnswers[idx] = [];
      if (input.type === 'radio') {
        if (input.checked) userAnswers[idx] = input.value;
      } else {
        userAnswers[idx] = input.value;
      }
    });
    // Show results, including correct answers for ALL questions
    renderResults(userAnswers);
  }

  function renderResults(userAnswers) {
    let html = '<h2 class="mb-4">Risultati</h2>';
    currentTestQuestions.forEach((q, idx) => {
      if (q.type === 'header') return;
      html += `<div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${idx+1}. ${q.question}</h5>
          <div><strong>La tua risposta:</strong> ${userAnswers[idx] ? userAnswers[idx] : '<em>Non risposto</em>'}</div>
          <div class="mt-2"><strong>Risposta corretta:</strong> ${formatCorrectAnswer(q)}</div>
          ${q.explanation ? `<div class="mt-2 text-muted">${q.explanation}</div>` : ''}
        </div>
      </div>`;
    });
    html += `<button class="btn btn-primary btn-lg mt-3" id="repeat-btn">Riprova Test</button>`;
    resultsContainer.innerHTML = html;
    quizContainer.classList.add('d-none');
    resultsContainer.classList.remove('d-none');
    document.getElementById('repeat-btn').addEventListener('click', () => startQuiz(currentTestId));
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

  // ...Add other handlers for history page if needed...

  // Remove all "back to menu" buttons from existing pages in your HTML!
});
