(() => {
  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const OPPOSITES = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  const STORAGE_KEY = "ksd77kr-png-snake-highscore";

  class SnakeGame {
    constructor(elements) {
      this.canvas = elements.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.statusEl = elements.statusEl;
      this.overlayEl = elements.overlayEl;
      this.scoreEl = elements.scoreEl;
      this.highScoreEl = elements.highScoreEl;
      this.startButton = elements.startButton;
      this.pauseButton = elements.pauseButton;
      this.restartButton = elements.restartButton;
      this.enemyButton = elements.enemyButton;
      this.controlButtons = elements.controlButtons || [];

      this.cols = 24;
      this.rows = 24;
      this.baseSpeed = 120;
      this.enemyMoveEvery = 2;
      this.highScore = Number(localStorage.getItem(STORAGE_KEY) || 0) || 0;

      this.timerId = null;
      this.running = false;
      this.gameOver = false;
      this.score = 0;
      this.directionName = "right";
      this.nextDirectionName = "right";
      this.enemyEnabled = false;
      this.tickCount = 0;
      this.enemyTickCount = 0;
      this.resizeObserver = null;

      this.bindEvents();
      this.reset(false);
      this.resizeCanvas();
      this.render();
      this.setStatus("Game idle.");
    }

    bindEvents() {
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onTouchStart = this.onTouchStart.bind(this);
      this.onTouchEnd = this.onTouchEnd.bind(this);

      document.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("resize", this.onResize);

      if (this.canvas) {
        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("touchstart", this.onTouchStart, { passive: true });
        this.canvas.addEventListener("touchend", this.onTouchEnd, { passive: true });
      }

      this.startButton?.addEventListener("click", () => this.start());
      this.pauseButton?.addEventListener("click", () => this.togglePause());
      this.restartButton?.addEventListener("click", () => this.restart());
      this.enemyButton?.addEventListener("click", () => this.toggleEnemy());

      this.controlButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const direction = button.dataset.direction;
          if (direction === "start") {
            this.togglePause();
            return;
          }

          if (direction && direction !== "start") {
            this.setDirection(direction);
          }
        });
      });
    }

    destroy() {
      clearInterval(this.timerId);
      document.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("resize", this.onResize);
      this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas?.removeEventListener("touchstart", this.onTouchStart);
      this.canvas?.removeEventListener("touchend", this.onTouchEnd);
    }

    onResize() {
      this.resizeCanvas();
      this.render();
    }

    resizeCanvas() {
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.max(280, Math.floor(Math.min(rect.width || 560, 680)));
      const ratio = window.devicePixelRatio || 1;

      this.canvas.width = Math.round(size * ratio);
      this.canvas.height = Math.round(size * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.drawSize = size;
      this.cellSize = size / this.cols;
    }

    reset(shouldRender = true) {
      this.snake = [
        { x: 7, y: 12 },
        { x: 6, y: 12 },
        { x: 5, y: 12 },
      ];
      this.directionName = "right";
      this.nextDirectionName = "right";
      this.score = 0;
      this.gameOver = false;
      this.running = false;
      this.tickCount = 0;
      this.enemyTickCount = 0;
      this.enemy = this.enemyEnabled ? this.makeEnemy() : null;
      this.food = this.makeFood();
      this.syncHud();
      this.setOverlay("Ready", "Press start to begin.");
      this.setStatus("Game idle.");

      if (shouldRender) {
        this.render();
      }
    }

    restart() {
      this.stopLoop();
      this.reset();
      this.start();
      this.setStatus("Game restarted.");
    }

    start() {
      if (this.gameOver) {
        this.reset(false);
      }

      if (this.running) {
        this.setStatus("Already running.");
        return;
      }

      this.running = true;
      this.setOverlay("Running", "Use arrows, WASD, or touch controls.");
      this.setStatus("Running.");
      this.startLoop();
    }

    togglePause() {
      if (this.gameOver) {
        this.restart();
        return;
      }

      if (!this.running) {
        this.start();
        return;
      }

      this.running = false;
      this.stopLoop();
      this.setOverlay("Paused", "Press start or Space to continue.");
      this.setStatus("Paused.");
    }

    toggleEnemy() {
      this.enemyEnabled = !this.enemyEnabled;
      if (this.enemyButton) {
        this.enemyButton.textContent = `Enemy: ${this.enemyEnabled ? "On" : "Off"}`;
      }

      if (this.enemyEnabled && !this.enemy) {
        this.enemy = this.makeEnemy();
      }

      if (!this.enemyEnabled) {
        this.enemy = null;
      }

      this.render();
      this.setStatus(`Enemy mode ${this.enemyEnabled ? "enabled" : "disabled"}.`);
    }

    startLoop() {
      if (this.timerId) return;
      this.timerId = window.setInterval(() => this.step(), this.baseSpeed);
    }

    stopLoop() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    setDirection(directionName) {
      if (!DIRECTIONS[directionName]) return;
      if (directionName === OPPOSITES[this.directionName]) return;
      this.nextDirectionName = directionName;
      if (!this.running && !this.gameOver) {
        this.setOverlay("Ready", `Direction set to ${directionName}. Press start.`);
      }
    }

    step() {
      if (!this.running || this.gameOver) return;

      this.directionName = this.nextDirectionName;
      const direction = DIRECTIONS[this.directionName];
      const head = this.snake[0];
      const nextHead = { x: head.x + direction.x, y: head.y + direction.y };

      if (this.hitsWall(nextHead) || this.hitsSelf(nextHead)) {
        this.endGame("Snake crashed.");
        return;
      }

      this.snake.unshift(nextHead);

      const ateFood = nextHead.x === this.food.x && nextHead.y === this.food.y;
      if (ateFood) {
        this.score += 10;
        this.highScore = Math.max(this.highScore, this.score);
        localStorage.setItem(STORAGE_KEY, String(this.highScore));
        this.food = this.makeFood();
        this.syncHud();
        this.setStatus("Food collected.");
      } else {
        this.snake.pop();
      }

      if (this.enemyEnabled) {
        this.enemyTickCount += 1;
        if (this.enemyTickCount % this.enemyMoveEvery === 0) {
          this.moveEnemy();
        }
        if (this.enemy && this.enemy.x === nextHead.x && this.enemy.y === nextHead.y) {
          this.endGame("Enemy collision.");
          return;
        }
      }

      this.tickCount += 1;
      this.render();
    }

    moveEnemy() {
      if (!this.enemy) return;

      const options = Object.entries(DIRECTIONS)
        .map(([name, vector]) => ({
          name,
          x: this.enemy.x + vector.x,
          y: this.enemy.y + vector.y,
        }))
        .filter((candidate) => !this.hitsWall(candidate));

      if (!options.length) return;

      const next = options[Math.floor(Math.random() * options.length)];
      this.enemy = { x: next.x, y: next.y };

      if (this.enemy.x === this.food.x && this.enemy.y === this.food.y) {
        this.food = this.makeFood();
      }

      if (this.snake.some((segment) => segment.x === this.enemy.x && segment.y === this.enemy.y)) {
        this.endGame("Enemy collision.");
      }
    }

    endGame(reason) {
      this.gameOver = true;
      this.running = false;
      this.stopLoop();
      this.highScore = Math.max(this.highScore, this.score);
      localStorage.setItem(STORAGE_KEY, String(this.highScore));
      this.syncHud();
      this.setOverlay("Game over", `${reason} Press restart to try again.`);
      this.setStatus(reason);
      this.render();
    }

    makeFood() {
      let candidate = this.randomCell();
      while (this.occupied(candidate) || (this.enemy && candidate.x === this.enemy.x && candidate.y === this.enemy.y)) {
        candidate = this.randomCell();
      }
      return candidate;
    }

    makeEnemy() {
      let candidate = this.randomCell();
      while (this.occupied(candidate) || (candidate.x === this.food.x && candidate.y === this.food.y)) {
        candidate = this.randomCell();
      }
      return candidate;
    }

    randomCell() {
      return {
        x: Math.floor(Math.random() * this.cols),
        y: Math.floor(Math.random() * this.rows),
      };
    }

    occupied(cell) {
      return this.snake.some((segment) => segment.x === cell.x && segment.y === cell.y);
    }

    hitsWall(cell) {
      return cell.x < 0 || cell.y < 0 || cell.x >= this.cols || cell.y >= this.rows;
    }

    hitsSelf(cell) {
      return this.snake.some((segment) => segment.x === cell.x && segment.y === cell.y);
    }

    syncHud() {
      if (this.scoreEl) this.scoreEl.textContent = String(this.score);
      if (this.highScoreEl) this.highScoreEl.textContent = String(this.highScore);
      if (this.enemyButton) {
        this.enemyButton.textContent = `Enemy: ${this.enemyEnabled ? "On" : "Off"}`;
      }
    }

    setStatus(text) {
      if (this.statusEl) {
        this.statusEl.textContent = text;
      }
    }

    setOverlay(title, text) {
      if (!this.overlayEl) return;
      const heading = this.overlayEl.querySelector("h3");
      const eyebrow = this.overlayEl.querySelector(".eyebrow");
      if (eyebrow) eyebrow.textContent = title;
      if (heading) heading.textContent = text;
      this.overlayEl.classList.toggle("is-hidden", this.running && !this.gameOver);
    }

    render() {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      const cellWidth = width / this.cols;
      const cellHeight = height / this.rows;

      this.ctx.clearRect(0, 0, width, height);

      this.ctx.save();
      this.ctx.fillStyle = "#f9f3e8";
      this.ctx.fillRect(0, 0, width, height);

      this.drawGrid(width, height, cellWidth, cellHeight);
      this.drawFood(cellWidth, cellHeight);
      if (this.enemyEnabled && this.enemy) {
        this.drawEnemy(cellWidth, cellHeight);
      }
      this.drawSnake(cellWidth, cellHeight);
      this.ctx.restore();

      this.overlayEl?.classList.toggle("is-hidden", this.running && !this.gameOver);
      if (!this.running && !this.gameOver) {
        this.overlayEl?.classList.remove("is-hidden");
      }
    }

    drawGrid(width, height, cellWidth, cellHeight) {
      this.ctx.strokeStyle = "rgba(42, 136, 174, 0.1)";
      this.ctx.lineWidth = 1;
      for (let x = 0; x <= this.cols; x += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(x * cellWidth, 0);
        this.ctx.lineTo(x * cellWidth, height);
        this.ctx.stroke();
      }
      for (let y = 0; y <= this.rows; y += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y * cellHeight);
        this.ctx.lineTo(width, y * cellHeight);
        this.ctx.stroke();
      }
    }

    drawSnake(cellWidth, cellHeight) {
      this.snake.forEach((segment, index) => {
        const x = segment.x * cellWidth;
        const y = segment.y * cellHeight;
        const inset = index === 0 ? 1.5 : 2.5;
        this.ctx.fillStyle = index === 0 ? "#2a88ae" : "#5cb3c7";
        this.roundRect(x + inset, y + inset, cellWidth - inset * 2, cellHeight - inset * 2, 4);
        this.ctx.fill();
      });
    }

    drawFood(cellWidth, cellHeight) {
      this.ctx.fillStyle = "#d96a4c";
      const x = this.food.x * cellWidth + 4;
      const y = this.food.y * cellHeight + 4;
      this.roundRect(x, y, cellWidth - 8, cellHeight - 8, 6);
      this.ctx.fill();
    }

    drawEnemy(cellWidth, cellHeight) {
      if (!this.enemy) return;
      this.ctx.fillStyle = "#f2c14e";
      const x = this.enemy.x * cellWidth + 3;
      const y = this.enemy.y * cellHeight + 3;
      this.roundRect(x, y, cellWidth - 6, cellHeight - 6, 5);
      this.ctx.fill();
    }

    roundRect(x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x + r, y);
      this.ctx.arcTo(x + width, y, x + width, y + height, r);
      this.ctx.arcTo(x + width, y + height, x, y + height, r);
      this.ctx.arcTo(x, y + height, x, y, r);
      this.ctx.arcTo(x, y, x + width, y, r);
      this.ctx.closePath();
    }

    onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        event.preventDefault();
        this.togglePause();
        return;
      }

      if (key === "r") {
        this.restart();
        return;
      }

      const mapping = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
      };

      if (mapping[key]) {
        event.preventDefault();
        this.setDirection(mapping[key]);
      }
    }

    onPointerDown(event) {
      if (!this.canvas) return;
      this.pointerOrigin = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture?.(event.pointerId);
    }

    onTouchStart(event) {
      const touch = event.changedTouches[0];
      this.pointerOrigin = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    onTouchEnd(event) {
      if (!this.pointerOrigin) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - this.pointerOrigin.x;
      const deltaY = touch.clientY - this.pointerOrigin.y;
      const threshold = 24;
      if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.setDirection(deltaX > 0 ? "right" : "left");
      } else {
        this.setDirection(deltaY > 0 ? "down" : "up");
      }
    }
  }

  window.SnakeGame = SnakeGame;
})();
