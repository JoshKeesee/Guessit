(() => {
  const socket = io();
  const playerList = document.querySelector("#player-list");
  const playerCount = document.querySelector("#player-count");
  const startButton = document.querySelector("#start-button");
  const endButton = document.querySelector("#end-button");
  const replayButton = document.querySelector("#replay-button");
  const fullscreen = document.querySelectorAll("#fullscreen");
  const mute = document.querySelectorAll("#mute");
  const music = new Audio();
  let req;

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

  const pa = (data) => {
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
    updateLeaderboard(prevRank != newRank);
  };

  socket.on("player answered", pa);

  socket.on("powerup", ({ item, player }) => {
    const p = player.powerups[item];
    const m = p.level == p.levels.length - 1;
    pa(player);
    addEvent(
      `<span class="player">${player.name}</span> ${m ? "maxed out" : "upgraded"} <span class="powerup">${p.name}</span>${m ? "!" : ` to level ${p.level + 1}/${p.levels.length}`}`,
      m ? "success" : "info",
    );
  });

  socket.on("total earned", (s) => {
    const te = document.querySelector("#total-earned");
    animateScore(s, te, "$", 0.1);
  });

  socket.on("stocks", (s) => {
    const st = document.querySelector("#stocks");
    updateStocks(s, st);
  });

  socket.on("stock spike", (s) => {
    const o = document.querySelector(".stock[data-name='" + s.name + "']")
      .dataset.price;
    addEvent(
      `<span class="stock" style="color: ${s.color || "var(--primary-color)"}">${s.name}</span> has spiked to 
      <span class="price">${s.price.toString().toScore("$")}</span> 
      (<span style="color: #00ff00">+${Math.floor(((s.price - o) / o) * 100)
        .toString()
        .withCommas()}%</span>)!`,
      "info",
    );
  });

  socket.on("stock crash", (s) => {
    const o = document.querySelector(".stock[data-name='" + s.name + "']")
      .dataset.price;
    addEvent(
      `
        <span class="stock" style="color: ${s.color || "var(--primary-color)"}">${s.name}</span> has crashed to 
        <span class="price">${s.price.toString().toScore("$")}</span> 
        (<span style="color: #ff0000">${Math.floor(((s.price - o) / o) * 100)
          .toString()
          .withCommas()}%</span>)!`,
      "danger",
    );
  });

  socket.on("stock market spike", () => {
    addEvent("The stock market has spiked!", "info");
  });

  socket.on("stock market crash", () => {
    addEvent("The stock market has crashed!", "danger");
  });

  socket.on("game started", (data) => {
    game = data;
    document.querySelector("#content.lobby").classList.remove("active");
    document.querySelector("#content.game").classList.add("active");
    document.querySelector("#content.ended").classList.remove("active");
    createStocks(game.stocks, document.querySelector("#stocks"));
    updateLeaderboard();
    addEvent("The game has started", "info");
  });

  socket.on("game ended", (data) => {
    game = data;
    document.querySelector("#content.lobby").classList.remove("active");
    document.querySelector("#content.game").classList.remove("active");
    document.querySelector("#content.ended").classList.add("active");
    const average = game.players.filter((e) => !e.isHost).map((e) => e.history).flat();
    const c = average.filter((e) => e.correct.includes(e.answer)).length;
    const i = average.filter((e) => !e.correct.includes(e.answer)).length;
    const a = ((c / (c + i)) || 0) * 100;
    const ac = document.querySelector("#accuracy");
    ac.dataset.correct = Math.floor(a);
    setTimeout(() => {
      ac.style.setProperty("--correct", Math.floor(a) + "%");
      animateScore(c, document.querySelector("#questions-correct .value"), "", 0.1);
      animateScore(i, document.querySelector("#questions-incorrect .value"), "", 0.1);
      animateScore(game.totalPointsEarned, document.querySelector("#total-earned .value"), "$", 0.1);
      animateScore(game.totalPointsLost, document.querySelector("#total-lost .value"), "$", 0.1);
    }, 1000);
    const leaderboard = game.players.filter((e) => !e.isHost).sort((a, b) => b.points - a.points);
    const l = document.querySelector("#leaderboard-stats #leaderboard");
    l.innerHTML = "";
    leaderboard.forEach((p, i) => {
      if (i <= 2) {
        const n = i == 0 ? "first" : i == 1 ? "second" : "third";
        const c = document.querySelector(`#top-3 #${n}`);
        c.querySelector(".name").innerText = p.name;
        animateScore(p.points, c.querySelector(".score"), "$", 0.1);
      } else {
        const c = createPlayer(p, false);
        c.dataset.rank = i + 1;
        l.appendChild(c);
      }
    });
  });

  socket.on("error", (e) => createError(e));

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

  const createPlayer = (p, a = true) => {
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
    s.innerText = p.points.toString().toScore("$");
    c.appendChild(n);
    c.appendChild(s);
    a && l.appendChild(c);
    return c;
  };

  const updateLeaderboard = (animate = true) => {
    const l = document.querySelector("#leaderboard");
    const a = () => {
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
    };
    if (animate) animateGrid(l, a, { duration: 1000, easing: "ease-in-out" });
    else a();
  };

  startButton.onclick = () => {
    socket.emit("start game", game);
  };

  endButton.onclick = () => {
    socket.emit("end game", game);
    cancelAnimationFrame(req);
  };

  replayButton.onclick = () => {
    window.location.reload();
  };

  const updateTime = () => {
    req = requestAnimationFrame(updateTime);
    if (!game.started || game.ended) return;
    const t = document.querySelector("#header #time");
    if (!t) return;
    const sd = new Date().getTime();
    const ed = new Date(game.endTime).getTime();
    const timeLeft = ed - sd;
    const m = Math.abs(Math.floor(timeLeft / 1000 / 60));
    const s = Math.abs(Math.floor((timeLeft / 1000) % 60));
    t.innerText = `${m}:${s < 10 ? "0" + s : s}`;
    if (timeLeft <= 0) {
      socket.emit("end game", game);
      return cancelAnimationFrame(req);
    }
  };

  updateTime();
})();
