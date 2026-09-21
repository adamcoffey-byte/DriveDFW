(function () {
  const data = window.DRIVEDFW;
  const form = document.getElementById("trip-form");
  const planEl = document.getElementById("plan");
  const chips = document.getElementById("chips");
  const savedEl = document.getElementById("saved");
  const savedEmpty = document.getElementById("saved-empty");
  const heatEl = document.getElementById("heat");
  const corridorsEl = document.getElementById("corridors");
  const clock = document.getElementById("clock");
  const KEY = "drivedfw-trips-v1";

  form.from.value = data.homeDefault;

  function tick() {
    clock.textContent = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  tick();
  setInterval(tick, 30000);

  data.places.forEach((place) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = place.name;
    btn.addEventListener("click", () => {
      form.to.value = place.query;
      buildPlan();
    });
    chips.appendChild(btn);
  });

  data.heatTips.forEach((tip) => {
    const li = document.createElement("li");
    li.textContent = tip;
    heatEl.appendChild(li);
  });

  data.corridors.forEach((c) => {
    const art = document.createElement("article");
    art.innerHTML = "<h4></h4><p></p>";
    art.querySelector("h4").textContent = c.title;
    art.querySelector("p").textContent = c.body;
    corridorsEl.appendChild(art);
  });

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }
  function storeSaved(list) {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
  }
  function renderSaved() {
    const list = loadSaved();
    savedEl.innerHTML = "";
    savedEmpty.hidden = list.length > 0;
    list.forEach((trip) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost";
      btn.textContent = trip.from + " → " + trip.to;
      btn.addEventListener("click", () => {
        form.from.value = trip.from;
        form.to.value = trip.to;
        buildPlan(false);
      });
      li.appendChild(btn);
      savedEl.appendChild(li);
    });
  }

  function findPlace(to) {
    const q = to.toLowerCase();
    return data.places.find((p) =>
      q.includes(p.name.toLowerCase()) || q.includes(p.query.toLowerCase())
    );
  }

  function mapsUrl(kind) {
    const from = encodeURIComponent(form.from.value.trim());
    const to = encodeURIComponent(form.to.value.trim());
    if (kind === "apple") {
      return "https://maps.apple.com/?saddr=" + from + "&daddr=" + to;
    }
    return "https://www.google.com/maps/dir/?api=1&origin=" + from + "&destination=" + to;
  }

  function buildPlan(save) {
    const from = form.from.value.trim();
    const to = form.to.value.trim();
    if (!from || !to) return;
    const place = findPlace(to);
    const note = place ? place.note : "Watch 183/121 and I-35W if you cut across Mid-Cities.";
    planEl.hidden = false;
    planEl.innerHTML =
      "<p><strong>" + from + " → " + to + "</strong></p>" +
      "<p>" + note + "</p>" +
      "<p>Leave a 15% charge buffer. Precondition if it is hot.</p>";
    if (save !== false) {
      const list = loadSaved().filter((t) => t.from !== from || t.to !== to);
      list.unshift({ from, to, at: Date.now() });
      storeSaved(list);
      renderSaved();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    buildPlan();
  });
  document.getElementById("maps-google").addEventListener("click", () => {
    if (form.from.value && form.to.value) window.open(mapsUrl("google"), "_blank");
  });
  document.getElementById("maps-apple").addEventListener("click", () => {
    if (form.from.value && form.to.value) window.open(mapsUrl("apple"), "_blank");
  });

  renderSaved();
})();
