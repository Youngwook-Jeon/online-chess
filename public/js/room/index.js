// ================
// DOM Elements
// ================
const room = document.getElementById('game-room');
const boxes = document.querySelectorAll('.box');
const playerLight = document.getElementById('player-light');
const playerBlack = document.getElementById('player-black');
const waitingMessage = document.getElementById('waiting-message');
const playerLightTimer = playerLight.querySelector('.timer');
const playerBlackTimer = playerBlack.querySelector('.timer');
const lightCapturedPieces = document.getElementById('light-captured-pieces');
const blackCapturedPieces = document.getElementById('black-captured-pieces');
// const piecesToPromoteContainer = document.getElementById("pieces-to-promote-container");
// const piecesToPromote = document.getElementById("pieces-to-promote");
// const gameOverMessageContainer = document.getElementById("game-over-message-container");
// const winnerUsername = gameOverMessageContainer.querySelector("p strong");
// const myScoreElement = document.getElementById("my-score");
// const enemyScoreElement = document.getElementById("enemy-score");

// ================
// Game Variables
// ================
let user = null;

let search = window.location.search.split('&');

let roomId = null;
let password = null;

let gameDetails = null;

let gameHasTimer = false;
let timer = null;
let myTurn = false;
let kingIsAttacked = false;
let pawnToPromotePosition = null;
let castling = null;

let gameOver = false;
let myScore = 0;
let enemyScore = 0;

let gameStartedAtTimestamp = null;

if (search.length > 1) {
  roomId = search[0].split('=')[1];
  password = search[1].split('=')[1];
} else {
  roomId = search[0].split('=')[1];
}

// ================
// Functions
// ================

const fetchUserCallback = (data) => {
  user = data;

  if (password) {
    socket.emit('user-connected', user, roomId, password);
  } else {
    socket.emit('user-connected', user, roomId);
  }

  socket.emit('get-game-details', roomId, user);
};

fetchData('/api/user-info', fetchUserCallback);

const displayChessPieces = () => {
  boxes.forEach((box) => {
    box.innerHTML = '';
  });

  lightPieces.forEach((piece) => {
    let box = document.getElementById(piece.position);

    box.innerHTML += `
      <div class="piece light" data-piece="${piece.piece}" data-points="${piece.points}">
        <img src="${piece.icon}" alt="Chess Piece">
      </div>
    `;
  });

  blackPieces.forEach((piece) => {
    let box = document.getElementById(piece.position);

    box.innerHTML += `
      <div class="piece black" data-piece="${piece.piece}" data-points="${piece.points}">
        <img src="${piece.icon}" alt="Chess Piece">
      </div>
    `;
  });
};

const updateTimer = () => {};

const timerEndedCallback = () => {};

const setCursor = (cursor) => {
  document.querySelectorAll(`.piece.${player}`).forEach((piece) => {
    piece.getElementsByClassName.cursor = cursor;
  });
};

const startGame = (user) => {
  playerBlack.querySelector('.username').innerText = playerTwo.username;

  waitingMessage.classList.add('hidden');
  playerBlack.classList.remove('hidden');

  displayChessPieces();
};

displayChessPieces();

// ================
// Socket Listeners
// ================

socket.on('receive-game-details', (details) => {
  gameDetails = details;
  let playerOne = gameDetails.players[0];
  gameHasTimer = gameDetails.time > 0;

  if (!gameHasTimer) {
    playerLightTimer.classList.add('hidden');
    playerBlackTimer.classList.add('hidden');
  } else {
    playerLightTimer.innerText = gameDetails.time + ':00';
    playerBlackTimer.innerText = gameDetails.time + ':00';
  }

  playerLight.querySelector('.username').innerText = playerOne.username;

  if (playerOne.username === user.username) {
    player = 'light';
    enemy = 'black';
    myTurn = true;
  } else {
    gameStartedAtTimestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    player = 'black';
    enemy = 'light';

    setCursor('default');
    startGame(user);
  }

  if (gameHasTimer) {
    timer = new Timer(
      player,
      roomId,
      gameDetails.time,
      0,
      updateTimer,
      timerEndedCallback
    );
  }

  hideSpinner();
  room.classList.remove('hidden');
});

socket.on('game-started', (playerTwo) => {
  gameStartedAtTimestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  startGame(playerTwo);

  if (gameHasTimer) {
    timer.start();
  }
});
