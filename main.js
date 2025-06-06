// --- Constants ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const MAX_LEVEL = 7;
const LEVEL_UP_SCORE = 1000;
const INITIAL_DROP_INTERVAL = 1000;
const DROP_INTERVAL_DECREASE = 100;
const COLORS = [
  null,
  '#00f0f0', // I
  '#0000f0', // J
  '#f0a000', // L
  '#f0f000', // O
  '#00f000', // S
  '#a000f0', // T
  '#f00000', // Z
];

const TETROMINOES = {
  I: [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0],
  ],
  J: [
    [2,0,0],
    [2,2,2],
    [0,0,0],
  ],
  L: [
    [0,0,3],
    [3,3,3],
    [0,0,0],
  ],
  O: [
    [4,4],
    [4,4],
  ],
  S: [
    [0,5,5],
    [5,5,0],
    [0,0,0],
  ],
  T: [
    [0,6,0],
    [6,6,6],
    [0,0,0],
  ],
  Z: [
    [7,7,0],
    [0,7,7],
    [0,0,0],
  ],
};
const TETROMINO_KEYS = Object.keys(TETROMINOES);

// --- Fun Messages ---
const FUN_MESSAGES = [
  "You're a Tetris Titan!",
  "Block Boss!",
  "Stack Attack!",
  "Office Legend!",
  "Back to work... or one more game?",
  "You cleared it!",
  "Impressive!",
  "Tetris Mastermind!",
  "Nice try!",
  "Keep stacking!"
];

// --- High Scores ---
const HIGHSCORE_KEY = 'gettetris_highscores';
function getHighScores() {
  return JSON.parse(localStorage.getItem(HIGHSCORE_KEY) || '[]');
}
function saveHighScores(scores) {
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(scores));
}
function addHighScore(name, score) {
  let scores = getHighScores();
  scores.push({ name, score });
  scores = scores.sort((a, b) => b.score - a.score).slice(0, 5);
  saveHighScores(scores);
}
function isHighScore(score) {
  const scores = getHighScores();
  if (scores.length < 5) return true;
  return score > scores[scores.length - 1].score;
}
function updateLeaderboard() {
  const scores = getHighScores();
  const html = scores.map((s, i) => `<div class='leaderboard-entry'><span>${i+1}. ${s.name}</span><span>${s.score}</span></div>`).join('');
  const el1 = document.getElementById('leaderboard-list');
  const el2 = document.getElementById('leaderboard-list-mobile');
  if (el1) el1.innerHTML = html;
  if (el2) el2.innerHTML = html;
}

// --- Fun Message ---
function showFunMessage() {
  const msg = FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)];
  document.getElementById('fun-message').textContent = msg;
}

// --- Modal ---
function showHighScoreModal(score, onSave) {
  const modal = document.getElementById('highscore-modal');
  modal.style.display = 'flex';
  const input = document.getElementById('player-name');
  input.value = '';
  input.focus();
  document.getElementById('save-score').onclick = function() {
    const name = input.value.trim() || 'Anonymous';
    onSave(name);
    modal.style.display = 'none';
    updateLeaderboard();
  };
}

// --- Utility Functions ---
function randomTetromino() {
  const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
  return {
    matrix: TETROMINOES[key].map(row => [...row]),
    colorIndex: TETROMINO_KEYS.indexOf(key) + 1,
    key,
  };
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i])).reverse();
}

// --- Game State ---
class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.paused = false;
    this.spawnTetromino();
  }

  spawnTetromino() {
    this.tetromino = randomTetromino();
    this.tetromino.row = 0;
    this.tetromino.col = Math.floor((COLS - this.tetromino.matrix[0].length) / 2);
    if (this.collides(this.tetromino.matrix, this.tetromino.row, this.tetromino.col)) {
      this.gameOver = true;
    }
    if (this.gameOver) {
      this.paused = true;
      showFunMessage();
      if (isHighScore(this.score)) {
        showHighScoreModal(this.score, (name) => {
          addHighScore(name, this.score);
        });
      }
    }
  }

  collides(matrix, row, col) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (
          matrix[r][c] &&
          (row + r >= ROWS ||
            col + c < 0 ||
            col + c >= COLS ||
            this.grid[row + r][col + c])
        ) {
          return true;
        }
      }
    }
    return false;
  }

  merge() {
    const { matrix, row, col, colorIndex } = this.tetromino;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          this.grid[row + r][col + c] = colorIndex;
        }
      }
    }
  }

  clearLines() {
    let lines = 0;
    outer: for (let r = ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < COLS; c++) {
        if (!this.grid[r][c]) continue outer;
      }
      this.grid.splice(r, 1);
      this.grid.unshift(Array(COLS).fill(0));
      lines++;
      r++; // recheck same row
    }
    if (lines > 0) {
      const points = [0, 100, 300, 500, 800][lines] * this.level;
      this.score += points;
      
      // Check for level up
      if (this.score >= this.level * LEVEL_UP_SCORE && this.level < MAX_LEVEL) {
        this.level++;
        this.dropInterval = Math.max(100, INITIAL_DROP_INTERVAL - (this.level - 1) * DROP_INTERVAL_DECREASE);
        document.getElementById('level').textContent = this.level;
      }
    }
  }

  move(offsetRow, offsetCol) {
    const { matrix, row, col } = this.tetromino;
    const newRow = row + offsetRow;
    const newCol = col + offsetCol;
    if (!this.collides(matrix, newRow, newCol)) {
      this.tetromino.row = newRow;
      this.tetromino.col = newCol;
      return true;
    }
    return false;
  }

  rotate() {
    const { matrix, row, col } = this.tetromino;
    const rotated = rotate(matrix);
    if (!this.collides(rotated, row, col)) {
      this.tetromino.matrix = rotated;
    }
  }

  drop() {
    if (this.paused) return;
    if (!this.move(1, 0)) {
      this.merge();
      this.clearLines();
      this.spawnTetromino();
    }
  }

  togglePause() {
    this.paused = !this.paused;
    document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
  }
}

