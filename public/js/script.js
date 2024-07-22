const socket = io();

// Initialize the leaflet map variable
let map;
const markers = {};
const polylines = {};
const userList = document.getElementById("user-list");
let currentPosition = null;
let positionUpdateInterval = null;
const trackingLines = {}; // To store tracking lines

// Function to handle geolocation success
const onGeolocationSuccess = (position) => {
  const { latitude, longitude } = position.coords;

  // Initialize the map with the user's location
  if (!map) {
    map = L.map("map").setView([latitude, longitude], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "LocTrack",
    }).addTo(map);
  }

  // Place a marker for the current user
  if (!markers["current"]) {
    markers["current"] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("You are here");
  } else {
    markers["current"].setLatLng([latitude, longitude]);
  }

  currentPosition = { latitude, longitude };

  // Start or restart updating the location periodically
  if (positionUpdateInterval) {
    clearInterval(positionUpdateInterval);
  }
  positionUpdateInterval = setInterval(updateLocation, 5000);
};

// Function to handle geolocation error
const onGeolocationError = (error) => {
  console.error("Geolocation error:", error);
};

// Function to update location periodically
const updateLocation = () => {
  if (currentPosition) {
    // Update the server with the user's current location
    socket.emit("send-location", currentPosition);
  }
};

// Check if geolocation is available and get the current position
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      onGeolocationSuccess(position); // Update location on each change
    },
    onGeolocationError,
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
} else {
  console.error("Geolocation is not supported by this browser.");
}

// Handle real-time location updates
socket.on("receive-location", (data) => {
  if (!map) return; // Ensure map is initialized before handling location updates

  const { id, latitude, longitude } = data;
  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`User: ${id}`);

    // Create a new polyline for the user
    polylines[id] = L.polyline([[latitude, longitude]], {
      color: "blue",
    }).addTo(map);
  }

  // Update the polyline with the new location
  if (polylines[id]) {
    const latlngs = polylines[id].getLatLngs();
    latlngs.push([latitude, longitude]);
    polylines[id].setLatLngs(latlngs);
  }

  // Optionally center the map on the first received location
  if (Object.keys(markers).length === 1) {
    map.setView([latitude, longitude], 16);
  }
});

// Handle user disconnection
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
  if (polylines[id]) {
    map.removeLayer(polylines[id]);
    delete polylines[id];
  }

  // Remove tracking lines for the disconnected user
  if (trackingLines[id]) {
    map.removeLayer(trackingLines[id]);
    delete trackingLines[id];
  }
});

// Update user list
socket.on("update-user-list", (userIds) => {
  userList.innerHTML = userIds
    .map(
      (id) =>
        `<li><button onclick="trackUser('${id}')">Track ${id}</button></li>`
    )
    .join("");
});

// Function to handle tracking requests
const trackUser = (id) => {
  // Emit tracking request to server
  socket.emit("track-user", id);
};

// Handle tracking updates
socket.on("receive-tracking-update", (data) => {
  const { trackerId, location } = data;
  const { latitude, longitude } = location;

  if (!trackingLines[trackerId]) {
    // Create a new polyline for tracking
    trackingLines[trackerId] = L.polyline([[latitude, longitude]], {
      color: "red",
    }).addTo(map);
  } else {
    // Update the existing polyline
    const latlngs = trackingLines[trackerId].getLatLngs();
    latlngs.push([latitude, longitude]);
    trackingLines[trackerId].setLatLngs(latlngs);
  }
});

// Share location message
socket.on("share-location", (data) => {
  const { id, latitude, longitude, message } = data;
  const link = `https://your-app-url?latitude=${latitude}&longitude=${longitude}`;
  const shareMessage = `${message}\n${link}`;
  console.log(`Share message: ${shareMessage}`);
});
