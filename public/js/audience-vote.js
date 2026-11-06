// Audience Vote Client Logic
(function() {
  const socket = (typeof io === 'function') ? io() : null;

  // 12 Zodiac Metadata
  const ZODIACS = [
    { key: 'aquarius', th: 'กุมภ์', en: 'Aquarius', icon: 'aquarius.png', date: '20 ม.ค. - 18 ก.พ.' },
    { key: 'pisces', th: 'มีน', en: 'Pisces', icon: 'pisces.png', date: '19 ก.พ. - 20 มี.ค.' },
    { key: 'aries', th: 'เมษ', en: 'Aries', icon: 'aries.png', date: '21 มี.ค. - 19 เม.ย.' },
    { key: 'taurus', th: 'พฤษภ', en: 'Taurus', icon: 'taurus.png', date: '20 เม.ย. - 20 พ.ค.' },
    { key: 'gemini', th: 'เมถุน', en: 'Gemini', icon: 'gemini.png', date: '21 พ.ค. - 20 มิ.ย.' },
    { key: 'cancer', th: 'กรกฎ', en: 'Cancer', icon: 'cancer.png', date: '21 มิ.ย. - 22 ก.ค.' },
    { key: 'leo', th: 'สิงห์', en: 'Leo', icon: 'leo.png', date: '23 ก.ค. - 22 ส.ค.' },
    { key: 'virgo', th: 'กันย์', en: 'Virgo', icon: 'virgo.png', date: '23 ส.ค. - 22 ก.ย.' },
    { key: 'libra', th: 'ตุลย์', en: 'Libra', icon: 'libra.png', date: '23 ก.ย. - 22 ต.ค.' },
    { key: 'scorpio', th: 'พิจิก', en: 'Scorpio', icon: 'scorpio.png', date: '23 ต.ค. - 21 พ.ย.' },
    { key: 'sagittarius', th: 'ธนู', en: 'Sagittarius', icon: 'sagittarius.png', date: '22 พ.ย. - 21 ธ.ค.' },
    { key: 'capricorn', th: 'มังกร', en: 'Capricorn', icon: 'capricorn.png', date: '22 ธ.ค. - 19 ม.ค.' }
  ];

  let rosterData = { registered: {}, nominated: {} };
  let voteState = { isPageOpen: true, isOpen: true, resetEpoch: 0, votes: [] };
  let currentUsername = localStorage.getItem('audience_vote_username') || '';
  let selectedZodiacKey = null;
  let myVotedZodiacKey = null;

  function showToast(msg) {
    const t = document.getElementById('toast');
    const m = document.getElementById('toast-msg');
    const i = document.getElementById('toast-icon');
    if (!t) return;
    if (m) m.textContent = msg;
    if (i) i.textContent = '';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function getSafeUserKey(name) {
    return String(name || 'guest').trim().toLowerCase().replace(/[\.#\$\[\]\/]/g, '_');
  }

  // Username modal handlers
  window.openUsernameModal = function() {
    const modal = document.getElementById('username-modal');
    const input = document.getElementById('username-input');
    if (modal) modal.style.display = 'flex';
    if (input) {
      input.value = currentUsername || '';
      setTimeout(() => input.focus(), 100);
    }
  };

  window.closeUsernameModal = function() {
    const modal = document.getElementById('username-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleUsernameSubmit = function(e) {
    e.preventDefault();
    const input = document.getElementById('username-input');
    const val = (input ? input.value : '').trim();
    if (!val) {
      showToast('กรุณากรอกชื่อของคุณ');
      return;
    }
    currentUsername = val;
    localStorage.setItem('audience_vote_username', currentUsername);
    closeUsernameModal();
    updateUserDisplay();
    checkIfUserAlreadyVoted();
    renderCards();
    showToast(`ยินดีต้อนรับคุณ ${currentUsername}`);
  };

  window.handleLogout = function() {
    currentUsername = '';
    localStorage.removeItem('audience_vote_username');
    myVotedZodiacKey = null;
    selectedZodiacKey = null;
    hideFloatingConfirmBar();
    updateUserDisplay();
    renderCards();
    showToast('ออกจากระบบเรียบร้อยแล้ว');
    openUsernameModal();
  };

  function updateUserDisplay() {
    const nameEl = document.getElementById('user-display-name');
    const statusEl = document.getElementById('user-vote-status');
    const btnLogout = document.getElementById('btn-user-logout');
    if (nameEl) nameEl.textContent = currentUsername || 'ยังไม่ได้ระบุชื่อ';
    if (btnLogout) btnLogout.style.display = currentUsername ? 'inline-flex' : 'none';

    if (statusEl) {
      if (!currentUsername) {
        statusEl.textContent = 'กดเพื่อระบุชื่อ';
        statusEl.className = 'user-status-badge badge-warning';
      } else if (myVotedZodiacKey) {
        const z = ZODIACS.find(x => x.key === myVotedZodiacKey);
        const zName = z ? `ราศี${z.th}` : myVotedZodiacKey;
        statusEl.textContent = `ล็อคคำตอบแล้ว: ${zName}`;
        statusEl.className = 'user-status-badge badge-locked';
      } else if (voteState.isOpen === false) {
        statusEl.textContent = 'รอบโหวตปิดอยู่';
        statusEl.className = 'user-status-badge badge-warning';
      } else {
        statusEl.textContent = 'พร้อมลงคะแนน (เลือกได้ 1 ราศี)';
        statusEl.className = 'user-status-badge badge-pending';
      }
    }
  }

  function updateClosedBanner() {
    const banner = document.getElementById('vote-closed-banner');
    if (!banner) return;
    if (voteState.isOpen === false) {
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }

  function syncPageAccessModal() {
    const pageClosedModal = document.getElementById('page-closed-modal');
    if (!pageClosedModal) return;

    if (voteState.isPageOpen === false) {
      pageClosedModal.style.display = 'flex';
      closeUsernameModal();
    } else {
      pageClosedModal.style.display = 'none';
    }
  }

  function checkIfUserAlreadyVoted() {
    myVotedZodiacKey = null;
    if (!currentUsername) return;

    // 1. Check from state votes
    const votes = voteState.votes || [];
    const cleanUser = currentUsername.trim().toLowerCase();
    const existing = votes.find(v => (v.username || '').trim().toLowerCase() === cleanUser);
    if (existing) {
      myVotedZodiacKey = existing.zodiacKey;
      return;
    }

    // 2. Check localStorage for current resetEpoch
    const epoch = voteState.resetEpoch || 0;
    const localChoice = localStorage.getItem('my_audience_vote_' + epoch);
    if (localChoice) {
      myVotedZodiacKey = localChoice;
    }
  }

  function applyRtdbData(val) {
    if (!val) return;
    voteState.isPageOpen = val.isPageOpen !== undefined ? val.isPageOpen : true;
    voteState.isOpen = val.isOpen !== undefined ? val.isOpen : true;
    voteState.resetEpoch = val.resetEpoch || 0;

    const votesObj = val.votes || {};
    voteState.votes = Array.isArray(votesObj) ? votesObj : Object.values(votesObj);

    syncPageAccessModal();
    checkIfUserAlreadyVoted();
    updateClosedBanner();
    updateUserDisplay();
    renderCards();
  }

  // Load Roster & Audience Vote State
  async function loadInitialData() {
    // 1. Fetch roster players (with static fallback)
    let rosterLoaded = false;
    try {
      const rosterRes = await fetch('/api/roster');
      if (rosterRes.ok) {
        const ct = rosterRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await rosterRes.json();
          if (json && json.data) {
            rosterData = json.data;
            rosterLoaded = true;
          }
        }
      }
    } catch (e) {}

    if (!rosterLoaded) {
      try {
        const staticRes = await fetch('/data/roster_default.json');
        if (staticRes.ok) {
          const staticJson = await staticRes.json();
          if (staticJson) {
            rosterData = staticJson;
            rosterLoaded = true;
          }
        }
      } catch (e) {}
    }

    // 2. Try Firebase RTDB first
    if (typeof rtdb !== 'undefined') {
      try {
        const snap = await rtdb.ref('audience_vote').once('value');
        const val = snap.val();
        if (val) {
          applyRtdbData(val);
        }
      } catch (e) {}
    }

    // 3. Fallback to local REST state
    try {
      const voteRes = await fetch('/api/audience-vote/state');
      if (voteRes.ok) {
        const ct = voteRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await voteRes.json();
          if (json && json.data) {
            voteState = json.data;
          }
        }
      }
    } catch (e) {}

    syncPageAccessModal();
    checkIfUserAlreadyVoted();
    updateClosedBanner();
    updateUserDisplay();
    renderCards();

    // If no username and page is open, prompt modal
    if (!currentUsername && voteState.isPageOpen !== false) {
      openUsernameModal();
    }
  }

  function getPlayersForZodiac(zodiacKey) {
    const list = [];
    const reg = (rosterData.registered && rosterData.registered[zodiacKey]) || [];
    reg.forEach(p => {
      if (p && (p.name || p.xAccount)) {
        list.push({
          name: p.name || 'ผู้เล่น',
          avatar: p.avatar || `/white/${zodiacKey}.png`,
          xAccount: p.xAccount || '',
          type: 'reg'
        });
      }
    });

    const nom = (rosterData.nominated && rosterData.nominated[zodiacKey]) || [];
    nom.forEach(p => {
      if (p && (p.name || p.xAccount)) {
        list.push({
          name: p.name || 'ผู้เล่น',
          avatar: p.avatar || `/white/${zodiacKey}.png`,
          xAccount: p.xAccount || '',
          type: 'nom'
        });
      }
    });

    return list;
  }

  function renderCards() {
    const grid = document.getElementById('zodiac-vote-grid');
    if (!grid) return;

    const isLocked = Boolean(myVotedZodiacKey);
    const isClosed = voteState.isOpen === false;

    grid.innerHTML = ZODIACS.map(z => {
      const isSelected = (selectedZodiacKey === z.key);
      const isMyVoted = (myVotedZodiacKey === z.key);

      let cardClasses = 'zodiac-vote-card';
      if (isSelected && !isLocked) cardClasses += ' selected';
      if (isMyVoted) cardClasses += ' voted-locked';
      if (isLocked && !isMyVoted) cardClasses += ' other-locked';
      if (isClosed && !isMyVoted) cardClasses += ' disabled-closed';

      const players = getPlayersForZodiac(z.key);
      const iconPath = `/white/${z.icon}`;

      const playersHtml = players.length > 0 ? `
        <div class="card-players-list">
          ${players.map(p => `
            <div class="player-chip">
              <img src="${p.avatar}" alt="${escapeHtml(p.name)}" class="player-avatar" onerror="this.src='${iconPath}'">
              <span class="player-name">${escapeHtml(p.name)}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card-players-empty">รอประกาศรายชื่อผู้เล่น</div>
      `;

      let badgeHtml = '';
      if (isMyVoted) {
        badgeHtml = `<div class="card-badge-voted">ล็อคคำตอบแล้ว</div>`;
      } else if (isSelected && !isLocked) {
        badgeHtml = `<div class="card-badge-selected">กำลังเลือก</div>`;
      }

      return `
        <div class="${cardClasses}" onclick="handleCardClick('${z.key}')">
          ${badgeHtml}
          <div class="card-top-info">
            <div class="card-zodiac-icon">
              <img src="${iconPath}" alt="${z.th}" onerror="this.src='/white/aquarius.png'">
            </div>
            <div>
              <div class="card-zodiac-title">ราศี${escapeHtml(z.th)}</div>
              <div class="card-zodiac-en">${escapeHtml(z.en)}</div>
              <div class="card-date-badge">${escapeHtml(z.date)}</div>
            </div>
          </div>
          ${playersHtml}
        </div>
      `;
    }).join('');
  }

  window.handleCardClick = function(zodiacKey) {
    if (voteState.isPageOpen === false) {
      showToast('ระบบโหวตถูกปิดการเข้าถึงอยู่ในขณะนี้');
      return;
    }
    if (myVotedZodiacKey) {
      showToast('คุณได้ลงคะแนนโหวตไปแล้วในรอบนี้ ไม่สามารถแก้ไขคำตอบได้');
      return;
    }
    if (voteState.isOpen === false) {
      showToast('ขณะนี้รอบการโหวตปิดรับคะแนนอยู่');
      return;
    }
    if (!currentUsername) {
      openUsernameModal();
      showToast('กรุณาระบุชื่อก่อนเลือกราศี');
      return;
    }

    selectedZodiacKey = zodiacKey;
    renderCards();
    showFloatingConfirmBar(zodiacKey);
  };

  function showFloatingConfirmBar(zodiacKey) {
    const bar = document.getElementById('floating-confirm-bar');
    const nameEl = document.getElementById('confirm-zodiac-name');
    if (!bar) return;

    const z = ZODIACS.find(x => x.key === zodiacKey);
    if (nameEl && z) {
      nameEl.textContent = `ราศี${z.th} (${z.en})`;
    }
    bar.classList.add('active');
  }

  function hideFloatingConfirmBar() {
    const bar = document.getElementById('floating-confirm-bar');
    if (bar) bar.classList.remove('active');
  }

  window.cancelSelection = function() {
    selectedZodiacKey = null;
    hideFloatingConfirmBar();
    renderCards();
  };

  window.submitVote = async function() {
    if (!selectedZodiacKey || !currentUsername) return;
    if (myVotedZodiacKey) {
      showToast('คุณได้ลงคะแนนโหวตไปแล้ว');
      return;
    }
    if (voteState.isOpen === false) {
      showToast('รอบโหวตปิดรับคะแนนแล้ว');
      return;
    }

    const z = ZODIACS.find(x => x.key === selectedZodiacKey);
    const zName = z ? `ราศี${z.th}` : selectedZodiacKey;

    const confirmed = confirm(`ยืนยันการโหวตให้กับ "${zName}" ใช่หรือไม่?\n\n(หลังจากกดยืนยันแล้วจะไม่สามารถแก้ไขคำตอบได้จนกว่าแอดมินจะรีเซ็ตรอบ)`);
    if (!confirmed) return;

    const btn = document.getElementById('btn-submit-vote');
    if (btn) btn.disabled = true;

    try {
      const safeKey = getSafeUserKey(currentUsername);
      const votePayload = {
        username: currentUsername,
        zodiacKey: selectedZodiacKey,
        zodiacNameTh: z ? z.th : selectedZodiacKey,
        zodiacNameEn: z ? z.en : selectedZodiacKey,
        timestamp: new Date().toISOString()
      };

      // 1. Submit directly to Firebase RTDB for cloud hosting
      if (typeof rtdb !== 'undefined') {
        await rtdb.ref(`audience_vote/votes/${safeKey}`).set(votePayload);
      }

      // 2. Also submit to local server REST API as backup
      try {
        await fetch('/api/audience-vote/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUsername,
            zodiacKey: selectedZodiacKey
          })
        });
      } catch (e) {}

      // Save choice to local storage
      const epoch = voteState.resetEpoch || 0;
      localStorage.setItem('my_audience_vote_' + epoch, selectedZodiacKey);

      myVotedZodiacKey = selectedZodiacKey;
      hideFloatingConfirmBar();
      updateUserDisplay();
      renderCards();
      showToast(`โหวตสำเร็จ! ล็อคคำตอบให้ "${zName}" เรียบร้อย`);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการลงคะแนน');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Socket.IO Listeners for local dev
  if (socket) {
    socket.on('audienceVote:init', (data) => {
      if (data) {
        voteState = data;
        syncPageAccessModal();
        checkIfUserAlreadyVoted();
        updateClosedBanner();
        renderCards();
      }
    });

    socket.on('audienceVote:pageStatus', (data) => {
      voteState.isPageOpen = data.isPageOpen;
      syncPageAccessModal();
    });

    socket.on('audienceVote:status', (data) => {
      voteState.isOpen = data.isOpen;
      updateClosedBanner();
      updateUserDisplay();
      renderCards();
    });

    socket.on('audienceVote:reset', (data) => {
      voteState.votes = [];
      voteState.resetEpoch = data.resetEpoch || Date.now();
      myVotedZodiacKey = null;
      selectedZodiacKey = null;
      hideFloatingConfirmBar();
      updateUserDisplay();
      renderCards();
      showToast('แอดมินได้รีเซ็ตรอบการโหวตแล้ว คุณสามารถเริ่มโหวตใหม่ได้');
    });

    socket.on('audienceVote:update', (data) => {
      if (data) {
        voteState = data;
        syncPageAccessModal();
        checkIfUserAlreadyVoted();
        updateClosedBanner();
        updateUserDisplay();
        renderCards();
      }
    });
  }

  // Firebase Realtime Database live listener for cloud hosting
  if (typeof rtdb !== 'undefined') {
    rtdb.ref('audience_vote').on('value', snap => {
      const val = snap.val();
      if (val) {
        const oldEpoch = voteState.resetEpoch || 0;
        applyRtdbData(val);
        if (val.resetEpoch && val.resetEpoch > oldEpoch && oldEpoch > 0) {
          myVotedZodiacKey = null;
          selectedZodiacKey = null;
          hideFloatingConfirmBar();
          updateUserDisplay();
          renderCards();
          showToast('แอดมินได้รีเซ็ตรอบการโหวตแล้ว คุณสามารถเริ่มโหวตใหม่ได้');
        }
      }
    });

    // Also listen to roster updates from RTDB if present
    rtdb.ref('roster').on('value', snap => {
      const val = snap.val();
      if (val) {
        rosterData = val;
        renderCards();
      }
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
  });
})();
