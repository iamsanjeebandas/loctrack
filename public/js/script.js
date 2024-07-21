const socket = io();

// Function to initialize Clerk
const initializeClerk = async () => {
  try {
    await window.Clerk.load();
    const user = window.Clerk.user;

    if (!user) {
      window.Clerk.redirectToSignIn();
    } else {
      console.log("User authenticated", user);
    }
  } catch (error) {
    console.error("Clerk authentication error:", error);
  }
};

// Ensure Clerk is initialized before using it
window.addEventListener("load", async () => {
  if (window.Clerk) {
    await initializeClerk();
  } else {
    console.error("Clerk is not available.");
  }
});

// Initialize the leaflet map variable
let map;
const markers = {};
const userList = document.getElementById("user-list");

// Function to handle geolocation success
const onGeolocationSuccess = (position) => {
  const { latitude, longitude } = position.coords;

  // Initialize the map with the user's location
  map = L.map("map").setView([latitude, longitude], 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "LocTrack",
  }).addTo(map);

  // Place a marker for the current user
  if (!markers["current"]) {
    markers["current"] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("You are here");
  }
};

// Function to handle geolocation error
const onGeolocationError = (error) => {
  console.error("Geolocation error:", error);
};

// Check if geolocation is available and get the current position
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    onGeolocationSuccess,
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
});

// Update user list
socket.on("update-user-list", (userIds) => {
  userList.innerHTML = userIds.map((id) => `<li>${id}</li>`).join("");
});

// Share location message
socket.on("share-location", (data) => {
  const { id, latitude, longitude, message } = data;
  const link = `https://loctrack-webapp.onrender.com?latitude=${latitude}&longitude=${longitude}`;
  const shareMessage = `${message}\n${link}`;
  console.log(`Share message: ${shareMessage}`);
});
