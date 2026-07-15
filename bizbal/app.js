"use strict";

const PALETTE = [
  { name: "버건디", hex: "#7b2638" },
  { name: "레드", hex: "#d64541" },
  { name: "딸기우유", hex: "#f4a6b8" },
  { name: "연핑크", hex: "#f8c8d8" },
  { name: "핑크", hex: "#ec6fa8" },
  { name: "핫핑크", hex: "#e9358f" },
  { name: "코랄", hex: "#f26b5b" },
  { name: "연코랄", hex: "#f7a79b" },
  { name: "연다홍", hex: "#f58b7a" },
  { name: "연주황", hex: "#f7b27a" },
  { name: "주황", hex: "#f28c28" },
  { name: "노랑", hex: "#f2c94c" },
  { name: "연노랑", hex: "#f8e8a0" },
  { name: "형광노랑", hex: "#e8f53d" },
  { name: "메론그린", hex: "#c9e89a" },
  { name: "연두", hex: "#a8d66d" },
  { name: "연초록", hex: "#9bcf9b" },
  { name: "초록", hex: "#4f8a5b" },
  { name: "연청록", hex: "#8fd3c1" },
  { name: "청록", hex: "#278c82" },
  { name: "소다", hex: "#a6e3e9" },
  { name: "연하늘", hex: "#c8e8f4" },
  { name: "하늘", hex: "#83c9e8" },
  { name: "블루", hex: "#377bb5" },
  { name: "스머프블루", hex: "#4da1d9" },
  { name: "다크네이비", hex: "#1f314d" },
  { name: "네이비그레이", hex: "#596579" },
  { name: "연보라", hex: "#c3b0dd" },
  { name: "보라", hex: "#8b62b2" },
  { name: "진보라", hex: "#5d347a" },
  { name: "라이트모브", hex: "#c7a4b8" },
  { name: "모브", hex: "#9a687d" },
  { name: "플럼", hex: "#713f5a" },
  { name: "살구", hex: "#f2b18f" },
  { name: "다크살구", hex: "#d88969" },
  { name: "베이지브라운", hex: "#b89978" },
  { name: "황토색", hex: "#b8873b" },
  { name: "브릭브라운", hex: "#9a4f3d" },
  { name: "진브라운", hex: "#654437" },
  { name: "다크카키", hex: "#4f5536" },
  { name: "블랙", hex: "#252525" },
  { name: "다크그레이", hex: "#55585c" },
  { name: "라이트그레이", hex: "#b7b8b6" },
  { name: "화이트", hex: "#f4f1e8" },
  { name: "아이보리", hex: "#eee4c9" }
].map(color => ({ ...color, rgb: hexToRgb(color.hex) }));

// version 1 프로젝트의 10색 인덱스를 현재 팔레트 인덱스로 변환합니다.
const LEGACY_PALETTE_INDEX_MAP = [1, 11, 17, 23, 27, 33, 38, 42, 40, 43];

const BEAD_SIZES = [4, 6, 8, 10];
const CURTAIN_WIDTHS = [10, 15, 20, 30, 40, 50, 60, 70];
const FIXED_BEAD_NAME = "고정 구슬";

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
  cells: [],
  originalCells: [],
  selectedColor: 0,
  cellSize: Number(els.zoom.value),
  drawing: false,
  strokeChanged: false,
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
    else showError("JPG 또는 JPEG 파일을 선택해 주세요.");
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
  if (state.cellSize >= minimum) return;
  state.cellSize = minimum;
  els.zoom.value = String(minimum);
  els.zoomValue.value = `${minimum}px`;
  drawGrid();
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
    button.title = excluded ? `${PALETTE[index].name} (사용하지 않음)` : PALETTE[index].name;
  });
  if (state.excludedColors.has(state.selectedColor)) {
    const nextColor = PALETTE.findIndex((_, index) => !state.excludedColors.has(index));
    if (nextColor >= 0) selectColor(nextColor);
  }
}

async function loadFile(file) {
  if (!/image\/jpeg/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) {
    showError("JPG 또는 JPEG 파일만 사용할 수 있습니다.");
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
  } catch (error) {
    showError("이미지를 읽을 수 없습니다. 다른 JPG 파일을 선택해 주세요.");
  }
}

