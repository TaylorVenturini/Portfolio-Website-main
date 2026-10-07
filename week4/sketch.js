// Tense Indigo Bump de Dump Garden
// p5.js + ml5 FaceMesh

let center;
let letters = [];
let cols, rows;
let cellSize = 28;

let video;
let faceMesh;
let faces = [];

let mouthX = 320;
let mouthY = 240;
let mouthOpen = 0;

let phrase = "TENSE INDIGO BUMP de DUMP GARDEN ";
let charCount = 0;

function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true });
}

function gotFaces(results) {
  faces = results;
}

function setup() {
  createCanvas(640, 480);
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textFont("Georgia");
  textStyle(BOLD);

  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  center = createVector(width / 2, height / 2);

  cols = floor(width / cellSize) + 1;
  rows = floor(height / cellSize) + 1;

  for (let i = 0; i < cols; i++) {
    letters[i] = [];
    for (let j = 0; j < rows; j++) {
      let x = i * cellSize + cellSize / 2;
      let y = j * cellSize + cellSize / 2;

      let ch = phrase.charAt(charCount % phrase.length);
      charCount++;

      letters[i][j] = new GardenLetter(x, y, ch);
    }
  }
}

function draw() {
  background(8, 6, 20);

  // Uncomment if you want to see the webcam underneath
  // tint(255, 40);
  // image(video, 0, 0, width, height);
  // noTint();

  updateMouthTracking();

  center.x = mouthX;
  center.y = mouthY;

  let bump = sin(frameCount * 0.08);
  let de = sin(frameCount * 0.08 + PI * 0.6);
  let dump = sin(frameCount * 0.08 + PI * 1.2);
  let pulse = 1 + bump * 0.08 + de * 0.05 + dump * 0.03;

  drawIndigoGlow(center.x, center.y, mouthOpen, pulse);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      letters[i][j].update(center.x, center.y, mouthOpen, pulse);
      letters[i][j].display();
    }
  }

  // Uncomment this if you want to see the mouth center
  // fill(255);
  // noStroke();
  // ellipse(center.x, center.y, 10, 10);
}

function updateMouthTracking() {
  if (faces.length > 0) {
    let face = faces[0];
    let keypoints = face.keypoints;

    let mouthTop = keypoints[13];
    let mouthBottom = keypoints[14];

    let targetX = (mouthTop.x + mouthBottom.x) / 2;
    let targetY = (mouthTop.y + mouthBottom.y) / 2;
    let targetOpen = dist(mouthTop.x, mouthTop.y, mouthBottom.x, mouthBottom.y);

    mouthX = lerp(mouthX, targetX, 0.3);
    mouthY = lerp(mouthY, targetY, 0.3);
    mouthOpen = lerp(mouthOpen, targetOpen, 0.3);
  } else {
    // If no face is found, let the center hover in the middle
    mouthX = lerp(mouthX, width / 2, 0.02);
    mouthY = lerp(mouthY, height / 2, 0.02);
    mouthOpen = lerp(mouthOpen, 0, 0.05);
  }
}

function drawIndigoGlow(x, y, mouthOpen, pulse) {
  noStroke();

  let bloom = constrain(map(mouthOpen, 3, 40, 0, 1), 0, 1);

  fill(40, 20, 80, 40);
  ellipse(x, y, 220 + bloom * 140 * pulse, 220 + bloom * 140 * pulse);

  fill(80, 40, 160, 30);
  ellipse(x, y, 140 + bloom * 100 * pulse, 140 + bloom * 100 * pulse);

  fill(140, 80, 255, 24);
  ellipse(x, y, 70 + bloom * 60 * pulse, 70 + bloom * 60 * pulse);
}

class GardenLetter {
  constructor(x, y, ch) {
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.char = ch;

    this.seed = random(1000);
    this.scale = random(0.55, 0.9);
    this.targetScale = this.scale;

    this.rotation = random(-0.2, 0.2);
    this.targetRotation = this.rotation;

    this.influence = 0;
    this.release = 0;
    this.currentColor = color(70, 40, 120);
  }

  update(cx, cy, mouthOpen, pulse) {
    let d = dist(this.homeX, this.homeY, cx, cy);

    // closer letters react more
    this.influence = constrain(map(d, 0, width * 0.75, 1, 0), 0, 1);

    // mouth opening controls the bloom
    let bloom = constrain(map(mouthOpen, 4, 38, 0, 1), 0, 1);

    // strong reaction happens near the mouth
    this.release = bloom * this.influence;

    let angleToCenter = atan2(this.homeY - cy, this.homeX - cx);

    // "garden" growth / bloom
    let spread = this.release * (20 + 110 * pulse);

    // slight tense trembling
    let jitterAmt = 0.4 + this.release * 2.5;
    let jitterX = sin(frameCount * 0.18 + this.seed * 5.0) * jitterAmt;
    let jitterY = cos(frameCount * 0.14 + this.seed * 4.0) * jitterAmt;

    // swaying motion
    let swayX = sin(frameCount * 0.03 + this.seed + d * 0.02) * 6 * this.influence;
    let swayY = cos(frameCount * 0.04 + this.seed + d * 0.015) * 8 * this.influence;

    // push letters outward from the mouth
    let targetX = this.homeX + cos(angleToCenter) * spread + jitterX + swayX;
    let targetY = this.homeY + sin(angleToCenter) * spread + jitterY + swayY;

    this.x = lerp(this.x, targetX, 0.14);
    this.y = lerp(this.y, targetY, 0.14);

    this.targetScale = 0.65 + this.release * 1.8 + (pulse - 1) * 0.8;
    this.scale = lerp(this.scale, this.targetScale, 0.12);

    let tenseRot = sin(frameCount * 0.05 + this.seed * 3.5) * 0.25;
    this.targetRotation = tenseRot + this.release * 1.3;
    this.rotation = lerp(this.rotation, this.targetRotation, 0.12);

    let farColor = color(38, 24, 72);
    let nearColor = color(155, 110, 255);
    let glowColor = color(210, 180, 255);

    let amt = constrain(this.influence * 0.7 + this.release * 0.6, 0, 1);
    this.currentColor = lerpColor(farColor, nearColor, amt);

    if (this.release > 0.75) {
      this.currentColor = lerpColor(this.currentColor, glowColor, 0.35);
    }
  }

  display() {
    // optional "stem" line for garden feel
    if (this.influence > 0.08) {
      stroke(90, 60, 150, 30 + this.influence * 40);
      line(this.homeX, this.homeY, this.x, this.y);
    }

    noStroke();

    push();
    translate(this.x, this.y);
    rotate(this.rotation);

    fill(this.currentColor);

    let displayChar = this.char;
    if (displayChar === " ") {
      displayChar = "•";
    }

    textSize(cellSize * this.scale);
    text(displayChar, 0, 0);

    pop();
  }
}