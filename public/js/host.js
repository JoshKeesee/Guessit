const socket = io();
const playerList = document.querySelector("#player-list");
const playerCount = document.querySelector("#player-count");
const startButton = document.querySelector("#start-button");
const endButton = document.querySelector("#end-button");
const fullscreen = document.querySelectorAll("#fullscreen");
const mute = document.querySelectorAll("#mute");
const music = new Audio();

fullscreen.forEach(
  (e) =>
    (e.onclick = () =>
      document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen()),
);

mute.forEach(
  (e) =>
    (e.onclick = () => {
      e.classList.toggle("active");
      if (mute.classList.contains("active")) music.muted = true;
      else music.muted = false;
    }),
);

document.onfullscreenchange = () => {
  fullscreen.forEach((e) =>
    e.classList.toggle("active", document.fullscreenElement != null),
  );
};

document.querySelector("#join-link").innerText = location.host + "/play";

socket.on("connect", () => {
  socket.emit("host join", game);
});

socket.on("player joined", (player) => {
  if (!game.started) {
    animateGrid(
      playerList,
      () => {
        const p = document.createElement("div");
        p.classList.add("player");
        p.innerText = player.name;
        p.onclick = () => {
          socket.emit("remove player", player);
        };
        playerList.appendChild(p);
        playerCount.innerText =
          playerList.children.length +
          " Player" +
          (playerList.children.length == 1 ? "" : "s");
      },
      {
        duration: 500,
        easing: "ease-in-out",
      },
    );
  } else {
    game.players.push(player);
    createPlayer(player);
    updateLeaderboard();
    addEvent(
      `<span class="player">${player.name}</span> joined the game`,
      "success",
    );
  }
});

socket.on("player left", (player) => {
  if (!game.started) {
    for (const p of playerList.children) {
      if (p.innerText == player.name) {
        p.remove();
        break;
      }
    }
    playerCount.innerText =
      playerList.children.length +
      " Player" +
      (playerList.children.length == 1 ? "" : "s");
  } else {
    const i = game.players.findIndex((e) => e.socketId == player.socketId);
    game.players.splice(i, 1);
    const l = document.querySelector("#leaderboard");
    l.querySelector(".player[data-name='" + player.name + "']").remove();
    updateLeaderboard();
    addEvent(
      `<span class="player">${player.name}</span> left the game`,
      "danger",
    );
  }
});

socket.on("player answered", (data) => {
  const p = game.players.find((e) => e.id == data.id);
  if (!p) return;
  const prevRank = game.players
    .filter((e) => !e.isHost)
    .sort((a, b) => b.points - a.points)
    .findIndex((e) => e.id == p.id);
  p.points = data.points;
  const newRank = game.players
    .filter((e) => !e.isHost)
    .sort((a, b) => b.points - a.points)
    .findIndex((e) => e.id == p.id);
  if (prevRank != newRank) {
    const d = newRank - prevRank;
    if (newRank == 0)
      addEvent(
        `<span class="player">${p.name}</span> overtook 1st place!`,
        "success",
      );
    else
      addEvent(
        `<span class="player">${p.name}</span> went ${d > 0 ? "down" : "up"} ${Math.abs(d)} place${Math.abs(d) == 1 ? "" : "s"}${d > 0 ? "" : "!"}`,
        d > 0 ? "danger" : "success",
      );
  }
  updateLeaderboard();
});

socket.on("total earned", (s) => {
  const te = document.querySelector("#total-earned");
  animateScore(s, te, 0.1);
});

socket.on("game started", (data) => {
  game = data;
  document.querySelector("#content.lobby").classList.remove("active");
  document.querySelector("#content.game").classList.add("active");
  updateLeaderboard();
  addEvent("The game has started", "info");
});

const addEvent = (text, c) => {
  const e = document.querySelector("#events");
  animateGrid(
    e,
    () => {
      const p = document.createElement("div");
      p.id = "event";
      p.innerHTML = text;
      if (c) p.classList.add(c);
      e.appendChild(p);
    },
    {
      duration: 500,
      easing: "ease-in-out",
    },
  );
};

const createPlayer = (p) => {
  const l = document.querySelector("#leaderboard");
  const c = document.createElement("div");
  c.classList.add("player");
  c.dataset.name = p.name;
  c.dataset.points = p.points;
  const n = document.createElement("div");
  n.id = "name";
  n.innerText = p.name;
  const s = document.createElement("div");
  s.id = "score";
  s.innerText = p.points.toString().toScore();
  c.appendChild(n);
  c.appendChild(s);
  l.appendChild(c);
  return c;
};

const updateLeaderboard = () => {
  const l = document.querySelector("#leaderboard");
  animateGrid(
    l,
    () => {
      const players = game.players
        .filter((e) => !e.isHost)
        .sort((a, b) => b.points - a.points);
      players.forEach((p, i) => {
        const e =
          l.querySelector(".player[data-name='" + p.name + "']") ||
          createPlayer(p);
        e.dataset.rank = i + 1;
        e.style.order = i;
        e.dataset.points = p.points;
        e.querySelector("#name").innerText = p.name;
        animateScore(p.points, e.querySelector("#score"), 0.1);
      });
    },
    {
      duration: 1000,
      easing: "ease-in-out",
    },
  );
};

startButton.onclick = () => {
  socket.emit("start game", game);
};