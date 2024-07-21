const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

let users = {};

io.on("connection", function (socket) {
  socket.on("send-location", function (data) {
    users[socket.id] = { ...data };
    io.emit("receive-location", { id: socket.id, ...data });
    io.emit("update-user-list", Object.keys(users));

    const message = `Check out my location on LocTrack!`;
    io.emit("share-location", { id: socket.id, ...data, message });
  });
  socket.on("disconnect", function () {
    delete users[socket.id];
    io.emit("user-disconnected", socket.id);
    io.emit("update-user-list", Object.keys(users));
  });
  console.log("connection successful");
});
app.get("/", function (req, res) {
  res.render("index");
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
