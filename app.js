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
  tick();
  setInterval(tick, 30000);

  const map = L.map("map", { zoomControl: true, attributionControl: true }).setView(data.center, data.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const pin = (color) => L.divIcon({
    className: "",
    iconSize: [16, 16],
    html: "<div style=\"width:14px;height:14px;border-radius:50%;background:" + color + ";border:2px solid #fff;box-shadow:0 0 0 4px rgba(0,0,0,.25)\"></div>"
  });

  data.places.forEach((p) => {
    L.marker([p.lat, p.lng], { icon: pin("#e82127") }).addTo(map).bindPopup("<strong>" + p.name + "</strong><br>" + p.note);
  });
  data.chargers.forEach((c) => {
    L.marker([c.lat, c.lng], { icon: pin("#3ddc84") }).addTo(map).bindPopup("<strong>" + c.name + "</strong><br>" + c.note);
  });

  data.places.forEach((place) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = place.name;
    btn.addEventListener("click", () => {
      form.to.value = place.query;
      map.setView([place.lat, place.lng], 12);
      buildPlan();
      planEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    document.getElementById("chips").appendChild(btn);
  });

  data.chargers.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = "<strong></strong><span></span>";
    li.querySelector("strong").textContent = c.name.replace("Tesla Supercharger — ", "");
    li.querySelector("span").textContent = c.note;
    li.addEventListener("click", () => {
      map.setView([c.lat, c.lng], 14);
      form.to.value = c.name + ", TX";
      buildPlan();
    });
    document.getElementById("chargers").appendChild(li);
  });

  data.parking.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = "<strong></strong><span></span>";
    li.querySelector("strong").textContent = p.name;
    li.querySelector("span").textContent = p.rate + " · " + p.use;
    document.getElementById("parking").appendChild(li);
  });

  data.heatTips.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
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
      ? " Prebook parking at dfwairport.com/park. Terminal is closest; Remote is cheapest."
      : "";
    planEl.hidden = false;
    planEl.innerHTML =
      "<p><strong>" + from + " → " + to + "</strong></p>" +
      "<p>" + note + park + "</p>" +
      "<p>Live traffic: Google or Waze. Incidents: 511DFW.</p>" +
      "<p>Nearest Supercharger: " + charge.name.replace("Tesla Supercharger — ", "") + ". Confirm in the Tesla app. Leave a 15% buffer.</p>";
    if (place) map.setView([place.lat, place.lng], 12);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    buildPlan();
  });
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
      newsEl.innerHTML = "<li>Headlines unavailable here. Use <a href=\"https://www.511dfw.org/\" target=\"_blank\" rel=\"noopener\">511DFW</a>.</li>";
    });
})();
