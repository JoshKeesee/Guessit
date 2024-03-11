const socket = io();
let name = "",
  code = "",
  game = {};

socket.on("player joined", (player) => {
  if (player.name != name) return;
  document.querySelector("#stats #username").innerText = player.name;
  animateScore(player.points);
  setTimeout(() => {
    document.querySelector("#lobby").classList.remove("active");
    document.querySelector("#loading").classList.remove("active");
    document.querySelector("#fade").classList.remove("active");
  }, 3000);
});

socket.on("player left", (player, reason) => {
  if (player.name != name) return;
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
});

socket.on("question", (id) => {
  currQuestion = id;
  nextQuestion(id);
});

socket.on("player answered", (player) => {
  if (player.name != name) return;
  document.querySelector("#stats #username").innerText = player.name;
  animateScore(player.points);
});

const animateScore = (score) => {
  const scoreEl = document.querySelector("#stats #score");
  const easing = 0.3;
  let curr =
    parseInt(scoreEl.innerText.replace(/,/g, "").replace("$", "")) || 0;
  const update = () => {
    curr += (score - curr) * easing;
    scoreEl.innerText = ("$" + Math.round(curr).toString().withCommas())
      .replace("-", "-$")
      .replace("$-", "-");
    if (Math.abs(score - curr) < 1)
      scoreEl.innerText = ("$" + score.toString().withCommas())
        .replace("-", "-$")
        .replace("$-", "-");
    else requestAnimationFrame(update);
  };
  update();
};
