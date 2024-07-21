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
      document.getElementById("loading").style.display = "none";
      document.getElementById("map").style.display = "block";
      document.getElementById("user-list").style.display = "block";
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

// Geolocation functionality
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      socket.emit("send-location", { latitude, longitude });
    },
    (error) => {
      console.error(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
}

// Initialize the leaflet map
const map = L.map("map").setView([0, 0], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "LocTrack",
}).addTo(map);

const markers = {};
const userList = document.getElementById("user-list");

socket.on("receive-location", (data) => {
  const { id, latitude, longitude } = data;
  map.setView([latitude, longitude], 16);
  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    markers[id] = L.marker([latitude, longitude]).addTo(map);
  }
});

socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});

socket.on("update-user-list", (userIds) => {
  userList.innerHTML = userIds.map((id) => `<li>${id}</li>`).join("");
});

socket.on("share-location", (data) => {
  const { id, latitude, longitude, message } = data;
  const link = `https://loctrack-webapp.onrender.com?latitude=${latitude}&longitude=${longitude}`;
  const shareMessage = `${message}\n${link}`;
  console.log(`Share message: ${shareMessage}`);
});
