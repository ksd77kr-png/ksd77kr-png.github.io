"use strict";

const PALETTE = [
  { name: "Crimson", hex: "#7b2638" },
  { name: "Scarlet", hex: "#d64541" },
  { name: "Rose", hex: "#f4a6b8" },
  { name: "Blush", hex: "#f8c8d8" },
  { name: "Fuchsia", hex: "#ec6fa8" },
  { name: "Magenta", hex: "#e9358f" },
  { name: "Coral", hex: "#f26b5b" },
  { name: "Salmon", hex: "#f7a79b" },
  { name: "Peach", hex: "#f58b7a" },
  { name: "Apricot", hex: "#f7b27a" },
  { name: "Orange", hex: "#f28c28" },
  { name: "Sunflower", hex: "#f2c94c" },
  { name: "Butter", hex: "#f8e8a0" },
  { name: "Lime", hex: "#e8f53d" },
  { name: "Moss", hex: "#c9e89a" },
  { name: "Leaf", hex: "#a8d66d" },
  { name: "Sage", hex: "#9bcf9b" },
  { name: "Forest", hex: "#4f8a5b" },
  { name: "Seafoam", hex: "#8fd3c1" },
  { name: "Teal", hex: "#278c82" },
  { name: "Aqua", hex: "#a6e3e9" },
  { name: "Ice", hex: "#c8e8f4" },
  { name: "Sky", hex: "#83c9e8" },
  { name: "Blue", hex: "#377bb5" },
  { name: "Azure", hex: "#4da1d9" },
  { name: "Navy", hex: "#1f314d" },
  { name: "Slate", hex: "#596579" },
  { name: "Lavender", hex: "#c3b0dd" },
  { name: "Violet", hex: "#8b62b2" },
  { name: "Indigo", hex: "#5d347a" },
  { name: "Mauve", hex: "#c7a4b8" },
  { name: "Dusty Rose", hex: "#9a687d" },
  { name: "Plum", hex: "#713f5a" },
  { name: "Sand", hex: "#f2b18f" },
  { name: "Tangerine", hex: "#d88969" },
  { name: "Beige", hex: "#b89978" },
  { name: "Tan", hex: "#b8873b" },
  { name: "Terracotta", hex: "#9a4f3d" },
  { name: "Umber", hex: "#654437" },
  { name: "Olive", hex: "#4f5536" },
  { name: "Charcoal", hex: "#252525" },
  { name: "Slate Gray", hex: "#55585c" },
  { name: "Silver", hex: "#b7b8b6" },
  { name: "Ivory", hex: "#f4f1e8" },
  { name: "Pearl", hex: "#eee4c9" }
].map(color => ({ ...color, rgb: hexToRgb(color.hex) }));

const LEGACY_PALETTE_INDEX_MAP = [1, 11, 17, 23, 27, 33, 38, 42, 40, 43];
const BEAD_SIZES = [4, 6, 8, 10];
const CURTAIN_WIDTHS = [10, 15, 20, 30, 40, 50, 60, 70];
const FIXED_BEAD_NAME = "Fixed bead";

const els = {
  beadSize: document.querySelector("#bead-size"),
  curtainWidth: document.querySelector("#curtain-width"),
  imageFile: document.querySelector("#image-file"),
  fileDrop: document.querySelector("#file-drop"),
  fileLabel: document.querySelector("#file-label"),
  inputSummary: document.querySelector("#input-summary"),
  generateBtn: document.querySelector("#generate-btn"),
  error: document.querySelector("#error-message"),
  workspace: document.querySelector("#workspace"),
  palette: document.querySelector("#palette"),
  zoom: document.querySelector("#zoom"),
  zoomValue: document.querySelector("#zoom-value"),
  canvas: document.querySelector("#bead-canvas"),
  canvasWrap: document.querySelector("#canvas-wrap"),
  undoBtn: document.querySelector("#undo-btn"),
  restoreBtn: document.querySelector("#restore-btn"),
  saveBtn: document.querySelector("#save-btn"),
  loadBtn: document.querySelector("#load-btn"),
  setupLoadBtn: document.querySelector("#setup-load-btn"),
  projectFile: document.querySelector("#project-file"),
  counts: document.querySelector("#color-counts"),
  instructions: document.querySelector("#instructions"),
  copyBtn: document.querySelector("#copy-btn"),
  printBtn: document.querySelector("#print-btn"),
  metricGrid: document.querySelector("#metric-grid"),
  metricSize: document.querySelector("#metric-size"),
  metricCount: document.querySelector("#metric-count"),
  colorDialog: document.querySelector("#color-dialog"),
  colorDialogTitle: document.querySelector("#color-dialog-title"),
  colorDialogDescription: document.querySelector("#color-dialog-description"),
  colorDialogOptions: document.querySelector("#color-dialog-options"),
  colorDialogClose: document.querySelector("#color-dialog-close"),
  colorCancelBtn: document.querySelector("#color-cancel-btn"),
  colorToggleBtn: document.querySelector("#color-toggle-btn")
};

