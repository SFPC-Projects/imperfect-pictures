// -----------------------------
// IMAGE CATEGORY STORAGE
// -----------------------------
let brownMatter = [];
let greenMatter = [];
let culturalSpores = [];
let fungalGrowths = [];

let heap = [];
let fungi = [];

let lastTurnTime = 0;
let turnInterval = 5000; 

function preload() {
  loadFromLinks([
    "https://i.postimg.cc/FHLFkW8R/brown1.jpg", 
    "https://i.postimg.cc/nLfF4Kf1/brown2.jpg", 
    "https://i.postimg.cc/q7ckjtkH/brown3.jpg", 
    "https://i.postimg.cc/ZRVJz1Bf/brown4.jpg",
    "https://i.postimg.cc/9MWcSWMR/brown5.jpg",
    "https://i.postimg.cc/7hhwHmSq/brown6.jpg",
    "https://i.postimg.cc/dQNJHcK3/brown7.jpg",
    "https://i.postimg.cc/HsJdFvp2/brown8.jpg",
  ], "brown", brownMatter);

  loadFromLinks([
    "https://i.postimg.cc/YCYkC4LL/green1.jpg", 
    "https://i.postimg.cc/3whh4K2S/green2.jpg",
    "https://i.postimg.cc/LX6MDNCj/green3.jpg",
    "https://i.postimg.cc/Kj1hS4yz/green4.jpg",
    "https://i.postimg.cc/d09YGzBq/green5.jpg",
    "https://i.postimg.cc/RFsxDKyy/green6.jpg",
    "https://i.postimg.cc/4xN891J8/green7.jpg",
    "https://i.postimg.cc/d0gngPGX/green8.jpg",
    "https://i.postimg.cc/8PbKcYVJ/green9.jpg",
    "https://i.postimg.cc/Gp4qMhTG/green10.jpg"
  ], "green", greenMatter);

  loadFromLinks([
    "https://i.postimg.cc/rFt2fdJZ/spore1.jpg",
    "https://i.postimg.cc/pr3b2x2B/spore2.jpg",
    "https://i.postimg.cc/T3MMFRNd/spore3.jpg",
    "https://i.postimg.cc/h4Yq8897/spore4.jpg",
    "https://i.postimg.cc/sXSKr6c2/spore5.jpg",
    "https://i.postimg.cc/bwCmH2rq/spore6.jpg"
  ], "spore", culturalSpores);

  loadFromLinks([
    "https://i.postimg.cc/sxLyv7J7/fungal1.jpg",
    "https://i.postimg.cc/GhZdRPt1/fungal2.jpg",
    "https://i.postimg.cc/CMk6T1P4/fungal3.jpg",
    "https://i.postimg.cc/ncxSHJNf/fungal4.jpg"
    
  ], "fungal", fungalGrowths);
}

function setup() {
  createCanvas(800, 600);
  imageMode(CENTER);
  noCursor();

  heap = []
    .concat(randomSubset(brownMatter, 8))
    .concat(randomSubset(greenMatter, 6))
    .concat(randomSubset(culturalSpores, 4))
    .concat(randomSubset(fungalGrowths, 2));
}

function draw() {
  background(20);

  for (let item of heap) {
    push();
    translate(width / 2, height / 2);

    if (item.type === "brown") {
      tint(255, 200 - item.decayLevel * 5);
      image(item.img, 0, 0, width, height);
    }

    if (item.type === "green") {
      for (let i = 20; i < item.decayLevel; i++) {
        tint(255, random(80, 150));
        image(item.img, random(-3, 3), random(-3, 3), width, height);
      }
    }

    if (item.type === "spore") {
      if (frameCount % int(random(30, 120)) === 0) {
        tint(255, random(50, 180));
        image(item.img, random(-10, 10), random(-10, 10), width, height);
      }
    }

    if (item.type === "fungal") {
      push();
      rotate(sin(frameCount * 0.01) * 0.02);
      tint(255, 150);
      image(item.img, noise(frameCount * 0.01) * 10, noise(frameCount * 0.015) * 10, width, height);
      pop();
    }
    pop();

    if (frameCount % 10 === 0 && item.decayLevel < 20) {
      if (item.type === "brown") item.decayLevel += 0.2;
      if (item.type === "green") item.decayLevel += 1;
      if (item.type === "spore") item.decayLevel += 0.5;
      if (item.type === "fungal") item.decayLevel += 0.5;
    }
  }

  for (let f of fungi) {
    f.grow();
    f.display();
  }

  if (millis() - lastTurnTime > turnInterval && heap.length > 0) {
    turnCompost();
    lastTurnTime = millis();
  }
}

function mouseMoved() {
  fungi.push(new Fungus(mouseX, mouseY));

  for (let item of heap) {
    if (item.type === "green") item.decayLevel += 0.5;
    if (item.type === "fungal") item.decayLevel += 0.2;
  }
}

function mousePressed() {
  for (let item of heap) {
    if (item.type === "green") item.decayLevel += 3;
  }
}

function turnCompost() {
  let idx = int(random(heap.length));
  let removed = heap.splice(idx, 1)[0];

  let pool;
  if (removed.type === "brown") pool = brownMatter;
  if (removed.type === "green") pool = greenMatter;
  if (removed.type === "spore") pool = culturalSpores;
  if (removed.type === "fungal") pool = fungalGrowths;

  if (pool.length > 0) {
    let newItem = random(pool);
    newItem.decayLevel = 0;
    heap.push(newItem);
  }
}

class Fungus {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 5;
    this.color = color(random(180, 255), random(150, 255), random(180, 255), 15);
  }
  grow() {
    this.size += 0.3;
  }
  display() {
    noStroke();
    fill(this.color);
    ellipse(this.x + random(-2, 2), this.y + random(-2, 2), this.size);
  }
}

function randomSubset(arr, count) {
  if (arr.length <= count) return arr;
  let copy = shuffle([...arr]);
  return copy.slice(0, count);
}

// -----------------------------
// Load from direct URLs
// -----------------------------
function loadFromLinks(links, type, targetArray) {
  for (let url of links) {
    let img = loadImage(url);
    targetArray.push({ img: img, type: type, decayLevel: 0 });
  }
}
