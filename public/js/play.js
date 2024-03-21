const socket = io();
const store = document.querySelector("#store");
const market = document.querySelector("#market");
const close = market.querySelector("#close");
const stock = document.querySelector("#stocks");
const stockMarket = document.querySelector("#stock-market");
const stockClose = stockMarket.querySelector("#close");
const gameFade = document.querySelector("#game #fade");
let name = "",
  code = "",
  game = {},
  powerups = {},
  stocks = {};

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
  Object.keys(powerups).forEach((k) => {
    const p = powerups[k];
    const mi = document.createElement("div");
    mi.id = k;
    mi.classList.add(...["market-item", p.color]);
    mi.dataset.item = k;
    const ds = document.createElement("div");
    ds.id = "description";
    const t = document.createElement("div");
    t.id = "title";
    t.innerText = p.name;
    ds.appendChild(t);
    ds.innerHTML += p.description;
    const dt = document.createElement("div");
    dt.id = "details";
    const c1 = document.createElement("div");
    const c = document.createElement("span");
    c.id = "current";
    c.classList.add(...["showy", "fast"]);
    c1.innerHTML = `
      <b>Current:</b><br>
      ${c.outerHTML} ${p.after}
    `;
    const div = document.createElement("div");
    div.id = "divider";
    const c2 = document.createElement("div");
    c2.id = "cont";
    const n = document.createElement("span");
    n.id = "next";
    n.classList.add(...["showy", "warm", "fast"]);
    c2.innerHTML = `
      <b>Next:</b><br>
      ${n.outerHTML} ${p.after}
    `;
    dt.appendChild(c1);
    dt.appendChild(div);
    dt.appendChild(c2);
    const b = document.createElement("div");
    b.id = "buy";
    b.classList.add(...["btn", "primary", "showy", "max-bold", "disabled"]);
    const pr = document.createElement("span");
    pr.id = "price";
    b.innerHTML = `Buy ${pr.outerHTML}`;
    mi.appendChild(ds);
    mi.appendChild(dt);
    mi.appendChild(b);
    document.querySelector("#market-items").appendChild(mi);
  });
  updateMpItems();
  updatePowerups(powerups);
  stocks = game.players.find((e) => e.name == name).stocks;
  createStocks(game.stocks, document.querySelector("#stocks.market-content"));
});

socket.on("stocks", (s) => {
  game.stocks = s;
  updateStocks(game.stocks, document.querySelector("#stocks.market-content"));
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
  const mpItems = document.querySelectorAll("#market .market-item");
  mpItems.forEach((e) => {
    const item = e.dataset.item;
    const ps = p[item].prices || [],
      ls = p[item].levels || [],
      l = p[item].level + 1;
    e.dataset.price = ps[l];
    animateScore(ps[l], e.querySelector("#price"));
    const max = l == ls.length;
    e.classList.toggle("max", max);
    let c = ls[l - 1],
      n = max ? c : ls[l];
    const x =
      item == "insurance"
        ? "%"
        : item == "streak" || item == "multiplier"
          ? "x"
          : "$";
    c = item == "insurance" ? 100 - c : c;
    n = item == "insurance" ? 100 - n : n;
    animateScore(c, e.querySelector("#current"), x);
    animateScore(n, e.querySelector("#next"), x);
    if (
      game.players.find((p) => p.name == name).points < ps[l] ||
      l == ls.length
    )
      e.querySelector("#buy").classList.add("disabled");
    else e.querySelector("#buy").classList.remove("disabled");
  });
};

close.onclick =
  stockClose.onclick =
  gameFade.onclick =
    (e) => {
      market.classList.remove("active");
      stockMarket.classList.remove("active");
      playSound("whoosh");
    };

store.onclick = () => {
  updatePowerups(powerups);
  market.classList.add("active");
  playSound("whoosh");
};

stock.onclick = () => {
  updateStocks(game.stocks, document.querySelector("#stocks.market-content"));
  stockMarket.classList.add("active");
  playSound("whoosh");
};

const updateMpItems = () => {
  const mpItems = document.querySelectorAll("#market .market-item");
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
};
