const menuSetup = () => {
  "use strict";
  const menu = document.querySelector("#menu");
  const menuBtn = document.querySelector("#menu-btn #menu-svg") || {};
  const menuExit = document.querySelector("#menu-btn.exit #menu-svg") || {};
  const menuFade = document.querySelector("#menu-fade") || {};
  const popups = document.querySelectorAll(".popup");

  menuBtn.onclick =
    menuExit.onclick =
    menuFade.onclick =
      (e) => {
        if (e.target.id != "menu-fade") menu.classList.toggle("toggled");
        else menu.classList.remove("toggled");
        popups.forEach((e) => e.classList.remove("active"));
      };
};

String.prototype.withCommas = function () {
  "use strict";
  return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

String.prototype.toScore = function () {
  "use strict";
  return ("$" + this.withCommas()).replace("-", "-$").replace("$-", "-");
};

const animateScore = (score, el, easing = 0.2) => {
  let curr = parseInt(el.innerText.replace(/,/g, "").replace("$", "")) || 0;
  const update = () => {
    curr += (score - curr) * easing;
    el.innerText = Math.round(curr).toString().toScore();
    if (Math.abs(score - curr) < 1) el.innerText = score.toString().toScore();
    else requestAnimationFrame(update);
  };
  update();
};

window.addEventListener("load", menuSetup);
