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
        delete window.game;
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

const svg = (path, viewBox) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  s.setAttribute("viewBox", viewBox);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  s.appendChild(p);
  return s;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const placeSuffix = (i) => {
  let j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) return i + "st";
  if (j == 2 && k != 12) return i + "nd";
  if (j == 3 && k != 13) return i + "rd";
  return i + "th";
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

const updateShares = (data) => {
  if (
    typeof game == "undefined" ||
    typeof name == "undefined" ||
    typeof socket == "undefined"
  )
    return;
  if (!data.success) return createStatus(data.error, "error");
  const p = game.players.find((e) => data.player.name == name);
  Object.keys(data.player).forEach((k) => (p[k] = data.player[k]));
  animateScore(p.stocks.find((s) => s.name == data.stock).shares, curr, "");
  updateStocks(
    game.stocks,
    document.querySelector("#stocks.market-content"),
    true,
  );
  animateScore(p.points, document.querySelector("#stats #score"));
  animateScore(p.streak, document.querySelector("#stats #streak span"), "");
};

const createStocks = (s, st, invest = false) => {
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
    if (invest) {
      const c = document.createElement("div");
      c.id = "invest";
      const sub = svg(
        "M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z",
        "0 0 448 512",
      );
      sub.id = "sub";
      sub.classList.add("disabled");
      sub.oncontextmenu = (e) => e.preventDefault();
      sub.onclick = () => {
        if (
          typeof game == "undefined" ||
          typeof name == "undefined" ||
          typeof socket == "undefined" ||
          sub.classList.contains("disabled")
        )
          return;
        let c = parseInt(curr.innerText);
        const p = game.players.find((e) => e.name == name);
        if (p.stocks.find((s) => s.name == e.name).shares < c)
          return sub.classList.add("disabled");
        c = parseInt(curr.innerText);
        if (p.stocks.find((s) => s.name == e.name).shares < c)
          sub.classList.add("disabled");
        socket.emit("sell stock", e.name, 1, updateShares);
      };
      const curr = document.createElement("div");
      curr.id = "curr";
      animateScore(0, curr, "");
      const add = svg(
        "M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z",
        "0 0 448 512",
      );
      add.id = "add";
      add.classList.add("disabled");
      add.oncontextmenu = (e) => e.preventDefault();
      add.onclick = () => {
        if (
          typeof game == "undefined" ||
          typeof name == "undefined" ||
          typeof socket == "undefined" ||
          add.classList.contains("disabled")
        )
          return;
        const c = game.stocks.find((s) => s.name == e.name).price;
        const p = game.players.find((e) => e.name == name);
        if (p.points < c) return add.classList.add("disabled");
        socket.emit("buy stock", e.name, 1, updateShares);
      };
      c.appendChild(sub);
      c.appendChild(curr);
      c.appendChild(add);
      g.appendChild(c);
    }
    st.querySelector("#graph").appendChild(g);
    animateScore(e.price, p);
  });
};

const updateStocks = (s, st, invest = false) => {
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
    if (invest) {
      if (
        typeof game == "undefined" ||
        typeof name == "undefined" ||
        typeof socket == "undefined"
      )
        return;
      const player = game.players.find((pl) => pl.name == name);
      const sub = p.querySelector("#sub");
      const curr = p.querySelector("#curr");
      const c = player.stocks.find((s) => s.name == e.name).shares;
      animateScore(c, curr, "");
      const add = p.querySelector("#add");
      if (c - 1 < 0) sub.classList.add("disabled");
      else sub.classList.remove("disabled");
      if (player.points < e.price) add.classList.add("disabled");
      else add.classList.remove("disabled");
    }
  });
};

const createPlayer = (p, a = true) => {
  const l = document.querySelector("#leaderboard");
  const c = document.createElement("div");
  c.classList.add("player");
  c.dataset.name = p.name;
  c.dataset.points = p.points;
  const n = document.createElement("div");
  n.id = "name";
  n.innerText = p.name;
  const s = document.createElement("div");
  s.id = "score";
  animateScore(p.points, s);
  c.appendChild(n);
  c.appendChild(s);
  a && l.appendChild(c);
  return c;
};

const createStatus = (e, c) => {
  const status = document.createElement("div");
  status.classList.add("status");
  const i = document.createElement("img");
  i.src = "/images/" + c + ".png";
  const s = document.createElement("span");
  s.innerHTML = e;
  status.appendChild(i);
  status.appendChild(s);
  document.querySelector("#status").appendChild(status);
  const h = status.offsetHeight + 10;
  status.animate(
    [
      {
        transform: "translateX(200%)",
        opacity: 0,
        marginTop: -h + "px",
        offset: 0,
        easing: "ease",
      },
      {
        transform: "translateX(0)",
        opacity: 1,
        marginTop: 0,
        offset: 0.1,
        easing: "ease",
      },
      {
        transform: "translateX(0)",
        opacity: 1,
        marginTop: 0,
        offset: 0.9,
        easing: "ease",
      },
      {
        transform: "translateX(200%)",
        opacity: 0,
        marginTop: -h + "px",
        offset: 1,
        easing: "ease",
      },
    ],
    {
      duration: 5000,
      easing: "ease",
    },
  ).onfinish = () => status.remove();
};

const playSound = (sound) => {
  const audio = new Audio(`/audio/${sound}.mp3`);
  audio.play();
};

window.addEventListener("load", () => {
  menuSetup();
  linkSetup();
  rippleSetup();
  const url = new URL(location.href);
  const error = url.searchParams.get("error");
  if (error) {
    createStatus(error, "error");
    url.searchParams.delete("error");
    history.replaceState({}, "", url.href);
  }
  const profile = document.querySelector("#profile");
  if (!profile) return;
  profile.onclick = () => {
    const d = profile.querySelector(".dropdown");
    d.classList.toggle("active");
  };
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

window.addEventListener("error", (e) => createStatus(e.message, "error"));
