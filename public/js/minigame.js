// 12 Vtuber Mini Games Engine (1. หาราศี 14 ป้าย / 2. จับคู่ราศี 24 ใบ)

const ZODIAC_CARDS = [
  { key: 'aquarius', th: 'กุมภ์', en: 'Aquarius', icon: '/white/aquarius.png' },
  { key: 'pisces', th: 'มีน', en: 'Pisces', icon: '/white/pisces.png' },
  { key: 'aries', th: 'เมษ', en: 'Aries', icon: '/white/aries.png' },
  { key: 'taurus', th: 'พฤษภ', en: 'Taurus', icon: '/white/taurus.png' },
  { key: 'gemini', th: 'เมถุน', en: 'Gemini', icon: '/white/gemini.png' },
  { key: 'cancer', th: 'กรกฎ', en: 'Cancer', icon: '/white/cancer.png' },
  { key: 'leo', th: 'สิงห์', en: 'Leo', icon: '/white/leo.png' },
  { key: 'virgo', th: 'กันย์', en: 'Virgo', icon: '/white/virgo.png' },
  { key: 'libra', th: 'ตุลย์', en: 'Libra', icon: '/white/libra.png' },
  { key: 'scorpio', th: 'พิจิก', en: 'Scorpio', icon: '/white/scorpio.png' },
  { key: 'sagittarius', th: 'ธนู', en: 'Sagittarius', icon: '/white/sagittarius.png' },
  { key: 'capricorn', th: 'มังกร', en: 'Capricorn', icon: '/white/capricorn.png' }
];

const BOMB_CARDS = [
  { key: 'bomb_1', isBomb: true, icon: '/game/end.png' },
  { key: 'bomb_2', isBomb: true, icon: '/game/end.png' }
];

let currentMode = 'find'; // 'find' | 'match'

// Game 1 State (Find 12 Zodiacs)
let findState = {
  score: 0,
  highScore: 0,
  gameOver: false,
  cards: []
};

// Game 2 State (Pair Matching)
let matchState = {
  turns: 0,
  matchedPairs: 0,
  bestTurns: 0,
  gameOver: false,
  cards: [],
  firstCard: null,
  secondCard: null,
  isLocked: false
};

// Shuffle Helper
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Initialize Engine
function initMinigame() {
  // Load High Scores
  const savedFindHigh = localStorage.getItem('vtuber_minigame_highscore');
  if (savedFindHigh) {
    findState.highScore = parseInt(savedFindHigh, 10) || 0;
  }

  const savedBestTurns = localStorage.getItem('vtuber_matching_best_turns');
  if (savedBestTurns) {
    matchState.bestTurns = parseInt(savedBestTurns, 10) || 0;
  }

  // Bind Mode Selector Buttons
  const btnModeFind = document.getElementById('mode-btn-find');
  const btnModeMatch = document.getElementById('mode-btn-match');

  if (btnModeFind) {
    btnModeFind.onclick = () => switchGameMode('find');
  }
  if (btnModeMatch) {
    btnModeMatch.onclick = () => switchGameMode('match');
  }

  // Bind Reset Buttons
  const btnResetFind = document.getElementById('btn-reset-find');
  if (btnResetFind) {
    btnResetFind.onclick = () => startFindGame();
  }

  const btnResetMatch = document.getElementById('btn-reset-match');
  if (btnResetMatch) {
    btnResetMatch.onclick = () => startMatchGame();
  }

  // Start initial mode
  switchGameMode('find');
}

// Switch Between Game 1 and Game 2
function switchGameMode(mode) {
  currentMode = mode;

  const btnModeFind = document.getElementById('mode-btn-find');
  const btnModeMatch = document.getElementById('mode-btn-match');
  const secFind = document.getElementById('game-section-find');
  const secMatch = document.getElementById('game-section-match');

  if (mode === 'find') {
    if (btnModeFind) btnModeFind.classList.add('active');
    if (btnModeMatch) btnModeMatch.classList.remove('active');
    if (secFind) secFind.style.display = 'block';
    if (secMatch) secMatch.style.display = 'none';
    startFindGame();
  } else {
    if (btnModeFind) btnModeFind.classList.remove('active');
    if (btnModeMatch) btnModeMatch.classList.add('active');
    if (secFind) secFind.style.display = 'none';
    if (secMatch) secMatch.style.display = 'block';
    startMatchGame();
  }
}

// ========================================================
// GAME 1: หาราศี 14 ป้าย (Find 12 Zodiacs)
// ========================================================

