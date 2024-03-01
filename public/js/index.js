const socket = io();

const menu = document.querySelector("#menu");
const menuBtn = document.querySelector("#menu-btn");
const menuExit = document.querySelector("#menu-btn.exit");
const menuFade = document.querySelector("#menu-fade");

menuBtn.onclick =
  menuExit.onclick =
  menuFade.onclick =
    () => {
      menu.classList.toggle("toggled");
    };