function getDimensions() {
  const beadMm = Number(els.beadSize.value);
  const widthCm = Number(els.curtainWidth.value);
  if (!BEAD_SIZES.includes(beadMm)) throw new Error("구슬 크기는 4, 6, 8, 10mm 중에서 선택해 주세요.");
  if (!CURTAIN_WIDTHS.includes(widthCm)) throw new Error("완성 가로 크기는 10, 15, 20, 30, 40, 50, 60, 70cm 중에서 선택해 주세요.");
  const cols = Math.max(1, Math.round(widthCm * 10 / beadMm));
  const rows = state.sourceImage ? Math.max(1, Math.round(cols * state.sourceImage.naturalHeight / state.sourceImage.naturalWidth)) : 0;
  if (rows > 1000 || cols * rows > 300000) throw new Error("이미지가 너무 세로로 깁니다. 세로가 짧은 이미지나 더 큰 구슬 크기를 사용해 주세요.");
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
    els.inputSummary.textContent = "사진을 선택하면 예상 도안 크기를 계산합니다.";
    return;
  }
  try {
    const { beadMm, cols, rows } = getDimensions();
    const actualWidth = cols * beadMm / 10;
    const actualRows = rows + 1;
    const actualHeight = actualRows * beadMm / 10;
    els.inputSummary.textContent = `예상 ${cols} × ${actualRows}칸 · 최상단 고정 구슬 포함 · 실제 약 ${formatNumber(actualWidth)} × ${formatNumber(actualHeight)}cm`;
    hideError();
  } catch (error) {
    els.inputSummary.textContent = "입력값을 확인해 주세요.";
  }
}

