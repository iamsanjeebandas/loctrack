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

// Object to keep track of user locations and tracking requests
const userLocations = {};
const trackingRequests = {};

// Handle real-time communication with Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle location sharing
  socket.on("send-location", (data) => {
    userLocations[socket.id] = data; // Store the user's location
    // Broadcast location to all clients
    socket.broadcast.emit("receive-location", {
      id: socket.id,
      ...data,
    });
    console.log(`Location received from ${socket.id}:`, data);
  });

  // Handle tracking requests
  socket.on("track-user", (targetId) => {
    if (!trackingRequests[socket.id]) {
      trackingRequests[socket.id] = new Set();
    }
    trackingRequests[socket.id].add(targetId);

    // Notify the target user that they are being tracked
    io.to(targetId).emit("tracking-request", { trackerId: socket.id });
  });

  // Handle tracking updates
  socket.on("stop-tracking", (targetId) => {
    if (trackingRequests[socket.id]) {
      trackingRequests[socket.id].delete(targetId);
    }
  });

  // Broadcast location updates to trackers
  socket.on("track-update", () => {
    if (trackingRequests[socket.id]) {
      trackingRequests[socket.id].forEach((trackedId) => {
        io.to(trackedId).emit("receive-tracking-update", {
          trackerId: socket.id,
          location: userLocations[socket.id],
        });
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Notify all clients that the user has disconnected
    socket.broadcast.emit("user-disconnected", socket.id);

    // Remove the user from tracking requests
    delete userLocations[socket.id];
    delete trackingRequests[socket.id];

    // Update the user list
    io.emit("update-user-list", Array.from(io.sockets.sockets.keys()));
  });
});

// Start the server on port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
