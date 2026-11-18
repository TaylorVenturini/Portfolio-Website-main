let shared;
let facets = [];

// Colors each facet cycles through
const palette = [
  "#004d33", // deep emerald
  "#0a2472", // deep sapphire
  "#7a0019", // deep ruby
  "#4b0f6b", // deep amethyst
  "#8a5a00", // deep citrine
  "#00505c", // deep teal topaz
  "#4a0010"  // deep garnet
];

function preload() {
  partyConnect(
    "wss://demoserver.p5party.org",
    "Tay"
  );

  // One color number per facet (13 facets)
  shared = partyLoadShared("jewel", {
    colors: new Array(13).fill(0)
  });
}

function setup() {
  createCanvas(200, 400); // 1:2, like an 11 x 5.5 mm stone
  buildFacets();
}

function draw() {
  background(240);
  strokeWeight(1.5);

  for (let i = 0; i < facets.length; i++) {
    // Facet color
    stroke(255, 120);
    fill(palette[shared.colors[i] % palette.length]);
    drawPoly(facets[i]);

    // Highlights and shading
    noStroke();
    if (i % 3 === 0) {
      fill(255, 35); // highlight facet
    } else {
      fill(0, (i % 3) * 20); // darker shading
    }
    drawPoly(facets[i]);
  }
}

// The outer hexagon, shrunk toward the center by "scale"
function hexPoints(scale) {
  let cx = width / 2;
  let cy = height / 2;
  let outer = [
    [width / 2, 0],
    [width, height * 0.25],
    [width, height * 0.75],
    [width / 2, height],
    [0, height * 0.75],
    [0, height * 0.25]
  ];
  return outer.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
}

// Three nested hexagons -> 12 step facets + 1 table facet
function buildFacets() {
  let rings = [hexPoints(1), hexPoints(0.68), hexPoints(0.38)];

  for (let r = 0; r < 2; r++) {
    let a = rings[r];
    let b = rings[r + 1];
    for (let i = 0; i < 6; i++) {
      let j = (i + 1) % 6;
      facets.push([a[i], a[j], b[j], b[i]]);
    }
  }

  facets.push(rings[2]); // the table (center)
}

function drawPoly(points) {
  beginShape();
  for (let [x, y] of points) {
    vertex(x, y);
  }
  endShape(CLOSE);
}

function mousePressed() {
  for (let i = 0; i < facets.length; i++) {
    if (pointInPolygon(mouseX, mouseY, facets[i])) {
      let c = [...shared.colors];
      c[i] = (c[i] + 1) % palette.length;
      shared.colors = c;
      return;
    }
  }
}

// Returns true if (x, y) is inside the polygon
function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let [xi, yi] = poly[i];
    let [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}