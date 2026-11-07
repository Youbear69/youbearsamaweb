// Audience Vote Client Script
(function() {
  const socket = (typeof io === 'function') ? io() : null;

  let currentUsername = localStorage.getItem('audience_vote_username') || '';
  let selectedZodiacKey = null;
  let myVotedZodiacKey = null;
  let rosterData = null;
  let voteState = { isPageOpen: true, isOpen: true, resetEpoch: 0, votes: [] };

  const ZODIACS = [
    { key: 'aquarius', th: 'กุมภ์', en: 'Aquarius', icon: 'aquarius.png' },
    { key: 'pisces', th: 'มีน', en: 'Pisces', icon: 'pisces.png' },
    { key: 'aries', th: 'เมษ', en: 'Aries', icon: 'aries.png' },
    { key: 'taurus', th: 'พฤษภ', en: 'Taurus', icon: 'taurus.png' },
    { key: 'gemini', th: 'เมถุน', en: 'Gemini', icon: 'gemini.png' },
    { key: 'cancer', th: 'กรกฎ', en: 'Cancer', icon: 'cancer.png' },
    { key: 'leo', th: 'สิงห์', en: 'Leo', icon: 'leo.png' },
    { key: 'virgo', th: 'กันย์', en: 'Virgo', icon: 'virgo.png' },
    { key: 'libra', th: 'ตุลย์/ตุล', en: 'Libra', icon: 'libra.png' },
    { key: 'scorpio', th: 'พิจิก', en: 'Scorpio', icon: 'scorpio.png' },
    { key: 'sagittarius', th: 'ธนู', en: 'Sagittarius', icon: 'sagittarius.png' },
    { key: 'capricorn', th: 'มังกร', en: 'Capricorn', icon: 'capricorn.png' }
  ];

  function showToast(msg) {
    const t = document.getElementById('toast');
    const m = document.getElementById('toast-msg');
    const i = document.getElementById('toast-icon');
    if (!t) return;
    if (m) m.textContent = msg;
    if (i) i.textContent = '';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function getSafeUserKey(name) {
    return String(name || 'guest').trim().toLowerCase().replace(/[\.#\$\[\]\/]/g, '_');
  }

  // Username modal handlers
  window.openUsernameModal = function() {
    if (myVotedZodiacKey) {
      showToast('คุณได้โหวตไปแล้วในรอบนี้ ไม่สามารถเปลี่ยนชื่อได้');
      return;
    }
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
    updateUserDisplay();
    closeUsernameModal();
    checkIfUserAlreadyVoted();
    renderCards();
    showToast(`ยินดีต้อนรับ คุณ ${currentUsername}`);
  };

  window.handleUserLogout = function() {
    if (!currentUsername) {
      openUsernameModal();
      return;
    }

    const msg = myVotedZodiacKey
      ? `ต้องการออกจากระบบจาก "${currentUsername}" หรือไม่? (ประวัติการโหวตในชื่อเดิมจะยังคงอยู่ และสามารถเข้าสู่ระบบด้วยชื่อใหม่ได้)`
      : `ต้องการออกจากระบบและเปลี่ยนชื่อผู้ใช้งานหรือไม่?`;

    if (!confirm(msg)) return;

    localStorage.removeItem('audience_vote_username');
    currentUsername = '';
    myVotedZodiacKey = null;
    selectedZodiacKey = null;

    hideFloatingConfirmBar();
    updateUserDisplay();
    renderCards();
    openUsernameModal();
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  function updateUserDisplay() {
    const nameEl = document.getElementById('voter-name-display');
    const badgeEl = document.getElementById('voter-status-badge');

    if (nameEl) {
      nameEl.textContent = currentUsername || 'ยังไม่ระบุชื่อ';
    }

    if (badgeEl) {
      if (myVotedZodiacKey) {
        const zMeta = ZODIACS.find(z => z.key === myVotedZodiacKey);
        badgeEl.className = 'voter-status-badge status-voted';
        badgeEl.textContent = `ล็อคคำตอบแล้ว: ราศี${zMeta ? zMeta.th : myVotedZodiacKey}`;
      } else if (voteState.isOpen === false) {
        badgeEl.className = 'voter-status-badge status-closed';
        badgeEl.textContent = 'ปิดรับโหวตชั่วคราว';
      } else if (!currentUsername) {
        badgeEl.className = 'voter-status-badge status-unvoted';
        badgeEl.textContent = 'คลิกเพื่อระบุชื่อ';
      } else {
        badgeEl.className = 'voter-status-badge status-unvoted';
        badgeEl.textContent = 'ยังไม่ได้โหวต (เลือกได้ 1 ราศี)';
      }
    }
  }

  function updateClosedBanner() {
    const banner = document.getElementById('system-closed-banner');
    if (!banner) return;
    if (voteState.isOpen === false) {
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
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
    if (!currentUsername) {
      myVotedZodiacKey = null;
      return;
    }

    // 1. Check in votes list from server/RTDB
    const votes = voteState.votes || [];
    const cleanUser = currentUsername.trim().toLowerCase();
    const found = votes.find(v => (v.username || '').trim().toLowerCase() === cleanUser);
    if (found) {
      myVotedZodiacKey = found.zodiacKey;
      selectedZodiacKey = found.zodiacKey;
      hideFloatingConfirmBar();
      updateUserDisplay();
      return;
    }

    // 2. Check localStorage for current resetEpoch
    const epoch = voteState.resetEpoch || 0;
    const localChoice = localStorage.getItem('my_audience_vote_' + epoch);
    if (localChoice) {
      myVotedZodiacKey = localChoice;
      selectedZodiacKey = localChoice;
      hideFloatingConfirmBar();
    } else {
      myVotedZodiacKey = null;
    }
    updateUserDisplay();
  }

  function applyRtdbData(val) {
    if (!val) return;
    const oldEpoch = voteState.resetEpoch || 0;
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

    // If resetEpoch increased, reset user vote state
    if (val.resetEpoch && val.resetEpoch > oldEpoch && oldEpoch > 0) {
      myVotedZodiacKey = null;
      selectedZodiacKey = null;
      hideFloatingConfirmBar();
      updateUserDisplay();
      renderCards();
      showToast('แอดมินได้รีเซ็ตการโหวตแล้ว คุณสามารถโหวตใหม่ได้');
    }
  }

  // Load Roster & Audience Vote State
  async function loadInitialData() {
    // 1. Fetch roster players (checking Firebase RTDB first, then local API, then static fallback)
    let rosterLoaded = false;
    if (typeof rtdb !== 'undefined') {
      try {
        const snap = await rtdb.ref('roster').once('value');
        const val = snap.val();
        if (val && (Object.keys(val.registered || {}).length > 0 || Object.keys(val.nominated || {}).length > 0)) {
          rosterData = val;
          rosterLoaded = true;
        }
      } catch (e) {}
    }

    if (!rosterLoaded) {
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
    }

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

    // 3. Fallback to local server REST API
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

  // Render 12 Zodiac Cards
  function renderCards() {
    const grid = document.getElementById('audience-zodiac-grid');
    if (!grid) return;

    // Use registered roster by default, fallback to nominated if empty
    const rosterReg = (rosterData && rosterData.registered) ? rosterData.registered : {};
    const rosterNom = (rosterData && rosterData.nominated) ? rosterData.nominated : {};

    grid.innerHTML = ZODIACS.map(z => {
      let players = rosterReg[z.key] || [];
      if (players.length === 0 && rosterNom[z.key]) {
        players = rosterNom[z.key];
      }

      const isSelected = (selectedZodiacKey === z.key);
      const isMyVoted = (myVotedZodiacKey === z.key);
      const isLockedOut = (myVotedZodiacKey && !isMyVoted);
      const isClosed = (voteState.isOpen === false);

      let cardClasses = 'audience-vote-card';
      if (isSelected) cardClasses += ' is-selected';
      if (isMyVoted) cardClasses += ' is-voted-target';
      if (isLockedOut || isClosed) cardClasses += ' is-disabled';

      let playersHtml = '';
      if (players.length === 0) {
        playersHtml = `<div class="no-players-placeholder">ตัวแทนราศี ${escapeHtml(z.th)}</div>`;
      } else {
        playersHtml = players.map(p => {
          const avatar = p.avatar || p.imageUrl || '/white/' + z.icon;
          const displayName = p.displayName || p.name || 'VTuber';
          const handle = p.handle || (p.xAccount ? (p.xAccount.startsWith('@') ? p.xAccount : '@' + p.xAccount.replace(/https?:\/\/(x|twitter)\.com\//i, '').split('/')[0]) : '');
          return `
            <div class="player-mini-row">
              <img src="${escapeHtml(avatar)}" onerror="this.onerror=null; this.src='/white/${z.icon}';" class="player-avatar-thumb" alt="${escapeHtml(displayName)}">
              <div class="player-text-info">
                <span class="player-display-name">${escapeHtml(displayName)}</span>
                ${handle ? `<span class="player-x-handle">${escapeHtml(handle)}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      return `
        <div class="${cardClasses}" onclick="handleCardClick('${z.key}')">
          <div class="card-top-header">
            <div class="zodiac-main-badge">
              <img src="/white/${z.icon}" class="zodiac-icon-img" alt="${escapeHtml(z.th)}">
              <div class="zodiac-names-wrap">
                <span class="zodiac-th-name">ราศี${escapeHtml(z.th)}</span>
                <span class="zodiac-en-name">${escapeHtml(z.en)}</span>
              </div>
            </div>
            <div class="select-indicator-box">
              ${isMyVoted ? '✓' : (isSelected ? '●' : '')}
            </div>
          </div>
          <div class="card-players-list">
            ${playersHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  window.handleCardClick = function(zKey) {
    if (voteState.isPageOpen === false) {
      showToast('ระบบยังไม่เปิดให้เข้าสู่หน้าโหวตในขณะนี้');
      return;
    }
    if (voteState.isOpen === false) {
      showToast('ระบบปิดรับการโหวตอยู่ในขณะนี้');
      return;
    }
    if (myVotedZodiacKey) {
      showToast('คุณได้โหวตและล็อคคำตอบแล้ว ไม่สามารถเปลี่ยนราศีได้');
      return;
    }
    if (!currentUsername) {
      openUsernameModal();
      return;
    }

    selectedZodiacKey = zKey;
    renderCards();
    showFloatingConfirmBar(zKey);
  };

  function showFloatingConfirmBar(zKey) {
    const bar = document.getElementById('floating-confirm-bar');
    const textEl = document.getElementById('confirm-zodiac-text');
    if (!bar || !textEl) return;

    const zMeta = ZODIACS.find(z => z.key === zKey);
    const zName = zMeta ? `${zMeta.th} (${zMeta.en})` : zKey;

    textEl.textContent = `คุณเลือก: ราศี${zName}`;
    bar.classList.add('show');
  }

  function hideFloatingConfirmBar() {
    const bar = document.getElementById('floating-confirm-bar');
    if (bar) bar.classList.remove('show');
  }

  window.confirmSubmitVote = async function() {
    if (!selectedZodiacKey) {
      showToast('กรุณาคลิกเลือกราศีก่อนยืนยัน');
      return;
    }
    if (!currentUsername) {
      openUsernameModal();
      return;
    }

    const zMeta = ZODIACS.find(z => z.key === selectedZodiacKey);
    const zName = zMeta ? `ราศี${zMeta.th} (${zMeta.en})` : selectedZodiacKey;

    const confirmed = confirm(`ยืนยันการลงคะแนนโหวตให้ "${zName}" ?\n\nหลังกดยืนยันแล้ว จะไม่สามารถเปลี่ยนคำตอบได้ จนกว่าแอดมินจะรีเซ็ตรอบใหม่`);
    if (!confirmed) return;

    const btn = document.getElementById('btn-submit-vote');
    if (btn) btn.disabled = true;

    try {
      const safeKey = getSafeUserKey(currentUsername);
      const votePayload = {
        username: currentUsername,
        zodiacKey: selectedZodiacKey,
        zodiacNameTh: zMeta ? zMeta.th : selectedZodiacKey,
        zodiacNameEn: zMeta ? zMeta.en : selectedZodiacKey,
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

      // Save choice to localStorage for current epoch
      const epoch = voteState.resetEpoch || 0;
      localStorage.setItem('my_audience_vote_' + epoch, selectedZodiacKey);

      myVotedZodiacKey = selectedZodiacKey;
      hideFloatingConfirmBar();
      updateUserDisplay();
      renderCards();
      showToast(`โหวตสำเร็จ! ล็อคคำตอบให้ "${zName}" เรียบร้อย`);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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

    socket.on('audienceVote:update', (data) => {
      if (data) {
        voteState = data;
        syncPageAccessModal();
        checkIfUserAlreadyVoted();
        updateClosedBanner();
        renderCards();
      }
    });

    socket.on('audienceVote:pageStatus', (data) => {
      if (data) {
        voteState.isPageOpen = data.isPageOpen;
        syncPageAccessModal();
        if (data.isPageOpen === false) {
          showToast('แอดมินได้ปิดการเข้าถึงหน้าโหวต');
        } else {
          showToast('แอดมินได้เปิดให้เข้าสู่หน้าโหวตแล้ว');
        }
      }
    });

    socket.on('audienceVote:status', (data) => {
      if (data) {
        voteState.isOpen = data.isOpen;
        updateClosedBanner();
        renderCards();
        showToast(data.isOpen ? 'ระบบเปิดรับโหวตรอบนี้แล้ว' : 'ระบบปิดรับโหวตชั่วคราว');
      }
    });

    socket.on('audienceVote:reset', () => {
      myVotedZodiacKey = null;
      selectedZodiacKey = null;
      hideFloatingConfirmBar();
      updateUserDisplay();
      renderCards();
      showToast('แอดมินได้รีเซ็ตการโหวตแล้ว คุณสามารถโหวตใหม่ได้');
    });

    socket.on('rosterUpdated', (newRoster) => {
      if (newRoster) {
        rosterData = newRoster;
        renderCards();
      }
    });
  }

  // Firebase Realtime Database listener for cloud hosting
  if (typeof rtdb !== 'undefined') {
    rtdb.ref('audience_vote').on('value', snap => {
      const val = snap.val();
      if (val) applyRtdbData(val);
    });

    rtdb.ref('roster').on('value', snap => {
      const val = snap.val();
      if (val) {
        rosterData = val;
        renderCards();
      }
    });
  }

  // Init
  document.addEventListener('DOMContentLoaded', loadInitialData);
})();
