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
    player.className = "player";
    p.innerText = player;
    playerList.appendChild(p);
    playerCount.innerText = playerList.children.length;
});