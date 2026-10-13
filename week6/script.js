const setup = document.getElementById("setup");
const nameInput = document.getElementById("nameInput");
const fileInput = document.getElementById("fileInput");
const stage = document.getElementById("stage");
const photo = document.getElementById("photo");
const controls = document.getElementById("controls");
const caption = document.getElementById("caption");
const offerButton = document.getElementById("offerButton");
const restartButton = document.getElementById("restartButton");

// each visit asks the question a different way
const prompts = [
  {
    text: "What device are we mourning today?",
    hint: "its name (ex: my cracked iPhone 11)"
  },
  {
    text: "Who's the dearly departed? (phone, laptop, earbuds...)",
    hint: "its name (ex: my laptop, Gerald)"
  }
];

const chosenPrompt = prompts[Math.floor(Math.random() * prompts.length)];
document.getElementById("prompt").textContent = chosenPrompt.text;
nameInput.placeholder = chosenPrompt.hint;

const WIN_W = 170;
const WIN_H = 130;
let tech = "my old tech";
let topLayer = 10; // goes up with every window so new ones land on top
let nextWave = 0;

const lists = {
  candle: ["🕯️"],
  flower: ["🌸", "🥀", "🌷", "🌼", "💐"],
  gadget: ["🔋", "🔌", "💾", "☕", "🧁", "🍕", "🥤", "🍙", "📱", "🎧", "🍩", "🍪", "🧃", "💿"]
};

const messages = [
  "RIP {name}. you were so loyal.",
  "{name} survived three drops and one spilled latte.",
  "forgive me for not backing you up.",
  "gone but not forgotten (my files are just gone).",
  "{name} gave 100% until the very end. battery: 1%.",
  "you will be remembered by my unsubmitted assignments.",
  "thank you for your service, {name}.",
  "the screen cracked but the memories didn't.",
  "it was just a software update, I swear.",
  "may your updates finally finish in the afterlife."
];

// each wave is bigger than the last; "label" is what the button says
// BEFORE you click it to bring that wave in
const waves = [
  { kind: "candle", count: 3, label: "" },
  { kind: "flower", count: 5, label: "Leave flowers 🌸" },
  { kind: "message", count: 7, label: "Say a few words 🪦" },
  { kind: "gadget", count: 9, label: "Bring snacks & batteries 🔋" }
];

// draws from a shuffled bag, so nothing repeats until the whole list has been used
const bags = new WeakMap();

function randomFrom(list) {
  let bag = bags.get(list);
  if (!bag || bag.length === 0) {
    bag = list.slice().sort(function () { return Math.random() - 0.5; });
    bags.set(list, bag);
  }
  return bag.pop();
}

function addWindow(kind) {
  if (!kind) {
    kind = randomFrom(["flower", "message", "gadget", "gadget"]);
  }

  const big = kind === "candle";
  const w = big ? 150 : WIN_W;
  const h = big ? 190 : WIN_H;

  const win = document.createElement("div");
  win.className = "window loading" + (big ? " big" : "");
  win.style.setProperty("--tilt", (Math.random() * 12 - 6) + "deg");

  // every new window goes on top of the others
  topLayer++;
  win.style.zIndex = topLayer;

  const bar = document.createElement("div");
  bar.className = "titlebar";
  bar.innerHTML = '<span class="dot close"></span><span class="dot"></span><span class="dot"></span>';
  win.appendChild(bar);

  const body = document.createElement("div");
  if (kind === "message") {
    body.className = "body message";
    body.textContent = randomFrom(messages).replace("{name}", tech);
  } else {
    body.className = "body offering" + (big ? " candle" : "");
    body.textContent = randomFrom(lists[kind]);
  }
  win.appendChild(body);

  // the red dot closes the window
  bar.querySelector(".close").addEventListener("click", function () {
    win.remove();
  });

  // clicking a window brings it to the front
  win.addEventListener("mousedown", function () {
    topLayer++;
    win.style.zIndex = topLayer;
  });

  // pick a spot that doesn't cover the photo
  const s = stage.getBoundingClientRect();
  const p = photo.getBoundingClientRect();
  const photoBox = {
    left: p.left - s.left - 10,
    top: p.top - s.top - 10,
    right: p.right - s.left + 10,
    bottom: p.bottom - s.top + 10
  };

  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 50; tries++) {
    x = Math.random() * Math.max(0, s.width - w);
    y = Math.random() * Math.max(0, s.height - h);
    const overlaps =
      x < photoBox.right && x + w > photoBox.left &&
      y < photoBox.bottom && y + h > photoBox.top;
    if (!overlaps) break;
  }

  win.style.left = x + "px";
  win.style.top = y + "px";
  stage.appendChild(win);

  // dark empty box first, then it fills in
  setTimeout(function () {
    win.classList.remove("loading");
  }, 500);
}

// bring in one whole wave of windows
function playWave(wave) {
  for (let i = 0; i < wave.count; i++) {
    setTimeout(function () {
      addWindow(wave.kind);
    }, i * 150);
  }
}

// the button always says what you'll leave NEXT
function updateButton() {
  if (nextWave < waves.length) {
    offerButton.textContent = waves[nextWave].label;
  } else {
    offerButton.textContent = "Leave another offering 🕯️";
  }
}

fileInput.addEventListener("change", function () {
  const file = fileInput.files[0];
  if (!file) return;

  tech = nameInput.value.trim() || "my old tech";
  caption.textContent = "In loving memory of " + tech;

  // wait for the photo to load so we know where it sits
  photo.onload = function () {
    playWave(waves[0]); // the first 3 candles arrive on their own
    nextWave = 1;
    updateButton();
  };
  photo.src = URL.createObjectURL(file);

  setup.classList.add("hidden");
  stage.classList.remove("hidden");
  controls.classList.remove("hidden");
});

offerButton.addEventListener("click", function () {
  let wait = 300;

  if (nextWave < waves.length) {
    const wave = waves[nextWave];
    playWave(wave);
    wait = wave.count * 150 + 400;
    nextWave++;
  } else {
    addWindow();
  }

  // pause the button while the windows pop in
  offerButton.disabled = true;
  setTimeout(function () {
    offerButton.disabled = false;
    updateButton();
  }, wait);
});

restartButton.addEventListener("click", function () {
  location.reload();
});