
function handleSubmit() {
    // codice originale

    // Mostra risposta corretta per ogni domanda
    currentTestQuestions.forEach((q, index) => {
        const resultBlock = document.getElementById(`result-q-${index}`);
        if (!resultBlock) return;
        let correctAnswer = '';
        if (q.type === 'open_ended' && q.model_answer) {
            if (typeof q.model_answer === 'object') {
                correctAnswer = q.model_answer.summary || '';
            } else {
                correctAnswer = q.model_answer;
            }
        } else if (q.answer) {
            correctAnswer = q.answer;
        }

        const explanation = q.explanation || '';
        const correctHTML = `<div class="text-success small mt-1"><strong>Risposta corretta:</strong> ${correctAnswer}</div>
                             <div class="text-muted small">${explanation}</div>`;
        resultBlock.insertAdjacentHTML('beforeend', correctHTML);
    });
}
