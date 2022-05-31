const express = require('express');
const dotenv = require('dotenv');
const db = require('./config/db');
const redisClient = require('./config/redis');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
dotenv.config();

const viewRoutes = require('./routes/views');
const userRoutes = require('./routes/api/user');
const { newUser, removeUser } = require('./util/user');
const { createRoom, joinRoom, removeRoom } = require('./util/room');

const app = express();

const server = http.createServer(app);

db.connect((err) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Connected to MySQL db.');
});

app.use(cookieParser('MY_SECRET'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', viewRoutes);
app.use('/api', userRoutes);

const io = socketIO(server);
io.on('connection', (socket) => {
  socket.on('user-connected', (user, roomId = null, password = null) => {
    if (roomId) {
      redisClient.get(roomId, (err, reply) => {
        if (err) throw err;

        if (reply) {
          let room = JSON.parse(reply);

          if (room.gameStarted) {
            socket.emit('error', 'The room is full!');
            return;
          }

          if (room.password && (!password || room.password !== password)) {
            socket.emit(
              'error',
              'To join the room you need the correct password.'
            );
            return;
          }

          socket.join(roomId);
          newUser(socket.id, user, roomId);

          if (room.players[0].username === user.username) {
            return;
          }

          if (room.players[1] === null) {
            room.players[1] = user;
          }

          room.gameStarted = true;
          redisClient.set(roomId, JSON.stringify(room));
          socket.to(roomId).emit('game-started');

          redisClient.get('roomIndices', (err, reply) => {
            if (err) throw err;

            if (reply) {
              let roomIndices = JSON.parse(reply);
              redisClient.get('rooms', (err, reply) => {
                if (reply) {
                  let rooms = JSON.parse(reply);
                  rooms[roomIndices[roomId]] = room;
                  redisClient.set('rooms', JSON.stringify(rooms));
                }
              });
            }
          });
        } else {
          socket.emit('error', 'The room does not exist.');
        }
      });
    } else {
      newUser(socket.id, user);
    }
  });

  socket.on('get-game-details', (roomId, user) => {
    redisClient.get(roomId, (err, reply) => {
      if (err) throw err;

      if (reply) {
        let room = JSON.parse(reply);
        let details = { players: room.players, time: room.time };

        socket.emit('receive-game-details', details);
      }
    });
  });

  socket.on('send-total-rooms-and-users', () => {
    redisClient.get('total-users', (err, reply) => {
      if (err) throw err;

      let totalUsers = 0;
      let totalRooms = 0;
      let numberOfRooms = [0, 0, 0, 0];

      if (reply) {
        totalUsers = parseInt(reply);
      }

      redisClient.get('total-rooms', (err, reply) => {
        if (err) throw err;

        if (reply) {
          totalRooms = parseInt(reply);
        }

        redisClient.get('number-of-rooms', (err, reply) => {
          if (err) throw err;

          if (reply) {
            numberOfRooms = JSON.parse(reply);
          }

          socket.emit(
            'receive-number-of-rooms-and-users',
            numberOfRooms,
            totalRooms,
            totalUsers
          );
        });
      });
    });
  });

  socket.on('create-room', (roomId, time, user, password = null) => {
    redisClient.get(roomId, (err, reply) => {
      if (err) throw err;

      if (reply) {
        socket.emit('error', `Room with id ${roomId} already exists!`);
      } else {
        if (password) {
          createRoom(roomId, user, time, password);
        } else {
          createRoom(roomId, user, time);
        }

        socket.emit('room-created');
      }
    });
  });

  socket.on('join-room', (roomId, user, password = null) => {
    redisClient.get(roomId, (err, reply) => {
      if (err) throw err;

      if (reply) {
        let room = JSON.parse(reply);
        if (room.players[1] === null) {
          if (room.password && (!password || room.password !== password)) {
            socket.emit(
              'error',
              'To join the room, you need the correct password.'
            );

            return;
          }

          joinRoom(roomId, user);

          if (room.password && password !== '') {
            socket.emit('room-joined', roomId, password);
          } else {
            socket.emit('room-joined', roomId);
          }
        } else {
          socket.emit('error', 'The room is full!');
        }
      } else {
        socket.emit('error', `Room with id ${roomId} does not exist!`);
      }
    });
  });

  socket.on('join-random', (user) => {
    redisClient.get('rooms', (err, reply) => {
      if (err) throw err;

      if (reply) {
        let rooms = JSON.parse(reply);
        let room = rooms.find(
          (room) => room.players[1] === null && !room.password
        );

        if (room) {
          joinRoom(room.id, user);
          socket.emit('room-joined', room.id);
        } else {
          socket.emit('error', 'No room found!');
        }
      } else {
        socket.emit('error', 'No room found!');
      }
    });
  });

  socket.on('get-rooms', (rank) => {
    redisClient.get('rooms', (err, reply) => {
      if (err) throw err;

      if (reply) {
        let rooms = JSON.parse(reply);
        if (rank === 'all') {
          socket.emit('receive-rooms', rooms);
        } else {
          let filteredRooms = rooms.filter(
            (room) => room.players[0].user_rank === rank
          );
          socket.emit('receive-rooms', filteredRooms);
        }
      } else {
        socket.emit('receive-rooms', []);
      }
    });
  });

  socket.on('send-message', (message, user, roomId = null) => {
    if (roomId) {
      socket.to(roomId).emit('receive-message', message, user);
    } else {
      socket.broadcast.emit('receive-message', message, user, true);
    }
  });

  socket.on('disconnect', () => {
    let socketId = socket.id;
    redisClient.get(socketId, (err, reply) => {
      if (err) throw err;

      if (reply) {
        let user = JSON.parse(reply);

        if (user.room) {
          redisClient.get(user.room, (err, reply) => {
            if (err) throw err;

            if (reply) {
              let room = JSON.parse(reply);

              if (!room.gameFinished) {
                io.to(user.room).emit(
                  'error',
                  'The other player left the game'
                );
              }
            }
          });

          removeRoom(user.room, user.user_rank);
        }
      }
    });

    removeUser(socketId);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(5000, () => console.log(`Server is running on port: ${PORT}`));
