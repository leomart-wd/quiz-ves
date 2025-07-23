let currentTestQuestions = [];
let userAnswers = [];
let quizData = {};

document.addEventListener('DOMContentLoaded', () => {
  const menuButtons = document.querySelectorAll('.menu-btn');
  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const testId = btn.dataset.testid;
      startTest(testId);
    });
  });

  const verifyButton = document.getElementById('verify-button');
  if (verifyButton) verifyButton.addEventListener('click', handleSubmit);

  const backToMenuBtn = document.getElementById('back-to-menu-btn');
  if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => location.reload());

  fetch('quiz.json')
    .then(response => response.json())
    .then(data => {
      quizData = data;
    });
});

function startTest(testId) {
  currentTestQuestions = quizData[testId] || [];
  userAnswers = new Array(currentTestQuestions.length).fill(null);
  document.getElementById('menu-container').classList.add('d-none');
  document.getElementById('quiz-container').classList.remove('d-none');
  renderQuiz();
}

function renderQuiz() {
  const container = document.getElementById('question-container');
  container.innerHTML = '';
  currentTestQuestions.forEach((q, i) => {
    const qDiv = document.createElement('div');
    qDiv.classList.add('mb-4');
    qDiv.innerHTML = `<div class="fw-bold mb-2">${i + 1}. ${q.domanda}</div>`;
    if (q.type === 'true_false' || q.type === 'multiple_choice') {
      q.risposte.forEach((opt, idx) => {
        qDiv.innerHTML += `
          <div>
            <input type="radio" name="q${i}" value="${opt}" id="q${i}_${idx}">
            <label for="q${i}_${idx}">${opt}</label>
          </div>`;
      });
    } else if (q.type === 'open_ended') {
      qDiv.innerHTML += `<textarea class="form-control" data-qidx="${i}" rows="3"></textarea>`;
    }
    if (q.riflessiva) {
      qDiv.innerHTML += `
        <button type="button" class="help-btn btn btn-light border rounded-circle p-2" onclick="showReflective('${q.riflessiva}', this)">
          <img src="brain-help.jpg" alt="help" style="width:70px;height:70px;border-radius:50%;">
        </button>`;
    }
    qDiv.id = `result-q-${i}`;
    container.appendChild(qDiv);
  });
}

function showReflective(msg, el) {
  let balloon = document.createElement('div');
  balloon.textContent = msg;
  balloon.className = 'reflective-msg';
  balloon.style.position = 'absolute';
  balloon.style.backgroundColor = '#f9f9f9';
  balloon.style.border = '1px solid #ccc';
  balloon.style.padding = '8px';
  balloon.style.borderRadius = '8px';
  balloon.style.zIndex = '9999';
  document.body.appendChild(balloon);
  const rect = el.getBoundingClientRect();
  balloon.style.left = `${rect.left + window.scrollX}px`;
  balloon.style.top = `${rect.bottom + window.scrollY + 10}px`;

  const hide = () => balloon.remove();
  balloon.addEventListener('click', hide);
  document.addEventListener('click', hide, { once: true });
  document.addEventListener('scroll', hide, { once: true });
  setTimeout(hide, 10000);
}

function handleSubmit() {
  const container = document.getElementById('question-container');
  const inputs = container.querySelectorAll('input[type=radio]:checked, textarea');
  inputs.forEach(input => {
    const qIndex = parseInt(input.name?.replace('q', '') || input.dataset.qidx);
    if (input.type === 'radio') {
      userAnswers[qIndex] = input.value;
    } else {
      userAnswers[qIndex] = input.value.trim();
    }
  });

  document.getElementById('quiz-container').classList.add('d-none');
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.classList.remove('d-none');
  resultsContainer.innerHTML = '<h3>Risultati</h3>';

  currentTestQuestions.forEach((q, index) => {
    const userAnswer = userAnswers[index];
    const correctAnswer = q.answer || q.model_answer?.summary || q.model_answer;
    const isCorrect = Array.isArray(correctAnswer)
      ? correctAnswer.includes(userAnswer)
      : userAnswer === correctAnswer;

    const explanation = q.explanation || '';
    const block = document.createElement('div');
    block.className = 'mb-3';
    block.id = `result-q-${index}`;
    block.innerHTML = `
      <div class="${isCorrect ? 'text-success' : 'text-danger'} fw-bold">
        ${index + 1}. ${q.domanda}
      </div>
      <div><strong>Tua risposta:</strong> ${userAnswer || '<em>Non risposto</em>'}</div>
      <div class="text-success small mt-1"><strong>Risposta corretta:</strong> ${correctAnswer}</div>
      <div class="text-muted small">${explanation}</div>
      <hr>`;
    resultsContainer.appendChild(block);
  });
}
