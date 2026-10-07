let squareSize= 150;
let lineWidth =4;


function setup() {
  createCanvas(400, 300);
  background(255);
}

function draw() {
  lineWidth=random(4,28);
squareSize=random(5,250);
 
  rectMode(CENTER);
  strokeWeight(lineWidth);
  stroke(0,0,225,10);
  fill(10,255,0,10);
  square(200,150,squareSize);
}