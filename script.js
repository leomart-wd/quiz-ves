document.addEventListener('DOMContentLoaded', initializeApp);

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
                button.addEventListener('click', () => startQuiz(button.dataset.testid));
            });

            reflectionModal = new bootstrap.Modal(document.getElementById('reflection-modal'));

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
                    if (q.type === 'open_ended' && q.model_answer && typeof q.model_answer === 'object') {
                        answerText = q.model_answer.summary + ' ' + q.model_answer.keywords.map(kw => kw.keyword + ' ' + kw.explanation).join(' ');
                    } else {
                        answerText = q.explanation || q.model_answer || '';
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
    
    function renderQuestions() {
        const quizForm = quizContainer.querySelector('#quiz-form');
        let formHTML = '';
        let questionCounter = 0;
        
        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            let helpButtonHTML = '';
            if (q.reflection_prompt) {
                helpButtonHTML = `
                    <button type="button" class="help-btn" data-reflection="${q.reflection_prompt}">
                        <img src="brain-help.jpg" alt="Aiuto">
                    </button>`;
            }
            
            formHTML += `<div class="question-block" id="q-block-${index}"><p class="question-text"><span>${questionCounter}. ${q.question}</span> ${helpButtonHTML}</p><div class="options-container">`;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    options.forEach(option => {
                        const optionId = `q-${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        formHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="q-${index}" id="${optionId}" value="${optionValue}" required><label class="form-check-label" for="${optionId}">${option}</label></div>`;
                    });
                    break;
                case 'short_answer':
                    formHTML += `<input type="text" class="form-control" name="q-${index}" placeholder="La tua risposta..." required>`;
                    break;
                case 'open_ended':
                    formHTML += `<textarea class="form-control" name="q-${index}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                    break;
            }
            formHTML += '</div></div>';
        });
        quizForm.innerHTML = formHTML;

        quizForm.querySelectorAll('.help-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); 
                const prompt = e.currentTarget.dataset.reflection;
                document.getElementById('reflection-modal-body').textContent = prompt;
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
            if ((input.type === 'radio' && input.checked) || (input.type !== 'radio' && input.value.trim() !== '')) {
                answeredNames.add(input.name);
            }
        });
        
        const answeredCount = answeredNames.size;
        quizContainer.querySelector('#progress-text').textContent = `Domande risposte: ${answeredCount} di ${totalQuestions}`;
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
            const inputElement = document.querySelector(`[name="q-${index}"]:checked`) || document.querySelector(`[name="q-${index}"]`);
            const userAnswer = inputElement ? inputElement.value.trim() : "";

            if (q.type !== 'open_ended') {
                const isCorrect = userAnswer.toLowerCase() === (q.answer || '').toString().toLowerCase();
                let resultClass = isCorrect ? 'correct' : 'incorrect';
                if (isCorrect) score++;
                
                resultsHTML += `<div class="result-item ${resultClass}"><p class="result-question">${questionCounter}. ${q.question}</p><p><strong>La tua risposta:</strong> ${userAnswer || "<em>Nessuna risposta</em>"}</p>${!isCorrect ? `<p class="result-explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>` : ''}</div>`;
            } else {
                let keywordsHTML = '';
                if (q.model_answer && q.model_answer.keywords) {
                    q.model_answer.keywords.forEach((kw, kw_index) => {
                        keywordsHTML += `<div class="form-check keyword-checklist-item"><input class="form-check-input" type="checkbox" id="kw-${index}-${kw_index}"><label class="form-check-label" for="kw-${index}-${kw_index}"><span>${kw.keyword}</span><i class="bi bi-info-circle-fill" data-bs-toggle="tooltip" data-bs-placement="top" title="${kw.explanation}"></i></label></div>`;
                    });
                }
                resultsHTML += `<div class="result-item open"><p class="result-question">${questionCounter}. ${q.question}</p><div class="row"><div class="col-md-6 mb-3 mb-md-0"><strong>La tua risposta:</strong><div class="user-answer-box">${userAnswer.replace(/</g, "<").replace(/>/g, ">") || "<em>Nessuna risposta</em>"}</div></div><div class="col-md-6"><strong>Concetti Chiave (autovalutazione):</strong><div class="keyword-summary">${q.model_answer ? q.model_answer.summary : ''}</div><div id="checklist-${index}">${keywordsHTML}</div><div class="progress mt-2" style="height: 10px;"><div class="progress-bar bg-success" id="progress-open-${index}" role="progressbar" style="width: 0%"></div></div></div></div></div>`;
            }
        });
        
        if (gradableCount > 0) {
            saveResult(currentTestId, score, gradableCount);
        }

        const scoreDisplay = gradableCount > 0 ? `${score} / ${gradableCount}` : "Test di Autovalutazione";
        const resultsPageHTML = `<div class="card-body p-md-5 p-4">
                <h2 class="text-center">${quizContainer.querySelector('.quiz-title-text').textContent} - Risultati</h2>
                <p class="text-center display-5 fw-bold my-4">${scoreDisplay}</p>
                <div class="mt-4">${resultsHTML}</div>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center mt-5">
                    <button id="back-to-menu-from-results-btn" class="btn btn-lg btn-secondary">Torna al Menù</button>
                    <button id="save-pdf-btn" class="btn btn-lg btn-danger"><i class="bi bi-file-earmark-pdf-fill"></i> Salva Risultati in PDF</button>
                </div>
            </div>`;
        
        resultsContainer.innerHTML = resultsPageHTML;
        resultsContainer.querySelector('#back-to-menu-from-results-btn').addEventListener('click', resetToMenu);
        resultsContainer.querySelector('#save-pdf-btn').addEventListener('click', generatePdf);


        new bootstrap.Tooltip(resultsContainer, { selector: '[data-bs-toggle="tooltip"]', trigger: 'hover', html: true });

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

    function generatePdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const resultsContent = resultsContainer.querySelector('.mt-4').innerText;
        const testTitle = resultsContainer.querySelector('h2').textContent;
        const score = resultsContainer.querySelector('p.display-5').textContent;

        doc.setFontSize(18);
        doc.text(testTitle, 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`Punteggio: ${score}`, 105, 30, { align: 'center' });
        doc.setFontSize(10);
        doc.text(resultsContent, 20, 45);
        
        doc.save(`risultati_${currentTestId}_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    function saveResult(testId, score, total) {
        const history = JSON.parse(localStorage.getItem('quizHistory')) || {};
        if (!history[testId]) history[testId] = [];
        history[testId].push({ score, total, percentage: total > 0 ? Math.round((score / total) * 100) : 0, date: new Date().toISOString() });
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    function viewHistory() {
        menuContainer.classList.add('d-none');
        historyContainer.classList.remove('d-none');
        
        const history = JSON.parse(localStorage.getItem('quizHistory')) || {};
        historyContent.innerHTML = '';

        if (Object.keys(history).length === 0) {
            historyContent.innerHTML = '<p class="text-center text-muted">Nessun risultato salvato.</p>';
            return;
        }

        Object.keys(allQuestionsData).forEach(testId => {
            if (!allQuestionsData[testId].filter) return;
            const testHistory = history[testId];
            const testTitle = document.querySelector(`[data-testid="${testId}"]`).textContent;
            
            let testHTML = `<div class="mb-5"><h3>${testTitle}</h3>`;
            if (!testHistory || testHistory.length === 0) {
                testHTML += '<p class="text-muted">Nessun tentativo registrato per questo test.</p>';
            } else {
                const canvasId = `chart-${testId}`;
                testHTML += `<div class="history-chart-container"><canvas id="${canvasId}"></canvas></div>`;
                testHTML += `<table class="table table-striped table-hover history-table"><thead><tr><th>Data</th><th>Punteggio</th><th>Percentuale</th></tr></thead><tbody>`;
                [...testHistory].reverse().slice(0, 10).forEach(result => {
                    const date = new Date(result.date);
                    testHTML += `<tr><td class="history-date">${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT')}</td><td><strong>${result.score} / ${result.total}</strong></td><td>${result.percentage}%</td></tr>`;
                });
                testHTML += '</tbody></table>';
            }
            testHTML += '</div><hr>';
            historyContent.innerHTML += testHTML;
        });

        Object.keys(history).forEach(testId => {
            if (history[testId] && history[testId].length > 0) {
                renderChart(testId, history[testId]);
            }
        });
    }

    function renderChart(testId, data) {
        const canvas = document.getElementById(`chart-${testId}`);
        if (!canvas) return;
        if (chartInstances[testId]) chartInstances[testId].destroy();

        const labels = data.map(r => new Date(r.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }));
        const percentages = data.map(r => r.percentage);

        chartInstances[testId] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Andamento Punteggio (%)',
                    data: percentages,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }

    function clearHistory() {
        if (confirm("Sei sicuro di voler cancellare TUTTO lo storico dei risultati? L'azione è irreversibile.")) {
            localStorage.removeItem('quizHistory');
            viewHistory();
        }
    }

    function resetToMenu() {
        quizContainer.classList.add('d-none');
        resultsContainer.classList.add('d-none');
        historyContainer.classList.add('d-none');
        menuContainer.classList.remove('d-none');
    }
    
    function handleBackToMenuDuringQuiz() {
        if (confirm("Sei sicuro di voler tornare al menù principale? Perderai i progressi di questo test.")) {
            resetToMenu();
        }
    }
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 3) {
            searchResultsContainer.innerHTML = '<p class="no-results">Scrivi almeno 3 caratteri per iniziare la ricerca.</p>';
            return;
        }

        const results = searchIndex.filter(item => item.text_to_search.includes(query));

        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p class="no-results">Nessun risultato trovato.</p>';
        } else {
            let resultsHTML = '';
            results.forEach(res => {
                const highlightedExplanation = res.explanation.replace(
                    new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'),
                    '<span class="highlight">$&</span>'
                );
                resultsHTML += `<div class="search-result-item"><p class="search-result-question">${res.question} <small class="text-muted">(${res.test})</small></p><p class="search-result-answer">${highlightedExplanation}</p></div>`;
            });
            searchResultsContainer.innerHTML = resultsHTML;
        }
    }
    
    function closeSearch() {
        searchOverlay.classList.add('d-none');
        document.body.style.overflow = '';
        searchInput.value = '';
        searchResultsContainer.innerHTML = '';
    }

    // Event Listeners
    viewHistoryBtn.addEventListener('click', viewHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    backToMenuFromHistoryBtn.addEventListener('click', resetToMenu);

    searchToggleBtn.addEventListener('click', () => { searchOverlay.classList.remove('d-none'); document.body.style.overflow = 'hidden'; searchInput.focus(); });
    searchCloseBtn.addEventListener('click', closeSearch);
    searchInput.addEventListener('input', performSearch);
    searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearch(); });

    if(tutorButton) {
        tutorButton.addEventListener('click', () => {
            window.open('https://chatgpt.com/g/g-68778387b31081918d876453face6087-tutor-ves', 'TutorVES', 'width=500,height=700');
        });
    }

    initializeApp();
});
