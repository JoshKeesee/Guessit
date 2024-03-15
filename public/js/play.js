const socket = io();
const store = document.querySelector("#store");
const market = document.querySelector("#market");
const close = market.querySelector("#close");
const gameFade = document.querySelector("#game #fade");
const mpItems = document.querySelectorAll("#market .market-item");
let name = "",
  code = "",
  game = {},
  prices = {};

socket.on("player joined", (player) => {
  if (player.name != name) return;
  const p = game.players?.find((e) => e.name == name);
  if (p) game.players[game.players.findIndex((e) => e.name == name)] = player;
  document.querySelector("#stats #username").innerText = player.name;
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
  if (p) game.players[game.players.findIndex((e) => e.name == name)] = player;
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
  prices = game.settings.prices;
  updatePrices(prices);
});

socket.on("question", (id) => {
  currQuestion = id;
  nextQuestion(id);
});

socket.on("player answered", (player) => {
  if (player.name != name) return;
  const p = game.players?.find((e) => e.name == name);
  if (p) game.players[game.players.findIndex((e) => e.name == name)] = player;
  document.querySelector("#stats #username").innerText = player.name;
  animateScore(player.points, document.querySelector("#stats #score"));
  updatePrices(prices);
});

const updatePrices = (p) => {
  mpItems.forEach((e) => {
    const item = e.dataset.item;
    e.dataset.price = p[item];
    animateScore(p[item], e.querySelector("#price"));
    if (game.players.find((p) => p.name == name).points < p[item]) e.querySelector("#buy").classList.add("disabled");
    else e.querySelector("#buy").classList.remove("disabled");
  });
}

store.onclick = close.onclick = gameFade.onclick = (e) => {
  if (e.target.id != "fade") market.classList.toggle("active");
  else market.classList.remove("active");
  playSound("whoosh");
};

mpItems.forEach((e) => {
  e.querySelector("#buy").onclick = () => {
    const item = e.dataset.item;
    const price = e.dataset.price;
    if (game.players.find((p) => p.name == name).points < price || e.querySelector("#buy").classList.contains("disabled"))
      return;
    playSound("click2");
    socket.emit("buy item", item, price, (data, error) => {
      if (data.success) {
        playSound("bought");
        prices[item] *= game.settings.priceMultiplier;
        updatePrices(prices);
      } else alert(error);
    });
  };
});
