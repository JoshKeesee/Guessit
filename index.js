const express = require("express");
const auth = require("./assets/auth");
const app = express();
const port = 3000;
const renderData = {
  appName: "Guessit",
  user: null,
  buttons: true,
  homepage: false,
};

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("views", __dirname + "/public/views");

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("index", { ...renderData, title: "An online quiz game show", homepage: true }));
app.get("/login", (req, res) => res.render("auth", {
  ...renderData,
  title: "Login",
  newUser: false,
  buttons: false,
}));
app.get("/signup", (req, res) => res.render("auth", {
  ...renderData,
  title: "Sign Up",
  newUser: true,
  buttons: false,
}));

io.use(auth);

io.on("connection", (socket) => {
  // console.log(socket.user);
});

server.listen(port, () => console.log(`Server listening on port ${port}`));
