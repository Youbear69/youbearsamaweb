// ==========================================
// Random 12 Zodiac — Main Logic
// ==========================================

(function () {
  'use strict';

  // --- State ---
  let currentMode = 'registered'; // 'registered' | 'proposed'
  let allRegistrations = [];
  let allProposals = [];
  let isSpinning = false;
  let dataReady = false;
  let picksPerZodiac = 1; // 1 to 4 max
  let globalVolume = 0.3; // 30% default

  // Sound effect
  let sfxAudio = null;

  // --- DOM Refs ---
  const grid = document.getElementById('random12-grid');
  const startBtn = document.getElementById('btn-start-random');
  const statusEl = document.getElementById('random12-status');
  const modeBtnReg = document.getElementById('mode-btn-registered');
  const modeBtnProp = document.getElementById('mode-btn-proposed');
  const btnCountMinus = document.getElementById('btn-count-minus');
  const btnCountPlus = document.getElementById('btn-count-plus');
  const pickCountVal = document.getElementById('pick-count-val');

  // --- Volume Control ---
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  const volumeToggle = document.getElementById('volume-toggle');
  const volumeIconOn = document.getElementById('volume-icon-on');
  const volumeIconMute = document.getElementById('volume-icon-mute');
  const volumeSliderWrap = document.getElementById('volume-slider-wrap');

  // Init volume from localStorage
  const savedVol = localStorage.getItem('random12_volume') || localStorage.getItem('site_volume');
  if (savedVol !== null) {
    globalVolume = parseFloat(savedVol);
  }
  if (volumeSlider) {
    volumeSlider.value = Math.round(globalVolume * 100);
    if (volumeValue) volumeValue.textContent = Math.round(globalVolume * 100) + '%';
    updateVolumeIcons();
    syncVolumeWithGlobal();
  }

  function syncVolumeWithGlobal() {
    if (sfxAudio) sfxAudio.volume = globalVolume;
    if (window.globalAudio) {
      window.globalAudio.volume = globalVolume;
      window.globalAudio.muted = (globalVolume <= 0);
    }
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      globalVolume = parseInt(e.target.value) / 100;
      if (volumeValue) volumeValue.textContent = e.target.value + '%';
      localStorage.setItem('random12_volume', globalVolume);
      localStorage.setItem('site_volume', globalVolume);
      updateVolumeIcons();
      syncVolumeWithGlobal();
    });
  }

  if (volumeToggle) {
    volumeToggle.addEventListener('click', () => {
      if (globalVolume > 0) {
        // Mute
        localStorage.setItem('random12_volume_prev', globalVolume);
        globalVolume = 0;
      } else {
        // Unmute
        const prev = parseFloat(localStorage.getItem('random12_volume_prev') || '0.3');
        globalVolume = prev > 0 ? prev : 0.3;
      }
      if (volumeSlider) volumeSlider.value = Math.round(globalVolume * 100);
      if (volumeValue) volumeValue.textContent = Math.round(globalVolume * 100) + '%';
      localStorage.setItem('random12_volume', globalVolume);
      localStorage.setItem('site_volume', globalVolume);
      updateVolumeIcons();
      syncVolumeWithGlobal();
    });
  }

  function updateVolumeIcons() {
    if (!volumeIconOn || !volumeIconMute) return;
    if (globalVolume <= 0) {
      volumeIconOn.style.display = 'none';
      volumeIconMute.style.display = 'block';
    } else {
      volumeIconOn.style.display = 'block';
      volumeIconMute.style.display = 'none';
    }
  }

  let hasRevealedWinners = false;

  // --- Multi-Pick Counter (+ / -) ---
  function updateCounterButtonsOnly() {
    if (pickCountVal) pickCountVal.textContent = picksPerZodiac;
    if (btnCountMinus) btnCountMinus.disabled = isSpinning || picksPerZodiac <= 1;
    if (btnCountPlus) btnCountPlus.disabled = isSpinning || picksPerZodiac >= 4;
  }

  function updateCounterUI() {
    updateCounterButtonsOnly();
    if (!hasRevealedWinners) {
      renderGrid();
    }
  }

  if (btnCountMinus) {
    btnCountMinus.addEventListener('click', () => {
      if (isSpinning || picksPerZodiac <= 1) return;
      picksPerZodiac--;
      updateCounterButtonsOnly();
      if (!hasRevealedWinners) renderGrid();
    });
  }

  if (btnCountPlus) {
    btnCountPlus.addEventListener('click', () => {
      if (isSpinning || picksPerZodiac >= 4) return;
      picksPerZodiac++;
      updateCounterButtonsOnly();
      if (!hasRevealedWinners) renderGrid();
    });
  }

  // --- Mode Toggle ---
  function setMode(mode) {
    currentMode = mode;
    hasRevealedWinners = false;
    if (modeBtnReg) modeBtnReg.classList.toggle('active', mode === 'registered');
    if (modeBtnProp) modeBtnProp.classList.toggle('active', mode === 'proposed');
    renderGrid();
  }

  if (modeBtnReg) modeBtnReg.addEventListener('click', () => { if (!isSpinning) setMode('registered'); });
  if (modeBtnProp) modeBtnProp.addEventListener('click', () => { if (!isSpinning) setMode('proposed'); });

  // --- Load Data ---
  async function loadData() {
    if (statusEl) statusEl.textContent = 'กำลังโหลดข้อมูล...';
    renderSkeletons();

    try {
      const [regs, props] = await Promise.all([
        fbGetRegistrations(),
        fbGetProposals()
      ]);

      allRegistrations = regs || [];
      allProposals = (props || []).filter(p => p.approved);
      dataReady = true;

      renderGrid();
      if (startBtn) startBtn.disabled = false;
      if (statusEl) statusEl.textContent = '';
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = '❌ โหลดข้อมูลไม่สำเร็จ';
      if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
  }

  // --- Render Skeletons ---
  function renderSkeletons() {
    if (!grid) return;
    grid.innerHTML = ZODIAC_METADATA.map(() =>
      `<div class="zodiac-slot-card skeleton" style="min-height: 170px;"></div>`
    ).join('');
  }

  // --- Get members per zodiac ---
  function getMembersByZodiac(zodiacKey) {
    const source = currentMode === 'registered' ? allRegistrations : allProposals;
    return source.filter(m => m.zodiacKey === zodiacKey);
  }

  // --- Render Grid ---
  function renderGrid() {
    if (!grid) return;
    grid.classList.remove('all-done');
    grid.innerHTML = '';

    ZODIAC_METADATA.forEach(z => {
      const members = getMembersByZodiac(z.key);
      const isEmpty = members.length === 0;

      const card = document.createElement('div');
      card.className = 'zodiac-slot-card' + (isEmpty ? ' empty-zodiac' : '');
      card.id = `slot-card-${z.key}`;
      card.dataset.zodiacKey = z.key;

      const targetCount = Math.min(picksPerZodiac, members.length);
      const labelText = picksPerZodiac > 1
        ? (members.length > 0 ? `สุ่ม ${targetCount} คน (จาก ${members.length})` : 'ไม่มีผู้สมัคร')
        : `${members.length} คน`;

      card.innerHTML = `
        <div class="slot-zodiac-icon">
          <img src="/assets/images/white/${z.icon}" alt="${z.th}">
        </div>
        <div class="slot-zodiac-label">${z.th} (${z.en})</div>
        <div class="slot-reel" id="slot-reel-${z.key}">
          ${isEmpty
            ? `<div class="slot-placeholder">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
                   <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                 </svg>
               </div>`
            : `<div class="slot-reel-inner">
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(157,147,204,0.3)" stroke-width="1.5"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
                 <div class="slot-name" style="color: var(--text-muted); opacity: 0.6; font-size: 0.72rem;">${labelText}</div>
               </div>`
          }
        </div>
      `;

      grid.appendChild(card);
    });
  }

  // --- Shuffle array (Fisher-Yates) ---
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Resolve avatar URL ---
  function getAvatarUrl(member) {
    if (member.imageUrl && !member.imageUrl.includes('dicebear')) {
      return member.imageUrl;
    }
    const name = member.displayName || member.xAccount || '?';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=7c3aed&textColor=ffffff&fontSize=38`;
  }

  // --- Start Spinning ---
  async function startSpin() {
    if (isSpinning || !dataReady) return;
    isSpinning = true;

    // Remove old confetti
    const existingCanvas = document.getElementById('confetti-canvas');
    if (existingCanvas) existingCanvas.remove();

    if (startBtn) {
      startBtn.disabled = true;
      startBtn.classList.add('spinning-active');
    }
    if (btnCountMinus) btnCountMinus.disabled = true;
    if (btnCountPlus) btnCountPlus.disabled = true;
    if (statusEl) statusEl.textContent = `🎰 กำลังสุ่ม ${picksPerZodiac} คนต่อราศี...`;

    // Reset all cards
    const cards = grid.querySelectorAll('.zodiac-slot-card');
    cards.forEach(c => {
      c.classList.remove('revealed');
    });
    grid.classList.remove('all-done');

    // Collect random picks for each zodiac
    const picks = [];
    const spinPromises = [];
    let sfxTriggered = false;

    ZODIAC_METADATA.forEach((z, index) => {
      const members = getMembersByZodiac(z.key);
      if (members.length === 0) {
        picks.push([]);
        return;
      }

      const shuffled = shuffle(members);
      const pickCount = Math.min(picksPerZodiac, shuffled.length);
      const winners = shuffled.slice(0, pickCount);
      picks.push(winners);

      // Fast, dramatic spin timing:
      // Starts quickly within ~500ms, spins ~2.8-3.4s, finishes in rapid cascade!
      const delay = index * 45; // slight stagger start
      const duration = 2800 + (index * 55); // each card spins ~3s, stops close together

      spinPromises.push(
        spinCard(z.key, shuffled, winners, delay, duration, () => {
          // Play SFX immediately when FIRST card finishes
          if (!sfxTriggered) {
            sfxTriggered = true;
            playSFX();
          }
        })
      );
    });

    // Wait for all spins to complete
    await Promise.all(spinPromises);

    // All done!
    grid.classList.add('all-done');

    // Confetti
    launchConfetti();

    // Sparkle particles on revealed cards
    setTimeout(() => {
      grid.querySelectorAll('.zodiac-slot-card.revealed').forEach(card => {
        createSparkles(card);
      });
    }, 200);

    const totalWinners = picks.reduce((sum, list) => sum + list.length, 0);
    const zodiacsWithWinners = picks.filter(p => p.length > 0).length;
    if (statusEl) {
      statusEl.textContent = `✨ สุ่มเสร็จแล้ว! ราศีละ ${picksPerZodiac} คน (ได้ทั้งหมด ${totalWinners} คน ใน ${zodiacsWithWinners} ราศี)`;
    }

    hasRevealedWinners = true;
    isSpinning = false;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.classList.remove('spinning-active');
    }
    updateCounterButtonsOnly();

    // Save spin log to Firebase RTDB
    try {
      const logResults = [];
      ZODIAC_METADATA.forEach((z, index) => {
        const winners = picks[index] || [];
        if (winners.length > 0) {
          logResults.push({
            zodiacKey: z.key,
            zodiacNameTh: z.th,
            zodiacNameEn: z.en,
            winners: winners.map(w => ({
              displayName: w.displayName || w.xAccount || '?',
              xAccount: w.xAccount || '',
              imageUrl: w.imageUrl || ''
            }))
          });
        }
      });

      const logPayload = {
        mode: currentMode,
        picksPerZodiac: picksPerZodiac,
        totalWinners: totalWinners,
        zodiacCount: zodiacsWithWinners,
        results: logResults
      };

      // 1. Save to local machine server disk (database/random12_logs.json)
      try {
        await fetch('/api/random12/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logPayload)
        });
      } catch (e) {
        console.warn('Local log save fallback:', e);
      }

      // 2. Also save to Firebase RTDB online
      if (typeof fbAddRandom12Log === 'function') {
        await fbAddRandom12Log(logPayload);
      }
    } catch (logErr) {
      console.warn('Error saving random12 log:', logErr);
    }
  }

  // --- Spin single card ---
  function spinCard(zodiacKey, shuffledMembers, winners, delay, duration, onComplete) {
    return new Promise(resolve => {
      setTimeout(() => {
        const card = document.getElementById(`slot-card-${zodiacKey}`);
        const reel = document.getElementById(`slot-reel-${zodiacKey}`);
        if (!card || !reel) { 
          if (typeof onComplete === 'function') onComplete();
          resolve(); 
          return; 
        }

        card.classList.add('spinning');
        reel.classList.remove('multi-mode');

        // Build reel track with multiple items cycling through fast
        const cycleCount = 20 + Math.floor(Math.random() * 8); // 20-27 cycles for rich animation
        const items = [];

        for (let i = 0; i < cycleCount; i++) {
          const member = shuffledMembers[i % shuffledMembers.length];
          items.push(member);
        }
        // Last item shown before stop is the first winner
        items.push(winners[0]);

        // Clear reel and create track
        const reelHeight = 68;
        reel.innerHTML = '';
        reel.style.position = 'relative';

        const track = document.createElement('div');
        track.className = 'slot-reel-track';
        track.style.top = '0';

        items.forEach(member => {
          const item = document.createElement('div');
          item.className = 'slot-reel-item';
          item.style.height = reelHeight + 'px';
          item.innerHTML = `
            <img class="slot-avatar" src="${getAvatarUrl(member)}" alt="" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.displayName || '?')}&backgroundColor=7c3aed&textColor=ffffff'">
            <div class="slot-name">${escapeHtml(member.displayName || member.xAccount || '?')}</div>
          `;
          track.appendChild(item);
        });

        reel.appendChild(track);

        // Animate: move track upward
        const totalHeight = items.length * reelHeight;
        const targetOffset = -(totalHeight - reelHeight);

        // Animate with requestAnimationFrame for smooth deceleration
        const spinDuration = duration;
        track.style.setProperty('--spin-duration', spinDuration + 'ms');

        const startTime = performance.now();
        const startPos = 0;
        const endPos = targetOffset;

        function easeOutQuint(t) {
          return 1 - Math.pow(1 - t, 5);
        }

        function animate(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / spinDuration, 1);
          const eased = easeOutQuint(progress);
          const currentPos = startPos + (endPos - startPos) * eased;

          track.style.transform = `translateY(${currentPos}px)`;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // Done! Reveal winner(s)
            card.classList.remove('spinning');
            card.classList.add('revealed');

            // Trigger sound on first card complete
            if (typeof onComplete === 'function') {
              onComplete();
            }

            // Render winner(s) in long horizontal rows (แถวเดียวยาว ๆ ให้เห็นชื่อครบ)
            reel.innerHTML = '';
            if (winners.length === 1) {
              const winner = winners[0];
              const wName = winner.displayName || winner.xAccount || '?';
              const finalInner = document.createElement('div');
              finalInner.className = 'slot-reel-inner';
              finalInner.title = wName;
              finalInner.innerHTML = `
                <img class="slot-avatar" src="${getAvatarUrl(winner)}" alt="" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(wName)}&backgroundColor=7c3aed&textColor=ffffff'">
                <div class="slot-name" title="${escapeHtml(wName)}">${escapeHtml(wName)}</div>
              `;
              reel.appendChild(finalInner);
            } else {
              // 2, 3, or 4 winners: all rendered as full-width horizontal rows
              reel.classList.add('multi-mode');
              const list = document.createElement('div');
              list.className = 'slot-multi-list';
              winners.forEach(w => {
                const wName = w.displayName || w.xAccount || '?';
                const row = document.createElement('div');
                row.className = 'slot-winner-row';
                row.title = wName;
                row.innerHTML = `
                  <img class="slot-winner-avatar" src="${getAvatarUrl(w)}" alt="" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(wName)}&backgroundColor=7c3aed&textColor=ffffff'">
                  <span class="slot-winner-name" title="${escapeHtml(wName)}">${escapeHtml(wName)}</span>
                `;
                list.appendChild(row);
              });
              reel.appendChild(list);
            }

            resolve();
          }
        }

        requestAnimationFrame(animate);
      }, delay);
    });
  }

  // --- Play SFX ---
  function playSFX() {
    try {
      if (!sfxAudio) {
        sfxAudio = new Audio('/audio/sfx12.mp3');
      }
      sfxAudio.volume = globalVolume;
      sfxAudio.currentTime = 0;
      sfxAudio.play().catch(() => {});
    } catch (e) {
      console.warn('SFX playback failed:', e);
    }
  }

  // --- Confetti ---
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#f97316', '#e879f9'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * -1,
        w: Math.random() * 8 + 4,
        h: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let frame = 0;
    const maxFrames = 180; // ~3 seconds at 60fps

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const fadeStart = maxFrames * 0.6;
      const globalAlpha = frame > fadeStart ? 1 - ((frame - fadeStart) / (maxFrames - fadeStart)) : 1;

      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = globalAlpha * p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
      });

      if (frame < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        canvas.remove();
      }
    }

    requestAnimationFrame(draw);
  }

  // --- Sparkle Particles ---
  function createSparkles(card) {
    for (let i = 0; i < 6; i++) {
      const spark = document.createElement('div');
      spark.className = 'sparkle-particle';
      spark.style.setProperty('--sx', (Math.random() - 0.5) * 50 + 'px');
      spark.style.setProperty('--sy', -(Math.random() * 40 + 10) + 'px');
      spark.style.left = Math.random() * 100 + '%';
      spark.style.top = Math.random() * 100 + '%';
      spark.style.background = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'][Math.floor(Math.random() * 5)];
      spark.style.animationDelay = (Math.random() * 0.5) + 's';
      card.appendChild(spark);
      setTimeout(() => spark.remove(), 1700);
    }
  }

  // --- Start Button Handler ---
  if (startBtn) {
    startBtn.addEventListener('click', startSpin);
  }

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();
