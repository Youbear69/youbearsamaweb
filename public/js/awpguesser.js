/**
 * NXZ AWP Map Guesser - Game Engine (Silky Smooth 60fps & Real-Time Audio)
 */

(function() {
  'use strict';

  // --- Map Catalog (31 sets total) ---
  const MAP_CATALOG = [
    // Anubis (10 sets)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `anubis_${i + 1}`,
      map: 'anubis',
      mapName: 'Anubis',
      logo: '/nxzawpguesser/logos/De_anubis.png',
      a1: `/nxzawpguesser/maps/anubis/${i + 1}/a1.png`,
      a2: `/nxzawpguesser/maps/anubis/${i + 1}/a2.png`,
      ans: `/nxzawpguesser/maps/anubis/${i + 1}/ans.png`
    })),
    // Cache (9 sets)
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `cache_${i + 1}`,
      map: 'cache',
      mapName: 'Cache',
      logo: '/nxzawpguesser/logos/De_cache.png',
      a1: `/nxzawpguesser/maps/cache/${i + 1}/a1.png`,
      a2: `/nxzawpguesser/maps/cache/${i + 1}/a2.png`,
      ans: `/nxzawpguesser/maps/cache/${i + 1}/ans.png`
    })),
    // Inferno (12 sets)
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `inferno_${i + 1}`,
      map: 'inferno',
      mapName: 'Inferno',
      logo: '/nxzawpguesser/logos/de_inferno.png',
      a1: `/nxzawpguesser/maps/inferno/${i + 1}/a1.png`,
      a2: `/nxzawpguesser/maps/inferno/${i + 1}/a2.png`,
      ans: `/nxzawpguesser/maps/inferno/${i + 1}/ans.png`
    }))
  ];

  // Map choices configuration (7 Pool maps + Question mark ❓)
  const MAP_CHOICES = [
    { key: 'anubis', name: 'Anubis', logo: '/nxzawpguesser/logos/De_anubis.png' },
    { key: 'cache', name: 'Cache', logo: '/nxzawpguesser/logos/De_cache.png' },
    { key: 'dust2', name: 'Dust II', logo: '/nxzawpguesser/logos/de_dust2.png' },
    { key: 'mirage', name: 'Mirage', logo: '/nxzawpguesser/logos/De_mirage.png' },
    { key: 'overpass', name: 'Overpass', logo: '/nxzawpguesser/logos/de_overpass.png' },
    { key: 'ancient', name: 'Ancient', logo: '/nxzawpguesser/logos/De_ancient.png' },
    { key: 'inferno', name: 'Inferno', logo: '/nxzawpguesser/logos/de_inferno.png' },
    { key: 'skip', name: 'Skip / Don\'t Know', isQuestion: true }
  ];

  // --- Audio System with Real-Time Volume & Acoustic Perception ---
  const audioPlay = new Audio('/nxzawpguesser/audio/awp_play.mp3');
  const audioScope = new Audio('/nxzawpguesser/audio/awp_scope.mp3');
  audioPlay.preload = 'auto';
  audioScope.preload = 'auto';

  // Load saved volume or default to 25%
  let savedVol = localStorage.getItem('nxz_awp_vol');
  let masterVolumePercent = savedVol !== null ? parseInt(savedVol, 10) : 25;
  let isMuted = false;

  const volumeSlider = document.getElementById('volume-slider');
  const volumeToggleBtn = document.getElementById('volume-toggle-btn');
  const volumePercentLabel = document.getElementById('volume-percent-label');

  // Human ear logarithmic response curve
  function calculateGain(percent) {
    if (isMuted || percent <= 0) return 0;
    const norm = Math.max(0, Math.min(100, percent)) / 100;
    // Power curve for natural, responsive volume adjustment
    return Math.pow(norm, 1.8);
  }

  function applyMasterVolume() {
    const gain = calculateGain(masterVolumePercent);
    audioPlay.volume = Math.min(1, Math.max(0, gain));
    audioScope.volume = Math.min(1, Math.max(0, gain * 1.1));
    audioPlay.muted = isMuted;
    audioScope.muted = isMuted;

    if (volumeSlider) {
      volumeSlider.value = isMuted ? 0 : masterVolumePercent;
    }
    if (volumePercentLabel) {
      volumePercentLabel.textContent = isMuted ? '0%' : `${masterVolumePercent}%`;
    }
    if (volumeToggleBtn) {
      if (isMuted || masterVolumePercent === 0) {
        volumeToggleBtn.textContent = '🔇';
      } else if (masterVolumePercent < 50) {
        volumeToggleBtn.textContent = '🔉';
      } else {
        volumeToggleBtn.textContent = '🔊';
      }
    }
  }

  // Real-time slider listener: immediately alters volume of playing sounds
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      masterVolumePercent = val;
      isMuted = (val === 0);
      localStorage.setItem('nxz_awp_vol', masterVolumePercent);
      applyMasterVolume();
    });
  }

  if (volumeToggleBtn) {
    volumeToggleBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      applyMasterVolume();
    });
  }

  function playSound(audioEl) {
    try {
      applyMasterVolume();
      audioEl.pause();
      audioEl.currentTime = 0;
      const promise = audioEl.play();
      if (promise && promise.catch) {
        promise.catch(() => {});
      }
    } catch (err) {}
  }

  // Initialize initial audio settings
  applyMasterVolume();

  // --- Game State ---
  let selectedMode = '10'; // '10', '20', '30', 'endless'
  let totalRounds = 10;
  let currentRoundIndex = 0;
  let score = 0;
  let roundAttempt = 1; // 1 (a1) or 2 (a2)
  let activePlaylist = [];
  let currentQuestion = null;
  let selectedMapChoice = null;
  let isGameStarting = false;
  let isScreenTransitioning = false;
  let endlessGameOver = false;
  let gameHistory = [];

  // --- DOM Elements ---
  const screenMenu = document.getElementById('screen-menu');
  const screenGame = document.getElementById('screen-game');
  const screenReveal = document.getElementById('screen-reveal');
  const screenSummary = document.getElementById('screen-summary');
  const menuWrapper = document.querySelector('.menu-wrapper');

  const btnPlaySolo = document.getElementById('btn-play-solo');
  const modePills = document.querySelectorAll('.mode-pill');
  const nxzLogo = document.getElementById('nxz-logo');
  const bulletSpark = document.getElementById('bullet-spark');
  const muzzleOverlay = document.getElementById('muzzle-overlay');

  const roundBadge = document.getElementById('round-badge');
  const skipBadge = document.getElementById('skip-badge');
  const scoreDisplay = document.getElementById('score-display');
  const scopeImg = document.getElementById('scope-img');
  const mapButtonsGrid = document.getElementById('map-buttons-grid');
  const btnGuess = document.getElementById('btn-guess');

  const revealRoundText = document.getElementById('reveal-round-text');
  const revealScoreText = document.getElementById('reveal-score-text');
  const answerImg = document.getElementById('answer-img');
  const revealLogo = document.getElementById('reveal-logo');
  const revealName = document.getElementById('reveal-name');
  const revealBadge = document.getElementById('reveal-badge');
  const btnNext = document.getElementById('btn-next');

  const summaryTitle = document.getElementById('summary-title');
  const summaryScore = document.getElementById('summary-score');
  const summaryAccuracy = document.getElementById('summary-accuracy');
  const summaryMode = document.getElementById('summary-mode');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnMainMenu = document.getElementById('btn-main-menu');

  // --- Utility: Array Shuffle ---
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // --- Pure 60fps Layout-Jump-Free Screen Transition ---
  async function showScreen(targetScreen) {
    if (isScreenTransitioning) return;
    isScreenTransitioning = true;

    const screens = [screenMenu, screenGame, screenReveal, screenSummary];
    const currentScreen = screens.find(s => !s.classList.contains('hidden'));

    if (currentScreen && currentScreen !== targetScreen) {
      // 1. Fade out active screen
      currentScreen.classList.add('fade-out');
      await new Promise(res => setTimeout(res, 250));
      currentScreen.classList.add('hidden');
      currentScreen.classList.remove('fade-out');
    }

    // 2. Prepare target screen
    targetScreen.classList.add('fade-out');
    targetScreen.classList.remove('hidden');

    // Force frame layout
    void targetScreen.offsetWidth;

    // 3. Fade in target screen smoothly
    requestAnimationFrame(() => {
      targetScreen.classList.remove('fade-out');
      setTimeout(() => {
        isScreenTransitioning = false;
      }, 260);
    });
  }

  // --- Prepare Round Ahead of Time (Prevents frame drops on click) ---
  function preparePlaylist() {
    let pool = shuffleArray(MAP_CATALOG);
    if (selectedMode !== 'endless' && pool.length < totalRounds) {
      while (pool.length < totalRounds) {
        pool = pool.concat(shuffleArray(MAP_CATALOG));
      }
    }
    activePlaylist = pool;
    currentRoundIndex = 0;
    score = 0;
    endlessGameOver = false;
    gameHistory = [];
    currentQuestion = activePlaylist[0];

    // Preload & decode first scope image while on menu (idle time)
    if (currentQuestion && currentQuestion.a1) {
      const preImg = new Image();
      preImg.src = currentQuestion.a1;
      if (preImg.decode) {
        preImg.decode().catch(() => {});
      }
    }
  }

  // Pre-prepare on startup
  preparePlaylist();

  // --- Mode Selection ---
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedMode = pill.getAttribute('data-mode');
      if (selectedMode === 'endless') {
        totalRounds = Infinity;
      } else {
        totalRounds = parseInt(selectedMode, 10) || 10;
      }
      preparePlaylist();
    });
  });

  // --- Play Solo Click: AWP Shot & Falling Logo Animation ---
  btnPlaySolo.addEventListener('click', () => {
    if (isGameStarting || isScreenTransitioning) return;
    isGameStarting = true;

    // 1. Play gunshot sound at exact slider volume
    playSound(audioPlay);

    // 2. Trigger visual effects without forced reflow
    if (muzzleOverlay) {
      muzzleOverlay.classList.remove('flash-active');
      requestAnimationFrame(() => {
        muzzleOverlay.classList.add('flash-active');
      });
    }

    if (bulletSpark) {
      bulletSpark.classList.remove('active');
      requestAnimationFrame(() => {
        bulletSpark.classList.add('active');
      });
    }

    // 3. Logo Shot & Fall animation (GPU transforms only, pure gravity physics)
    if (nxzLogo) {
      nxzLogo.classList.remove('logo-shot-fall');
      requestAnimationFrame(() => {
        nxzLogo.classList.add('logo-shot-fall');
      });
    }

    // 4. Smooth transition into Game Screen after shot animation finishes
    setTimeout(async () => {
      renderMapButtons();
      setupRoundUI(0);
      await showScreen(screenGame);
      isGameStarting = false;
    }, 2000);
  });

  // --- Render Map Choice Buttons in Game Arena ---
  function renderMapButtons() {
    mapButtonsGrid.innerHTML = '';
    MAP_CHOICES.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'map-btn';
      btn.type = 'button';
      btn.dataset.key = choice.key;
      btn.title = choice.name;

      if (choice.isQuestion) {
        btn.classList.add('question-btn');
        btn.innerHTML = `<div class="question-badge">?</div>`;
      } else {
        btn.innerHTML = `<img src="${choice.logo}" alt="${choice.name}" loading="eager">`;
      }

      btn.addEventListener('click', () => {
        selectChoice(choice.key, btn);
      });

      mapButtonsGrid.appendChild(btn);
    });
  }

  function selectChoice(key, btnElem) {
    const allBtns = mapButtonsGrid.querySelectorAll('.map-btn');
    allBtns.forEach(b => b.classList.remove('selected'));

    if (selectedMapChoice === key) {
      selectedMapChoice = null;
      btnGuess.classList.remove('ready');
    } else {
      selectedMapChoice = key;
      btnElem.classList.add('selected');
      btnGuess.classList.add('ready');
    }
  }

  // Preload a2 and ans images in advance
  function preloadNextImages(q) {
    if (!q) return;
    const imgA2 = new Image();
    imgA2.src = q.a2;
    const imgAns = new Image();
    imgAns.src = q.ans;
  }

  // --- Setup Round UI ---
  function setupRoundUI(index) {
    currentRoundIndex = index;
    roundAttempt = 1;
    selectedMapChoice = null;
    btnGuess.classList.remove('ready');

    if (currentRoundIndex >= activePlaylist.length) {
      activePlaylist = activePlaylist.concat(shuffleArray(MAP_CATALOG));
    }

    currentQuestion = activePlaylist[currentRoundIndex];
    preloadNextImages(currentQuestion);

    // Update Header
    if (selectedMode === 'endless') {
      roundBadge.textContent = `${currentRoundIndex + 1}`;
    } else {
      roundBadge.textContent = `${currentRoundIndex + 1}/${totalRounds}`;
    }
    scoreDisplay.textContent = `correct : ${score}`;
    skipBadge.classList.remove('visible');

    // Deselect all buttons
    const allBtns = mapButtonsGrid.querySelectorAll('.map-btn');
    allBtns.forEach(b => b.classList.remove('selected'));

    // Set Scope Image (a1)
    scopeImg.classList.remove('zoom-change');
    scopeImg.src = currentQuestion.a1;
  }

  // --- Guess Button Logic ---
  btnGuess.addEventListener('click', handleGuess);

  function handleGuess() {
    if (!currentQuestion || isScreenTransitioning) return;

    if (!selectedMapChoice) {
      mapButtonsGrid.style.animation = 'none';
      void mapButtonsGrid.offsetWidth;
      mapButtonsGrid.style.animation = 'menuRecoilShake 0.25s ease';
      return;
    }

    const isSkipChoice = (selectedMapChoice === 'skip');
    const isCorrect = (!isSkipChoice && selectedMapChoice === currentQuestion.map);

    if (isCorrect) {
      // ✅ Correct Answer!
      score++;
      scoreDisplay.textContent = `correct : ${score}`;
      gameHistory.push({
        question: currentQuestion,
        result: 'correct',
        attempt: roundAttempt
      });
      goToReveal(true);
    } else {
      // ❌ Incorrect Answer or Skipped (❓)
      if (roundAttempt === 1) {
        // First chance missed -> transition to a2
        roundAttempt = 2;

        // Play scope zoom sound at slider volume
        playSound(audioScope);

        // Scope zoom animation & switch image
        scopeImg.classList.remove('zoom-change');
        void scopeImg.offsetWidth;
        scopeImg.classList.add('zoom-change');
        scopeImg.src = currentQuestion.a2;

        // Show Skip: 1 badge
        skipBadge.classList.add('visible');

        // Reset choice for second attempt
        selectedMapChoice = null;
        btnGuess.classList.remove('ready');
        const allBtns = mapButtonsGrid.querySelectorAll('.map-btn');
        allBtns.forEach(b => b.classList.remove('selected'));
      } else {
        // Second chance missed -> round over!
        gameHistory.push({
          question: currentQuestion,
          result: 'wrong',
          attempt: roundAttempt
        });

        // If Endless Mode: "ผิดทั้ง 2 ครั้ง" -> Game Over!
        if (selectedMode === 'endless') {
          endlessGameOver = true;
        }

        goToReveal(false);
      }
    }
  }

  // --- Reveal / Answer Screen ---
  async function goToReveal(isCorrect) {
    if (selectedMode === 'endless') {
      revealRoundText.textContent = `${currentRoundIndex + 1}`;
    } else {
      revealRoundText.textContent = `${currentRoundIndex + 1}/${totalRounds}`;
    }
    revealScoreText.textContent = `correct : ${score}`;

    // Pre-decode answer image
    const aImg = new Image();
    aImg.src = currentQuestion.ans;
    if (aImg.decode) {
      try { await aImg.decode(); } catch(e) {}
    }
    answerImg.src = currentQuestion.ans;

    // Show map logo & name
    revealLogo.src = currentQuestion.logo;
    revealLogo.alt = currentQuestion.mapName;
    revealName.textContent = currentQuestion.mapName;

    // Badge status
    if (isCorrect) {
      revealBadge.className = 'result-badge correct';
      revealBadge.textContent = 'Correct';
    } else {
      revealBadge.className = 'result-badge wrong';
      revealBadge.textContent = 'Missed';
    }

    await showScreen(screenReveal);
  }

  // --- Next Button Logic ---
  btnNext.addEventListener('click', handleNext);

  async function handleNext() {
    if (isScreenTransitioning) return;

    // Check if Endless Mode game over
    if (endlessGameOver) {
      goToSummary();
      return;
    }

    // Check if fixed rounds finished
    if (selectedMode !== 'endless' && currentRoundIndex + 1 >= totalRounds) {
      goToSummary();
      return;
    }

    // Pre-decode next round image before transition
    const nextQ = activePlaylist[currentRoundIndex + 1] || activePlaylist[0];
    const nImg = new Image();
    nImg.src = nextQ.a1;
    if (nImg.decode) {
      try { await nImg.decode(); } catch(e) {}
    }

    setupRoundUI(currentRoundIndex + 1);
    await showScreen(screenGame);
  }

  // --- Summary Screen ---
  function goToSummary() {
    const totalPlayed = currentRoundIndex + 1;
    const accuracy = totalPlayed > 0 ? Math.round((score / totalPlayed) * 100) : 0;

    if (selectedMode === 'endless') {
      summaryTitle.textContent = 'GAME OVER';
      summaryMode.textContent = 'Endless Mode';
      summaryScore.textContent = `${score}`;
    } else {
      if (score >= Math.ceil(totalRounds * 0.7)) {
        summaryTitle.textContent = 'VICTORY!';
      } else {
        summaryTitle.textContent = 'MATCH FINISHED';
      }
      summaryMode.textContent = `${totalRounds} Rounds`;
      summaryScore.textContent = `${score} / ${totalRounds}`;
    }

    summaryAccuracy.textContent = `${accuracy}%`;
    showScreen(screenSummary);
  }

  // Play Again: Replay same mode
  btnPlayAgain.addEventListener('click', () => {
    let pool = shuffleArray(MAP_CATALOG);
    if (selectedMode !== 'endless' && pool.length < totalRounds) {
      while (pool.length < totalRounds) {
        pool = pool.concat(shuffleArray(MAP_CATALOG));
      }
    }
    activePlaylist = pool;
    currentRoundIndex = 0;
    score = 0;
    endlessGameOver = false;
    gameHistory = [];

    renderMapButtons();
    setupRoundUI(0);
    showScreen(screenGame);
  });

  // Main Menu: Return to home & reset logo
  btnMainMenu.addEventListener('click', () => {
    if (nxzLogo) {
      nxzLogo.classList.remove('logo-shot-fall');
    }
    showScreen(screenMenu);
  });

  // Keyboard shortcut: Space or Enter for Guess / Next
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (!screenReveal.classList.contains('hidden')) {
        e.preventDefault();
        handleNext();
      } else if (!screenGame.classList.contains('hidden') && selectedMapChoice) {
        e.preventDefault();
        handleGuess();
      }
    }
  });

})();
