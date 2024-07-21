const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// Initialize the Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));

// Middleware for parsing JSON requests
app.use(express.json());

// Serve the index.ejs file for the main route
app.get("/", (req, res) => {
  res.render("index"); // Renders index.ejs
});

// Handle real-time communication with Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle location sharing
  socket.on("send-location", (data) => {
    // Broadcast location to all clients
    socket.broadcast.emit("receive-location", {
      id: socket.id,
      ...data,
    });
    console.log(`Location received from ${socket.id}:`, data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    socket.broadcast.emit("user-disconnected", socket.id);
  });

  // Update user list
  io.emit("update-user-list", Array.from(io.sockets.sockets.keys()));
});

// Start the server on port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
