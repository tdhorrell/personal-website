const hiddenInput = document.getElementById("hiddenInput");

const initialUploadBtn = document.getElementById("initial-upload-button");
const uploadNewBtn = document.getElementById("upload-new-button");

const actionsPanel = document.querySelector(".lapsify-actions");

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
// BUTTON LOGIC
// =========================

if (initialUploadBtn) {
  initialUploadBtn.addEventListener("click", () => {
    hiddenInput.click();
  });
}

if (uploadNewBtn) {
  uploadNewBtn.addEventListener("click", () => {
    hiddenInput.click();
  });
}

// =========================
// IMAGE UPLOAD
// =========================

hiddenInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  if (initialUploadBtn) initialUploadBtn.classList.add("hidden");
  actionsPanel.classList.remove("hidden");
  document.getElementById('lapsify-comparison').classList.remove('hidden');

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

  hiddenInput.value = "";
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

  const width = filteredCanvas.width;
  const height = filteredCanvas.height;

  let float = toFloatImage(imageData);

  float = applyWarmToneFloat(float, width, height);
  float = applyFadeFloat(float);
  float = gaussianBlurFloat(float, width, height);
  float = addGrainFloat(float);
  float = addVignetteFloat(float, width, height);

  imageData = fromFloatImage(float, imageData);

  filteredCtx.putImageData(imageData, 0, 0);
}

// =========================
// FLOAT HELPERS
// =========================

function toFloatImage(imageData) {
  const float = new Float32Array(imageData.data.length);

  for (let i = 0; i < imageData.data.length; i++) {
    float[i] = imageData.data[i] / 255;
  }

  return float;
}

function fromFloatImage(float, imageData) {
  for (let i = 0; i < float.length; i++) {
    imageData.data[i] = Math.max(0, Math.min(255, float[i] * 255));
  }

  return imageData;
}


// =========================
// Warm tone
// =========================

function applyWarmToneFloat(float, width, height) {
  for (let i = 0; i < float.length; i += 4) {
    const r = float[i];
    const g = float[i + 1];
    const b = float[i + 2];

    float[i]     = 1.05 * r + 0.02 * g;
    float[i + 1] = g;
    float[i + 2] = 0.02 * g + 0.95 * b;
  }

  return float;
}


// =========================
// Fade
// =========================

function applyFadeFloat(float) {
  for (let i = 0; i < float.length; i += 4) {
    float[i]     = float[i] * 0.85 + 0.08;
    float[i + 1] = float[i + 1] * 0.85 + 0.08;
    float[i + 2] = float[i + 2] * 0.85 + 0.08;
  }

  return float;
}


// =========================
// Gaussian blur
// =========================

function gaussianBlurFloat(float, width, height) {
  const kernel = [1, 2, 1];
  const norm = 4;

  const temp = new Float32Array(float.length);
  const output = new Float32Array(float.length);

  // horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const i = (y * width + x) * 4 + c;

        temp[i] =
          (float[i - 4] * kernel[0] +
           float[i]     * kernel[1] +
           float[i + 4] * kernel[2]) / norm;
      }
    }
  }

  // vertical pass
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        const i = (y * width + x) * 4 + c;

        output[i] =
          (temp[i - width * 4] * kernel[0] +
           temp[i]             * kernel[1] +
           temp[i + width * 4] * kernel[2]) / norm;
      }
    }
  }

  for (let i = 0; i < float.length; i += 4) {
    float[i]     = float[i]     * 0.7 + output[i]     * 0.3;
    float[i + 1] = float[i + 1] * 0.7 + output[i + 1] * 0.3;
    float[i + 2] = float[i + 2] * 0.7 + output[i + 2] * 0.3;
  }

  return float;
}


// =========================
// Grain
// =========================

function addGrainFloat(float) {
  for (let i = 0; i < float.length; i += 4) {
    const noise = (Math.random() - 0.5) * 0.04;

    float[i]     += noise;
    float[i + 1] += noise;
    float[i + 2] += noise;
  }

  return float;
}


// =========================
// Vignette
// =========================

function addVignetteFloat(float, width, height) {
  const strength = 0.25; // lower = softer vignette

  for (let y = 0; y < height; y++) {
    const ny = (y / height) * 2 - 1;

    for (let x = 0; x < width; x++) {
      const nx = (x / width) * 2 - 1;

      // stretch radius so effect starts farther out
      const radius = Math.sqrt(nx * nx + ny * ny) * 0.7;

      // smoother curve (quadratic falloff)
      const mask = 1 - strength * radius * radius;

      const i = (y * width + x) * 4;

      float[i]     *= mask;
      float[i + 1] *= mask;
      float[i + 2] *= mask;
    }
  }

  return float;
}

// =========================
// DOWNLOAD
// =========================

const downloadBtn = document.getElementById("download");

// mobile helper
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (downloadBtn) {
  downloadBtn.onclick = () => {
    
    // blob convert
    filteredCanvas.toBlob(async (blob) => {
      const fileName = "lapsified-image.png";
      const file = new File([blob], fileName, { type: "image/png" });

      // mobile devices
      if (isMobileDevice() && navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Lapsify Image',
            text: 'Here is my lapsified image!'
          });
          return;
        } catch (error) {
          console.log("Share failed or closed, falling back to download.", error);
        }
      }

      // desktop
      const link = document.createElement("a");
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up memory
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }, "image/png");
  };
}


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
