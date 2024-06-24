const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

let lobbies = {};
let quizzes = require('./quizzes/quizzes.json');

app.use(express.static('public'));
app.use(express.json());

app.get('/builder', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quiz-builder.html'));
});

app.post('/saveQuiz', (req, res) => {
    const { quizName, quizDescription, quizAuthor, quiz } = req.body;
    const quizId = Math.random().toString(36).substr(2, 5);
    quizzes[quizId] = { quizName, quizDescription, quizAuthor, quiz };
    saveQuizzesToFile();
    res.json({ quizId });
});

app.get('/quizzes', (req, res) => {
    res.json(quizzes);
});

// Socket.io logic
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('getQuizzes', () => {
        console.log(`Client ${socket.id} requested quizzes list.`);
        socket.emit('quizzesList', quizzes);
    });

    socket.on('createLobby', ({ quizId, username }) => {
        console.log(`Client ${socket.id} attempting to create lobby for quiz ID: ${quizId}`);
        if (quizzes[quizId]) {
            const lobbyId = generateLobbyId();
            lobbies[lobbyId] = { quiz: quizzes[quizId], players: [{ id: socket.id, username }] };
            socket.join(lobbyId);
            console.log(`Client ${socket.id} joined lobby ${lobbyId}`);
            socket.emit('lobbyCreated', lobbyId);
            io.to(lobbyId).emit('updatePlayers', lobbies[lobbyId].players);
            console.log(`Lobby ${lobbyId} created successfully.`);
        } else {
            console.log(`Quiz ID ${quizId} not found. Sending error to client.`);
            socket.emit('error', 'Quiz not found');
        }
    });

    socket.on('joinLobby', ({ lobbyId, username }) => {
        if (lobbies[lobbyId]) {
            socket.join(lobbyId);
            lobbies[lobbyId].players.push({ id: socket.id, username });
            socket.emit('joinedLobby', lobbyId);
            io.to(lobbyId).emit('updatePlayers', lobbies[lobbyId].players);
        } else {
            socket.emit('error', 'Lobby not found');
        }
    });

    socket.on('startQuiz', (lobbyId) => {
        if (lobbies[lobbyId]) {
            io.to(lobbyId).emit('startQuiz', lobbies[lobbyId].quiz);
        }
    });

    socket.on('submitAnswer', (lobbyId, answer) => {
        if (lobbies[lobbyId]) {
            io.to(lobbyId).emit('playerAnswered', socket.id, answer);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        for (const [lobbyId, lobby] of Object.entries(lobbies)) {
            lobby.players = lobby.players.filter((player) => player.id !== socket.id);
            io.to(lobbyId).emit('updatePlayers', lobby.players);
            if (lobby.players.length === 0) {
                delete lobbies[lobbyId];
            }
        }
    });
});

function saveQuizzesToFile() {
    fs.writeFile(path.join(__dirname, 'quizzes', 'quizzes.json'), JSON.stringify(quizzes, null, 2), (err) => {
        if (err) {
            console.error('Failed to save quizzes:', err);
        } else {
            console.log('Quizzes saved successfully.');
        }
    });
}
function generateLobbyId() {
    return Math.random().toString(36).substr(2, 5);
}

// Start the server
server.listen(port, () => console.log(`Server running on port ${port}`));