// --- Renderer ---
class Renderer {
  constructor(canvas, game) {
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.canvas = canvas;
  }

  drawBlock(x, y, colorIndex) {
    if (!colorIndex) return;
    this.ctx.fillStyle = COLORS[colorIndex];
    this.ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    this.ctx.strokeStyle = '#222';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.drawBlock(c, r, this.game.grid[r][c]);
      }
    }
    // Draw current tetromino
    const { matrix, row, col, colorIndex } = this.game.tetromino;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          this.drawBlock(col + c, row + r, colorIndex);
        }
      }
    }
  }
}

// --- Controls ---
class Controls {
  constructor(game, renderer, updateScore) {
    this.game = game;
    this.renderer = renderer;
    this.updateScore = updateScore;
    this.active = false;
    this.handleKey = this.handleKey.bind(this);
    this.dropInterval = null;
  }

  enable() {
    if (!this.active) {
      window.addEventListener('keydown', this.handleKey);
      this.active = true;
      this.startDropInterval();
    }
  }

  disable() {
    if (this.active) {
      window.removeEventListener('keydown', this.handleKey);
      this.active = false;
      this.stopDropInterval();
    }
  }

  startDropInterval() {
    this.stopDropInterval();
    this.dropInterval = setInterval(() => {
      if (!this.game.gameOver && !this.game.paused) {
        // Only drop if the piece can move down, otherwise do nothing (wait for merge and spawn in drop())
        const { matrix, row, col } = this.game.tetromino;
        if (!this.game.collides(matrix, row + 1, col)) {
          this.game.move(1, 0);
        } else {
          this.game.drop(); // merge, clear lines, spawn new piece
        }
        this.renderer.render();
        this.updateScore(this.game.score);
      } else {
        this.disable();
      }
    }, 500);
  }

  stopDropInterval() {
    if (this.dropInterval) {
      clearInterval(this.dropInterval);
      this.dropInterval = null;
    }
  }

  handleKey(e) {
    if (this.game.gameOver) return;
    let moved = false;
    switch (e.key) {
      case 'ArrowLeft':
        moved = this.game.move(0, -1);
        break;
      case 'ArrowRight':
        moved = this.game.move(0, 1);
        break;
      case 'ArrowDown':
        // Fast drop by one row
        if (!this.game.collides(this.game.tetromino.matrix, this.game.tetromino.row + 1, this.game.tetromino.col)) {
          this.game.move(1, 0);
        } else {
          this.game.drop();
        }
        moved = true;
        break;
      case 'ArrowUp':
        this.game.rotate();
        moved = true;
        break;
    }
    if (moved) {
      this.renderer.render();
      this.updateScore(this.game.score);
    }
  }
}

// --- Game Initialization ---
let game, renderer, controls;

function updateScore(score) {
  document.getElementById('score').textContent = score;
}

function startGame() {
  if (game) {
    controls.disable();
  }
  
  const canvas = document.getElementById('tetris');
  game = new Game();
  renderer = new Renderer(canvas, game);
  controls = new Controls(game, renderer, updateScore);
  
  controls.enable();
  renderer.render();
  updateScore(0);
  document.getElementById('level').textContent = '1';
  document.getElementById('pause-btn').textContent = 'Pause';
  document.getElementById('fun-message').textContent = '';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('pause-btn').addEventListener('click', () => {
    if (game) {
      if (game.paused) {
        controls.startDropInterval();
        game.paused = false;
      } else {
        controls.stopDropInterval();
        game.paused = true;
      }
    }
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (game) {
      controls.disable();
      game.reset();
      renderer.render();
      updateScore(0);
      document.getElementById('level').textContent = '1';
      document.getElementById('pause-btn').textContent = 'Pause';
      document.getElementById('fun-message').textContent = '';
    }
  });
});

window.addEventListener('keydown', function(e) {
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && game && !game.gameOver) {
    e.preventDefault();
  }
});

// --- Init leaderboard on load ---
updateLeaderboard();