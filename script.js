document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([20, 77], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Track user location
  if (navigator.geolocation) {
    let userMarker, accuracyCircle;

    function updateUserLocation(position) {
      const { latitude, longitude, accuracy } = position.coords;
      map.setView([latitude, longitude], 14);

      const userIcon = L.divIcon({
        html: '<div style="width: 12px; height: 12px; background: blue; border-radius: 50%;"></div>',
        className: "",
        iconSize: [12, 12]
      });

      // Remove previous marker and circle
      if (userMarker) map.removeLayer(userMarker);
      if (accuracyCircle) map.removeLayer(accuracyCircle);

      userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
        .bindPopup("<strong>You are here!</strong>").openPopup();

      accuracyCircle = L.circle([latitude, longitude], {
        radius: accuracy || 100,
        color: "blue",
        fillColor: "#add8e6",
        fillOpacity: 0.4
      }).addTo(map);
    }

    function handleLocationError(error) {
      console.error("Geolocation error:", error);
    }

    navigator.geolocation.watchPosition(updateUserLocation, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  }

  // Event form and list
  const form = document.getElementById("eventForm");
  const eventList = document.querySelector(".event-list");
  const searchInput = document.querySelector(".search-input");
  const searchButton = document.querySelector(".search-button");
  const filterButtons = document.querySelectorAll(".filter");

  let events = JSON.parse(localStorage.getItem("events")) || [];
  let markers = [];
  let selectedMarker = null;
  let currentFilter = "all"; // Track the currently selected filter

  const categoryIcons = {
    "concert": "🎵",
    "workshop": "📚",
    "sports": "⚽",
    "theater": "🎭",
    "food": "🍔"
  };

  function createCustomIcon(symbol) {
    return L.divIcon({
      html: `<div style="font-size: 20px; text-align:center;">${symbol}</div>`,
      className: "",
      iconSize: [25, 25]
    });
  }

  function addEvent(eventData) {
    const { name, category, lat, lng } = eventData;
    const symbol = categoryIcons[category] || "📍";

    const marker = L.marker([lat, lng], { icon: createCustomIcon(symbol) })
      .addTo(map)
      .bindPopup(`<strong>${name}</strong> (${category})`);

    markers.push({ marker, category, id: eventData.id });

    const li = document.createElement("li");
    li.innerHTML = `${symbol} ${name} (${category}) (${lat.toFixed(4)}, ${lng.toFixed(4)}) 
                    <button class="delete-btn">Delete</button>`;

    li.querySelector(".delete-btn").addEventListener("click", () => {
      map.removeLayer(marker);
      events = events.filter(e => e.id !== eventData.id);
      saveEvents();
      renderEvents();
    });

    eventList.appendChild(li);
  }

  function saveEvents() {
    localStorage.setItem("events", JSON.stringify(events));
  }

  function renderEvents() {
    eventList.innerHTML = "";
    markers.forEach(({ marker }) => map.removeLayer(marker));
    markers = [];

    events.forEach(event => {
      if (currentFilter === "all" || event.category === currentFilter) {
        addEvent(event);
      }
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.querySelector("input:nth-of-type(1)").value.trim();
    const locationName = form.querySelector("input:nth-of-type(2)").value.trim();
    const category = form.querySelector("select").value;
    const lat = parseFloat(form.querySelector("input:nth-of-type(3)").value);
    const lng = parseFloat(form.querySelector("input:nth-of-type(4)").value);

    if (!name || !category || isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid event details.");
      return;
    }

    const newEvent = { id: Date.now(), name, locationName, category, lat, lng };
    events.push(newEvent);
    addEvent(newEvent);
    saveEvents();
    form.reset();
  });

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      filterButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      currentFilter = button.dataset.category || "all";
      renderEvents();
    });
  });

  async function searchLocation() {
    const query = searchInput.value.trim();
    if (!query) return;

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
    const data = await response.json();

    if (data.length > 0) {
      const { lat, lon } = data[0];
      map.setView([lat, lon], 12);
    } else {
      alert("Location not found!");
    }
  }

  searchButton.addEventListener("click", searchLocation);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchLocation();
    }
  });

  // Allow users to click on the map to set an event location
  map.on("click", function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Fill input fields with clicked coordinates
    form.querySelector("input:nth-of-type(3)").value = lat.toFixed(6);
    form.querySelector("input:nth-of-type(4)").value = lng.toFixed(6);

    // Remove previous marker if exists
    if (selectedMarker) {
      map.removeLayer(selectedMarker);
    }

    // Add new marker at clicked location
    selectedMarker = L.marker([lat, lng]).addTo(map)
      .bindPopup(`<strong>Event Location:</strong> (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      .openPopup();
  });

  renderEvents();
});