function generatePattern() {
  if (!state.sourceImage || !validateInputs()) return;

  try {
    els.generateBtn.disabled = true;
    els.generateBtn.textContent = "변환 중…";
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
    showError(error.message || "도안을 만드는 중 문제가 발생했습니다.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.innerHTML = "도안 다시 만들기 <span>→</span>";
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
  ctx.fillStyle = "#f7f2e9";
  ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
  state.beadSprites = createBeadSprites(size);
  const fixedBeadSprite = createFixedBeadSprite(size);

  ctx.fillStyle = "#e5eee9";
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
  ctx.strokeStyle = size >= 11 ? "rgba(35,31,32,.11)" : "rgba(35,31,32,.07)";
  ctx.lineWidth = 1;
  for (let col = 0; col <= state.cols; col += 1) {
    const x = Math.min(col * size + .5, els.canvas.width - .5);
    ctx.moveTo(x, 0); ctx.lineTo(x, els.canvas.height);
  }
  for (let row = 0; row <= actualRows; row += 1) {
    const y = Math.min(row * size + .5, els.canvas.height - .5);
    ctx.moveTo(0, y); ctx.lineTo(els.canvas.width, y);
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
    const radius = Math.max(1, size * .42);

    spriteCtx.beginPath();
    spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
    spriteCtx.fillStyle = color.hex;
    spriteCtx.fill();
    spriteCtx.save();
    spriteCtx.clip();

    const volume = spriteCtx.createRadialGradient(size * .31, size * .27, 0, center, center, radius * 1.15);
    volume.addColorStop(0, "rgba(255,255,255,.72)");
    volume.addColorStop(.24, "rgba(255,255,255,.23)");
    volume.addColorStop(.62, "rgba(255,255,255,0)");
    volume.addColorStop(1, "rgba(0,0,0,.32)");
    spriteCtx.fillStyle = volume;
    spriteCtx.fillRect(0, 0, size, size);
    spriteCtx.restore();

    spriteCtx.beginPath();
    spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
    spriteCtx.strokeStyle = "rgba(35,31,32,.34)";
    spriteCtx.lineWidth = Math.max(1, size * .055);
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
  const radius = size * .43;

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
  metal.addColorStop(.32, "#d69b24");
  metal.addColorStop(.58, "#fff2a6");
  metal.addColorStop(1, "#8b5b0c");
  spriteCtx.fillStyle = metal;
  spriteCtx.fill();
  spriteCtx.strokeStyle = "#5e3e0b";
  spriteCtx.lineWidth = Math.max(1, size * .075);
  spriteCtx.stroke();

  spriteCtx.beginPath();
  spriteCtx.arc(center, center, Math.max(1.2, size * .14), 0, Math.PI * 2);
  spriteCtx.fillStyle = "#173f37";
  spriteCtx.fill();
  spriteCtx.strokeStyle = "rgba(255,255,255,.8)";
  spriteCtx.lineWidth = Math.max(.7, size * .045);
  spriteCtx.stroke();
  return sprite;
}

function startDrawing(event) {
  if (!state.cells.length) return;
  if (event.pointerType === "touch") {
    state.touchPointer = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    return;
  }
  event.preventDefault();
  state.drawing = true;
  state.strokeChanged = false;
  pushHistory();
  paintAtPointer(event);
  els.canvas.setPointerCapture?.(event.pointerId);
}

function continueDrawing(event) {
  if (event.pointerType === "touch") {
    const touch = state.touchPointer;
    if (!touch || touch.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) > 8) {
      touch.moved = true;
    }
    return;
  }
  if (!state.drawing) return;
  event.preventDefault();
  paintAtPointer(event);
}

function stopDrawing(event) {
  if (event?.pointerType === "touch") {
    const touch = state.touchPointer;
    if (!touch || touch.pointerId !== event.pointerId) return;
    state.touchPointer = null;
    if (event.type === "pointerup" && !touch.moved) {
      state.strokeChanged = false;
      pushHistory();
      paintAtPointer(event);
      if (!state.strokeChanged) state.undoStack.pop();
      els.undoBtn.disabled = state.undoStack.length === 0;
      scheduleOutputUpdate();
    }
    return;
  }
  if (!state.drawing) return;
  state.drawing = false;
  if (!state.strokeChanged) state.undoStack.pop();
  els.undoBtn.disabled = state.undoStack.length === 0;
  scheduleOutputUpdate();
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
  state.strokeChanged = true;
  drawCell(row, col);
}

function drawCell(row, col) {
  const size = state.cellSize;
  const x = col * size;
  const y = (row + 1) * size;
  ctx.fillStyle = "#f7f2e9";
  ctx.fillRect(x, y, size, size);
  if (!state.beadSprites.length) state.beadSprites = createBeadSprites(size);
  ctx.drawImage(state.beadSprites[state.cells[row * state.cols + col]], x, y);
  ctx.strokeStyle = "rgba(35,31,32,.1)";
  ctx.strokeRect(x + .5, y + .5, size - 1, size - 1);
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
  els.metricGrid.textContent = `${state.cols} × ${actualRows}`;
  els.metricSize.textContent = `${formatNumber(width)} × ${formatNumber(height)}cm`;
  els.metricCount.textContent = (state.cells.length + state.cols).toLocaleString("ko-KR");
}

function updateCounts() {
  const counts = Array(PALETTE.length).fill(0);
  state.cells.forEach(colorIndex => { counts[colorIndex] += 1; });
  els.counts.replaceChildren();
  const fixedChip = document.createElement("button");
  fixedChip.type = "button";
  fixedChip.className = "count-chip fixed-chip";
  fixedChip.disabled = true;
  fixedChip.innerHTML = `<i></i><span>${FIXED_BEAD_NAME}</span><b>${state.cols.toLocaleString("ko-KR")}개</b>`;
  fixedChip.setAttribute("aria-label", `${FIXED_BEAD_NAME}, ${state.cols.toLocaleString("ko-KR")}개, 편집할 수 없음`);
  els.counts.append(fixedChip);
  PALETTE.forEach((color, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "count-chip";
    if (state.excludedColors.has(index)) chip.classList.add("is-excluded");
    chip.style.setProperty("--chip", color.hex);
    const status = state.excludedColors.has(index) ? "사용 안 함" : `${counts[index].toLocaleString("ko-KR")}개`;
    chip.disabled = counts[index] === 0 && !state.excludedColors.has(index);
    chip.innerHTML = `<i></i><span>${color.name}</span><b>${status}</b>`;
    chip.setAttribute("aria-label", chip.disabled
      ? `${color.name}, 0개, 편집할 수 없음`
      : `${color.name}, ${status}, 색상 편집`);
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
  els.colorDialogTitle.textContent = `${color.name} 색상 편집`;
  els.colorDialogDescription.textContent = excluded
    ? `${color.name}은(는) 현재 도안에서 사용하지 않는 색상입니다.`
    : `도안에 있는 ${color.name} ${count.toLocaleString("ko-KR")}개를 다른 색상으로 한 번에 바꿀 수 있습니다.`;
  els.colorDialogOptions.replaceChildren();

  PALETTE.forEach((option, optionIndex) => {
    if (state.excludedColors.has(optionIndex)) return;
    const isCurrent = optionIndex === index;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-option";
    button.classList.toggle("is-current", isCurrent);
    button.style.setProperty("--option", option.hex);
    button.innerHTML = `<i></i><span>${option.name}</span>${isCurrent ? "<small>현재 색상</small>" : ""}`;
    button.setAttribute("aria-label", isCurrent ? `${option.name}, 현재 색상 유지` : `${option.name}(으)로 변경`);
    if (isCurrent) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => {
      if (isCurrent) closeColorDialog();
      else replaceColor(index, optionIndex);
    });
    els.colorDialogOptions.append(button);
  });

  els.colorDialogOptions.hidden = excluded;
  els.colorToggleBtn.textContent = excluded ? "이 색상 다시 사용하기" : "이 색상 사용하지 않음";
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
    showError("최소 한 가지 색상은 사용해야 합니다.");
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
    "비즈발 작업지시서",
    `원본: ${state.sourceName}`,
    `구슬: ${formatNumber(beadMm)}mm / 도안: ${state.cols} × ${actualRows}칸`,
    `완성 크기: 약 ${formatNumber(state.cols * beadMm / 10)} × ${formatNumber(actualRows * beadMm / 10)}cm`,
    `고정 구슬: 최상단 각 라인 1개 / 총 ${state.cols}개`,
    "구슬 순서: 아래 → 위 (마지막은 고정 구슬)",
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
  const baseName = (state.sourceName || "비즈발-도안").replace(/\.[^.]+$/, "").replace(/[\\/:*?\"<>|]/g, "-");
  link.href = url;
  link.download = `${baseName}.beads.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  flashButton(els.saveBtn, "저장 완료 ✓");
}

async function loadProjectFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error("프로젝트 파일은 50MB 이하만 불러올 수 있습니다.");
    const project = JSON.parse(await file.text());
    validateProject(project);
    const { grid, settings } = project;
    const isLegacyProject = project.version === 1;
    const convertColors = values => isLegacyProject
      ? values.map(value => LEGACY_PALETTE_INDEX_MAP[value])
      : values;
    state.cols = grid.cols;
    state.rows = grid.rows;
    state.cells = Uint8Array.from(convertColors(grid.cells));
    state.originalCells = Uint8Array.from(convertColors(grid.originalCells || grid.cells));
    state.sourceImage = await restoreSourceImage(project.sourceImageData);
    state.sourceName = project.sourceName || file.name;
    state.undoStack = [];
    state.excludedColors = new Set(convertColors(settings.excludedColors || []));
    const savedSelectedColor = Math.max(0, Number(settings.selectedColor) || 0);
    state.selectedColor = isLegacyProject
      ? LEGACY_PALETTE_INDEX_MAP[savedSelectedColor]
      : Math.min(PALETTE.length - 1, savedSelectedColor);
    els.beadSize.value = settings.beadMm;
    els.curtainWidth.value = settings.curtainWidthCm;
    const minimumCellSize = getMinimumCellSize(Number(settings.curtainWidthCm));
    els.zoom.min = String(minimumCellSize);
    state.cellSize = Math.min(24, Math.max(minimumCellSize, Number(settings.zoom) || 12));
    els.zoom.value = state.cellSize;
    els.zoomValue.value = `${state.cellSize}px`;
    els.fileLabel.textContent = `${state.sourceName} · 저장 프로젝트`;
    els.generateBtn.disabled = !state.sourceImage;
    els.undoBtn.disabled = true;
    updatePaletteAvailability();
    selectColor(state.selectedColor);
    hideError();
    els.workspace.hidden = false;
    updateAllOutputs();
    els.inputSummary.textContent = `저장된 프로젝트 · ${state.cols} × ${state.rows + 1}칸 · 최상단 고정 구슬 포함`;
    requestAnimationFrame(() => els.workspace.scrollIntoView({ behavior: "smooth", block: "start" }));
    flashButton(els.loadBtn, "불러오기 완료 ✓");
  } catch (error) {
    showError(error.message || "프로젝트 파일을 불러올 수 없습니다.");
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
  return canvas.toDataURL("image/jpeg", .9);
}

async function restoreSourceImage(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error("프로젝트의 원본 이미지 데이터가 올바르지 않습니다.");
  }
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
}

function validateProject(project) {
  if (!project || project.type !== "bead-curtain-project" || ![1, 2].includes(project.version)) {
    throw new Error("지원하지 않는 프로젝트 파일입니다.");
  }
  const { grid, settings } = project;
  const projectPaletteLength = project.version === 1 ? LEGACY_PALETTE_INDEX_MAP.length : PALETTE.length;
  if (!grid || !Number.isInteger(grid.cols) || !Number.isInteger(grid.rows) || grid.cols < 1 || grid.rows < 1) {
    throw new Error("프로젝트의 그리드 정보가 올바르지 않습니다.");
  }
  if (grid.cols * grid.rows > 300000 || !Array.isArray(grid.cells) || grid.cells.length !== grid.cols * grid.rows) {
    throw new Error("프로젝트의 구슬 데이터가 올바르지 않습니다.");
  }
  if (grid.cells.some(value => !Number.isInteger(value) || value < 0 || value >= projectPaletteLength)) {
    throw new Error("프로젝트에 알 수 없는 색상이 포함되어 있습니다.");
  }
  if (grid.originalCells && (!Array.isArray(grid.originalCells) || grid.originalCells.length !== grid.cells.length)) {
    throw new Error("프로젝트의 원본 도안 데이터가 올바르지 않습니다.");
  }
  if (grid.originalCells?.some(value => !Number.isInteger(value) || value < 0 || value >= projectPaletteLength)) {
    throw new Error("프로젝트 원본에 알 수 없는 색상이 포함되어 있습니다.");
  }
  if (!settings || !BEAD_SIZES.includes(Number(settings.beadMm)) || !CURTAIN_WIDTHS.includes(Number(settings.curtainWidthCm))) {
    throw new Error("프로젝트의 크기 설정이 올바르지 않습니다.");
  }
  if (settings.selectedColor !== undefined
    && (!Number.isInteger(Number(settings.selectedColor))
      || Number(settings.selectedColor) < 0
      || Number(settings.selectedColor) >= projectPaletteLength)) {
    throw new Error("프로젝트의 선택 색상 설정이 올바르지 않습니다.");
  }
  if (settings.excludedColors && (!Array.isArray(settings.excludedColors)
    || settings.excludedColors.some(value => !Number.isInteger(value) || value < 0 || value >= projectPaletteLength)
    || new Set(settings.excludedColors).size >= projectPaletteLength)) {
    throw new Error("프로젝트의 미사용 색상 설정이 올바르지 않습니다.");
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
    const oldText = els.copyBtn.textContent;
    els.copyBtn.textContent = "복사 완료 ✓";
    setTimeout(() => { els.copyBtn.textContent = oldText; }, 1400);
  } catch (error) {
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
  return Number(value.toFixed(1)).toLocaleString("ko-KR");
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
  red = red > .04045 ? Math.pow((red + .055) / 1.055, 2.4) : red / 12.92;
  green = green > .04045 ? Math.pow((green + .055) / 1.055, 2.4) : green / 12.92;
  blue = blue > .04045 ? Math.pow((blue + .055) / 1.055, 2.4) : blue / 12.92;
  let x = (red * .4124 + green * .3576 + blue * .1805) / .95047;
  let y = (red * .2126 + green * .7152 + blue * .0722);
  let z = (red * .0193 + green * .1192 + blue * .9505) / 1.08883;
  const pivot = value => value > .008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  x = pivot(x); y = pivot(y); z = pivot(z);
  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
