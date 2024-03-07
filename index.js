const express = require("express");
const auth = require("./assets/auth");
const app = express();
const session = require("express-session");
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
  search: false,
  styles: [
    "https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,100..900;1,100..900&family=Oxanium:wght@200..800&display=swap",
  ],
};

const games = {};

if (!db.get("users")) db.set("users", []);
if (!db.get("packs")) db.set("packs", []);
if (!fs.existsSync(__dirname + "/public/uploads")) fs.mkdirSync(__dirname + "/public/uploads");

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.engine("html", require("ejs").renderFile);
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
  if (!req.session.user && !allowed.includes(req.path))
    return res.redirect("/login?redirect=" + req.path);
  if (req.session.user && allowed.includes(req.path))
    return res.redirect("/dashboard");
  next();
});

app.get("/", (req, res) => {
  res.render("index", {
    ...renderData,
    title: "An online quiz game show",
    homepage: true,
    styles: [...renderData.styles, "/css/index.css"],
  });
});
app.get("/login", (req, res) =>
  res.render("auth", {
    ...renderData,
    title: "Login",
    newUser: false,
    buttons: false,
    styles: [...renderData.styles, "/css/auth.css"],
  }),
);
app.get("/signup", (req, res) =>
  res.render("auth", {
    ...renderData,
    title: "Sign Up",
    newUser: true,
    buttons: false,
    styles: [...renderData.styles, "/css/auth.css"],
  }),
);
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
        id: users.length + 1,
      };
      db.set("users", [
        ...users,
        {
          username,
          email,
          password: hash,
          profile: null,
          gender,
          id: users.length + 1,
        },
      ]);
      res.json({ success: true });
    });
});
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});
app.get("/dashboard", (req, res) => {
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
    });
  res.render("dashboard", {
    ...renderData,
    title: "Dashboard",
    user: req.session.user,
    bar: true,
    search: true,
    packs,
    styles: [...renderData.styles, "/css/dashboard.css"],
  });
});
app.get("/host/:id", (req, res) => {
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || (pack.author != req.session.user.id && !pack.public)) return res.redirect("/");
  const codeLength = 6;
  const joinCode = Math.floor(Math.random() * Math.pow(10, codeLength - 1)) + Math.pow(10, codeLength - 1);
  res.render("host", {
    ...renderData,
    title: "Host",
    user: req.session.user,
    pack,
    joinCode,
    settings: {
      time: 10,
      pointsPerQuestion: 100,
      pointsPerIncorrect: -50,
      minPoints: 0,
      maxPlayers: Infinity,
      minPlayers: 1,
      randomizeAnswers: true,
    },
    styles: [...renderData.styles, "/css/host.css"],
  });
});
app.get("/host/:id/play", (req, res) => {
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || (pack.author != req.session.user.id && !pack.public)) return res.redirect("/");
  res.render("host-play", {
    ...renderData,
    title: "Host",
    user: req.session.user,
    pack,
    styles: [...renderData.styles, "/css/host-play.css"],
  });
});
app.get("/pack/:id", (req, res) => {
  const users = db.get("users");
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || (!pack.public && pack.author != req.session.user.id))
    return res.redirect("/");
  const user = users.find((user) => user.id == pack.author);
  pack.user = user;
  res.render("pack", {
    ...renderData,
    title: pack.name,
    user: req.session.user,
    pack,
    user,
    styles: [...renderData.styles, "/css/pack.css"],
  });
});
app.get("/pack/:id/edit", (req, res) => {
  const pack = db.get("packs").find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id) return res.redirect("/");
  res.render("edit", {
    ...renderData,
    title: "Edit " + pack.name,
    user: req.session.user,
    pack,
    styles: [...renderData.styles, "/css/edit.css", "/css/pack.css"],
  });
});
app.post("/pack/:id/edit", (req, res) => {
  const { name, description, public } = req.body;
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id) return res.redirect("/");
  pack.name = name;
  pack.description = description;
  pack.public = public;
  db.set("packs", packs);
  res.redirect("/pack/" + pack.id);
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
  db.set("packs", packs);
  res.json({
    success: true,
    id: req.body.id,
  });
});
app.get("/pack/:id/delete", (req, res) => {
  const packs = db.get("packs");
  const pack = packs.find((pack) => pack.id == req.params.id);
  if (!pack || pack.author != req.session.user.id) return res.redirect("/");
  if (pack.image && fs.existsSync(__dirname + "/public" + pack.image))
    fs.unlinkSync(__dirname + "/public" + pack.image);
  packs.splice(packs.indexOf(pack), 1);
  db.set("packs", packs);
  res.redirect("/dashboard");
});
app.get("/create", (req, res) => {
  res.render("create", {
    ...renderData,
    title: "Create a pack",
    user: req.session.user,
    styles: [...renderData.styles, "/css/create.css"],
  });
});
app.post("/create", upload.single("image"), (req, res) => {
  const { name, description, public } = req.body;
  const packs = db.get("packs");
  const pack = {
    id: packs.length + 1,
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
  res.redirect("/pack/" + pack.id);
});
app.use("*", (req, res) =>
  res.render("404", {
    ...renderData,
    title: "Not found",
    buttons: false,
    styles: [...renderData.styles, "/css/404.css"],
  }),
);

io.use(auth);

io.on("connection", (socket) => {
  socket.on("join", (data) => {
    socket.join(data.room);
    socket.emit("joined", data);
  });
  socket.on("host join", (data) => {
    socket.join(data.room);
    socket.emit("host joined", data);
  });
  socket.on("start game", (data) => {
    const game = {
      ...data,
      players: [],
      questions: [],
      current: 0,
      started: false,
    };
    games[data.room] = game;
    io.to(data.room).emit("game started", game);
  });
  socket.on("player join", (data) => {
    const game = games[data.room];
    if (!game) return;
    game.players.push(data);
    io.to(data.room).emit("player joined", data);
  });
  socket.on("next question", (data) => {
    const game = games[data.room];
    if (!game) return;
    game.current++;
    io.to(data.room).emit("question", game.questions[game.current]);
  });
  socket.on("submit answer", (data) => {
    const game = games[data.room];
    if (!game) return;
    game.questions[game.current].answers = game.questions[game.current].answers || [];
    game.questions[game.current].answers.push(data);
    io.to(data.room).emit("answer submitted", data);
  });
  socket.on("end game", (data) => {
    const game = games[data.room];
    if (!game) return;
    io.to(data.room).emit("game ended", game);
    delete games[data.room];
  });
});

server.listen(port, () => console.log(`Server listening on port ${port}`));

process.on("uncaughtException", (err) => console.error(err));
