const button = document.getElementById("generate-button");
const memeText = document.getElementById("meme-text");
const memeImage = document.getElementById("meme-image");
const words = [
  "cat",
  "star",
  "fire",
  "love",
  "home",
  "web",
  "cool",
  "music",
  "computer",
  "welcome",
  "email",
  "angel",
  "skull",
  "rainbow"
];

button.addEventListener("click", generateMeme);

function generateMeme() {

  // Get text
  fetch("https://corporatebs-generator.sameerkumar.website/?" + Date.now())
    .then(response => response.json())
    .then(data => {
      memeText.textContent = data.phrase;
    });

  // Get image
  const word = words[Math.floor(Math.random() * words.length)];
  fetch("https://gifcities.archive.org/api/v1/gifsearch?q=" + word)
  .then(response => response.json())
  .then(data => {
    const result = data[Math.floor(Math.random() * data.length)];

    const gifURL =
      "https://web.archive.org/web/" +
      result.gif.replace("/", "im_/");

    memeImage.src = gifURL;
  });

}