const ctx = els.canvas.getContext("2d");
const state = {
  sourceImage: null,
  sourceName: "",
  cols: 0,
  rows: 0,
  cells: new Uint8Array(0),
  originalCells: new Uint8Array(0),
  selectedColor: 0,
  cellSize: Number(els.zoom.value),
  drawing: false,
  touchPointer: null,
  undoStack: [],
  updateTimer: null,
  beadSprites: [],
  excludedColors: new Set(),
  dialogColor: null
};

buildPalette();
bindEvents();
updateZoomRange();
updateInputSummary();

function bindEvents() {
  els.imageFile.addEventListener("change", event => {
    const [file] = event.target.files;
    if (file) loadFile(file);
  });

  [els.beadSize, els.curtainWidth].forEach(input => {
    input.addEventListener("input", () => {
      if (input === els.curtainWidth) updateZoomRange();
      updateInputSummary();
      validateInputs(false);
    });
  });

  ["dragenter", "dragover"].forEach(type => els.fileDrop.addEventListener(type, event => {
    event.preventDefault();
    els.fileDrop.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach(type => els.fileDrop.addEventListener(type, event => {
    event.preventDefault();
    els.fileDrop.classList.remove("is-dragging");
  }));
  els.fileDrop.addEventListener("drop", event => {
    const file = [...event.dataTransfer.files].find(item => /image\/jpeg/i.test(item.type) || /\.jpe?g$/i.test(item.name));
    if (file) loadFile(file);
    else showError("Please choose a JPG or JPEG file.");
  });

  els.generateBtn.addEventListener("click", generatePattern);
  els.zoom.addEventListener("input", () => {
    state.cellSize = Number(els.zoom.value);
    els.zoomValue.value = `${state.cellSize}px`;
    drawGrid();
  });

  els.canvas.addEventListener("pointerdown", startDrawing);
  els.canvas.addEventListener("pointermove", continueDrawing);
  window.addEventListener("pointerup", stopDrawing);
  window.addEventListener("pointercancel", stopDrawing);
  els.canvas.addEventListener("contextmenu", event => event.preventDefault());

  els.undoBtn.addEventListener("click", undo);
  els.restoreBtn.addEventListener("click", restoreOriginal);
  els.saveBtn.addEventListener("click", saveProject);
  els.loadBtn.addEventListener("click", () => els.projectFile.click());
  els.setupLoadBtn.addEventListener("click", () => els.projectFile.click());
  els.projectFile.addEventListener("change", loadProjectFile);
  els.copyBtn.addEventListener("click", copyInstructions);
  els.printBtn.addEventListener("click", () => window.print());
  els.colorDialogClose.addEventListener("click", closeColorDialog);
  els.colorCancelBtn.addEventListener("click", closeColorDialog);
  els.colorToggleBtn.addEventListener("click", toggleDialogColor);
  els.colorDialog.addEventListener("click", event => {
    if (event.target === els.colorDialog) closeColorDialog();
  });
}

function getMinimumCellSize(widthCm = Number(els.curtainWidth.value)) {
  return widthCm >= 50 ? 3 : 7;
}

function updateZoomRange() {
  const minimum = getMinimumCellSize();
  els.zoom.min = String(minimum);
  if (state.cellSize < minimum) {
    state.cellSize = minimum;
    els.zoom.value = String(minimum);
    els.zoomValue.value = `${minimum}px`;
    drawGrid();
  }
}

function buildPalette() {
  PALETTE.forEach((color, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.style.setProperty("--swatch", color.hex);
    button.dataset.short = color.name;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", color.name);
    button.setAttribute("aria-checked", index === state.selectedColor ? "true" : "false");
    button.title = color.name;
    button.addEventListener("click", () => selectColor(index));
    els.palette.append(button);
  });
}

function selectColor(index) {
  if (state.excludedColors.has(index)) return;
  state.selectedColor = index;
  [...els.palette.children].forEach((button, buttonIndex) => {
    button.setAttribute("aria-checked", buttonIndex === index ? "true" : "false");
  });
}

function updatePaletteAvailability() {
  [...els.palette.children].forEach((button, index) => {
    const excluded = state.excludedColors.has(index);
    button.disabled = excluded;
    button.title = excluded ? `${PALETTE[index].name} (disabled)` : PALETTE[index].name;
  });
  if (state.excludedColors.has(state.selectedColor)) {
    const nextColor = PALETTE.findIndex((_, index) => !state.excludedColors.has(index));
    if (nextColor >= 0) selectColor(nextColor);
  }
}

async function loadFile(file) {
  if (!/image\/jpeg/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) {
    showError("Bizbal only accepts JPG or JPEG images.");
    return;
  }

  try {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode();
    URL.revokeObjectURL(url);
    state.sourceImage = image;
    state.sourceName = file.name;
    els.fileLabel.textContent = file.name;
    els.generateBtn.disabled = false;
    hideError();
    updateInputSummary();
  } catch {
    showError("The image could not be loaded. Please pick another JPG file.");
  }
}

function getDimensions() {
  const beadMm = Number(els.beadSize.value);
  const widthCm = Number(els.curtainWidth.value);
  if (!BEAD_SIZES.includes(beadMm)) throw new Error("Please select 4, 6, 8, or 10 mm.");
  if (!CURTAIN_WIDTHS.includes(widthCm)) throw new Error("Please select 10, 15, 20, 30, 40, 50, 60, or 70 cm.");
  const cols = Math.max(1, Math.round(widthCm * 10 / beadMm));
  const rows = state.sourceImage ? Math.max(1, Math.round(cols * state.sourceImage.naturalHeight / state.sourceImage.naturalWidth)) : 0;
  if (rows > 1000 || cols * rows > 300000) throw new Error("The image is too large for browser processing.");
  return { beadMm, widthCm, cols, rows };
}

function validateInputs(showMessage = true) {
  try {
    getDimensions();
    if (showMessage) hideError();
    return true;
  } catch (error) {
    if (showMessage) showError(error.message);
    return false;
  }
}

function updateInputSummary() {
  if (!state.sourceImage) {
    els.inputSummary.textContent = "Pick a photo and the studio will calculate the pattern size.";
    return;
  }
  try {
    const { beadMm, cols, rows } = getDimensions();
    const actualWidth = cols * beadMm / 10;
    const actualRows = rows + 1;
    const actualHeight = actualRows * beadMm / 10;
    els.inputSummary.textContent = `Approx. ${cols} x ${actualRows} beads, including the fixed top row. Actual size: ${formatNumber(actualWidth)} x ${formatNumber(actualHeight)} cm.`;
    hideError();
  } catch {
    els.inputSummary.textContent = "Check the selected values.";
  }
}

function generatePattern() {
  if (!state.sourceImage || !validateInputs()) return;

  try {
    els.generateBtn.disabled = true;
    els.generateBtn.innerHTML = "Generating<span>→</span>";
    const { cols, rows } = getDimensions();
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    sampleCtx.imageSmoothingEnabled = true;
    sampleCtx.imageSmoothingQuality = "high";
    sampleCtx.fillStyle = "#ffffff";
    sampleCtx.fillRect(0, 0, cols, rows);
    sampleCtx.drawImage(state.sourceImage, 0, 0, cols, rows);
    const pixels = sampleCtx.getImageData(0, 0, cols, rows).data;
    const cells = quantizePixels(pixels, cols * rows, state.excludedColors);

    state.cols = cols;
    state.rows = rows;
    state.cells = cells;
    state.originalCells = new Uint8Array(cells);
    state.undoStack = [];
    els.undoBtn.disabled = true;
    els.workspace.hidden = false;
    updateAllOutputs();
    requestAnimationFrame(() => els.workspace.scrollIntoView({ behavior: "smooth", block: "start" }));
  } catch (error) {
    showError(error.message || "Something went wrong while generating the pattern.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.innerHTML = "Generate pattern<span>→</span>";
  }
}

function quantizePixels(pixels, cellCount, excludedColors) {
  const paletteLab = PALETTE.map(color => rgbToLab(color.rgb.r, color.rgb.g, color.rgb.b));
  const cells = new Uint8Array(cellCount);
  for (let index = 0; index < cells.length; index += 1) {
    const offset = index * 4;
    const lab = rgbToLab(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    cells[index] = findNearestColor(lab, paletteLab, excludedColors);
  }
  return cells;
}

function findNearestColor(lab, paletteLab, excludedColors = new Set()) {
  let nearest = 0;
  let minDistance = Infinity;
  paletteLab.forEach((candidate, index) => {
    if (excludedColors.has(index)) return;
    const dl = lab.l - candidate.l;
    const da = lab.a - candidate.a;
    const db = lab.b - candidate.b;
    const distance = dl * dl + da * da + db * db;
    if (distance < minDistance) {
      minDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

function updateAllOutputs() {
  drawGrid();
  updateMetrics();
  updateCounts();
  updateInstructions();
}

function drawGrid() {
  if (!state.cols || !state.rows) return;
  const size = state.cellSize;
  const actualRows = state.rows + 1;
  els.canvas.width = state.cols * size;
  els.canvas.height = actualRows * size;
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  ctx.fillStyle = "#f8f5ee";
  ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
  state.beadSprites = createBeadSprites(size);
  const fixedBeadSprite = createFixedBeadSprite(size);

  ctx.fillStyle = "#eef6f8";
  ctx.fillRect(0, 0, els.canvas.width, size);
  for (let col = 0; col < state.cols; col += 1) {
    ctx.drawImage(fixedBeadSprite, col * size, 0);
  }

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const x = col * size;
      const y = (row + 1) * size;
      ctx.drawImage(state.beadSprites[state.cells[row * state.cols + col]], x, y);
    }
  }

  ctx.beginPath();
  ctx.strokeStyle = size >= 11 ? "rgba(24,49,58,.11)" : "rgba(24,49,58,.07)";
  ctx.lineWidth = 1;
  for (let col = 0; col <= state.cols; col += 1) {
    const x = Math.min(col * size + 0.5, els.canvas.width - 0.5);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, els.canvas.height);
  }
  for (let row = 0; row <= actualRows; row += 1) {
    const y = Math.min(row * size + 0.5, els.canvas.height - 0.5);
    ctx.moveTo(0, y);
    ctx.lineTo(els.canvas.width, y);
  }
  ctx.stroke();
}

function createBeadSprites(size) {
  return PALETTE.map(color => {
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const spriteCtx = sprite.getContext("2d");
    const center = size / 2;
    const radius = Math.max(1, size * 0.42);

    spriteCtx.beginPath();
    spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
    spriteCtx.fillStyle = color.hex;
    spriteCtx.fill();
    spriteCtx.save();
    spriteCtx.clip();

    const volume = spriteCtx.createRadialGradient(size * 0.31, size * 0.27, 0, center, center, radius * 1.15);
    volume.addColorStop(0, "rgba(255,255,255,.72)");
    volume.addColorStop(0.24, "rgba(255,255,255,.23)");
    volume.addColorStop(0.62, "rgba(255,255,255,0)");
    volume.addColorStop(1, "rgba(0,0,0,.32)");
    spriteCtx.fillStyle = volume;
    spriteCtx.fillRect(0, 0, size, size);
    spriteCtx.restore();

    spriteCtx.beginPath();
    spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
    spriteCtx.strokeStyle = "rgba(24,49,58,.34)";
    spriteCtx.lineWidth = Math.max(1, size * 0.055);
    spriteCtx.stroke();
    return sprite;
  });
}

function createFixedBeadSprite(size) {
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext("2d");
  const center = size / 2;
  const radius = size * 0.43;

  spriteCtx.beginPath();
  for (let point = 0; point < 6; point += 1) {
    const angle = Math.PI / 3 * point - Math.PI / 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    if (point === 0) spriteCtx.moveTo(x, y);
    else spriteCtx.lineTo(x, y);
  }
  spriteCtx.closePath();
  const metal = spriteCtx.createLinearGradient(0, 0, size, size);
  metal.addColorStop(0, "#fff0a8");
  metal.addColorStop(0.32, "#d69b24");
  metal.addColorStop(0.58, "#fff2a6");
  metal.addColorStop(1, "#8b5b0c");
  spriteCtx.fillStyle = metal;
  spriteCtx.fill();
  spriteCtx.strokeStyle = "#5e3e0b";
  spriteCtx.lineWidth = Math.max(1, size * 0.075);
  spriteCtx.stroke();

  spriteCtx.beginPath();
  spriteCtx.arc(center, center, Math.max(1.2, size * 0.14), 0, Math.PI * 2);
  spriteCtx.fillStyle = "#173f37";
  spriteCtx.fill();
  spriteCtx.strokeStyle = "rgba(255,255,255,.8)";
  spriteCtx.lineWidth = Math.max(0.7, size * 0.045);
  spriteCtx.stroke();
  return sprite;
}

function startDrawing(event) {
  if (!state.cells.length) return;
  event.preventDefault();
  state.drawing = true;
  pushHistory();
  paintAtPointer(event);
  els.canvas.setPointerCapture?.(event.pointerId);
}

function continueDrawing(event) {
  if (!state.drawing) return;
  event.preventDefault();
  paintAtPointer(event);
}

function stopDrawing(event) {
  if (!state.drawing) return;
  state.drawing = false;
  if (state.undoStack.length) els.undoBtn.disabled = false;
  if (event?.type === "pointercancel") scheduleOutputUpdate();
}

function paintAtPointer(event) {
  const rect = els.canvas.getBoundingClientRect();
  const col = Math.floor((event.clientX - rect.left) * els.canvas.width / rect.width / state.cellSize);
  const visualRow = Math.floor((event.clientY - rect.top) * els.canvas.height / rect.height / state.cellSize);
  const row = visualRow - 1;
  if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) return;
  const index = row * state.cols + col;
  if (state.cells[index] === state.selectedColor) return;
  state.cells[index] = state.selectedColor;
  drawCell(row, col);
  scheduleOutputUpdate();
}

function drawCell(row, col) {
  const size = state.cellSize;
  const x = col * size;
  const y = (row + 1) * size;
  ctx.fillStyle = "#f8f5ee";
  ctx.fillRect(x, y, size, size);
  if (!state.beadSprites.length) state.beadSprites = createBeadSprites(size);
  ctx.drawImage(state.beadSprites[state.cells[row * state.cols + col]], x, y);
  ctx.strokeStyle = "rgba(24,49,58,.1)";
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function scheduleOutputUpdate() {
  clearTimeout(state.updateTimer);
  state.updateTimer = setTimeout(() => {
    updateCounts();
    updateInstructions();
  }, 80);
}

function undo() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  state.cells = previous.cells;
  state.originalCells = previous.originalCells;
  state.excludedColors = previous.excludedColors;
  els.undoBtn.disabled = state.undoStack.length === 0;
  updatePaletteAvailability();
  updateAllOutputs();
}

function restoreOriginal() {
  if (!state.originalCells.length || arraysEqual(state.cells, state.originalCells)) return;
  pushHistory();
  state.cells = new Uint8Array(state.originalCells);
  els.undoBtn.disabled = false;
  updateAllOutputs();
}

function updateMetrics() {
  const beadMm = Number(els.beadSize.value);
  const actualRows = state.rows + 1;
  const width = state.cols * beadMm / 10;
  const height = actualRows * beadMm / 10;
  els.metricGrid.textContent = `${state.cols} x ${actualRows}`;
  els.metricSize.textContent = `${formatNumber(width)} x ${formatNumber(height)} cm`;
  els.metricCount.textContent = (state.cells.length + state.cols).toLocaleString("en-US");
}

function updateCounts() {
  const counts = Array(PALETTE.length).fill(0);
  state.cells.forEach(colorIndex => { counts[colorIndex] += 1; });
  els.counts.replaceChildren();

  const fixedChip = document.createElement("button");
  fixedChip.type = "button";
  fixedChip.className = "count-chip fixed-chip";
  fixedChip.disabled = true;
  fixedChip.innerHTML = `<i></i><span>${FIXED_BEAD_NAME}</span><b>${state.cols.toLocaleString("en-US")}</b>`;
  fixedChip.setAttribute("aria-label", `${FIXED_BEAD_NAME}, ${state.cols.toLocaleString("en-US")} beads`);
  els.counts.append(fixedChip);

  PALETTE.forEach((color, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "count-chip";
    if (state.excludedColors.has(index)) chip.classList.add("is-excluded");
    chip.style.setProperty("--chip", color.hex);
    const status = state.excludedColors.has(index) ? "disabled" : `${counts[index].toLocaleString("en-US")} beads`;
    chip.disabled = counts[index] === 0 && !state.excludedColors.has(index);
    chip.innerHTML = `<i></i><span>${color.name}</span><b>${status}</b>`;
    chip.setAttribute("aria-label", `${color.name}, ${status}`);
    chip.addEventListener("click", () => openColorDialog(index, counts[index]));
    els.counts.append(chip);
  });
}

function pushHistory() {
  state.undoStack.push({
    cells: new Uint8Array(state.cells),
    originalCells: new Uint8Array(state.originalCells),
    excludedColors: new Set(state.excludedColors)
  });
  if (state.undoStack.length > 30) state.undoStack.shift();
}

function openColorDialog(index, count) {
  const color = PALETTE[index];
  const excluded = state.excludedColors.has(index);
  state.dialogColor = index;
  els.colorDialogTitle.textContent = `${color.name} color edit`;
  els.colorDialogDescription.textContent = excluded
    ? `${color.name} is currently disabled for this pattern.`
    : `Replace the ${count.toLocaleString("en-US")} ${color.name} beads with another color.`;
  els.colorDialogOptions.replaceChildren();

  PALETTE.forEach((option, optionIndex) => {
    if (state.excludedColors.has(optionIndex)) return;
    const isCurrent = optionIndex === index;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-option";
    button.classList.toggle("is-current", isCurrent);
    button.style.setProperty("--option", option.hex);
    button.innerHTML = `<i></i><span>${option.name}</span>${isCurrent ? "<small>current</small>" : ""}`;
    button.setAttribute("aria-label", isCurrent ? `${option.name}, current color` : `${option.name}, replace with this color`);
    if (isCurrent) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => {
      if (isCurrent) closeColorDialog();
      else replaceColor(index, optionIndex);
    });
    els.colorDialogOptions.append(button);
  });

  els.colorDialogOptions.hidden = excluded;
  els.colorToggleBtn.textContent = excluded ? "Enable this color" : "Disable this color";
  els.colorToggleBtn.classList.toggle("is-restore", excluded);
  els.colorDialog.showModal();
}

function closeColorDialog() {
  state.dialogColor = null;
  els.colorDialog.close();
}

function replaceColor(fromIndex, toIndex) {
  if (!state.cells.some(value => value === fromIndex)) {
    closeColorDialog();
    return;
  }
  pushHistory();
  state.cells.forEach((value, index) => {
    if (value === fromIndex) state.cells[index] = toIndex;
  });
  els.undoBtn.disabled = false;
  closeColorDialog();
  updateAllOutputs();
}

function toggleDialogColor() {
  const colorIndex = state.dialogColor;
  if (colorIndex === null) return;
  const excluding = !state.excludedColors.has(colorIndex);
  if (excluding && state.excludedColors.size >= PALETTE.length - 1) {
    showError("At least one color must stay available.");
    closeColorDialog();
    return;
  }

  pushHistory();
  if (excluding) state.excludedColors.add(colorIndex);
  else state.excludedColors.delete(colorIndex);
  recalculateWithAvailableColors(colorIndex);
  els.undoBtn.disabled = false;
  updatePaletteAvailability();
  closeColorDialog();
  updateAllOutputs();
}

function recalculateWithAvailableColors(changedColor) {
  if (state.sourceImage) {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = state.cols;
    sampleCanvas.height = state.rows;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    sampleCtx.fillStyle = "#ffffff";
    sampleCtx.fillRect(0, 0, state.cols, state.rows);
    sampleCtx.drawImage(state.sourceImage, 0, 0, state.cols, state.rows);
    const pixels = sampleCtx.getImageData(0, 0, state.cols, state.rows).data;
    state.cells = quantizePixels(pixels, state.cols * state.rows, state.excludedColors);
  } else if (state.excludedColors.has(changedColor)) {
    const paletteLab = PALETTE.map(color => rgbToLab(color.rgb.r, color.rgb.g, color.rgb.b));
    const replacement = findNearestColor(paletteLab[changedColor], paletteLab, state.excludedColors);
    state.cells.forEach((value, index) => {
      if (value === changedColor) state.cells[index] = replacement;
    });
  }
  state.originalCells = new Uint8Array(state.cells);
}

function getLineSegments(col) {
  const segments = [];
  let current = state.cells[(state.rows - 1) * state.cols + col];
  let count = 1;
  for (let row = state.rows - 2; row >= 0; row -= 1) {
    const color = state.cells[row * state.cols + col];
    if (color === current) count += 1;
    else {
      segments.push({ color: current, count });
      current = color;
      count = 1;
    }
  }
  segments.push({ color: current, count });
  return segments;
}

function updateInstructions() {
  const fragment = document.createDocumentFragment();
  for (let col = 0; col < state.cols; col += 1) {
    const line = document.createElement("div");
    line.className = "instruction-line";
    const title = document.createElement("b");
    title.textContent = `Line ${col + 1}`;
    const segmentWrap = document.createElement("span");
    segmentWrap.className = "segments";
    getLineSegments(col).forEach(segment => {
      const item = document.createElement("span");
      item.className = "segment";
      item.style.setProperty("--segment", PALETTE[segment.color].hex);
      item.innerHTML = `<i></i>${PALETTE[segment.color].name} ${segment.count}`;
      segmentWrap.append(item);
    });
    const fixedItem = document.createElement("span");
    fixedItem.className = "segment fixed-segment";
    fixedItem.innerHTML = `<i></i>${FIXED_BEAD_NAME} 1`;
    segmentWrap.append(fixedItem);
    line.append(title, segmentWrap);
    fragment.append(line);
  }
  els.instructions.replaceChildren(fragment);
}

function instructionText() {
  const beadMm = Number(els.beadSize.value);
  const actualRows = state.rows + 1;
  const header = [
    "Bizbal bead-curtain instructions",
    `Source: ${state.sourceName}`,
    `Bead size: ${formatNumber(beadMm)} mm / Pattern: ${state.cols} x ${actualRows} beads`,
    `Actual size: ${formatNumber(state.cols * beadMm / 10)} x ${formatNumber(actualRows * beadMm / 10)} cm`,
    `Fixed beads: 1 top row / ${state.cols} total`,
    "Build the curtain from bottom to top, with the fixed row at the very end.",
    ""
  ];
  const lines = Array.from({ length: state.cols }, (_, col) => {
    const segments = getLineSegments(col).map(segment => `${PALETTE[segment.color].name}${segment.count}`);
    segments.push(`${FIXED_BEAD_NAME}1`);
    return `Line ${col + 1}: ${segments.join(" / ")}`;
  });
  return [...header, ...lines].join("\n");
}

function saveProject() {
  if (!state.cells.length) return;
  const project = {
    type: "bead-curtain-project",
    version: 2,
    savedAt: new Date().toISOString(),
    sourceName: state.sourceName,
    sourceImageData: serializeSourceImage(),
    settings: {
      beadMm: Number(els.beadSize.value),
      curtainWidthCm: Number(els.curtainWidth.value),
      selectedColor: state.selectedColor,
      zoom: state.cellSize,
      excludedColors: [...state.excludedColors]
    },
    grid: {
      cols: state.cols,
      rows: state.rows,
      cells: Array.from(state.cells),
      originalCells: Array.from(state.originalCells)
    }
  };
  const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const baseName = (state.sourceName || "bizbal-pattern").replace(/\.[^.]+$/, "").replace(/[\\/:*?\"<>|]/g, "-");
  link.href = url;
  link.download = `${baseName}.beads.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  flashButton(els.saveBtn, "Saved");
}

async function loadProjectFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error("Project files must be smaller than 50 MB.");
    const project = JSON.parse(await file.text());
    validateProject(project);
    const { grid, settings } = project;
    const isLegacyProject = project.version === 1;
    const convertColors = values => isLegacyProject ? values.map(value => LEGACY_PALETTE_INDEX_MAP[value]) : values;
    state.cols = grid.cols;
    state.rows = grid.rows;
    state.cells = Uint8Array.from(convertColors(grid.cells));
    state.originalCells = Uint8Array.from(convertColors(grid.originalCells || grid.cells));
    state.sourceImage = await restoreSourceImage(project.sourceImageData);
    state.sourceName = project.sourceName || file.name;
    state.undoStack = [];
    state.excludedColors = new Set(convertColors(settings.excludedColors || []));
    const savedSelectedColor = Math.max(0, Number(settings.selectedColor) || 0);
    state.selectedColor = isLegacyProject ? LEGACY_PALETTE_INDEX_MAP[savedSelectedColor] : Math.min(PALETTE.length - 1, savedSelectedColor);
    els.beadSize.value = settings.beadMm;
    els.curtainWidth.value = settings.curtainWidthCm;
    const minimumCellSize = getMinimumCellSize(Number(settings.curtainWidthCm));
    els.zoom.min = String(minimumCellSize);
    state.cellSize = Math.min(24, Math.max(minimumCellSize, Number(settings.zoom) || 12));
    els.zoom.value = state.cellSize;
    els.zoomValue.value = `${state.cellSize}px`;
    els.fileLabel.textContent = `${state.sourceName} loaded project`;
    els.generateBtn.disabled = !state.sourceImage;
    els.undoBtn.disabled = true;
    updatePaletteAvailability();
    selectColor(state.selectedColor);
    hideError();
    els.workspace.hidden = false;
    updateAllOutputs();
    els.inputSummary.textContent = `Loaded project: ${state.cols} x ${state.rows + 1} beads, including the fixed row.`;
    requestAnimationFrame(() => els.workspace.scrollIntoView({ behavior: "smooth", block: "start" }));
    flashButton(els.loadBtn, "Loaded");
  } catch (error) {
    showError(error.message || "The project file could not be loaded.");
  } finally {
    event.target.value = "";
  }
}

function serializeSourceImage() {
  if (!state.sourceImage) return null;
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(state.sourceImage.naturalWidth, state.sourceImage.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(state.sourceImage.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(state.sourceImage.naturalHeight * scale));
  const imageCtx = canvas.getContext("2d");
  imageCtx.fillStyle = "#ffffff";
  imageCtx.fillRect(0, 0, canvas.width, canvas.height);
  imageCtx.drawImage(state.sourceImage, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function restoreSourceImage(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error("The project image data is not valid.");
  }
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
}

function validateProject(project) {
  if (!project || project.type !== "bead-curtain-project" || ![1, 2].includes(project.version)) {
    throw new Error("Unsupported project file.");
  }
  const { grid, settings } = project;
  const projectPaletteLength = project.version === 1 ? LEGACY_PALETTE_INDEX_MAP.length : PALETTE.length;
  if (!grid || !Number.isInteger(grid.cols) || !Number.isInteger(grid.rows) || grid.cols < 1 || grid.rows < 1) {
    throw new Error("The project grid is invalid.");
  }
  if (grid.cols * grid.rows > 300000 || !Array.isArray(grid.cells) || grid.cells.length !== grid.cols * grid.rows) {
    throw new Error("The project cell data is invalid.");
  }
  if (grid.cells.some(value => !Number.isInteger(value) || value < 0 || value >= projectPaletteLength)) {
    throw new Error("The project contains an invalid color index.");
  }
  if (grid.originalCells && (!Array.isArray(grid.originalCells) || grid.originalCells.length !== grid.cells.length)) {
    throw new Error("The project original grid is invalid.");
  }
  if (grid.originalCells?.some(value => !Number.isInteger(value) || value < 0 || value >= projectPaletteLength)) {
    throw new Error("The project original grid contains an invalid color index.");
  }
  if (!settings || !BEAD_SIZES.includes(Number(settings.beadMm)) || !CURTAIN_WIDTHS.includes(Number(settings.curtainWidthCm))) {
    throw new Error("The project settings are invalid.");
  }
  if (settings.selectedColor !== undefined
    && (!Number.isInteger(Number(settings.selectedColor))
      || Number(settings.selectedColor) < 0
      || Number(settings.selectedColor) >= projectPaletteLength)) {
    throw new Error("The selected color is invalid.");
  }
  if (settings.excludedColors && (!Array.isArray(settings.excludedColors)
    || settings.excludedColors.some(value => !Number.isInteger(value) || value < 0 || value >= projectPaletteLength)
    || new Set(settings.excludedColors).size >= projectPaletteLength)) {
    throw new Error("The excluded-color list is invalid.");
  }
}

function flashButton(button, message) {
  const oldText = button.textContent;
  button.textContent = message;
  setTimeout(() => { button.textContent = oldText; }, 1400);
}

async function copyInstructions() {
  try {
    await navigator.clipboard.writeText(instructionText());
    flashButton(els.copyBtn, "Copied");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = instructionText();
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = false;
}

function hideError() {
  els.error.hidden = true;
  els.error.textContent = "";
}

function formatNumber(value) {
  return Number(value.toFixed(1)).toLocaleString("en-US");
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
  return true;
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToLab(r, g, b) {
  let red = r / 255;
  let green = g / 255;
  let blue = b / 255;
  red = red > 0.04045 ? Math.pow((red + 0.055) / 1.055, 2.4) : red / 12.92;
  green = green > 0.04045 ? Math.pow((green + 0.055) / 1.055, 2.4) : green / 12.92;
  blue = blue > 0.04045 ? Math.pow((blue + 0.055) / 1.055, 2.4) : blue / 12.92;
  let x = (red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047;
  let y = (red * 0.2126 + green * 0.7152 + blue * 0.0722);
  let z = (red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883;
  const pivot = value => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  x = pivot(x); y = pivot(y); z = pivot(z);
  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
