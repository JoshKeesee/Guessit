const socket = io();
const playerList = document.querySelector("#player-list");
const playerCount = document.querySelector("#player-count");
const startButton = document.querySelector("#start-button");
const fullscreen = document.querySelector("#fullscreen");
const mute = document.querySelector("#mute");
const music = new Audio();

fullscreen.onclick = () => {
    fullscreen.classList.toggle("active");
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
};

mute.onclick = () => {
    mute.classList.toggle("active");
    if (mute.classList.contains("active")) music.muted = true;
    else music.muted = false;
};

document.onfullscreenchange = () => {
    if (!document.fullscreenElement) fullscreen.classList.remove("active");
};

document.querySelector("#join-link").innerText = location.host + "/play";

socket.on("connect", () => {
    socket.emit("host join", room);
});

socket.on("player joined", (player) => {
    const p = document.createElement("div");
    p.classList.add("player");
    p.innerText = player.name;
    p.onclick = () => {
        socket.emit("remove player", player);
    };
    playerList.appendChild(p);
    playerCount.innerText = playerList.children.length + " Player" + (playerList.children.length == 1 ? "" : "s");
});

socket.on("player left", (player) => {
    for (const p of playerList.children) {
        if (p.innerText == player.name) {
            p.remove();
            break;
        }
    }
    playerCount.innerText = playerList.children.length + " Player" + (playerList.children.length == 1 ? "" : "s");
});