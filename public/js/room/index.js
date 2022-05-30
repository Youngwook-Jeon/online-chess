// ================
// Game Variables
// ================

let user = null;

let search = window.location.split("&");

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
  roomId = search[0].split("=")[1];
  password = search[1].split("=")[1];
} else {
  roomId = search[0].split("=")[1];
}

// ================
// Functions
// ================

const fetchUserCallback = (data) => {
  user = data;

  if (password) {
    socket.emit("user-connected", user, roomId, password);
  } else {
    socket.emit("user-connected", user, roomId);
  }

  socket.emit("get-game-details", roomId, user);
}

fetchData("/api/user-info", fetchUserCallback);