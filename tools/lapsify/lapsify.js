const upload = document.getElementById("upload");
const originalCanvas = document.getElementById("originalCanvas");
const filteredCanvas = document.getElementById("filteredCanvas");

const originalCtx = originalCanvas.getContext("2d");
const filteredCtx = filteredCanvas.getContext("2d");


// =========================
// CONFIG (future sliders hook here)
// =========================

const config = {
  warmth: 1.15,
  fadeAmount: 0.1,
  blurRadius: 2,
  grainStrength: 8,
  vignetteStrength: 0.4
};


// =========================
// IMAGE UPLOAD
// =========================

upload.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();

  img.onload = () => {
    const maxSize = 1200;
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      width *= scale;
      height *= scale;
    }

    originalCanvas.width = width;
    originalCanvas.height = height;
    filteredCanvas.width = width;
    filteredCanvas.height = height;

    originalCtx.drawImage(img, 0, 0, width, height);
    filteredCtx.drawImage(img, 0, 0, width, height);

    applyLapsify();
  };

  img.src = URL.createObjectURL(file);
});


// =========================
// MAIN PIPELINE
// =========================

function applyLapsify() {
  let imageData = filteredCtx.getImageData(
    0,
    0,
    filteredCanvas.width,
    filteredCanvas.height
  );

  imageData = applyWarmTone(imageData, config);
  imageData = applyFade(imageData, config);
  imageData = applyBlur(imageData, config);
  imageData = addGrain(imageData, config);
  imageData = addVignette(imageData, config);

  filteredCtx.putImageData(imageData, 0, 0);
}


// =========================
// EFFECT FUNCTIONS
// =========================

function applyWarmTone(imageData, cfg) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * cfg.warmth);
    data[i + 2] *= 0.9;
  }

  return imageData;
}


function applyFade(imageData, cfg) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];
      v = v * (1 - cfg.fadeAmount) + 255 * cfg.fadeAmount;
      data[i + c] = v;
    }
  }

  return imageData;
}


// Simple box blur (fast + mobile friendly)
function applyBlur(imageData, cfg) {
  const radius = cfg.blurRadius;
  if (radius <= 0) return imageData;

  const { width, height, data } = imageData;
  const copy = new Uint8ClampedArray(data);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {

      let r = 0, g = 0, b = 0, count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          r += copy[idx];
          g += copy[idx + 1];
          b += copy[idx + 2];
          count++;
        }
      }

      const i = (y * width + x) * 4;
      data[i] = r / count;
      data[i + 1] = g / count;
      data[i + 2] = b / count;
    }
  }

  return imageData;
}


function addGrain(imageData, cfg) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * cfg.grainStrength;

    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }

  return imageData;
}


function addVignette(imageData, cfg) {
  const { width, height, data } = imageData;

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX**2 + centerY**2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      const factor = 1 - (dist / maxDist) * cfg.vignetteStrength;

      const i = (y * width + x) * 4;

      data[i] *= factor;
      data[i + 1] *= factor;
      data[i + 2] *= factor;
    }
  }

  return imageData;
}


// =========================
// DOWNLOAD
// =========================

document.getElementById("download").onclick = () => {
  const link = document.createElement("a");
  link.download = "lapsified.png";
  link.href = filteredCanvas.toDataURL("image/png");
  link.click();
};


// =========================
// BURGER MENU
// =========================


const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

const navLinks = document.querySelectorAll('.nav-menu a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});
