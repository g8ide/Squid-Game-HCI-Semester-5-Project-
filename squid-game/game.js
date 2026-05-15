/* ============================================
   SQUID GAME — RED LIGHT GREEN LIGHT
   Game Logic
   ============================================ */

(() => {
  'use strict';

  // ---- DOM REFS ----
  const $ = id => document.getElementById(id);
  const startScreen   = $('startScreen');
  const gameScreen     = $('gameScreen');
  const gameOverScreen = $('gameOverScreen');
  const startBtn       = $('startBtn');
  const retryBtn       = $('retryBtn');
  const timerEl        = $('timer');
  const signalDisplay  = $('signalDisplay');
  const signalText     = $('signalText');
  const progressText   = $('progressText');
  const progressBar    = $('progressBar');
  const progressMarker = $('progressMarker');
  const player         = $('player');
  const doll           = $('doll');
  const redFlash       = $('redFlash');
  const scanLine       = $('scanLine');
  const npcContainer   = $('npcContainer');
  const resultIcon     = $('resultIcon');
  const resultTitle    = $('resultTitle');
  const resultSubtitle = $('resultSubtitle');
  const finalProgress  = $('finalProgress');
  const finalTime      = $('finalTime');

  // ---- AUDIO (Web Audio API) ----
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
  }

  function playTone(freq, duration, type = 'square', vol = 0.15) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playGreenLight() {
    playTone(523, 0.15, 'sine', 0.2);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 100);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.2), 200);
  }

  function playRedLight() {
    playTone(330, 0.3, 'square', 0.2);
    setTimeout(() => playTone(220, 0.5, 'square', 0.25), 200);
  }

  function playEliminated() {
    playTone(200, 0.1, 'sawtooth', 0.3);
    setTimeout(() => playTone(150, 0.15, 'sawtooth', 0.3), 100);
    setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.35), 200);
  }

  function playWin() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'sine', 0.2), i * 150);
    });
  }

  function playSinging() {
    // Simulates the doll singing "무궁화 꽃이 피었습니다"
    const notes = [392, 440, 392, 330, 392, 440, 392, 330, 294, 330, 294, 262];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.18, 'sine', 0.12), i * 150);
    });
  }

  // ---- GAME STATE ----
  const DIFFICULTY = {
    easy:   { time: 90, greenMin: 3000, greenMax: 6000, redMin: 2000, redMax: 4000, speed: 0.45, gracePeriod: 400 },
    normal: { time: 60, greenMin: 2500, greenMax: 5000, redMin: 2000, redMax: 4500, speed: 0.35, gracePeriod: 250 },
    hard:   { time: 40, greenMin: 1500, greenMax: 3500, redMin: 2500, redMax: 5000, speed: 0.28, gracePeriod: 120 },
  };

  let difficulty = 'easy';
  let gameState = 'idle'; // idle | playing | over
  let isGreenLight = true;
  let isMoving = false;
  let progress = 0;       // 0-100
  let timeLeft = 60;
  let timerInterval = null;
  let signalTimeout = null;
  let gameLoopRAF = null;
  let lastTimestamp = 0;
  let graceTimer = 0;     // ms after red light before detection
  let startTime = 0;

  // NPCs
  const NPC_COUNT = 20;
  let npcs = [];

  // ---- DIFFICULTY BUTTONS ----
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
    });
  });

  // ---- PARTICLES (Start Screen) ----
  function createParticles() {
    const container = $('particles');
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 6 + 's';
      p.style.animationDuration = (4 + Math.random() * 4) + 's';
      p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
      p.style.background = ['var(--pink)', 'var(--teal-light)', 'var(--gold)'][Math.floor(Math.random() * 3)];
      container.appendChild(p);
    }
  }
  createParticles();

  // ---- SCREEN MANAGEMENT ----
  function showScreen(screen) {
    [startScreen, gameScreen, gameOverScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  // ---- NPC MANAGEMENT ----
  function createNPCs() {
    npcContainer.innerHTML = '';
    npcs = [];
    for (let i = 0; i < NPC_COUNT; i++) {
      const npc = document.createElement('div');
      npc.className = 'npc';
      const xPos = 10 + Math.random() * 80;
      const num = Math.floor(Math.random() * 456) + 1;
      npc.style.left = xPos + '%';
      npc.style.bottom = (8 + Math.random() * 5) + '%';
      const scale = 0.6 + Math.random() * 0.4;
      npc.style.transform = `scale(${scale})`;
      npc.style.zIndex = Math.floor(scale * 10 + 10);
      npc.innerHTML = `
        <div class="npc-head"></div>
        <div class="npc-body"><div class="npc-number">${num}</div></div>
        <div class="npc-legs"><div class="npc-leg"></div><div class="npc-leg"></div></div>
      `;
      npcContainer.appendChild(npc);

      npcs.push({
        el: npc,
        progress: Math.random() * 5,
        speed: (0.15 + Math.random() * 0.25) * DIFFICULTY[difficulty].speed / 0.35,
        alive: true,
        reactionDelay: 100 + Math.random() * 600, // ms to stop after red light
        reckless: Math.random() < 0.15, // some NPCs are reckless
      });
    }
  }

  // ---- START GAME ----
  function startGame() {
    initAudio();
    const cfg = DIFFICULTY[difficulty];
    gameState = 'playing';
    isGreenLight = true;
    isMoving = false;
    progress = 0;
    timeLeft = cfg.time;
    graceTimer = 0;
    startTime = Date.now();

    // Reset visuals
    player.style.bottom = '10%';
    player.classList.remove('running');
    doll.className = 'doll facing-away';
    signalDisplay.className = 'hud-item signal-display green';
    signalText.textContent = 'GREEN LIGHT';
    timerEl.textContent = timeLeft;
    timerEl.classList.remove('warning');
    progressBar.style.width = '0%';
    progressMarker.style.left = '0%';
    progressText.textContent = '0%';
    redFlash.classList.remove('active');
    scanLine.classList.remove('active');

    createNPCs();
    showScreen(gameScreen);

    // Start timer
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = Math.max(0, timeLeft);
      if (timeLeft <= 10) timerEl.classList.add('warning');
      if (timeLeft <= 0) {
        endGame('timeout');
      }
    }, 1000);

    // Start signal loop
    scheduleSignalChange();

    // Start game loop
    lastTimestamp = performance.now();
    gameLoopRAF = requestAnimationFrame(gameLoop);

    playGreenLight();
    playSinging();
  }

  // ---- SIGNAL (GREEN/RED) LOGIC ----
  function scheduleSignalChange() {
    const cfg = DIFFICULTY[difficulty];
    if (isGreenLight) {
      const duration = cfg.greenMin + Math.random() * (cfg.greenMax - cfg.greenMin);
      signalTimeout = setTimeout(() => switchToRed(), duration);
    } else {
      const duration = cfg.redMin + Math.random() * (cfg.redMax - cfg.redMin);
      signalTimeout = setTimeout(() => switchToGreen(), duration);
    }
  }

  function switchToRed() {
    if (gameState !== 'playing') return;
    isGreenLight = false;
    graceTimer = 0;

    // Doll turns around
    doll.className = 'doll facing-front';
    signalDisplay.className = 'hud-item signal-display red';
    signalText.textContent = 'RED LIGHT';
    redFlash.classList.add('active');
    scanLine.classList.add('active');

    playRedLight();
    scheduleSignalChange();
  }

  function switchToGreen() {
    if (gameState !== 'playing') return;
    isGreenLight = true;

    // Doll turns away
    doll.className = 'doll facing-away';
    signalDisplay.className = 'hud-item signal-display green';
    signalText.textContent = 'GREEN LIGHT';
    redFlash.classList.remove('active');
    scanLine.classList.remove('active');

    playGreenLight();
    playSinging();
    scheduleSignalChange();
  }

  // ---- GAME LOOP ----
  function gameLoop(timestamp) {
    if (gameState !== 'playing') return;
    const dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    const cfg = DIFFICULTY[difficulty];

    // Player movement
    if (isMoving) {
      progress += cfg.speed * (dt / 16.67);
      progress = Math.min(progress, 100);
      player.classList.add('running');
    } else {
      player.classList.remove('running');
    }

    // Check red light violation (with grace period)
    if (!isGreenLight) {
      graceTimer += dt;
      if (isMoving && graceTimer > cfg.gracePeriod) {
        endGame('eliminated');
        return;
      }
    }

    // Update player visuals
    const playerBottom = 10 + (progress / 100) * 55; // from 10% to 65%
    player.style.bottom = playerBottom + '%';
    progressBar.style.width = progress + '%';
    progressMarker.style.left = progress + '%';
    progressText.textContent = Math.floor(progress) + '%';

    // Update NPCs
    updateNPCs(dt);

    // Win check
    if (progress >= 100) {
      endGame('win');
      return;
    }

    gameLoopRAF = requestAnimationFrame(gameLoop);
  }

  // ---- NPC LOGIC ----
  function updateNPCs(dt) {
    const cfg = DIFFICULTY[difficulty];

    npcs.forEach(npc => {
      if (!npc.alive) return;

      let shouldMove = false;
      if (isGreenLight) {
        shouldMove = true;
      } else {
        // Some NPCs keep moving briefly (reaction delay)
        if (npc._stopTimer === undefined) npc._stopTimer = 0;
        npc._stopTimer += dt;

        if (npc._stopTimer < npc.reactionDelay) {
          shouldMove = true;
        }

        // Reckless NPCs sometimes move during red
        if (npc.reckless && Math.random() < 0.002) {
          shouldMove = true;
        }
      }

      if (isGreenLight) {
        npc._stopTimer = 0;
      }

      if (shouldMove) {
        npc.progress += npc.speed * (dt / 16.67);
        npc.el.classList.add('running');
      } else {
        npc.el.classList.remove('running');
      }

      // Eliminate NPCs that move too long during red
      if (!isGreenLight && shouldMove && graceTimer > cfg.gracePeriod + 200) {
        if (npc.reckless || npc._stopTimer > npc.reactionDelay + 300) {
          npc.alive = false;
          npc.el.classList.add('eliminated');
          npc.el.classList.remove('running');
          if (Math.random() < 0.3) playTone(100 + Math.random() * 100, 0.15, 'sawtooth', 0.05);
        }
      }

      // Update NPC position
      const npcBottom = 8 + (npc.progress / 100) * 55;
      npc.el.style.bottom = npcBottom + '%';

      // Win check for NPCs (just stop them at 100%)
      if (npc.progress >= 100) {
        npc.progress = 100;
        npc.el.classList.remove('running');
      }
    });
  }

  // ---- END GAME ----
  function endGame(reason) {
    gameState = 'over';
    clearInterval(timerInterval);
    clearTimeout(signalTimeout);
    cancelAnimationFrame(gameLoopRAF);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    setTimeout(() => {
      // Set result screen
      resultIcon.className = 'result-icon';
      resultTitle.className = 'result-title';

      if (reason === 'eliminated') {
        resultIcon.classList.add('eliminated');
        resultTitle.classList.add('eliminated');
        resultTitle.textContent = 'ELIMINATED';
        resultSubtitle.textContent = 'You moved during Red Light';
        playEliminated();
      } else if (reason === 'timeout') {
        resultIcon.classList.add('timeout');
        resultTitle.classList.add('timeout');
        resultTitle.textContent = 'TIME\'S UP';
        resultSubtitle.textContent = 'You ran out of time';
        playEliminated();
      } else {
        resultIcon.classList.add('winner');
        resultTitle.classList.add('winner');
        resultTitle.textContent = 'YOU SURVIVED';
        resultSubtitle.textContent = 'You crossed the finish line!';
        playWin();
      }

      finalProgress.textContent = Math.floor(progress) + '%';
      finalTime.textContent = elapsed + 's';

      showScreen(gameOverScreen);
    }, reason === 'eliminated' ? 800 : 300);

    // Flash effect on elimination
    if (reason === 'eliminated') {
      player.style.animation = 'eliminateFlash 0.3s ease 2';
      setTimeout(() => player.style.animation = '', 600);
    }
  }

  // ---- INPUT HANDLING ----
  function startMoving() {
    if (gameState !== 'playing') return;
    isMoving = true;
  }

  function stopMoving() {
    isMoving = false;
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      startMoving();
    }
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      stopMoving();
    }
  });

  // Mouse / Touch on game field
  gameScreen.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    startMoving();
  });
  gameScreen.addEventListener('mouseup', stopMoving);
  gameScreen.addEventListener('mouseleave', stopMoving);

  gameScreen.addEventListener('touchstart', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    startMoving();
  }, { passive: false });
  gameScreen.addEventListener('touchend', e => {
    e.preventDefault();
    stopMoving();
  }, { passive: false });

  // ---- BUTTONS ----
  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', () => {
    showScreen(startScreen);
  });

  // Prevent context menu on long press
  document.addEventListener('contextmenu', e => e.preventDefault());

})();