function startFindGame() {
  findState.score = 0;
  findState.gameOver = false;
  updateFindScoreUI();

  const banner = document.getElementById('find-result-banner');
  if (banner) {
    banner.style.display = 'none';
    banner.className = 'minigame-result-banner';
    banner.textContent = '';
  }

  // 12 Zodiacs + 2 Bombs = 14 Cards (1 Left + 12 Center 6x2 + 1 Right)
  const allCards = shuffle([...ZODIAC_CARDS, ...BOMB_CARDS]);
  findState.cards = allCards;

  const leftWingEl = document.getElementById('wing-left');
  const centerMatrixEl = document.getElementById('center-matrix');
  const rightWingEl = document.getElementById('wing-right');

  if (!leftWingEl || !centerMatrixEl || !rightWingEl) return;

  leftWingEl.innerHTML = '';
  centerMatrixEl.innerHTML = '';
  rightWingEl.innerHTML = '';

  // Slot 0: Left wing
  leftWingEl.appendChild(createFindCardElement(allCards[0], 0));

  // Slots 1 - 12: Center matrix (12 cards in 6x2 grid)
  for (let i = 1; i <= 12; i++) {
    centerMatrixEl.appendChild(createFindCardElement(allCards[i], i));
  }

  // Slot 13: Right wing
  rightWingEl.appendChild(createFindCardElement(allCards[13], 13));
}

function createFindCardElement(cardData, index) {
  const card = document.createElement('div');
  card.className = 'minigame-card';
  card.dataset.index = index;

  let backContent = '';
  if (cardData.isBomb) {
    backContent = `
      <div class="card-face card-back card-bomb">
        <img src="${cardData.icon}" class="card-bomb-img" alt="X">
      </div>
    `;
  } else {
    backContent = `
      <div class="card-face card-back card-zodiac">
        <img src="${cardData.icon}" class="card-zodiac-icon" alt="${cardData.th}">
      </div>
    `;
  }

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front">
        <img src="/game/banner.png" class="card-front-img" alt="12 Vtuber Slot Banner">
      </div>
      ${backContent}
    </div>
  `;

  card.addEventListener('click', () => onFindCardClick(card, cardData));
  return card;
}

function onFindCardClick(cardEl, cardData) {
  if (findState.gameOver || cardEl.classList.contains('flipped')) return;

  cardEl.classList.add('flipped');

  if (cardData.isBomb) {
    findState.gameOver = true;
    cardEl.classList.add('shake');
    playAudioTone(false);

    showFindResultBanner(
      `💥 เจอป้าย "X"! จบเกมแล้ว! คุณทำคะแนนได้ ${findState.score} / 12 ราศี`,
      'lose'
    );

    setTimeout(() => {
      revealRemainingFindCards();
    }, 600);
  } else {
    findState.score++;
    playAudioTone(true);

    if (findState.score > findState.highScore) {
      findState.highScore = findState.score;
      localStorage.setItem('vtuber_minigame_highscore', findState.highScore.toString());
    }

    updateFindScoreUI();

    if (findState.score === 12) {
      findState.gameOver = true;
      showFindResultBanner(
        `🎉 สุดยอดมาก! คุณหาครบทั้ง 12 ราศีแล้ว! ได้คะแนนเต็ม 12 / 12!`,
        'win'
      );
      triggerWinConfetti();
    }
  }
}

function revealRemainingFindCards() {
  const allCards = document.querySelectorAll('#game-section-find .minigame-card');
  allCards.forEach(card => {
    if (!card.classList.contains('flipped')) {
      card.classList.add('flipped');
      card.style.opacity = '0.65';
    }
    card.classList.add('disabled');
  });
}

function updateFindScoreUI() {
  const scoreEl = document.getElementById('find-game-score');
  const highEl = document.getElementById('find-game-highscore');
  if (scoreEl) scoreEl.textContent = findState.score;
  if (highEl) highEl.textContent = findState.highScore;
}

function showFindResultBanner(text, type) {
  const banner = document.getElementById('find-result-banner');
  if (!banner) return;
  banner.textContent = text;
  banner.className = `minigame-result-banner ${type}`;
  banner.style.display = 'block';
}

// ========================================================
// GAME 2: จับคู่ 12 ราศี 24 ใบ (Zodiac Pair Matching)
// ========================================================

function startMatchGame() {
  matchState.turns = 0;
  matchState.matchedPairs = 0;
  matchState.gameOver = false;
  matchState.firstCard = null;
  matchState.secondCard = null;
  matchState.isLocked = false;
  updateMatchScoreUI();

  const banner = document.getElementById('match-result-banner');
  if (banner) {
    banner.style.display = 'none';
    banner.className = 'minigame-result-banner';
    banner.textContent = '';
  }

  // 12 Zodiac pairs = 24 Cards
  const pairs = [];
  ZODIAC_CARDS.forEach((z, idx) => {
    pairs.push({ ...z, uniqueId: `z_${idx}_a` });
    pairs.push({ ...z, uniqueId: `z_${idx}_b` });
  });

  const shuffledPairs = shuffle(pairs);
  matchState.cards = shuffledPairs;

  const gridEl = document.getElementById('matching-board-grid');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  shuffledPairs.forEach((cardData, index) => {
    gridEl.appendChild(createMatchCardElement(cardData, index));
  });
}

function createMatchCardElement(cardData, index) {
  const card = document.createElement('div');
  card.className = 'matching-card';
  card.dataset.index = index;
  card.dataset.key = cardData.key;

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front">
        <img src="/game/banner.png" class="card-front-img" alt="12 Vtuber Banner">
      </div>
      <div class="card-face card-back card-zodiac">
        <img src="${cardData.icon}" class="card-zodiac-icon" alt="${cardData.th}">
      </div>
    </div>
  `;

  card.addEventListener('click', () => onMatchCardClick(card, cardData));
  return card;
}

