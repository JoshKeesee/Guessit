require("dotenv").config();
const ejs = require("ejs");
const express = require("express");
const app = express();
const session = require("express-session");
const url = require("url");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "." + file.originalname.split(".").pop());
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(null, false);
  },
});
const fs = require("fs");
const db = require("@jkeesee/json-db");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const port = 3000;
const renderData = {
  appName: "Guessit",
  user: null,
  buttons: true,
  homepage: false,
  bar: false,
  tabs: false,
  search: false,
  query: "",
  styles: [],
  scripts: [],
};

class ConsoleProgressBar {
  constructor(name = "Done") {
    this.barLength = 20;
    this.name = name;
    this.startTime = Date.now();
  }
  update(progress, time = Date.now() - this.startTime) {
    const progressString = "█".repeat(progress * this.barLength);
    const emptyString = " ".repeat(this.barLength - progress * this.barLength);
    const timeString =
      time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
    process.stdout.write(
      `\r[${progressString}${emptyString}] ${Math.floor(progress * 100)}% ${this.name} (${timeString})`,
    );
  }
  finish() {
    this.endTime = Date.now();
    this.time = this.endTime - this.startTime;
    this.update(1, this.time);
    process.stdout.write("\n");
  }
}

const generateQuestions = async (
  {
    numQuestions = 1,
    numAnswers = 4,
    difficulty = "easy",
    topic,
    socketId = null,
  },
  startId = 1,
) => {
  try {
    const p = new ConsoleProgressBar("questions generated");
    const prompt = `
      Generate exactly ${Math.max(1, Math.min(20, numQuestions))} ${difficulty} question${numQuestions == 1 ? "" : "s"} about "${topic}" with exactly ${Math.max(2, Math.min(4, numAnswers))} answers each in this JSON array format:
      [{
        "question", // the question text
        "answers": [], // only include the exact correct answers from "answer_choices"
        "answer_choices": [], // include all answer choices including those from "answers" (maximum ${Math.max(2, Math.min(4, numAnswers))} choices)
        "type", // "multiple" for multiple choice and "tof" for true/false question types
        "id", // ${startId} + question number
      }]
    `;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContentStream(prompt);
    p.update(0);
    let text = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      text += chunkText;
      const pr = text.replace(/\n/g, "").split("},").length / numQuestions;
      p.update(pr);
      if (socketId) io.to(socketId).emit("magicreate progress", pr);
    }
    p.finish();
    let qs, qe, questions = [];
    while ((qs = text.indexOf("{")) != -1) {
      qe = text.indexOf("}", qs) + 1;
      const q = text.slice(qs, qe).replace(/"[^"]*"/g, (match) =>
        match.replace(/['"]/g, (match) => "\\" + match),
      );
      try {
        const question = JSON.parse(text.slice(qs, qe));
        questions.push(question);
      } catch (error) {
        console.error("Error parsing question:", error, text.slice(qs, qe));
      }
      text = text.slice(qe + 1);
    }
    return questions;
  } catch (e) {
    console.error(e);
    if (socketId) io.to(socketId).emit("magicreate progress", 0);
    return { error: "An error occurred while generating questions" };
  }
};

const games = {};

if (!db.get("users")) db.set("users", []);
if (!db.get("packs")) db.set("packs", []);
if (!fs.existsSync(__dirname + "/public/uploads"))
  fs.mkdirSync(__dirname + "/public/uploads");

const server = require("http").createServer(app);
const io = require("socket.io")(server);

const generateJoinCode = (length) => {
  const characters = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
};

app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", __dirname + "/public/views");

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "guessit-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: Date.now() + 60 * 60 * 1000 },
  }),
);
app.use((req, res, next) => {
  const allowed = ["/login", "/signup", "/"];
  if (req.path.startsWith("/play")) return next();
  if (
    !req.session.user &&
    (req.path.startsWith("/login") || req.path.startsWith("/login"))
  )
    return next();
  if (!req.session.user && !allowed.includes(req.path))
    return res.redirect("/login?redirect=" + req.path);
  if (req.session.user && allowed.includes(req.path))
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: req.query,
      }),
    );
  next();
});

