module.exports = (socket, next) => {
  socket.user = {
    room: null,
    name: null,
    id: null,
    socketId: socket.id,
    score: 0,
    history: [],
    isReady: false,
    isPlaying: false,
    isHost: false,
  };

  next();
};
