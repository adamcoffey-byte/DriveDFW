(function () {
  const data = window.DRIVEDFW;
  const form = document.getElementById("trip-form");
  const fromSel = document.getElementById("from-select");
  const toSel = document.getElementById("to-select");
  const planEl = document.getElementById("plan");
  let wxNow = null;

  const starts = [
    { name: "Euless (home)", query: "Euless, TX" },
    { name: "Bedford", query: "Bedford, TX" },
    { name: "Hurst", query: "Hurst, TX" },
    { name: "Irving", query: "Irving, TX" }
  ].concat(data.places.map((p) => ({ name: p.name, query: p.query })));

  const dests = [{ name: "Choose a destination", query: "" }]
    .concat(data.places.map((p) => ({ name: p.name, query: p.query })))
    .concat(data.chargers.map((c) => ({ name: c.name.replace("Tesla Supercharger — ", "Supercharger — "), query: c.name + ", TX" })));

  function fill(sel, list, selected) {
    sel.innerHTML = "";
    list.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.query;
      opt.textContent = item.name;
      if (item.query === selected) opt.selected = true;
      sel.appendChild(opt);
    });
  }
  fill(fromSel, starts, data.homeDefault);
  fill(toSel, dests, "");

  const clock = document.getElementById("clock");
  function tick() {
    clock.textContent = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit"
    });
  }
  tick(); setInterval(tick, 30000);

  function wxLabel(code) {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly cloudy";
    if (code <= 48) return "Fog";
    if (code <= 57) return "Drizzle";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Showers";
    return "Storms";
  }
  fetch("https://api.open-meteo.com/v1/forecast?latitude=32.837&longitude=-97.082&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FChicago&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=7")
    .then((r) => r.json())
    .then((wx) => {
      const c = wx.current; wxNow = c;
      document.getElementById("wx-now").innerHTML =
        "<div class=\"wx-temp\">" + Math.round(c.temperature_2m) + "°</div>" +
        "<div class=\"wx-meta\"><strong>" + wxLabel(c.weather_code) + "</strong><br>Wind " +
        Math.round(c.wind_speed_10m) + " mph · Humidity " + Math.round(c.relative_humidity_2m) + "%</div>";
      const days = document.getElementById("wx-days"); days.innerHTML = "";
      wx.daily.time.forEach((day, i) => {
        const el = document.createElement("div"); el.className = "wx-day";
        const name = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" });
        el.innerHTML = "<b>" + name + "</b><em>" + Math.round(wx.daily.temperature_2m_max[i]) + "°</em><span>" +
          Math.round(wx.daily.temperature_2m_min[i]) + "° · " + wx.daily.precipitation_probability_max[i] + "%</span>";
        days.appendChild(el);
      });
    })
    .catch(() => { document.getElementById("wx-now").textContent = "Forecast unavailable."; });

  const map = L.map("map").setView(data.center, data.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
  const pin = (color) => L.divIcon({ className: "", iconSize: [16, 16], html: "<div style=\"width:14px;height:14px;border-radius:50%;background:" + color + ";border:2px solid #fff\"></div>" });
  data.places.forEach((p) => L.marker([p.lat, p.lng], { icon: pin("#e82127") }).addTo(map).bindPopup("<strong>" + p.name + "</strong><br>" + p.note));
  data.chargers.forEach((c) => L.marker([c.lat, c.lng], { icon: pin("#3ddc84") }).addTo(map).bindPopup("<strong>" + c.name + "</strong><br>" + c.note));

  function setTo(query) {
    toSel.value = query;
    if (!toSel.value) {
      const opt = document.createElement("option");
      opt.value = query; opt.textContent = query; opt.selected = true;
      toSel.appendChild(opt);
    }
    [...document.querySelectorAll("#chips button")].forEach((b) => {
      b.classList.toggle("active", b.dataset.query === query);
    });
  }

  data.places.forEach((place) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = place.name; btn.dataset.query = place.query;
    btn.addEventListener("click", () => { setTo(place.query); map.setView([place.lat, place.lng], 12); buildPlan(); });
    document.getElementById("chips").appendChild(btn);
  });
  data.chargers.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = "<strong></strong><span></span>";
    li.querySelector("strong").textContent = c.name.replace("Tesla Supercharger — ", "");
    li.querySelector("span").textContent = c.note;
    li.addEventListener("click", () => { setTo(c.name + ", TX"); map.setView([c.lat, c.lng], 14); buildPlan(); });
    document.getElementById("chargers").appendChild(li);
  });
  data.parking.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = "<strong></strong><span></span>";
    li.querySelector("strong").textContent = p.name;
    li.querySelector("span").textContent = p.rate + " · " + p.use;
    document.getElementById("parking").appendChild(li);
  });
  data.heatTips.forEach((t) => { const li = document.createElement("li"); li.textContent = t; document.getElementById("heat").appendChild(li); });
  data.corridors.forEach((c) => {
    const art = document.createElement("article"); art.innerHTML = "<h4></h4><p></p>";
    art.querySelector("h4").textContent = c.title; art.querySelector("p").textContent = c.body;
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
    const from = encodeURIComponent(fromSel.value);
    const to = encodeURIComponent(toSel.value);
    if (kind === "apple") return "https://maps.apple.com/?saddr=" + from + "&daddr=" + to;
    if (kind === "waze") return "https://waze.com/ul?q=" + to + "&navigate=yes";
    if (kind === "511") return "https://www.511dfw.org/";
    return "https://www.google.com/maps/dir/?api=1&origin=" + from + "&destination=" + to + "&travelmode=driving";
  }
  function buildPlan() {
    const from = fromSel.value.trim();
    const to = toSel.value.trim();
    if (!from || !to) {
      planEl.hidden = false;
      planEl.innerHTML = "<p><strong>Pick a destination.</strong></p><p>Start is set. Choose where you are going.</p>";
      return;
    }
    const place = findPlace(to);
    const charge = nearestCharger(place);
    const note = place ? place.note : "Watch 183/121 and I-35W across Mid-Cities.";
    const park = /airport|dfw|love field/i.test(to) ? " Prebook parking at dfwairport.com/park." : "";
    const heat = wxNow && wxNow.temperature_2m >= 90 ? " Precondition — it is hot." : " Leave a 15% charge buffer.";
    const fromName = fromSel.options[fromSel.selectedIndex]?.text || from;
    const toName = toSel.options[toSel.selectedIndex]?.text || to;
    planEl.hidden = false;
    planEl.innerHTML =
      "<p><strong>Start:</strong> " + fromName + "</p>" +
      "<p><strong>Destination:</strong> " + toName + "</p>" +
      "<p>" + note + park + heat + "</p>" +
      "<p>Nearest Supercharger: " + charge.name.replace("Tesla Supercharger — ", "") + ".</p>";
    if (place) map.setView([place.lat, place.lng], 12);
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); buildPlan(); });
  toSel.addEventListener("change", buildPlan);
  fromSel.addEventListener("change", () => { if (toSel.value) buildPlan(); });
  document.querySelectorAll("[data-maps]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.getAttribute("data-maps") === "511" || (fromSel.value && toSel.value)) window.open(mapsUrl(btn.getAttribute("data-maps")), "_blank");
    });
  });

  const newsEl = document.getElementById("news");
  fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://news.google.com/rss/search?q=DFW+traffic+OR+%22DFW+Airport%22&hl=en-US&gl=US&ceid=US:en"))
    .then((r) => r.text())
    .then((xml) => {
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const items = [...doc.querySelectorAll("item")].slice(0, 6);
      if (!items.length) throw new Error("empty");
      newsEl.innerHTML = "";
      items.forEach((item) => {
        const li = document.createElement("li"); const a = document.createElement("a");
        a.href = item.querySelector("link")?.textContent || "#"; a.target = "_blank"; a.rel = "noopener";
        a.textContent = item.querySelector("title")?.textContent || "Headline";
        li.appendChild(a); newsEl.appendChild(li);
      });
    })
    .catch(() => { newsEl.innerHTML = "<li>Use <a href=\"https://www.511dfw.org/\" target=\"_blank\" rel=\"noopener\">511DFW</a>.</li>"; });
})();
