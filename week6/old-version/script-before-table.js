// ---------- Rest In Pieces ----------
// ---------- cutting out the background ----------
// 1st choice: an AI background remover (loaded only when someone uploads).
// If that can't load, a simple built-in cutout removes the background by
// flood-filling from the photo's edges (works best on plain backgrounds).
let removeBackground = null;
let cutoutNote = "";      // shown on the page if the AI remover didn't work

async function cutOut(file) {
  let blob = null;
  cutoutNote = "";
  try {
    if (!removeBackground) {
      statusEl.textContent = "summoning the background remover… (first time takes a bit)";
      ({ removeBackground } = await import("https://esm.sh/@imgly/background-removal@1.4.5"));
    }
    statusEl.textContent = "separating it from this world…";
    blob = await removeBackground(file);
  } catch (err) {
    console.error("AI background removal failed, using the simple cutout:", err);
    cutoutNote = ` (simple cutout used — AI remover error: ${err && err.message ? err.message : err})`;
    statusEl.textContent = "separating it from this world… (simple mode)";
  }
  try {
    const canvas = await toCanvas(blob || file);
    if (!blob) simpleCutout(canvas);
    return await cropToContents(canvas);
  } catch (err) {
    console.error("Cutout failed, using the original photo:", err);
    return URL.createObjectURL(file);
  }
}

