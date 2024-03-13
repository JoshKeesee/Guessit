const loader = document.querySelector("#loader");
let check;

const setLoader = (progress) => {
  loader.style.setProperty("--progress", progress + "%");
  if (progress == 0) loader.style.opacity = 1;
  if (progress == 100) {
    loader.style.opacity = 0;
    setTimeout(() => loader.style.setProperty("--progress", 0), 300);
  }
};

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

const linkSetup = () => {
  "use strict";
  document.querySelectorAll("a").forEach(
    (a) =>
      (a.onclick = async (e) => {
        if (a.target == "_blank" || a.target == "_self") return;
        clearInterval(check);
        setLoader(0);
        e.preventDefault();
        let url = new URL(a.href);
        url.searchParams.set("api", true);
        setLoader(10);
        let curr = 10;
        check = setInterval(() => {
          if (curr < 90) setLoader(curr++);
          else clearInterval(check);
        }, 2000);
        const data = await fetch(url.href, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
        const json = await data.json();
        clearInterval(check);
        setLoader(90);
        url = new URL(data.url);
        url.searchParams.delete("api");
        history.pushState({}, "", url.href);
        document.title = json.rd.appName + " - " + json.rd.title;
        const ignore = ["main", "socket.io", "menu", "time"];
        document.body.querySelectorAll("script").forEach((s) => {
          if (!ignore.some((e) => s.src.includes(e))) s.remove();
        });
        for (const href of json.rd.styles) {
          await new Promise((res) => {
            const l = document.createElement("link");
            l.rel = "stylesheet";
            l.href = href;
            l.onload = () => res();
            document.head.appendChild(l);
          });
        }
        const c = document.querySelector("#container");
        c.innerHTML = json.html;
        ignore.push(...json.rd.styles);
        document.head.querySelectorAll("link").forEach((l) => {
          if (!ignore.some((e) => l.href.includes(e)) && l.rel == "stylesheet")
            l.remove();
        });
        for (const src of json.rd.scripts) {
          await new Promise((res) => {
            const s = document.createElement("script");
            s.src = src;
            s.onload = () => res();
            document.body.appendChild(s);
          });
        }
        dispatchEvent(new Event("load"));
        setLoader(100);
      }),
  );
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

window.addEventListener("load", () => {
  menuSetup();
  linkSetup();
});

window.addEventListener("popstate", (e) => {
  e.preventDefault();
  const a = document.createElement("a");
  a.href = location.href;
  a.style.display = "none";
  document.querySelector("#container").appendChild(a);
  linkSetup();
  a.click();
});
