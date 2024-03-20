(() => {
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
        mute.forEach((el) => (el.muted = e.classList.contains("active")));
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
      l.querySelector(`.player[data-name="${player.name}"]`).remove();
      updateLeaderboard();
      addEvent(
        `<span class="player">${player.name}</span> left the game`,
        "danger",
      );
    }
  });

  socket.on("player answered", (data) => {
    const p = game.players.find((e) => e.name == data.name);
    if (!p) return;
    const prevRank = game.players
      .filter((e) => !e.isHost)
      .sort((a, b) => b.points - a.points)
      .findIndex((e) => e.name == p.name);
    p.points = data.points;
    const newRank = game.players
      .filter((e) => !e.isHost)
      .sort((a, b) => b.points - a.points)
      .findIndex((e) => e.name == p.name);
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

  socket.on("powerup", ({ item, player }) => {
    const p = player.powerups[item];
    const m = p.level == p.levels.length - 1;
    addEvent(
      `<span class="player">${player.name}</span> ${m ? "maxed out" : "upgraded"} <span class="powerup">${p.name}</span>${m ? "!" : ` to level ${p.level + 1}/${p.levels.length}`}`,
      m ? "success" : "info",
    );
  });

  socket.on("total earned", (s) => {
    const te = document.querySelector("#total-earned");
    animateScore(s, te, "$");
  });

  const createStocks = (s) => {
    const st = document.querySelector("#stocks");
    st.querySelector("#graph").innerHTML = "";
    const mh = Math.max(...s.map((e) => e.price));
    s.forEach((e) => {
      const g = document.createElement("div");
      g.dataset.name = e.name;
      g.dataset.price = e.price;
      g.classList.add("stock");
      g.style.height = `${(e.price / mh) * 100}%`;
      if (e.color) g.style.backgroundColor = e.color;
      const t = document.createElement("div");
      t.id = "text";
      const i = document.createElement("img");
      i.src = `/images/stocks/${e.name.toLowerCase()}.png`;
      t.appendChild(i);
      const p = document.createElement("div");
      p.id = "price";
      g.appendChild(p);
      g.appendChild(t);
      st.querySelector("#graph").appendChild(g);
      animateScore(e.price, p);
    });
  };
    

  socket.on("stocks", (s) => {
    const st = document.querySelector("#stocks");
    const g = st.querySelector("#graph");
    const c = g.children;
    if (c.length == 0) createStocks(s);
    const mh = Math.max(...s.map((e) => e.price));
    s.forEach((e, i) => {
      const h = (e.price / mh) * 100;
      const p = c[i];
      p.style.height = `${h}%`;
      if (e.price > p.dataset.price) p.classList.add("up");
      else if (e.price < p.dataset.price) p.classList.add("down");
      else p.classList.remove("up", "down");
      p.dataset.price = e.price;
      animateScore(e.price, p.querySelector("#price"));
    });
  });

  socket.on("game started", (data) => {
    game = data;
    document.querySelector("#content.lobby").classList.remove("active");
    document.querySelector("#content.game").classList.add("active");
    createStocks(game.stocks);
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
        e.insertBefore(p, e.firstChild);
      },
      {
        duration: 500,
        easing: "ease-in-out",
        reverse: true,
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
          animateScore(p.points, e.querySelector("#score"), "$");
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
})();