async function toCanvas(fileOrBlob, max = 900) {
  const bmp = await createImageBitmap(fileOrBlob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

function simpleCutout(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h), d = img.data;

  // a slightly blurred copy to compare colours (ignores fabric/paper texture)
  const soft = document.createElement("canvas");
  soft.width = w; soft.height = h;
  const sctx = soft.getContext("2d", { willReadFrequently: true });
  sctx.filter = "blur(1.5px)";
  sctx.drawImage(canvas, 0, 0);
  const s = sctx.getImageData(0, 0, w, h).data;

  // average colour around the edges = "the background"
  let R = 0, G = 0, B = 0, n = 0;
  const add = (p) => { R += s[p * 4]; G += s[p * 4 + 1]; B += s[p * 4 + 2]; n++; };
  for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
  R /= n; G /= n; B /= n;

  const diff = (p, r, g, b) => Math.abs(s[p * 4] - r) + Math.abs(s[p * 4 + 1] - g) + Math.abs(s[p * 4 + 2] - b);
  const STEP = 26;     // how different a neighbouring pixel can be and still count as background
  const FAR = 150;     // never eat pixels this different from the edge colour

  const bg = new Uint8Array(w * h);
  const stack = [];
  const seed = (p) => { if (!bg[p] && diff(p, R, G, B) < FAR) { bg[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }

  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    const r = s[p * 4], g = s[p * 4 + 1], b = s[p * 4 + 2];
    const tryq = (q) => {
      if (!bg[q] && diff(q, r, g, b) < STEP && diff(q, R, G, B) < FAR) { bg[q] = 1; stack.push(q); }
    };
    if (x > 0) tryq(p - 1);
    if (x < w - 1) tryq(p + 1);
    if (y > 0) tryq(p - w);
    if (y < h - 1) tryq(p + w);
  }

  // if it removed almost nothing or almost everything, the photo isn't suited — keep it whole
  let count = 0;
  for (let i = 0; i < bg.length; i++) count += bg[i];
  const frac = count / bg.length;
  if (frac < .04 || frac > .96) return;

  for (let p = 0; p < bg.length; p++) {
    if (bg[p]) { d[p * 4 + 3] = 0; continue; }
    // soften the edge by one pixel
    const x = p % w, y = (p / w) | 0;
    if ((x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w])) {
      d[p * 4 + 3] = 140;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// trim the empty transparent space so the object fills its spot on the pile
function cropToContents(canvas) {
  const w = canvas.width, h = canvas.height;
  const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 30) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(canvas, -x0, -y0);
  return new Promise((res) => out.toBlob((b) => res(URL.createObjectURL(b)), "image/png"));
}

// ---------- identifying the tech (ml5 + COCO-SSD, like the Coding Train example) ----------
// COCO-SSD already knows these objects, so no training is needed.
const TECH_NAMES = {
  "cell phone": "cell phone", "laptop": "laptop", "tv": "TV / monitor",
  "keyboard": "keyboard", "mouse": "mouse", "remote": "remote",
  "microwave": "microwave", "toaster": "toaster", "oven": "oven",
  "refrigerator": "fridge", "hair drier": "hair dryer", "clock": "clock",
};
let detector = null;

function loadDetector() {
  if (!detector) {
    detector = new Promise((resolve, reject) => {
      if (typeof ml5 === "undefined") return reject(new Error("ml5 didn't load"));
      const d = ml5.objectDetector("cocossd", () => resolve(d));
    });
  }
  return detector;
}
loadDetector().catch(() => {});   // start loading the model as soon as the page opens

async function identify(file) {
  try {
    const det = await loadDetector();
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const results = await new Promise((resolve, reject) =>
      det.detect(img, (err, r) => (err ? reject(err) : resolve(r))));

    // ignore people; prefer known tech, then the biggest + most confident thing
    const things = results.filter((r) => r.label !== "person");
    if (!things.length) return null;
    const score = (r) => r.confidence * (r.width * r.height) * (TECH_NAMES[r.label] ? 3 : 1);
    const best = things.sort((a, b) => score(b) - score(a))[0];
    const W = img.naturalWidth, H = img.naturalHeight;
    return {
      name: TECH_NAMES[best.label] || best.label,
      pct: Math.round(best.confidence * 100),
      box: [best.x / W, best.y / H, best.width / W, best.height / H],   // 0–1 of the photo
    };
  } catch (err) {
    console.error("Identifying the tech failed:", err);
    return null;
  }
}

// crop the photo to the detected object (plus a margin) so there's less background to erase
async function cropTo(file, [bx, by, bw, bh], pad = .08) {
  const bmp = await createImageBitmap(file);
  const x0 = Math.max(0, (bx - pad) * bmp.width), y0 = Math.max(0, (by - pad) * bmp.height);
  const x1 = Math.min(bmp.width, (bx + bw + pad) * bmp.width), y1 = Math.min(bmp.height, (by + bh + pad) * bmp.height);
  const c = document.createElement("canvas");
  c.width = Math.round(x1 - x0); c.height = Math.round(y1 - y0);
  c.getContext("2d").drawImage(bmp, -x0, -y0);
  return new Promise((res) => c.toBlob(res, "image/png"));
}

// ---------- the shared shrine (Supabase) ----------
// Every relic is saved, so everyone who visits sees the same pile.
// This "anon" key is meant to be public — it can only do what the
// table's policies allow (view + add relics, never edit or delete).
const SUPABASE_URL = "https://uaqiyouywvyzghnqdnfn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWl5b3V5d3Z5emdobnFkbmZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTY5NDYsImV4cCI6MjEwODE3Mjk0Nn0.jSG9PBo7fyVrXvx2JYZSU7vWFxLNP-GNZ4HYQDyVUWI";
const DB_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const MAX_ON_PILE = 40;     // only show the most recent relics
const BUCKET = "old tech";  // your Supabase storage bucket

// save one relic: upload the cut-out image, then add a row to the table
async function saveRelic(src, name) {
  try {
    // the bucket only accepts PNGs, so convert anything else to PNG first
    let blob = await (await fetch(src)).blob();
    if (blob.type !== "image/png") {
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas");
      c.width = bmp.width; c.height = bmp.height;
      c.getContext("2d").drawImage(bmp, 0, 0);
      blob = await new Promise((res) => c.toBlob(res, "image/png"));
    }
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const bucket = encodeURIComponent(BUCKET);   // makes the name safe to put in a web address

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { ...DB_HEADERS, "Content-Type": "image/png" },
      body: blob,
    });
    if (!up.ok) throw new Error(`image upload: ${up.status} ${await up.text()}`);

    const image_url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    const row = await fetch(`${SUPABASE_URL}/rest/v1/relics`, {
      method: "POST",
      headers: { ...DB_HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ name, image_url }),
    });
    if (!row.ok) throw new Error(`saving the row: ${row.status} ${await row.text()}`);
    return "";
  } catch (err) {
    console.error("Saving to Supabase failed:", err);
    return ` (not saved to the shared shrine: ${err.message})`;
  }
}

