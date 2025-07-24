






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
    let currentQuizState = {
        options: [],
        questions: []
    };



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

        // Initialize Bootstrap modal first
        reflectionModal = new bootstrap.Modal(document.getElementById('reflection-modal'));

        // Add event listeners after data is loaded
        const menuButtons = document.querySelectorAll('.menu-btn');
        if (menuButtons.length > 0) {
            menuButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const testId = button.getAttribute('data-testid');
                    if (testId) {
                        startQuiz(testId);
                    }
                });
            });
        }

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
    
    if (!questionPool || questionPool.length === 0) {
        alert(`Attenzione: non ci sono domande disponibili per il test '${testId}'. Controlla il file quiz.json.`);
        return;
    }

    const titleElement = document.querySelector(`[data-testid="${testId}"]`);
    if (!titleElement) {
        console.error(`Element with data-testid="${testId}" not found`);
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
    
    // Reset quiz state
    currentQuizState = {
        options: [],
        questions: [...currentTestQuestions]
    };
    
    const testTitleText = titleElement.textContent;
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

    function renderQuestions() {
        const quizForm = quizContainer.querySelector('#quiz-form');
        let formHTML = '';
        let questionCounter = 0;
        
        currentTestQuestions.forEach((q, index) => {
            questionCounter++;
            let helpButtonsHTML = '';
            
            // Add answer button with proper model answer content
     

let answerText = '';
if (q.type === 'open_ended') {
    answerText = q.model_answer ? 
        (typeof q.model_answer === 'string' ? 
            q.model_answer : 
            q.model_answer.summary
        ) : '';
} else {
    // For both true/false and multiple choice questions, show the actual answer
    answerText = q.answer || '';
}

// For true/false questions, convert 'true'/'false' to 'Vero'/'Falso' when displaying
if (q.type === 'true_false') {
    answerText = answerText.toLowerCase() === 'true' ? 'Vero' : 'Falso';
}

helpButtonsHTML += `
    <button type="button" class="help-btn show-answer-btn" data-answer="${answerText}">
        <i class="bi bi-check-circle-fill answer-icon"></i>
    </button>`;

            // Add reflection button if prompt exists
            if (q.reflection_prompt) {
                helpButtonsHTML += `
                    <button type="button" class="help-btn" data-reflection="${q.reflection_prompt}">
                        <i class="bi bi-question-circle-fill question-icon"></i>
                    </button>`;
            }



            formHTML += `
                <div class="question-block" id="q-block-${index}">
                    <p class="question-text">
                        <span>${questionCounter}. ${q.question}</span>
                        <span class="help-buttons">${helpButtonsHTML}</span>
                    </p>
                    <div class="options-container">`;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    // Store options in currentQuizState for PDF generation
                    currentQuizState.options[index] = options;
                    options.forEach(option => {
                        const optionId = `q-${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        formHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="q-${index}" id="${optionId}" value="${optionValue}"><label class="form-check-label" for="${optionId}">${option}</label></div>`;
                    });
                    break;
                case 'short_answer':
                    formHTML += `<input type="text" class="form-control" name="q-${index}" placeholder="La tua risposta...">`;
                    break;
                case 'open_ended':
                    formHTML += `<textarea class="form-control" name="q-${index}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                    break;
            }
            formHTML += '</div></div>';
        });
        
        quizForm.innerHTML = formHTML;

        // Add event listeners for all help buttons
        quizForm.querySelectorAll('.help-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const reflectionPrompt = btn.dataset.reflection;
                const answer = btn.dataset.answer;
                
                document.getElementById('modal-title-text').textContent = 
                    reflectionPrompt ? 'Spunto di Riflessione' : 'Risposta Corretta';
                    
                document.getElementById('reflection-modal-body').textContent = 
                    reflectionPrompt || answer;
                    
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
            if ((input.type === 'radio' && input.checked) || 
                (input.type !== 'radio' && input.value.trim() !== '')) {
                answeredNames.add(input.name);
            }
        });
        
        const answeredCount = answeredNames.size;
        quizContainer.querySelector('#progress-text').textContent = 
            `Domande risposte: ${answeredCount} di ${totalQuestions}`;
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
            const inputElement = document.querySelector(`[name="q-${index}"]:checked`) || 
                               document.querySelector(`[name="q-${index}"]`);
            const userAnswer = inputElement ? inputElement.value.trim() : "";

            if (q.type !== 'open_ended') {
                const isCorrect = userAnswer.toLowerCase() === (q.answer || '').toString().toLowerCase();
                let resultClass = isCorrect ? 'correct' : 'incorrect';
                if (isCorrect) score++;
                
                resultsHTML += `
                    <div class="result-item ${resultClass}">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <p><strong>La tua risposta:</strong> ${userAnswer || "<em>Nessuna risposta</em>"}</p>
                        <p class="result-explanation"><strong>Risposta corretta:</strong> ${q.answer}</p>
                        ${q.explanation ? `<p class="result-explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>` : ''}
                    </div>`;
            } else {
                let modelAnswerHTML = '';
                if (q.model_answer) {
                    if (typeof q.model_answer === 'string') {
                        modelAnswerHTML = `
                            <div class="model-answer-section mt-3">
                                <strong>Risposta corretta:</strong>
                                <div class="model-answer-summary">${q.model_answer}</div>
                            </div>`;
                    } else {
                        modelAnswerHTML = `
                            <div class="model-answer-section mt-3">
                                <strong>Risposta corretta:</strong>
                                <div class="model-answer-summary">${q.model_answer.summary || ""}</div>`;
                        
                        if (q.model_answer.keywords && q.model_answer.keywords.length > 0) {
                            modelAnswerHTML += `
                                <div class="mt-2">
                                    <strong>Concetti chiave:</strong>
                                    <ul class="model-answer-keywords">`;
                            q.model_answer.keywords.forEach(kw => {
                                modelAnswerHTML += `
                                    <li><strong>${kw.keyword}</strong>: ${kw.explanation}</li>`;
                            });
                            modelAnswerHTML += `</ul></div>`;
                        }
                        modelAnswerHTML += `</div>`;
                    }
                }

                resultsHTML += `
                    <div class="result-item open">
                        <p class="result-question">${questionCounter}. ${q.question}</p>
                        <div class="row">
                            <div class="col-12">
                                <strong>La tua risposta:</strong>
                                <div class="user-answer-box">
                                    ${userAnswer ? userAnswer.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<em>Nessuna risposta</em>"}
                                </div>
                                ${modelAnswerHTML}
                            </div>
                        </div>
                    </div>`;
            }
        });
        
        if (gradableCount > 0) {
            saveResult(currentTestId, score, gradableCount);
        }

        const scoreDisplay = gradableCount > 0 ? `${score} / ${gradableCount}` : "Test di Autovalutazione";
        const resultsPageHTML = `
            <div class="card-body p-md-5 p-4">
                <h2 class="text-center">${quizContainer.querySelector('.quiz-title-text').textContent} - Risultati</h2>
                <p class="text-center display-5 fw-bold my-4">${scoreDisplay}</p>
                <div class="mt-4">${resultsHTML}</div>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center mt-5">
                    <button id="save-pdf-btn" class="btn btn-lg btn-danger">
                        <i class="bi bi-file-earmark-pdf-fill"></i> Salva Risultati in PDF
                    </button>
                </div>
            </div>`;
        
        resultsContainer.innerHTML = resultsPageHTML;
        resultsContainer.querySelector('#save-pdf-btn').addEventListener('click', generatePdf);

        quizContainer.classList.add('d-none');
        resultsContainer.classList.remove('d-none');
    }



    function generatePdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const usableWidth = pageWidth - (margin * 2);
        
        // Set initial position
        let yPos = margin;
        
        // Get content
        const testTitle = resultsContainer.querySelector('h2').textContent;
        const score = resultsContainer.querySelector('p.display-5').textContent;
        const resultItems = resultsContainer.querySelectorAll('.result-item');
        
        // Add date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT');
        
        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(testTitle, usableWidth);
        titleLines.forEach(line => {
            doc.text(line, pageWidth / 2, yPos, { align: 'center' });
            yPos += 8;
        });
        
        // Date and Score
        yPos += 5;
        doc.setFontSize(11);
        doc.text(`Data: ${dateStr}`, margin, yPos);
        yPos += 8;
        doc.setFontSize(14);
        doc.text(`Punteggio: ${score}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        // Results
        doc.setFontSize(11);
        resultItems.forEach((item, index) => {
            // Check if we need a new page
            if (yPos > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }
            
            // Question number and text
            const questionEl = item.querySelector('.result-question');
            doc.setFont('helvetica', 'bold');
            const questionLines = doc.splitTextToSize(questionEl.textContent, usableWidth);
            questionLines.forEach(line => {
                doc.text(line, margin, yPos);
                yPos += 6;
            });
            
            // Print all available options if they exist in currentQuizState
            const options = currentQuizState.options[index];
            if (options && options.length > 0) {
                yPos += 2;
                doc.setFont('helvetica', 'bold');
                doc.text("Opzioni disponibili:", margin, yPos);
                yPos += 6;
                
                doc.setFont('helvetica', 'normal');
                options.forEach((optionText, optIndex) => {
                    const optionLine = `${optIndex + 1}) ${optionText}`;
                    const optionLines = doc.splitTextToSize(optionLine, usableWidth - 10);
                    optionLines.forEach(line => {
                        if (yPos > pageHeight - margin) {
                            doc.addPage();
                            yPos = margin;
                        }
                        doc.text(line, margin + 5, yPos);
                        yPos += 6;
                    });
                });
            }
            
            // User's answer
            yPos += 2;
            doc.setFont('helvetica', 'bold');
            doc.text("La tua risposta:", margin, yPos);
            yPos += 6;
            
            doc.setFont('helvetica', 'normal');
            const userAnswerBox = item.querySelector('.user-answer-box');
            if (userAnswerBox) {
                const userAnswerText = userAnswerBox.textContent.trim();
                const userAnswerLines = doc.splitTextToSize(userAnswerText, usableWidth - 5);
                userAnswerLines.forEach(line => {
                    if (yPos > pageHeight - margin) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin + 5, yPos);
                    yPos += 6;
                });
            }
            
            // Correct Answer and Explanation
            const explanationEl = item.querySelector('.result-explanation');
            if (explanationEl) {
                // Correct Answer
                yPos += 2;
                doc.setFont('helvetica', 'bold');
                doc.text("Risposta corretta:", margin, yPos);
                yPos += 6;
                
                doc.setFont('helvetica', 'normal');
                const answerText = explanationEl.textContent.split('Spiegazione:')[0].replace('Risposta corretta:', '').trim();
                const answerLines = doc.splitTextToSize(answerText, usableWidth - 5);
                answerLines.forEach(line => {
                    if (yPos > pageHeight - margin) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin + 5, yPos);
                    yPos += 6;
                });

                // Explanation if exists
                if (explanationEl.textContent.includes('Spiegazione:')) {
                    yPos += 2;
                    doc.setFont('helvetica', 'bold');
                    doc.text("Spiegazione:", margin, yPos);
                    yPos += 6;
                    
                    doc.setFont('helvetica', 'normal');
                    const explanationText = explanationEl.textContent.split('Spiegazione:')[1].trim();
                    const explanationLines = doc.splitTextToSize(explanationText, usableWidth - 5);
                    explanationLines.forEach(line => {
                        if (yPos > pageHeight - margin) {
                            doc.addPage();
                            yPos = margin;
                        }
                        doc.text(line, margin + 5, yPos);
                        yPos += 6;
                    });
                }
            }


            // Model Answer section for open-ended questions
            const modelAnswer = item.querySelector('.model-answer-section');
            if (modelAnswer) {
                const summary = modelAnswer.querySelector('.model-answer-summary');
                if (summary) {
                    const summaryLines = doc.splitTextToSize(summary.textContent, usableWidth - 5);
                    summaryLines.forEach(line => {
                        if (yPos > pageHeight - margin) {
                            doc.addPage();
                            yPos = margin;
                        }
                        doc.text(line, margin + 5, yPos);
                        yPos += 6;
                    });
                }
                
                // Keywords if they exist
                const keywords = modelAnswer.querySelectorAll('.model-answer-keywords li');
                if (keywords.length > 0) {
                    yPos += 2;
                    doc.setFont('helvetica', 'bold');
                    doc.text("Concetti chiave:", margin, yPos);
                    yPos += 6;
                    
                    doc.setFont('helvetica', 'normal');
                    keywords.forEach(keyword => {
                        const keywordLines = doc.splitTextToSize(keyword.textContent, usableWidth - 10);
                        keywordLines.forEach(line => {
                            if (yPos > pageHeight - margin) {
                                doc.addPage();
                                yPos = margin;
                            }
                            doc.text("• " + line, margin + 5, yPos);
                            yPos += 6;
                        });
                    });
                }
            }
            
            // Add some spacing between questions
            yPos += 10;
            
            // Draw a light separator line between questions
            if (index < resultItems.length - 1) {
                doc.setDrawColor(200);
                doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
            }
        });
        
        // Save the PDF
        const fileName = `risultati_${currentTestId}_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
    }

    function saveResult(testId, score, total) {
        const history = JSON.parse(localStorage.getItem('quizHistory')) || {};
        if (!history[testId]) history[testId] = [];
        history[testId].push({ 
            score, 
            total, 
            percentage: total > 0 ? Math.round((score / total) * 100) : 0, 
            date: new Date().toISOString() 
        });
        localStorage.setItem('quizHistory', JSON.stringify(history));
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
                resultsHTML += `
                    <div class="search-result-item">
                        <p class="search-result-question">${res.question} 
                            <small class="text-muted">(${res.test})</small>
                        </p>
                        <p class="search-result-answer">${highlightedExplanation}</p>
                    </div>`;
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

    if(tutorButton) {
        tutorButton.addEventListener('click', () => {
            window.open('https://chatgpt.com/g/g-68778387b31081918d876453face6087-tutor-ves', 'TutorVES', 'width=500,height=700');
        });
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
            testHTML += `<table class="table table-striped table-hover history-table">
                <thead><tr><th>Data</th><th>Punteggio</th><th>Percentuale</th></tr></thead><tbody>`;
            [...testHistory].reverse().slice(0, 10).forEach(result => {
                const date = new Date(result.date);
                testHTML += `
                    <tr>
                        <td class="history-date">
                            ${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT')}
                        </td>
                        <td><strong>${result.score} / ${result.total}</strong></td>
                        <td>${result.percentage}%</td>
                    </tr>`;
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

    
    
    initializeApp();
});