app.get("/", async (req, res) => {
  const rd = {
    ...renderData,
    template: "index",
    title: "An online quiz game show",
    homepage: true,
    user: req.session.user,
    styles: [...renderData.styles, "/css/index.css", "/css/question.css"],
    scripts: ["/js/question.js", "/js/index.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/play", async (req, res) => {
  const rd = {
    ...renderData,
    template: "play",
    title: "Join Game",
    user: req.session.user,
    buttons: false,
    styles: [
      ...renderData.styles,
      "/css/play.css",
      "/css/lobby.css",
      "/css/question.css",
    ],
    scripts: ["/js/question.js", "/js/play.js", "/js/lobby.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/login", async (req, res) => {
  const rd = {
    ...renderData,
    template: "auth",
    title: "Login",
    newUser: false,
    buttons: false,
    styles: [...renderData.styles, "/css/auth.css"],
    scripts: ["/js/auth.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/signup", async (req, res) => {
  const rd = {
    ...renderData,
    template: "auth",
    title: "Sign Up",
    newUser: true,
    buttons: false,
    styles: [...renderData.styles, "/css/auth.css"],
    scripts: ["/js/auth.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.get("users").find((user) => user.username == username);
  if (user) {
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        delete user.password;
        req.session.user = user;
        res.json({ success: true });
      } else
        res.json({
          success: false,
          errors: [{ param: "password", msg: "Incorrect password" }],
        });
    });
  } else {
    res.json({
      success: false,
      errors: [{ param: "username", msg: "User not found" }],
    });
  }
});
app.post("/signup", (req, res) => {
  const { username, email, password, confirm, gender } = req.body;
  const users = db.get("users");
  const errors = [];
  if (password != confirm)
    errors.push({
      param: "confirm",
      msg: "Passwords do not match",
    });
  if (password.length < 6)
    errors.push({
      param: "password",
      msg: "Password must be at least 6 characters long",
    });
  if (users.find((user) => user.username == username))
    errors.push({
      param: "username",
      msg: "Username already taken",
    });
  if (users.find((user) => user.email == email))
    errors.push({
      param: "email",
      msg: "Email already taken",
    });
  if (errors.length) res.json({ success: false, errors });
  else
    bcrypt.hash(password, saltRounds, (err, hash) => {
      req.session.user = {
        username,
        email,
        profile: null,
        gender,
        id: parseInt(users.sort((a, b) => b.id - a.id)[0]?.id || 0) + 1,
      };
      db.set("users", [
        ...users,
        {
          username,
          email,
          password: hash,
          profile: null,
          gender,
          id: parseInt(users.sort((a, b) => b.id - a.id)[0]?.id || 0) + 1,
        },
      ]);
      res.json({ success: true });
    });
});
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect(
    url.format({
      pathname: "/",
      query: req.query,
    }),
  );
});
app.get("/dashboard", async (req, res) => {
  const users = db.get("users");
  const packs = db
    .get("packs")
    .filter((pack) => pack.author == req.session.user.id)
    .map((pack) => {
      const user = users.find((user) => user.id == pack.author);
      return {
        ...pack,
        user,
      };
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const rd = {
    ...renderData,
    template: "dashboard",
    title: "Dashboard",
    user: req.session.user,
    bar: true,
    tabs: true,
    search: true,
    packs,
    styles: [...renderData.styles, "/css/dashboard.css"],
    scripts: ["/js/dashboard.js", "/js/search.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/search", async (req, res) => {
  const query = (req.query.q || "").trim().split(" ");
  const users = db.get("users");
  const packs = db
    .get("packs")
    .filter(
      (pack) =>
        pack.public &&
        (query == "" ||
          pack.name.split(" ").some((e) => query.includes(e.toLowerCase())) ||
          pack.description
            .split(" ")
            .some((e) => query.includes(e.toLowerCase())) ||
          query.includes(
            users.find((user) => user.id == pack.author).username.toLowerCase(),
          )),
    )
    .map((pack) => {
      const user = users.find((user) => user.id == pack.author);
      return {
        ...pack,
        user,
      };
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const rd = {
    ...renderData,
    template: "search",
    title: "Search",
    user: req.session.user,
    bar: true,
    search: true,
    query,
    packs,
    styles: [...renderData.styles, "/css/search.css", "/css/dashboard.css"],
    scripts: ["/js/search.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/host/:id", async (req, res) => {
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || (pack.author != req.session.user.id && !pack.public))
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: {
          ...req.query,
          error: "Pack is not public or was not created by you.",
        },
      }),
    );
  if (pack.questions.length == 0)
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: {
          ...req.query,
          error: "Pack doesn't have any questions.",
        },
      }),
    );
  const rd = {
    ...renderData,
    template: "host",
    title: "Host",
    user: req.session.user,
    styles: [...renderData.styles, "/css/host.css"],
    scripts: ["/js/host.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/pack/:id", async (req, res) => {
  const users = db.get("users");
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || (!pack.public && pack.author != req.session.user.id))
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: {
          ...req.query,
          error: "Pack is not public or was not created by you.",
        },
      }),
    );
  const user = users.find((user) => user.id == pack.author);
  pack.user = user;
  const rd = {
    ...renderData,
    template: "pack",
    title: pack.name,
    user: req.session.user,
    pack,
    styles: [...renderData.styles, "/css/pack.css"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.get("/pack/:id/edit", async (req, res) => {
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: {
          ...req.query,
          error: "Pack was not created by you.",
        },
      }),
    );
  const rd = {
    ...renderData,
    template: "edit",
    title: "Edit " + pack.name,
    user: req.session.user,
    pack,
    styles: [...renderData.styles, "/css/edit.css", "/css/pack.css"],
    scripts: ["/js/edit.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.post("/pack/:id/edit", (req, res) => {
  const { name, description, public } = req.body;
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: {
          ...req.query,
          error: "Pack was not created by you.",
        },
      }),
    );
  pack.name = name;
  pack.description = description;
  pack.public = public;
  db.set("packs", packs);
  res.redirect(
    url.format({
      pathname: "/pack/" + pack.id,
      query: req.query,
    }),
  );
});
app.post("/pack/:id/add-question", (req, res) => {
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.json({ success: false });
  const q = {
    ...req.body,
    id: parseInt(pack.questions.sort((a, b) => b.id - a.id)[0]?.id || 0) + 1,
  };
  pack.questions = pack.questions || [];
  pack.questions.push(q);
  pack.updated_at = new Date();
  db.set("packs", packs);
  res.json({
    success: true,
    question: q,
  });
});
app.post("/pack/:id/edit-question", (req, res) => {
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.json({ success: false });
  pack.questions = pack.questions || [];
  const q = pack.questions.findIndex((e) => e.id == req.body.id);
  pack.questions[q] = req.body;
  pack.updated_at = new Date();
  db.set("packs", packs);
  res.json({
    success: true,
    question: req.body,
  });
});
app.post("/pack/:id/delete-question", (req, res) => {
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.json({ success: false });
  pack.questions = pack.questions || [];
  const q = pack.questions.find((e) => e.id == req.body.id);
  if (!q) return res.json({ success: false });
  pack.questions.splice(pack.questions.indexOf(q), 1);
  pack.updated_at = new Date();
  db.set("packs", packs);
  res.json({
    success: true,
    id: req.body.id,
  });
});
app.post("/pack/:id/generate-questions", async (req, res) => {
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.json({ success: false });
  const id =
    parseInt(pack.questions.sort((a, b) => b.id - a.id)[0]?.id || 0) + 1;
  const questions = await generateQuestions(req.body, id);
  if (questions.error)
    return res.json({ success: false, error: questions.error });
  pack.questions.push(...questions);
  pack.updated_at = new Date();
  db.set("packs", packs);
  res.json({
    success: true,
    questions,
  });
});
app.get("/pack/:id/delete", (req, res) => {
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id)
    return res.redirect(
      url.format({
        pathname: "/dashboard",
        query: {
          ...req.query,
          error: "Pack was not created by you.",
        },
      }),
    );
  if (pack.image && fs.existsSync(__dirname + "/public" + pack.image))
    fs.unlinkSync(__dirname + "/public" + pack.image);
  packs.splice(packs.indexOf(pack), 1);
  db.set("packs", packs);
  res.redirect(
    url.format({
      pathname: "/dashboard",
      query: req.query,
    }),
  );
});
app.get("/create", async (req, res) => {
  const rd = {
    ...renderData,
    template: "create",
    title: "Create a pack",
    user: req.session.user,
    styles: [...renderData.styles, "/css/create.css"],
    scripts: ["/js/create.js"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});
app.post("/create", upload.single("image"), (req, res) => {
  const { name, description, public } = req.body;
  const packs = db.get("packs");
  const pack = {
    id: (packs.sort((a, b) => b.id - a.id)[0]?.id || 0) + 1,
    author: req.session.user.id,
    name,
    description,
    image: req.file ? "/uploads/" + req.file.filename : null,
    public: public == "on",
    created_at: new Date(),
    updated_at: new Date(),
    questions: [],
  };
  packs.push(pack);
  db.set("packs", packs);
  res.json({
    success: true,
    redirect: "/pack/" + pack.id,
  });
});
app.use("*", async (req, res) => {
  const rd = {
    ...renderData,
    template: "404",
    title: "Not found",
    buttons: false,
    styles: [...renderData.styles, "/css/404.css"],
  };
  if (req.query.api)
    return res.json({
      html: await ejs.renderFile(
        __dirname + "/public/views/" + rd.template + ".html",
        rd,
      ),
      rd,
    });
  res.render("components/layout", rd);
});

const getCorrectPoints = (pp, streak) => {
  return Math.floor(
    Math.max(
      1,
      (pp["mpq"].levels[pp["mpq"].level] +
        pp["streak"].levels[pp["streak"].level] * streak) *
        pp["multiplier"].levels[pp["multiplier"].level],
    ),
  );
};

const getIncorrectPoints = (pp, streak) => {
  const ppc = getCorrectPoints(pp, streak);
  return Math.floor(
    Math.max(
      0,
      ppc - ppc * (pp["insurance"].levels[pp["insurance"].level] / 100),
    ),
  );
};

const getPoints = (p) => {
  const { powerups: pp } = p,
    ppc = getCorrectPoints(pp, p.streak),
    ppi = getIncorrectPoints(pp, p.streak),
    nppc = getCorrectPoints(pp, p.streak + 1),
    nppi = Math.floor(
      Math.max(
        0,
        getCorrectPoints(pp, p.streak) -
          getCorrectPoints(pp, p.streak) *
            (pp["insurance"].levels[pp["insurance"].level] / 100),
      ),
    );
  return { ppc, ppi, nppc, nppi };
};

io.on("connection", (socket) => {
  let user = {
    room: null,
    name: null,
    id: null,
    socketId: socket.id,
    points: 0,
    totalPointsEarned: 0,
    totalPointsLost: 0,
    history: [],
    streak: 0,
    isHost: false,
    powerups: {},
    stocks: {},
    pointsPerCorrect: 1,
    pointsPerIncorrect: 1,
    nextPointsPerCorrect: 1,
    nextPointsPerIncorrect: 1,
  };
  socket.on("check code", (code, cb = () => {}) => {
    const game = games[code];
    if (!game) return cb(false, "Game not found");
    if (game.ended) return cb(false, "Game has ended");
    if (!game.settings.joinInLate && game.started)
      return cb(false, "You can't join in late");
    if (game.players.length >= game.maxPlayers) return cb(false, "Game full");
    cb(true);
  });
  socket.on("join", (code, name, cb = () => {}) => {
    const game = games[code];
    if (!game) return cb(false, "Game not found");
    if (game.ended) return cb(false, "Game has ended");
    if (!game.settings.joinInLate && game.started)
      return cb(false, "You can't join in late");
    if (game.players.length >= game.maxPlayers) return cb(false, "Game full");
    if (game.players.find((e) => e.name == name))
      return cb(false, "Name already taken");
    user.name = name.replaceAll("'", "").replaceAll('"', "").trim();
    user.id = (game.players.sort((a, b) => b.id - a.id)[0]?.id || 0) + 1;
    user.room = code;
    user.points = game.settings.startingPoints;
    user.powerups = structuredClone(game.settings.powerups);
    user.stocks = structuredClone(game.stocks).map(
      (e) => (e = { name: e.name, shares: 0, color: e.color }),
    );
    game.players.push(user);
    user = game.players.find((e) => e.id == user.id);
    socket.join(code);
    cb(true);
    io.to(code).emit("player joined", user);
    if (game.started) {
      socket.emit("game started", game);
      socket.emit("question", game.current);
    }
  });
  socket.on("disconnect", () => {
    const game = games[user.room];
    if (!game) return;
    if (!user.isHost) {
      game.players.splice(
        game.players.findIndex((player) => player.id == user.id),
        1,
      );
      io.to(user.room).emit("player left", user, "disconnected from the game");
    } else {
      game.players.splice(
        game.players.findIndex((player) => player.isHost),
        1,
      );
      game.ended = true;
      io.to(user.room).emit("game ended", game, "Host disconnected from game");
    }
  });
  socket.on("remove player", (data) => {
    if (!user.isHost) return socket.emit("error", "You are not the host");
    const game = games[data.room];
    if (!game) return socket.emit("error", "Game not found");
    const player = game.players.find((player) => player.id == data.id);
    if (!player) return socket.emit("error", "Player not found");
    game.players.splice(game.players.indexOf(player), 1);
    io.to(data.room).emit("player left", player, "removed by the host");
  });
  socket.on("host join", (packId) => {
    const joinCode = generateJoinCode(6);
    const pack = db.get("packs").find((pack) => pack.id == packId);
    games[joinCode] = {
      lobby: true,
      started: false,
      ended: false,
      current: 0,
      totalPointsEarned: 0,
      totalPointsLost: 0,
      streak: 0,
      stocks: [
        { name: "Apple", price: 0, color: "#ff0080" },
        { name: "Google", price: 0, color: "#00ff00" },
        { name: "Amazon", price: 0, color: "#8000ff" },
        { name: "Microsoft", price: 0, color: "#ff00ff" },
        { name: "Tesla", price: 0, color: "#00ffff" },
        { name: "Netflix", price: 0, color: "#ff0000" },
        { name: "X", price: 0, color: "#ff8000" },
        { name: renderData.appName, price: 0 },
      ],
      pack,
      joinCode,
      settings: {
        time: 10,
        startingPoints: 0,
        minPoints: -100,
        maxPlayers: Infinity,
        minPlayers: 1,
        randomizeAnswers: true,
        joinInLate: true,
        priceMultiplier: 2,
        powerups: {
          multiplier: {
            name: "Multiplier",
            description: "Multiply your earnings",
            color: "blue",
            prices: [
              0, 50, 300, 2000, 12000, 85000, 700000, 6500000, 65000000,
              1000000000,
            ],
            levels: [1, 1.5, 2, 3, 5, 8, 12, 18, 30, 100],
            level: 0,
            x: "x",
            after: " money",
          },
          mpq: {
            name: "Money Per Question",
            description: "Increase the amount of money you earn per question",
            color: "purple",
            prices: [
              0, 10, 100, 1000, 10000, 75000, 300000, 1000000, 10000000,
              100000000,
            ],
            levels: [1, 5, 50, 100, 500, 2000, 5000, 10000, 250000, 1000000],
            level: 0,
            x: "$",
            after: " per question",
          },
          streak: {
            name: "Streak Amper",
            description: "Amp up your answer streak earnings",
            color: "green",
            prices: [
              0, 20, 200, 2000, 20000, 200000, 2000000, 20000000, 200000000,
              2000000000,
            ],
            levels: [1, 3, 10, 50, 250, 1200, 6500, 35000, 175000, 1000000],
            level: 0,
            x: "x",
            after: " bonus",
          },
          insurance: {
            name: "Insurance",
            description: "Lose less money on incorrect answers",
            color: "red",
            prices: [
              0, 10, 250, 1000, 25000, 100000, 1000000, 5000000, 25000000,
              500000000,
            ],
            levels: [0, 10, 25, 40, 50, 70, 80, 90, 95, 99],
            level: 0,
            x: "%",
            after: " less loss",
          },
        },
      },
      players: [user],
    };
    for (let i = 0; i < games[joinCode].stocks.length; i++) {
      const stock = games[joinCode].stocks[i];
      stock.price = Math.floor(Math.random() * (1000 - 10) + 10);
    }
    user.isHost = true;
    user.room = joinCode;
    socket.join(joinCode);
    socket.emit("host joined", games[joinCode]);
  });
  socket.on("start game", (joinCode) => {
    const game = games[joinCode];
    if (!game) return;
    if (!user.isHost) return;
    if (game.ended) return;
    if (game.started) return;
    if (game.players.filter((e) => !e.isHost).length < game.settings.minPlayers)
      return io.to(joinCode).emit("error", "Not enough players");
    game.ended = false;
    game.started = true;
    game.current = 0;
    const d = new Date();
    d.setMinutes(d.getMinutes() + game.settings.time);
    game.endTime = d;
    io.to(joinCode).emit("game started", game);
    io.to(joinCode).emit("question", game.current);
  });
  socket.on("player join", (data) => {
    const game = games[data.room];
    if (!game) return socket.emit("error", "Game not found");
    game.players.push(data);
    io.to(data.room).emit("player joined", data);
  });
  socket.on("next question", (data) => {
    const game = games[data.room];
    if (!game) return socket.emit("error", "Game not found");
    if (!user.isHost) return socket.emit("error", "You are not the host");
    if (game.ended) return;
    if (!game.started) return socket.emit("error", "Game has not started");
    game.current++;
    io.to(data.room).emit("question", game.current);
  });
  socket.on("submit answer", (data) => {
    const game = games[user.room];
    if (!game) return socket.emit("error", "Game not found");
    const question =
      game.pack.questions.find((e) => e.id == data.current) ||
      game.pack.questions[game.current];
    if (!question) return;
    const player = game.players.find((e) => e.id == user.id);
    if (!player) return;
    const o = player.points;
    const correct = question.answers;
    const { ppc, ppi, nppc, nppi } = getPoints(player);
    user.pointsPerCorrect = ppc;
    user.pointsPerIncorrect = ppi;
    user.nextPointsPerCorrect = nppc;
    user.nextPointsPerIncorrect = nppi;
    if (correct.includes(data.answer)) {
      player.streak++;
      player.points += user.pointsPerCorrect;
      game.totalPointsEarned += player.points - o;
      user.totalPointsEarned += player.points - o;
    } else {
      player.streak = 0;
      player.points -= user.pointsPerIncorrect;
      game.totalPointsLost += o - player.points;
      user.totalPointsLost += o - player.points;
    }
    if (player.points < game.settings.minPoints)
      player.points = game.settings.minPoints;
    player.history.push({
      question: question.question,
      answer: data.answer,
      correct,
      answer_choices: question.answer_choices,
    });
    io.to(user.room).emit("player answered", {
      name: player.name,
      points: player.points,
      pointsPerCorrect: player.pointsPerCorrect,
      pointsPerIncorrect: player.pointsPerIncorrect,
      nextPointsPerCorrect: player.nextPointsPerCorrect,
      nextPointsPerIncorrect: player.nextPointsPerIncorrect,
      streak: player.streak,
    });
  });
  socket.on("buy item", (item, cb = () => {}) => {
    const l = user.powerups[item];
    if (!l) return cb({ success: false, error: "Item not found" });
    if (l.level >= l.levels?.length)
      return cb({ success: false, error: "Max level" });
    if (user.points < l.prices[l.level])
      return cb({ success: false, error: "Not enough points" });
    l.level++;
    user.points -= l.prices[l.level];
    user.streak = 0;
    const { ppc, ppi } = getPoints(user);
    user.nextPointsPerCorrect = ppc;
    user.nextPointsPerIncorrect = ppi;
    const p = {
      name: user.name,
      points: user.points,
      streak: user.streak,
      powerups: user.powerups,
      nextPointsPerCorrect: user.nextPointsPerCorrect,
      nextPointsPerIncorrect: user.nextPointsPerIncorrect,
    };
    cb({ success: true, player: p });
    io.to(user.room).emit("powerup", {
      item,
      player: p,
    });
  });
  socket.on("buy stock", (name, num, cb = () => {}) => {
    const stock = user.stocks[name];
    const game = games[user.room];
    if (!stock) return cb({ success: false, error: "Stock not found" });
    if (user.points < stock.price * num)
      return cb({ success: false, error: "Not enough points" });
    stock.shares += num;
    user.points -= game.stocks.find((e) => e.name == name).price * num;
    user.streak = 0;
    const { ppc, ppi } = getPoints(user);
    user.nextPointsPerCorrect = ppc;
    user.nextPointsPerIncorrect = ppi;
    const p = {
      name: user.name,
      points: user.points,
      streak: user.streak,
      stocks: user.stocks,
      nextPointsPerCorrect: user.nextPointsPerCorrect,
      nextPointsPerIncorrect: user.nextPointsPerIncorrect,
    };
    cb({ success: true, player: p });
    io.to(user.room).emit("stock", {
      name,
      player: p,
    });
  });
  socket.on("end game", (joinCode) => {
    const game = games[joinCode];
    if (!game) return socket.emit("error", "Game not found");
    if (!user.isHost) return socket.emit("error", "You are not the host");
    game.ended = true;
    io.to(joinCode).emit("game ended", game);
  });
});

setInterval(() => {
  let min = 10;
  for (const code in games) {
    const game = games[code];
    const host = game.players.find((e) => e.isHost);
    if (game.players.length == 0 || !host) {
      delete games[code];
      continue;
    }
    if (!game.started || game.ended) continue;
    io.to(code).emit("total earned", game.totalPointsEarned);
    const stocks = game.stocks;
    const r = Math.random() * 100;
    if (r == 99) {
      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        stock.price += Math.floor(Math.random() * (1000 - 500) + 500);
        if (stock.price < min) stock.price = min;
      }
      io.to(code).emit("stock market spike", stocks);
    } else if (r == 0) {
      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        stock.price -= Math.floor(Math.random() * (1000 - 500) + 500);
        if (stock.price < min) stock.price = min;
      }
      io.to(code).emit("stock market crash", stocks);
    }
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (Math.random() > 0.5) {
        const r = Math.random();
        const sr = Math.floor(Math.random() * 100);
        if (sr == 99) {
          stock.price += Math.floor(Math.random() * (1000 - 500) + 500);
          if (stock.price < min) stock.price = min;
          io.to(code).emit("stock spike", stock);
        } else if (sr == 0) {
          stock.price -= Math.floor(Math.random() * (1000 - 500) + 500);
          if (stock.price < min) stock.price = min;
          io.to(code).emit("stock crash", stock);
        } else if (r > 0.5) stock.price += Math.floor(Math.random() * 100);
        else stock.price -= Math.floor(Math.random() * 100);
        if (stock.price < min) stock.price = min;
      }
    }
    io.to(code).emit("stocks", game.stocks);
  }
}, 1000 * 10);

server.listen(port, () => console.log(`Server listening on port ${port}`));

process.on("uncaughtException", (err) => console.error(err));
