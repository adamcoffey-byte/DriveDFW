const destinations = [
  "DFW Airport",
  "Downtown Fort Worth",
  "Downtown Dallas",
  "Arlington",
  "Grapevine",
  "Alliance",
];

const clock = document.getElementById("clock");
const form = document.getElementById("trip-form");
const out = document.getElementById("plan-out");
const chips = document.getElementById("chips");

function tick() {
  clock.textContent = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
tick();
setInterval(tick, 30_000);

destinations.forEach((name) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = name;
  btn.addEventListener("click", () => {
    form.to.value = name;
    form.requestSubmit();
  });
  chips.appendChild(btn);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const from = form.from.value.trim();
  const to = form.to.value.trim();
  out.textContent = `DriveDFW plan: ${from} → ${to}. Watch 183/121 and I-35W. Precondition if it is hot. Leave a 15% arrival buffer.`;
});
