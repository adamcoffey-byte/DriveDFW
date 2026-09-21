(function () {
  const data = window.DRIVEDFW;
  const form = document.getElementById("trip-form");
  const planEl = document.getElementById("plan");
  form.from.value = data.homeDefault;

  const clock = document.getElementById("clock");
  function tick() {
    clock.textContent = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit"
    });
  }
  tick(); setInterval(tick, 30000);

  const map = L.map("map").setView(data.center, data.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const destIcon = L.divIcon({ className: "", html: "<div style=\"width:12px;height:12px;border-radius:50%;background:#f87171;border:2px solid #fff\"></div>" });
  const chargeIcon = L.divIcon({ className: "", html: "<div style=\"width:12px;height:12px;border-radius:50%;background:#6ee7b7;border:2px solid #fff\"></div>" });

  data.places.forEach((p) => {
    L.marker([p.lat, p.lng], { icon: destIcon }).addTo(map).bindPopup(p.name + "<br>" + p.note);
  });
  data.chargers.forEach((c) => {
    L.marker([c.lat, c.lng], { icon: chargeIcon }).addTo(map).bindPopup("<strong>" + c.name + "</strong><br>" + c.note);
  });

  data.places.forEach((place) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = place.name;
    btn.addEventListener("click", () => {
      form.to.value = place.query;
      map.setView([place.lat, place.lng], 12);
      buildPlan();
    });
    document.getElementById("chips").appendChild(btn);
  });

  data.chargers.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c.name + " — " + c.note;
    li.addEventListener("click", () => {
      map.setView([c.lat, c.lng], 14);
      form.to.value = c.name + ", TX";
      buildPlan(false);
    });
    document.getElementById("chargers").appendChild(li);
  });

  data.parking.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = "<strong>" + p.name + "</strong> — " + p.rate + ". " + p.use;
    document.getElementById("parking").appendChild(li);
  });
  data.heatTips.forEach((t) => {
    const li = document.createElement("li"); li.textContent = t;
    document.getElementById("heat").appendChild(li);
  });
  data.corridors.forEach((c) => {
    const art = document.createElement("article");
    art.innerHTML = "<h4></h4><p></p>";
    art.querySelector("h4").textContent = c.title;
    art.querySelector("p").textContent = c.body;
    document.getElementById("corridors").appendChild(art);
  });

  function findPlace(to) {
    const q = to.toLowerCase();
    return data.places.find((p) => q.includes(p.name.toLowerCase()) || q.includes(p.query.toLowerCase()));
  }
  function nearestCharger(place) {
    if (!place) return data.chargers[0];
    return data.chargers.slice().sort((a, b) => {
      const da = (a.lat - place.lat) ** 2 + (a.lng - place.lng) ** 2;
      const db = (b.lat - place.lat) ** 2 + (b.lng - place.lng) ** 2;
      return da - db;
    })[0];
  }
  function mapsUrl(kind) {
    const from = encodeURIComponent(form.from.value.trim());
    const to = encodeURIComponent(form.to.value.trim());
    if (kind === "apple") return "https://maps.apple.com/?saddr=" + from + "&daddr=" + to;
    if (kind === "waze") return "https://waze.com/ul?q=" + to + "&navigate=yes";
    if (kind === "511") return "https://www.511dfw.org/";
    return "https://www.google.com/maps/dir/?api=1&origin=" + from + "&destination=" + to + "&travelmode=driving";
  }
  function buildPlan() {
    const from = form.from.value.trim();
    const to = form.to.value.trim();
    if (!from || !to) return;
    const place = findPlace(to);
    const charge = nearestCharger(place);
    const note = place ? place.note : "Watch 183/121 and I-35W across Mid-Cities.";
    const park = /airport|dfw|love field/i.test(to)
      ? " Parking: prebook on dfwairport.com/park if this is a flight. Terminal is closest; Remote is cheapest."
      : "";
    planEl.hidden = false;
    planEl.innerHTML =
      "<p><strong>Best route now:</strong> open Google or Waze for live traffic, then check 511DFW for incidents.</p>" +
      "<p><strong>" + from + " → " + to + "</strong></p>" +
      "<p>" + note + park + "</p>" +
      "<p>Nearest listed Supercharger: " + charge.name + ". Confirm in the Tesla app. Leave a 15% buffer.</p>";
    if (place) map.setView([place.lat, place.lng], 12);
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); buildPlan(); });
  document.querySelectorAll("[data-maps]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.getAttribute("data-maps") === "511" || (form.from.value && form.to.value)) {
        window.open(mapsUrl(btn.getAttribute("data-maps")), "_blank");
      }
    });
  });

  const newsEl = document.getElementById("news");
  const feed = "https://news.google.com/rss/search?q=DFW+traffic+OR+%22DFW+Airport%22+parking+OR+%22North+Texas%22+highway&hl=en-US&gl=US&ceid=US:en";
  const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(feed);
  fetch(proxy)
    .then((r) => r.text())
    .then((xml) => {
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const items = [...doc.querySelectorAll("item")].slice(0, 6);
      if (!items.length) throw new Error("empty");
      newsEl.innerHTML = "";
      items.forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = item.querySelector("link")?.textContent || "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = item.querySelector("title")?.textContent || "Headline";
        li.appendChild(a);
        newsEl.appendChild(li);
      });
    })
    .catch(() => {
      newsEl.innerHTML = "<li>News feed blocked in this browser. Use <a href=\"https://www.511dfw.org/\" target=\"_blank\" rel=\"noopener\">511DFW</a> and local news.</li>";
    });
})();
