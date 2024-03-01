const express = require("express");
const auth = require("./assets/auth");
const app = express();
const port = 3000;
const renderData = {
  appName: "Guessit",
};

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("views", __dirname + "/public/views");

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.render("index", renderData);
});

io.use(auth);

io.on("connection", (socket) => {
  console.log(socket.user);
});

server.listen(port, () => console.log(`Server listening on port ${port}`));
