document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quiz-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultsContainer = document.getElementById('results-container');
    const scoreText = document.getElementById('score-text');
    let questionsData = [];

    // Carica le domande dal file JSON
    async function loadQuestions() {
        try {
            const response = await fetch('quiz.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            questionsData = await response.json();
            renderQuestions();
        } catch (error) {
            console.error('Errore nel caricamento delle domande:', error);
            quizForm.innerHTML = '<p style="color: red; text-align: center;">Impossibile caricare il test. Controlla che il file quiz.json sia presente e corretto.</p>';
        }
    }

    // Mostra le domande nella pagina
    function renderQuestions() {
        let quizHTML = '';
        questionsData.forEach((q, index) => {
            if (q.type === 'header') {
                quizHTML += `<h2 class="section-header">${q.text}</h2>`;
                return;
            }

            quizHTML += `<div class="question-block" id="q-block-${index}">`;
            quizHTML += `<p class="question-text">${q.question}</p>`;
            
            switch (q.type) {
                case 'multiple_choice':
                case 'true_false':
                    const options = q.type === 'true_false' ? ['Vero', 'Falso'] : q.options;
                    quizHTML += '<div class="options-container">';
                    options.forEach(option => {
                        const optionValue = q.type === 'true_false' ? (option === 'Vero' ? 'true' : 'false') : option;
                        quizHTML += `
                            <div>
                                <input type="radio" name="question-${index}" id="q${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}" value="${optionValue}" required>
                                <label for="q${index}-${option.replace(/[^a-zA-Z0-9]/g, '')}">${option}</label>
                            </div>
                        `;
                    });
                    quizHTML += '</div>';
                    break;

                case 'short_answer':
                    quizHTML += `<input type="text" name="question-${index}" class="short-answer-input" placeholder="Scrivi la tua risposta qui..." required>`;
                    break;
                
                case 'open_ended':
                     quizHTML += `<textarea class="open-ended-input" name="question-${index}" rows="4" placeholder="Spiega con parole tue..."></textarea>`;
                     quizHTML += `<div class="model-answer hidden" id="model-answer-${index}"><strong>Risposta Modello:</strong> ${q.model_answer}</div>`;
                    break;
            }
            quizHTML += '</div>';
        });
        quizForm.innerHTML = quizHTML;
    }

    // Gestisce l'invio e la correzione
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        let score = 0;
        let totalGradable = 0;

        questionsData.forEach((q, index) => {
            if (q.type === 'header') return; // Salta i titoli di sezione

            const questionBlock = document.getElementById(`q-block-${index}`);
            questionBlock.classList.remove('correct', 'incorrect');
            
            if (q.type !== 'open_ended') {
                totalGradable++;
                let userAnswer;
                if (q.type === 'short_answer') {
                    const input = document.querySelector(`input[name="question-${index}"]`);
                    userAnswer = input.value.trim().toLowerCase();
                } else {
                    const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
                    userAnswer = selectedOption ? selectedOption.value : null;
                }

                const correctAnswer = q.answer.toString().toLowerCase();
                if (userAnswer === correctAnswer) {
                    score++;
                    questionBlock.classList.add('correct');
                } else {
                    questionBlock.classList.add('incorrect');
                }
            } else {
                 document.getElementById(`model-answer-${index}`).classList.remove('hidden');
            }
        });
        
        // Mostra i risultati
        scoreText.textContent = `Hai risposto correttamente a ${score} su ${totalGradable} domande valutabili.`;
        resultsContainer.classList.remove('hidden');
        submitBtn.disabled = true;
        
        const firstResult = document.getElementById('results-container');
        if (firstResult) {
            firstResult.scrollIntoView({ behavior: 'smooth' });
        }
    });

    loadQuestions();
});