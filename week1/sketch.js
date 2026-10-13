let squareSize= 150;
let lineWidth =4;


function setup() {
  createCanvas(400, 300);
  background(0);
}

function draw() {
  lineWidth=random(4,28);
squareSize=random(5,250);
 
  rectMode(CENTER);
  strokeWeight(lineWidth);
  stroke(255,30,60,14);
  fill(150,70,255,12);
  square(200,150,squareSize);
}