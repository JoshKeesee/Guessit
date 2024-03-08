module.exports = (socket, next) => {
  socket.user = {
    room: null,
    name: null,
    id: null,
    socketId: socket.id,
    score: 0,
    history: [],
    isHost: false,
  };

  next();
};
