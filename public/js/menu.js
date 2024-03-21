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

const rippleSetup = () => {
  "use strict";
  document.querySelectorAll(".ripple").forEach((el) => {
    el.onmousedown = (e) => {
      const r = document.createElement("div");
      r.classList.add("ripple-effect");
      const d = Math.max(el.clientWidth, el.clientHeight);
      const rad = d / 2;
      const { left, top } = el.getBoundingClientRect();
      r.style.width = r.style.height = d + "px";
      r.style.left = e.clientX - left - rad + "px";
      r.style.top = e.clientY - top - rad + "px";
      el.appendChild(r);
      setTimeout(() => r.remove(), 1000);
    };
  });
};

const linkSetup = () => {
  "use strict";
  document.querySelectorAll("a").forEach(
    (a) =>
      (a.onclick = async (e) => {
        if (
          a.target == "_blank" ||
          a.target == "_self" ||
          a.href.includes("/host")
        )
          return;
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

const updateObject = (c, n) => {
  Object.keys(n).forEach((k) => (c[k] = n[k]));
  return c;
};

String.prototype.withCommas = function () {
  "use strict";
  return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

String.prototype.toScore = function (f) {
  "use strict";
  const n = this.withCommas();
  return (f == "$" ? f + n : n + f).replace("-", "-" + f).replace(f + "-", "-");
};

const animateScore = (score, el, t = "$", easing = 0.2) => {
  let curr = parseInt(el.innerText.replace(/,/g, "").replace(t, "")) || 0;
  const update = () => {
    curr += (score - curr) * easing;
    el.innerText = Math.round(curr).toString().toScore(t);
    if (Math.abs(score - curr) < 1) el.innerText = score.toString().toScore(t);
    else requestAnimationFrame(update);
  };
  update();
};

const createStocks = (s, st) => {
  st.querySelector("#graph").innerHTML = "";
  const mh = Math.max(...s.map((e) => e.price));
  s.forEach((e) => {
    const g = document.createElement("div");
    g.dataset.name = e.name;
    g.dataset.price = e.price;
    g.classList.add("stock");
    g.style.height = `${(e.price / mh) * 100}%`;
    if (e.color) g.style.backgroundColor = e.color;
    const t = document.createElement("div");
    t.id = "text";
    const i = document.createElement("img");
    i.src = `/images/stocks/${e.name.toLowerCase()}.png`;
    t.appendChild(i);
    const p = document.createElement("div");
    p.id = "price";
    g.appendChild(p);
    g.appendChild(t);
    st.querySelector("#graph").appendChild(g);
    animateScore(e.price, p);
  });
};

const updateStocks = (s, st) => {
  const g = st.querySelector("#graph");
  const c = g.children;
  if (c.length == 0) createStocks(s, document.querySelector("#stocks"));
  const mh = Math.max(...s.map((e) => e.price));
  s.forEach((e, i) => {
    const h = (e.price / mh) * 100;
    const p = c[i];
    p.style.height = `${h}%`;
    if (e.price > p.dataset.price) p.classList.add("up");
    else if (e.price < p.dataset.price) p.classList.add("down");
    else p.classList.remove("up", "down");
    p.dataset.price = e.price;
    animateScore(e.price, p.querySelector("#price"));
  });
};

const playSound = (sound) => {
  const audio = new Audio(`/audio/${sound}.mp3`);
  audio.play();
};

window.addEventListener("load", () => {
  menuSetup();
  linkSetup();
  rippleSetup();
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
