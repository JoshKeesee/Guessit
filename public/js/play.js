const socket = io();
let name = "", code = "";

socket.on("player joined", (player) => {
    if (player.name != name) return;
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