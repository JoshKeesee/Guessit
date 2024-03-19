const socket = io();
const store = document.querySelector("#store");
const market = document.querySelector("#market");
const close = market.querySelector("#close");
const gameFade = document.querySelector("#game #fade");
const mpItems = document.querySelectorAll("#market .market-item");
let name = "",
  code = "",
  game = {},
  powerups = {};

socket.on("player joined", (player) => {
  if (player.name != name) return;
  const p = game.players?.find((e) => e.name == name);
  if (p) game.players[game.players.findIndex((e) => e.name == name)] = player;
  document.querySelector("#stats #username").innerText = player.name;
  animateScore(
    player.streak,
    document.querySelector("#stats #streak span"),
    "",
  );
  animateScore(player.points, document.querySelector("#stats #score"));
  setTimeout(() => {
    document.querySelector("#lobby").classList.remove("active");
    document.querySelector("#loading").classList.remove("active");
    document.querySelector("#fade").classList.remove("active");
  }, 3000);
});

socket.on("player left", (player, reason) => {
  if (player.name != name) return;
  const p = game.players?.find((e) => e.name == name);
  if (p)
    game.players[game.players.findIndex((e) => e.name == name)] = updateObject(
      p,
      player,
    );
  const url = new URL(location.href);
  url.searchParams.delete("code");
  history.replaceState(null, "", url);
  document.querySelector("#lobby").classList.add("active");
  document.querySelector("#loading").classList.remove("active");
  document.querySelector("#fade").classList.remove("active");
  joinPopup.style = "";
  joinBtn.onclick = checkCode;
  joinCode.type = "number";
  joinCode.placeholder = "Join Code";
  joinCode.disabled = false;
  joinCode.focus();
  document.querySelector(".error").innerText = "You were " + reason;
});

socket.on("game started", (data) => {
  game = data;
  document.querySelector("#play-lobby").classList.remove("active");
  powerups = game.settings.powerups;
  updatePowerups(powerups);
});

socket.on("question", (id) => {
  currQuestion = id;
  nextQuestion(id);
});

socket.on("player answered", (player) => {
  if (player.name != name) return;
  const p = game.players?.find((e) => e.name == name);
  if (p)
    game.players[game.players.findIndex((e) => e.name == name)] = updateObject(
      p,
      player,
    );
  document.querySelector("#stats #username").innerText = player.name;
  animateScore(player.points, document.querySelector("#stats #score"));
  animateScore(
    player.streak,
    document.querySelector("#stats #streak span"),
    "",
  );
});

const updatePowerups = (p) => {
  mpItems.forEach((e) => {
    const item = e.dataset.item;
    const ps = p[item].prices || [],
      ls = p[item].levels || [],
      l = p[item].level + 1;
    e.dataset.price = ps[l];
    animateScore(ps[l], e.querySelector("#price"));
    if (item != "stocks") {
      const max = l == ls.length;
      e.classList.toggle("max", max);
      let c = ls[l - 1],
        n = max ? c : ls[l];
      const x = item == "insurance" ? "%" : item == "multiplier" ? "x" : "$";
      c = item == "insurance" ? 100 - c : c;
      n = item == "insurance" ? 100 - n : n;
      animateScore(c, e.querySelector("#current"), x);
      animateScore(n, e.querySelector("#next"), x);
    }
    if (
      game.players.find((p) => p.name == name).points < ps[l] ||
      l == ls.length
    )
      e.querySelector("#buy").classList.add("disabled");
    else e.querySelector("#buy").classList.remove("disabled");
  });
};

store.onclick =
  close.onclick =
  gameFade.onclick =
    (e) => {
      updatePowerups(powerups);
      if (e.target.id != "fade") market.classList.toggle("active");
      else market.classList.remove("active");
      playSound("whoosh");
    };

mpItems.forEach((e) => {
  e.querySelector("#buy").onclick = () => {
    const item = e.dataset.item;
    const price = e.dataset.price;
    if (
      game.players.find((p) => p.name == name).points < price ||
      e.querySelector("#buy").classList.contains("disabled")
    )
      return;
    e.querySelector("#buy").classList.add("disabled");
    playSound("click2");
    socket.emit("buy item", item, (data) => {
      if (data.success) {
        playSound("bought");
        powerups[item] = data.player.powerups[item];
        const p = game.players.find((e) => e.name == name);
        game.players[game.players.findIndex((e) => e.name == name)] =
          updateObject(p, data.player);
        updatePowerups(powerups);
        animateScore(
          data.player.points,
          document.querySelector("#stats #score"),
        );
        animateScore(
          data.player.streak,
          document.querySelector("#stats #streak span"),
          "",
        );
      }
    });
  };
});
