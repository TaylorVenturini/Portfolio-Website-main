// Week 5: Make It Worse
// Every click adds one more thing that ruins your day, plus one of your photos to go with it.
// Add your own bad things to the list below!

const button = document.getElementById("generate-button");
const resetButton = document.getElementById("reset-button");
const memeText = document.getElementById("meme-text");
const memeImage = document.getElementById("meme-image");
const fallback = document.getElementById("meme-fallback");
const meter = document.getElementById("meter");
const log = document.getElementById("log");
const meme = document.getElementById("meme");

//naomi's added code/ connect script.js to supabase
const supabaseClient = supabase.createClient(
  "https://uspxokoxzbajirtyhtjv.supabase.co",
  "sb_publishable_QfPcMD4M9fWHFAL5oHRznA_7g7g-v5Y"
);

const saveButton = document.getElementById("save-button");

saveButton.addEventListener("click", saveMeme);

// each bad thing has some text and an emoji (shown if a photo is slow or missing)
const badThings = [
  { text: "Your phone is at 1%. The charger is in another building.", emoji: "🪫" },
  { text: "You stepped in a puddle. Wearing socks.", emoji: "🧦" },
  { text: "Your update has been \"2 minutes remaining\" since Tuesday.", emoji: "⏳" },
  { text: "Someone replied-all. Then someone replied-all to say stop replying-all.", emoji: "📧" },
  { text: "The chips are all crumbs. Only crumbs.", emoji: "🥔" },
  { text: "You hit save on the wrong version. Of everything.", emoji: "💾" },
  { text: "The wifi is connected but it is lying to you.", emoji: "📶" },
  { text: "A tiny rock in your shoe. Forever.", emoji: "🪨" },
  { text: "Your earbuds are tangled. Not a little. Spiritually.", emoji: "🎧" },
  { text: "The group project chat is just 'lol' from one person.", emoji: "💬" },
  { text: "Your screen cracked. A new crack. Next to the old crack.", emoji: "📱" },
  { text: "It is raining, and your umbrella is in the other bag.", emoji: "🌧️" },
  { text: "You said 'you too' when the waiter said enjoy your meal.", emoji: "😬" },
  { text: "A pop-up appeared. It has no X button.", emoji: "🪟" },
  { text: "Your computer wants to restart. It will not ask again. It will just do it.", emoji: "🔄" },
  { text: "A wasp is in the room and it is clearly the boss.", emoji: "🐝" },
  { text: "Everyone else already understood the assignment.", emoji: "📝" },
  { text: "The printer is out of ink. It was never in ink.", emoji: "🖨️" },
  { text: "You walked into a room and forgot why. Then it happened again.", emoji: "🚪" },
  { text: "Your bagel fell cream-cheese side down. On a very clean floor.", emoji: "🥯" },
  { text: "You clicked 'Remind me tomorrow' for the 40th day in a row.", emoji: "🔔" },
  { text: "The sun came out the second you went inside.", emoji: "☀️" },
  { text: "Your phone autocorrected something to a thing you did not mean.", emoji: "🦆" },
  { text: "The one cable you needed is the one cable you gave away.", emoji: "🔌" }
];

// "worse" labels for the meter, they get sadder as it goes on
const moods = [
  "Your day is 0% ruined.",
  "Slightly annoying.",
  "Getting worse.",
  "Not great.",
  "Genuinely bad.",
  "Everything hurts.",
  "This is a sign.",
  "You should go back to bed.",
  "Stop clicking. It's not going to help."
];

// your photos live in the "memes" folder: meme-01.jpg ... meme-38.jpg
// if you add more, change this number
const photoCount = 38;
let photoBag = [];
function nextPhoto() {
  if (photoBag.length === 0) {
    for (let i = 1; i <= photoCount; i++) photoBag.push(i);
    photoBag.sort(function () { return Math.random() - 0.5; });
  }
  const n = photoBag.pop();
  return "memes/meme-" + String(n).padStart(2, "0") + ".jpg";
}

// shuffled bag so a bad thing never repeats until you've seen them all
let bag = [];
function nextBadThing() {
  if (bag.length === 0) {
    bag = badThings.slice().sort(function () { return Math.random() - 0.5; });
  }
  return bag.pop();
}

let count = 0;

button.addEventListener("click", makeItWorse);
resetButton.addEventListener("click", startOver);

function makeItWorse() {
  const bad = nextBadThing();
  count++;

  memeText.textContent = bad.text;

  // show the emoji right away, then swap in one of your photos once it loads
  showFallback(bad.emoji);
  loadPhoto();

  // replay the pop animation
  meme.classList.remove("pop");
  void meme.offsetWidth;
  meme.classList.add("pop");

  // keep a list of everything that's gone wrong
  const item = document.createElement("li");
  item.textContent = bad.text;
  log.prepend(item);

  // the page gets more chaotic the more you click
  document.body.classList.remove("worse-1", "worse-2", "worse-3");
  if (count >= 10) document.body.classList.add("worse-3");
  else if (count >= 6) document.body.classList.add("worse-2");
  else if (count >= 3) document.body.classList.add("worse-1");

  const percent = Math.min(100, count * 9);
  meter.textContent = moods[Math.min(count, moods.length - 1)] + " (" + percent + "% ruined)";

  resetButton.hidden = false;
  button.textContent = count >= 8 ? "[ Make It Even Worse ]" : "[ Make It Worse ]";
}

function showFallback(emoji) {
  memeImage.hidden = true;
  fallback.hidden = false;
  fallback.textContent = emoji;
}

function loadPhoto() {
  const url = nextPhoto();

  // only swap once the picture actually loads, so it never breaks
  const test = new Image();
  test.onload = function () {
    memeImage.src = url;
    memeImage.hidden = false;
    fallback.hidden = true;
  };
  test.src = url;
}

function startOver() {
  count = 0;
  log.innerHTML = "";
  document.body.classList.remove("worse-1", "worse-2", "worse-3");
  memeText.textContent = "Everything is fine. For now.";
  showFallback("🙂");
  meter.textContent = "Your day is 0% ruined.";
  button.textContent = "[ Make It Worse ]";
  resetButton.hidden = true;
}

// Naomi's code creating the save function
async function saveMeme() {

  const { error } = await supabaseClient
    .from("memes")
    .insert({
      image_url: memeImage.src,
      meme_text: memeText.textContent
    });

  if (error) {
    console.error("Could not save meme:", error);
  } else {
    console.log("Meme saved!");
  }
}