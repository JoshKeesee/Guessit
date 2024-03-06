const menuSetup = () => {
  "use strict";
  const menu = document.querySelector("#menu");
  const menuBtn = document.querySelector("#menu-btn #menu-svg");
  const menuExit = document.querySelector("#menu-btn.exit #menu-svg");
  const menuFade = document.querySelector("#menu-fade");

  menuBtn.onclick =
    menuExit.onclick =
    menuFade.onclick =
      () => {
        menu.classList.toggle("toggled");
      };
};

window.addEventListener("load", menuSetup);