// put a saved relic on the pile without the flying animation
async function placeSaved(row, onTop) {
  const el = makeRelic(row.image_url, row.name || "unknown device");
  el.style.transition = "none";
  el.style.left = PEAK.x + "%";
  el.style.top = PEAK.y + "%";
  stage.appendChild(el);
  const img = el.querySelector("img");
  await img.decode().catch(() => {});
  const ratio = img.naturalHeight / img.naturalWidth || 1;
  const w = BASE_WIDTH * Math.min(1, 1.15 / ratio);
  el.dataset.w = w;
  el.style.width = w + "%";

  if (onTop) {
    el.classList.add("winged", "landed");
    stage.classList.add("blessed");
    current = el;
  } else {
    retire(el);
    el.querySelectorAll(".wing").forEach((wing) => (wing.style.animation = "none"));  // already buried, no wings
  }
  void el.offsetWidth;          // apply the position instantly…
  el.style.transition = "";     // …then turn the slide animations back on
}

// on page load: rebuild the pile from the database (oldest first, newest on the peak)
async function loadShrine() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/relics?select=name,image_url,created_at&order=created_at.desc&limit=${MAX_ON_PILE}`,
      { headers: DB_HEADERS });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = (await res.json()).reverse();
    for (let i = 0; i < rows.length; i++) await placeSaved(rows[i], i === rows.length - 1);
    if (rows.length) statusEl.textContent = `${rows.length} relic${rows.length > 1 ? "s" : ""} rest here. add yours.`;
  } catch (err) {
    console.error("Loading the shrine from Supabase failed:", err);
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
  el.classList.add("retired", "buried");
  el.style.rotate = (Math.random() * 50 - 25) + "deg";
  el.style.left = x + "%";
  el.style.top = y + "%";
  el.style.width = parseFloat(el.dataset.w) * .62 + "%";
}

// ---------- the ascension ----------
async function ascend(file) {
  if (busy || !file || !file.type.startsWith("image/")) return;
  busy = true;
  fileInput.disabled = true;
  // identify it, crop to it, then cut out the background
  statusEl.textContent = "consulting the machine spirits…";
  const guess = await identify(file);
  const label = nameInput.value.trim() || (guess ? guess.name : "unknown device");
  const guessNote = guess ? ` (the machine says: ${guess.name}, ${guess.pct}% sure)` : "";
  const source = guess ? await cropTo(file, guess.box) : file;

  statusEl.textContent = "separating it from this world…";
  const src = await cutOut(source);
  statusEl.textContent = `${label} is ascending…${guessNote}`;

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
  const appear = el.animate(
    [{ transform: T(dx, dy + 60, S * .5), opacity: 0, filter: "brightness(3)" },
     { transform: T(dx, dy, S), opacity: 1, filter: "brightness(1)" }],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
  );
  await appear.finished;

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
  appear.cancel();   // the flight takes over from here

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
  const land = el.animate(
    [{ transform: "none" }, { transform: "scale(1.08, .9)" }, { transform: "none" }],
    { duration: 450, easing: "ease-out" }
  );
  flight.cancel();
  await land.finished;
  el.getAnimations().forEach((a) => a.cancel());
  el.classList.add("landed");
  stage.classList.add("blessed");
  burst(el, 20);

  current = el;
  statusEl.textContent = `${label} has been laid to rest${guessNote}. saving it to the shrine…`;
  const saveNote = await saveRelic(src, label);
  statusEl.textContent = `${label} has been laid to rest${guessNote}. upload another to make an offering.${cutoutNote}${saveNote}`;
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

// rebuild the shared pile when the page opens
loadShrine();
