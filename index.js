const express = require("express");
const auth = require("./assets/auth");
const app = express();
const session = require("express-session");
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

if (!db.get("users")) db.set("users", []);
if (!db.get("packs")) db.set("packs", []);

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
  })
);
app.use((req, res, next) => {
  const allowed = ["/login", "/signup", "/"];
  const notAllowed = ["/dashboard"];
  if (!req.session.user && notAllowed.includes(req.path)) return res.redirect("/login");
  if (req.session.user && allowed.includes(req.path)) return res.redirect("/dashboard");
  next();
});

app.get("/", (req, res) => {
  res.render("index", {
    ...renderData,
    title: "An online quiz game show",
    homepage: true,
    styles: [
      ...renderData.styles,
      "/css/index.css",
    ],
  });
});
app.get("/login", (req, res) =>
  res.render("auth", {
    ...renderData,
    title: "Login",
    newUser: false,
    buttons: false,
    styles: [
      ...renderData.styles,
      "/css/auth.css",
    ],
  }),
);
app.get("/signup", (req, res) =>
  res.render("auth", {
    ...renderData,
    title: "Sign Up",
    newUser: true,
    buttons: false,
    styles: [
      ...renderData.styles,
      "/css/auth.css",
    ],
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
      } else res.json({
          success: false,
          errors: [
            { param: "password", msg: "Incorrect password" },
          ]
        });
    });
  } else {
    res.json({ success: false, errors: [{ param: "username", msg: "User not found" }] });
  }
});
app.post("/signup", (req, res) => {
  const { username, email, password, confirm } = req.body;
  const users = db.get("users");
  const errors = [];
  if (password != confirm) errors.push({
    param: "confirm",
    msg: "Passwords do not match",
  });
  if (password.length < 6) errors.push({
    param: "password",
    msg: "Password must be at least 6 characters long",
  });
  if (users.find((user) => user.username == username)) errors.push({
    param: "username",
    msg: "Username already taken",
  });
  if (users.find((user) => user.email == email)) errors.push({
    param: "email",
    msg: "Email already taken",
  });
  if (errors.length) res.json({ success: false, errors });
  else
    bcrypt.hash(password, saltRounds, (err, hash) => {
      req.session.user = { username, email, profile: null, id: users.length + 1 };
      db.set("users", [
        ...users,
        {
          username,
          email,
          password: hash,
          profile: null,
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
  const packs = db.get("packs").filter((pack) => pack.author == req.session.user.id).map((pack) => {
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
    styles: [
      ...renderData.styles,
      "/css/dashboard.css",
    ],
  });
});
app.use("*", (req, res) =>
  res.render("404", {
    ...renderData,
    title: "Not found",
    buttons: false,
    styles: [
      ...renderData.styles,
      "/css/404.css",
    ],
  }),
);

io.use(auth);

io.on("connection", (socket) => {
  // console.log(socket.user);
});

server.listen(port, () => console.log(`Server listening on port ${port}`));
