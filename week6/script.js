// ---------- Rest In Pieces ----------
// Background remover. It's loaded only when someone uploads, so if it ever
// fails to load the rest of the page keeps working (the photo flies up uncut).
let removeBackground = null;

async function cutOut(file) {
  try {
    if (!removeBackground) {
      statusEl.textContent = "summoning the background remover… (first time takes a bit)";
      ({ removeBackground } = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm"));
    }
    statusEl.textContent = "separating it from this world…";
    const blob = await removeBackground(file);   // PNG, background gone
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("Background removal failed:", err);
    return URL.createObjectURL(file);            // fall back to the original photo
  }
}

// ---------- Rest In Pieces ----------
// Upload a photo of dead tech -> it sprouts wings -> flies to the top of the pile.
// The newest relic always takes the peak; older ones settle down the slopes.

const stage     = document.getElementById("stage");
const fileInput = document.getElementById("file");
const nameInput = document.getElementById("name");
const statusEl  = document.getElementById("status");

// All positions are % of the background image (bottom-centre of the photo).
const PEAK  = { x: 48.4, y: 12.5 };
const SLOTS = [
  [40, 29],   [57.5, 28.5], [35, 36],   [62, 36], [45.5, 37.5],
  [52, 39.5], [30, 45],     [67, 44],   [38, 47], [59.5, 48],
];
const BASE_WIDTH = 7.5;   // relic width on the peak, % of the pile image

let current = null;
let retiredCount = 0;
let busy = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- wings (built from feathers so no image file is needed) ----------
function wingSVG() {
  // the wing's "arm" is a curve from the shoulder (0,70) out to the tip (190,15)
  const arm = (t) => {
    const u = 1 - t;
    return [u * u * 0 + 2 * u * t * 70 + t * t * 190,
            u * u * 70 + 2 * u * t * -5 + t * t * 15];
  };
  const feather = (x, y, angle, len, w, fill) =>
    `<path d="M0 0 Q${len * .45} ${-w} ${len} 0 Q${len * .45} ${w} 0 0Z"
       transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})"
       fill="${fill}" stroke="#a9b4c4" stroke-width=".6"/>`;

  let s = "";
  for (let i = 0; i <= 16; i++) {           // long flight feathers (back)
    const t = .08 + (i / 16) * .92, [x, y] = arm(t);
    s += feather(x, y, 100 - 80 * t, 45 + 70 * t ** 1.4, 7 + 3 * t, "url(#featherA)");
  }
  for (let i = 0; i <= 12; i++) {           // middle layer
    const t = .05 + (i / 12) * .85, [x, y] = arm(t);
    s += feather(x, y, 95 - 70 * t, 28 + 35 * t, 6, "url(#featherB)");
  }
  for (let i = 0; i <= 14; i++) {           // small fluffy feathers on top
    const t = (i / 14) * .9, [x, y] = arm(t);
    s += feather(x - 2, y + 2, 70 - 50 * t, 14 + 10 * t, 5, "#fff");
  }
  return `<svg viewBox="-10 -12 320 150" aria-hidden="true">${s}</svg>`;
}
const WING = wingSVG();

function makeRelic(src, label) {
  const el = document.createElement("div");
  el.className = "relic";
  const wing = `<div class="wing"><div class="flap">${WING}</div></div>`;
  el.innerHTML = `
    <div class="side r">${wing}</div>
    <div class="side l">${wing}</div>
    <div class="halo"></div>
    <img alt="">
    <div class="plaque"></div>`;
  el.querySelector("img").src = src;
  el.querySelector("img").alt = label;
  el.querySelector(".plaque").textContent = "R.I.P. " + label;
  el.title = label;
  return el;
}

// ---------- sparkles ----------
function sparkAt(x, y, spread = 1) {
  const s = document.createElement("div");
  s.className = "spark";
  s.style.left = x + "%";
  s.style.top = y + "%";
  s.style.setProperty("--dx", (Math.random() - .5) * 60 * spread + "px");
  s.style.setProperty("--dy", (Math.random() * 50 + 10) * spread + "px");
  s.style.setProperty("--life", (.6 + Math.random() * .7) + "s");
  stage.appendChild(s);
  s.addEventListener("animationend", () => s.remove());
}

function centreOf(el) {        // element centre as % of the stage
  const sr = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return [((r.left + r.width / 2 - sr.left) / sr.width) * 100,
          ((r.top + r.height / 2 - sr.top) / sr.height) * 100];
}

function burst(el, n) {
  const [x, y] = centreOf(el);
  for (let i = 0; i < n; i++) sparkAt(x + (Math.random() - .5) * 8, y + (Math.random() - .5) * 8, 2);
}

// ---------- moving older relics down the pile ----------
function retire(el) {
  let [x, y] = SLOTS[retiredCount % SLOTS.length];
  if (retiredCount >= SLOTS.length) { x += (Math.random() - .5) * 4; y += Math.random() * 4; }
  retiredCount++;
  el.classList.add("retired");
  el.style.left = x + "%";
  el.style.top = y + "%";
  el.style.width = parseFloat(el.dataset.w) * .62 + "%";
}

// ---------- the ascension ----------
async function ascend(file) {
  if (busy || !file || !file.type.startsWith("image/")) return;
  busy = true;
  fileInput.disabled = true;
  const label = nameInput.value.trim() || "unknown device";
  statusEl.textContent = `${label} is ascending…`;

   statusEl.textContent = "separating it from this world…";
   const src = await cutOut(file);
   statusEl.textContent = `${label} is ascending…`;

   if (current) retire(current);

   const el = makeRelic(src, label);

  const img = el.querySelector("img");
  el.style.left = PEAK.x + "%";
  el.style.top = PEAK.y + "%";
  el.style.opacity = "0";
  stage.appendChild(el);
  await img.decode().catch(() => {});

  // tall photos get a bit narrower so they don't tower over the pile
  const ratio = img.naturalHeight / img.naturalWidth || 1;
  const w = BASE_WIDTH * Math.min(1, 1.15 / ratio);
  el.dataset.w = w;
  el.style.width = w + "%";

  // where it starts (middle of the screen, big) relative to where it lands
  const sr = stage.getBoundingClientRect();
  const fx = (PEAK.x / 100) * sr.width, fy = (PEAK.y / 100) * sr.height;
  const S = Math.max(1.6, (Math.min(innerWidth, innerHeight) * .3) / el.offsetWidth);
  const sx = innerWidth / 2 - sr.left;
  const sy = innerHeight * .45 - sr.top + (el.offsetHeight * S) / 2;
  const dx = sx - fx, dy = sy - fy;
  const T = (x, y, s) => `translate(${x}px, ${y}px) scale(${s})`;

  // 1. appear
  el.style.opacity = "";
  await el.animate(
    [{ transform: T(dx, dy + 60, S * .5), opacity: 0, filter: "brightness(3)" },
     { transform: T(dx, dy, S), opacity: 1, filter: "brightness(1)" }],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
  ).finished;

  // 2. grow wings
  el.classList.add("winged");
  burst(el, 26);
  await wait(1300);

  // 3. fly to the peak in a swooping curve
  el.classList.add("flying");
  const side = Math.random() < .5 ? -1 : 1;
  const cx = dx * .5 + side * sr.width * .16, cy = dy * .55;
  const frames = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, u = 1 - t;
    const x = u * u * dx + 2 * u * t * cx;
    const y = u * u * dy + 2 * u * t * cy + Math.sin(t * Math.PI * 4) * 14 * u;
    frames.push({ transform: T(x, y, S + (1 - S) * t) });
  }
  const flight = el.animate(frames, { duration: 2800, easing: "cubic-bezier(.45,.05,.35,1)", fill: "forwards" });

  let flying = true;
  (function trail() {
    if (!flying) return;
    const [x, y] = centreOf(img);
    sparkAt(x + (Math.random() - .5) * 2, y + (Math.random() - .5) * 3);
    setTimeout(trail, 35);
  })();
  await flight.finished;
  flying = false;

  // 4. land
  el.classList.remove("flying");
  await el.animate(
    [{ transform: "none" }, { transform: "scale(1.08, .9)" }, { transform: "none" }],
    { duration: 450, easing: "ease-out" }
  ).finished;
  el.getAnimations().forEach((a) => a.cancel());
  el.classList.add("landed");
  stage.classList.add("blessed");
  burst(el, 20);

  current = el;
  statusEl.textContent = `${label} has been laid to rest. upload another to make an offering.`;
  nameInput.value = "";
  fileInput.value = "";
  fileInput.disabled = false;
  busy = false;
}

fileInput.addEventListener("change", () => ascend(fileInput.files[0]));

// drag & drop anywhere on the page
addEventListener("dragover", (e) => { e.preventDefault(); document.body.classList.add("dragging"); });
addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("dragging"); });
addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  ascend(e.dataTransfer.files[0]);
});
