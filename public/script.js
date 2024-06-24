const socket = io();
let currentQuestionIndex = 0;
let currentQuiz = [];
let currentQuizId = null;

function joinLobby() {
    const username = document.getElementById('username').value;
    const lobbyId = document.getElementById('lobby-id').value;
    socket.emit('joinLobby', { lobbyId, username });
}

function createLobby() {
    document.getElementById('join-lobby').style.display = 'none';
    document.getElementById('create-lobby').style.display = 'block';
}

socket.on('joinedLobby', (lobbyId) => {
    document.getElementById('join-lobby').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('lobby-id-display').innerText = lobbyId;
});

socket.on('lobbyCreated', (lobbyId) => {
    document.getElementById('join-lobby').style.display = 'none';
    document.getElementById('create-lobby').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('lobby-id-display').innerText = lobbyId;
});

socket.on('updatePlayers', (players) => {
    const playersList = document.getElementById('players');
    playersList.innerHTML = '';
    players.forEach((player) => {
        const li = document.createElement('li');
        li.innerText = player.username;
        playersList.appendChild(li);
    });
});

function startQuiz() {
    const lobbyId = document.getElementById('lobby-id-display').innerText;
    socket.emit('startQuiz', lobbyId);
}

socket.on('startQuiz', (quiz) => {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    currentQuiz = quiz;
    currentQuestionIndex = 0;
    showQuestion();
});

function showQuestion() {
    const question = currentQuiz[currentQuestionIndex];
    document.getElementById('question').innerText = question.question;
    const answersList = document.getElementById('answers');
    answersList.innerHTML = '';
    question.answers.forEach((answer, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<button onclick="submitAnswer(${index})">${answer}</button>`;
        answersList.appendChild(li);
    });
}

function submitAnswer(answerIndex) {
    const lobbyId = document.getElementById('lobby-id-display').innerText;
    socket.emit('submitAnswer', lobbyId, answerIndex);
}

socket.on('playerAnswered', (playerId, answerIndex) => {
    console.log(`Player ${playerId} answered with ${answerIndex}`);
    nextQuestion();
});

function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        alert('Quiz finished!');
    }
}

socket.on('error', (message) => {
    alert(message);
});

// Quiz Builder
function addQuestion() {
    const questionsDiv = document.getElementById('questions');
    const questionDiv = document.createElement('div');
    questionDiv.classList.add('question');
    questionDiv.innerHTML = `
        <textarea placeholder="Enter question..."></textarea>
        <textarea placeholder="Enter answer 1..."></textarea>
        <textarea placeholder="Enter answer 2..."></textarea>
        <textarea placeholder="Enter answer 3..."></textarea>
        <textarea placeholder="Enter answer 4..."></textarea>
    `;
    questionsDiv.appendChild(questionDiv);
}

function saveQuiz() {
    const quizName = document.getElementById('quiz-name').value;
    const quizDescription = document.getElementById('quiz-description').value;
    const quizAuthor = document.getElementById('quiz-author').value;
    const quiz = buildQuiz();
    fetch('/saveQuiz', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quizName, quizDescription, quizAuthor, quiz })
    })
    .then(response => response.json())
    .then(data => {
        alert(`Quiz '${quizName}' saved with ID: ${data.quizId}`);
        window.location.href = '/';
    })
    .catch(error => {
        console.error('Error saving quiz:', error);
    });
}

function buildQuiz() {
    const questionsDiv = document.getElementById('questions');
    const questionDivs = questionsDiv.querySelectorAll('.question');
    const quiz = [];
    questionDivs.forEach((div) => {
        const textareas = div.querySelectorAll('textarea');
        const question = textareas[0].value;
        const answers = [];
        for (let i = 1; i < textareas.length; i++) {
            answers.push(textareas[i].value);
        }
        quiz.push({ question, answers });
    });
    return quiz;
}

function getQuizzes() {
    socket.emit('getQuizzes');
}

socket.on('quizzesList', (quizzes) => {
    const quizzesDiv = document.getElementById('quizzes');
    quizzesDiv.innerHTML = '';
    for (const quizId in quizzes) {
        if (quizzes.hasOwnProperty(quizId)) {
            const quiz = quizzes[quizId];
            const quizButton = document.createElement('button');
            quizButton.textContent = `${quiz.quizName} by ${quiz.quizAuthor}`;
            quizButton.onclick = () => {
                showQuizInfoPopup(quizId, quiz);
            };
            quizzesDiv.appendChild(quizButton);
        }
    }
});

function showQuizInfoPopup(quizId, quiz) {
    const popup = document.getElementById('quiz-info-popup');
    document.getElementById('quiz-info-name').innerText = quiz.quizName;
    document.getElementById('quiz-info-description').innerText = quiz.quizDescription;
    document.getElementById('quiz-info-author').innerText = quiz.quizAuthor;
    popup.style.display = 'block';

    currentQuizId = quizId;
}
function closeQuizInfoPopup() {
    const popup = document.getElementById('quiz-info-popup');
    popup.style.display = 'none';
}

function makeLobby() {
    const username = prompt('Enter your username:');
    if (username && currentQuizId) {
        socket.emit('createLobby', { quizId: currentQuizId, username });
    }
    closeQuizInfoPopup();
}