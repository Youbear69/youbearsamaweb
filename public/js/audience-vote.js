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
      input.focus();
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

    if (myVotedZodiacKey) {
      const zMeta = ZODIACS.find(z => z.key === myVotedZodiacKey);
      const zName = zMeta ? zMeta.th : myVotedZodiacKey;
      if (badgeEl) {
        badgeEl.className = 'voter-status-badge status-voted';
        badgeEl.textContent = `โหวตแล้ว: ราศี${zName}`;
      }
    } else {
      if (badgeEl) {
        badgeEl.className = 'voter-status-badge status-unvoted';
        badgeEl.textContent = 'ยังไม่ได้โหวต';
      }
    }
  }

  // Load Roster & Audience Vote State
  async function loadInitialData() {
    try {
      // 1. Fetch roster players
      const rosterRes = await fetch('/api/roster');
      if (rosterRes.ok) {
        const json = await rosterRes.json();
        rosterData = json.data;
      }

      // 2. Fetch audience vote state
      const voteRes = await fetch('/api/audience-vote/state');
      if (voteRes.ok) {
        const json = await voteRes.json();
        if (json.data) {
          voteState = json.data;
        }
      }

      syncPageAccessModal();
      checkIfUserAlreadyVoted();
      updateClosedBanner();
      updateUserDisplay();
      renderCards();

      // If no username and page is open, prompt modal
      if (!currentUsername && voteState.isPageOpen !== false) {
        openUsernameModal();
      }
    } catch (err) {
      console.error('Error loading initial vote data:', err);
      renderCards();
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

    const votes = voteState.votes || [];
    const found = votes.find(v => v.username.toLowerCase() === currentUsername.toLowerCase());
    if (found) {
      myVotedZodiacKey = found.zodiacKey;
      selectedZodiacKey = found.zodiacKey;
      hideFloatingConfirmBar();
    } else {
      myVotedZodiacKey = null;
    }
    updateUserDisplay();
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
        playersHtml = `<div class="no-players-placeholder">ตัวแทนราศี ${z.th}</div>`;
      } else {
        playersHtml = players.map(p => {
          const avatar = p.imageUrl || '/assets/images/mascot/not-speak.png';
          const handle = p.handle || (p.xAccount ? (p.xAccount.startsWith('@') ? p.xAccount : '@' + p.xAccount.replace(/https?:\/\/(x|twitter)\.com\//i, '').split('/')[0]) : '');
          return `
            <div class="player-mini-row">
              <img src="${escapeHtml(avatar)}" onerror="this.onerror=null; this.src='/assets/images/mascot/not-speak.png';" class="player-avatar-thumb" alt="${escapeHtml(p.displayName || 'VTuber')}">
              <div class="player-text-info">
                <span class="player-display-name">${escapeHtml(p.displayName || 'VTuber')}</span>
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
              <img src="/white/${z.icon}" class="zodiac-icon-img" alt="${z.th}">
              <div class="zodiac-names-wrap">
                <span class="zodiac-th-name">ราศี${z.th}</span>
                <span class="zodiac-en-name">${z.en}</span>
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
      const res = await fetch('/api/audience-vote/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          zodiacKey: selectedZodiacKey
        })
      });

      const json = await res.json();
      if (json.success) {
        myVotedZodiacKey = selectedZodiacKey;
        hideFloatingConfirmBar();
        updateUserDisplay();
        renderCards();
        showToast(`โหวตสำเร็จ! ล็อคคำตอบให้ "${zName}" เรียบร้อย`);
      } else {
        showToast(json.message || 'ไม่สามารถลงคะแนนได้');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
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

  // Socket.IO Listeners
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

  // Init
  document.addEventListener('DOMContentLoaded', loadInitialData);
})();