function onMatchCardClick(cardEl, cardData) {
  if (matchState.isLocked || matchState.gameOver || cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) {
    return;
  }

  cardEl.classList.add('flipped');

  if (!matchState.firstCard) {
    // First card flipped in this turn
    matchState.firstCard = { el: cardEl, data: cardData };
    playAudioTone(true, 440); // A4
  } else {
    // Second card flipped in this turn -> evaluate match
    matchState.secondCard = { el: cardEl, data: cardData };
    matchState.turns++;
    matchState.isLocked = true;
    updateMatchScoreUI();

    const isMatch = matchState.firstCard.data.key === matchState.secondCard.data.key;

    if (isMatch) {
      // MATCHED!
      playMatchSuccessSound();
      matchState.firstCard.el.classList.add('matched');
      matchState.secondCard.el.classList.add('matched');
      matchState.matchedPairs++;
      updateMatchScoreUI();

      matchState.firstCard = null;
      matchState.secondCard = null;
      matchState.isLocked = false;

      // Check if all 12 pairs matched
      if (matchState.matchedPairs === 12) {
        matchState.gameOver = true;

        if (!matchState.bestTurns || matchState.turns < matchState.bestTurns) {
          matchState.bestTurns = matchState.turns;
          localStorage.setItem('vtuber_matching_best_turns', matchState.bestTurns.toString());
          updateMatchScoreUI();
        }

        showMatchResultBanner(
          `🎉 ยอดเยี่ยมมาก! คุณจับคู่ครบ 12 ราศีสำเร็จ โดยใช้ไปทั้งหมด ${matchState.turns} รอบ!`,
          'win'
        );
        triggerWinConfetti();
      }
    } else {
      // NOT MATCHED -> Flip back after delay
      playAudioTone(false);
      matchState.firstCard.el.classList.add('shake');
      matchState.secondCard.el.classList.add('shake');

      setTimeout(() => {
        matchState.firstCard.el.classList.remove('flipped', 'shake');
        matchState.secondCard.el.classList.remove('flipped', 'shake');
        matchState.firstCard = null;
        matchState.secondCard = null;
        matchState.isLocked = false;
      }, 750);
    }
  }
}

function updateMatchScoreUI() {
  const pairsEl = document.getElementById('matching-pairs');
  const turnsEl = document.getElementById('matching-turns');
  const bestEl = document.getElementById('matching-best-turns');

  if (pairsEl) pairsEl.textContent = matchState.matchedPairs;
  if (turnsEl) turnsEl.textContent = matchState.turns;
  if (bestEl) bestEl.textContent = matchState.bestTurns > 0 ? matchState.bestTurns : '--';
}

function showMatchResultBanner(text, type) {
  const banner = document.getElementById('match-result-banner');
  if (!banner) return;
  banner.textContent = text;
  banner.className = `minigame-result-banner ${type}`;
  banner.style.display = 'block';
}

// Audio Feedback
function playAudioTone(isSuccess, freq = 587.33) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isSuccess) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {}
}

function playMatchSuccessSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.18, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.3);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.3);
    });
  } catch (e) {}
}

// Confetti Particle Effect
function triggerWinConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#fbbf24', '#ffffff'];

  for (let i = 0; i < 140; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.008
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.alpha -= p.decay;
      if (p.alpha > 0) {
        alive = true;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }
  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMinigame);
} else {
  initMinigame();
}

window.initMinigame = initMinigame;
window.startFindGame = startFindGame;
window.startMatchGame = startMatchGame;
window.switchGameMode = switchGameMode;
