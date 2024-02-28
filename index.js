const express = require("express");
const app = express();
const port = 3000;
const renderData = {
    appName: "Guessit",
    contactEmail: "joshuakeesee1@gmail.com",
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

io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });
});

server.listen(port, () => console.log(`Server listening on port ${port}`));