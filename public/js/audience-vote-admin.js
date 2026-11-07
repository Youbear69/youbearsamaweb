// Audience Vote Admin Script
(function() {
  const socket = (typeof io === 'function') ? io() : null;
  let adminVoteState = { isPageOpen: true, isOpen: true, totalVotes: 0, zodiacStats: [], votes: [] };

  const ZODIAC_METADATA_FALLBACK = [
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
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function applyRtdbData(val) {
    if (!val) return;
    const isPageOpen = val.isPageOpen !== undefined ? val.isPageOpen : true;
    const isOpen = val.isOpen !== undefined ? val.isOpen : true;
    const votesObj = val.votes || {};
    const votesArr = Array.isArray(votesObj) ? votesObj : Object.values(votesObj);
    const totalVotes = votesArr.length;

    const counts = {};
    const metaList = (typeof ZODIAC_METADATA !== 'undefined') ? ZODIAC_METADATA : ZODIAC_METADATA_FALLBACK;
    metaList.forEach(z => { counts[z.key] = 0; });
    votesArr.forEach(v => {
      if (v && v.zodiacKey && counts[v.zodiacKey] !== undefined) {
        counts[v.zodiacKey]++;
      }
    });

    const zodiacStats = metaList.map(z => {
      const cnt = counts[z.key] || 0;
      return {
        key: z.key,
        th: z.th,
        en: z.en,
        icon: z.icon || (z.key + '.png'),
        count: cnt,
        percentage: totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0
      };
    });

    adminVoteState = {
      isPageOpen: isPageOpen,
      isOpen: isOpen,
      resetEpoch: val.resetEpoch || 0,
      totalVotes: totalVotes,
      zodiacStats: zodiacStats,
      votes: votesArr
    };
    renderAll();
  }

  async function loadAdminVoteState() {
    // 1. Try Firebase RTDB first
    if (typeof rtdb !== 'undefined') {
      try {
        const snap = await rtdb.ref('audience_vote').once('value');
        const val = snap.val();
        if (val) {
          applyRtdbData(val);
          return;
        }
      } catch (e) {
        console.warn('RTDB read failed, trying REST API:', e);
      }
    }

    // 2. Fallback to local server REST API
    try {
      const res = await fetch('/api/audience-vote/state');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          adminVoteState = json.data;
          renderAll();
        }
      }
    } catch (err) {
      console.warn('Failed to load admin vote state from REST:', err);
    }
  }
  window.loadAdminVoteState = loadAdminVoteState;

  function renderAll() {
    renderStatusAndStats();
    renderTallyGrid();
    renderVotersTable();
    setupStreamDeckUrls();
  }

  function renderStatusAndStats() {
    const pageInd = document.getElementById('page-status-indicator');
    const voteInd = document.getElementById('vote-status-indicator');
    const countEl = document.getElementById('total-voters-count');
    const btnTogglePage = document.getElementById('btn-toggle-page');
    const btnToggleVote = document.getElementById('btn-toggle-vote');

    const isPageOpen = adminVoteState.isPageOpen !== false;
    const isRoundOpen = adminVoteState.isOpen === true;

    if (pageInd) {
      if (isPageOpen) {
        pageInd.className = 'status-pill-indicator pill-open';
        pageInd.innerHTML = '<span class="status-dot dot-green"></span><span>หน้าเว็บโหวต: เปิดให้เข้าได้</span>';
      } else {
        pageInd.className = 'status-pill-indicator pill-closed';
        pageInd.innerHTML = '<span class="status-dot dot-red"></span><span>หน้าเว็บโหวต: ปิดและซ่อนปุ่ม</span>';
      }
    }

    if (voteInd) {
      if (isRoundOpen) {
        voteInd.className = 'status-pill-indicator pill-open';
        voteInd.innerHTML = '<span class="status-dot dot-green"></span><span>รอบการโหวต: เปิดรับคะแนน</span>';
      } else {
        voteInd.className = 'status-pill-indicator pill-closed';
        voteInd.innerHTML = '<span class="status-dot dot-red"></span><span>รอบการโหวต: ปิดรับคะแนนชั่วคราว</span>';
      }
    }

    if (countEl) {
      countEl.textContent = (adminVoteState.totalVotes || 0).toLocaleString();
    }

    if (btnTogglePage) {
      btnTogglePage.className = `btn-action-admin ${isPageOpen ? 'btn-danger-outline' : 'btn-cyan-outline'}`;
      btnTogglePage.textContent = isPageOpen ? 'กดปิดหน้าเว็บโหวต' : 'กดเปิดหน้าเว็บโหวต';
    }

    if (btnToggleVote) {
      btnToggleVote.className = `btn-action-admin ${isRoundOpen ? 'btn-danger-outline' : 'btn-cyan-outline'}`;
      btnToggleVote.textContent = isRoundOpen ? 'กดปิดรับโหวตรอบนี้' : 'กดเปิดรับโหวตรอบนี้';
    }
  }

  function renderTallyGrid() {
    const grid = document.getElementById('admin-tally-grid');
    if (!grid) return;

    const stats = adminVoteState.zodiacStats || [];
    if (stats.length === 0) {
      grid.innerHTML = '<div style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 2rem;">กำลังโหลดข้อมูล...</div>';
      return;
    }

    grid.innerHTML = stats.map(s => {
      const hasVotes = s.count > 0;
      const iconPath = `/white/${s.icon || (s.key + '.png')}`;
      return `
        <div class="tally-card ${hasVotes ? 'has-votes' : ''}">
          <div class="tally-card-header">
            <div class="tally-zodiac-title">
              <img src="${iconPath}" onerror="this.onerror=null; this.src='/white/aquarius.png';" class="tally-zodiac-icon" alt="${escapeHtml(s.th)}">
              <div>
                <strong style="color: #fff; font-size: 1.05rem;">ราศี${escapeHtml(s.th)}</strong>
                <span style="color: #a78bfa; font-size: 0.8rem; margin-left: 4px;">(${escapeHtml(s.en)})</span>
              </div>
            </div>
            <div class="tally-percentage-big">${s.percentage}%</div>
          </div>

          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${s.percentage}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; color: #cbd5e1; margin-top: 4px;">
            <span>คะแนนโหวต:</span>
            <strong style="color: ${hasVotes ? '#38bdf8' : '#94a3b8'}; font-size: 0.95rem;">${s.count} คน</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  window.renderVotersTable = function() {
    const tbody = document.getElementById('voters-table-body');
    const searchInput = document.getElementById('voters-search');
    if (!tbody) return;

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const votes = [...(adminVoteState.votes || [])].reverse(); // newest first

    const filtered = votes.filter(v => {
      if (!query) return true;
      return (v.username && v.username.toLowerCase().includes(query)) ||
             (v.zodiacNameTh && v.zodiacNameTh.toLowerCase().includes(query)) ||
             (v.zodiacKey && v.zodiacKey.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ${query ? 'ไม่พบชื่อที่ค้นหา' : 'ยังไม่มีผู้ลงคะแนนโหวตในรอบนี้'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((v, idx) => {
      let timeStr = '-';
      if (v.timestamp) {
        try {
          const d = new Date(v.timestamp);
          timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch(e) {}
      }
      return `
        <tr>
          <td style="color: var(--text-muted);">${filtered.length - idx}</td>
          <td style="color: var(--text-muted); font-size: 0.9rem;">${timeStr}</td>
          <td>
            <strong style="color: #ffffff; font-size: 0.98rem;">${escapeHtml(v.username || 'ผู้ชม')}</strong>
          </td>
          <td>
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 9999px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc; font-weight: 600; font-size: 0.88rem;">
              ราศี${escapeHtml(v.zodiacNameTh || v.zodiacKey)}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  let currentSdDomain = localStorage.getItem('sd_domain_choice') || 'local';

  window.setStreamDeckDomain = function(domain) {
    currentSdDomain = domain;
    localStorage.setItem('sd_domain_choice', domain);
    const btnLocal = document.getElementById('btn-sd-domain-local');
    const btnCloud = document.getElementById('btn-sd-domain-cloud');

    if (domain === 'local') {
      if (btnLocal) {
        btnLocal.className = 'btn-secondary active';
        btnLocal.style.background = 'rgba(56, 189, 248, 0.25)';
        btnLocal.style.borderColor = '#38bdf8';
        btnLocal.style.color = '#fff';
      }
      if (btnCloud) {
        btnCloud.className = 'btn-secondary';
        btnCloud.style.background = 'transparent';
        btnCloud.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        btnCloud.style.color = '#cbd5e1';
      }
    } else {
      if (btnCloud) {
        btnCloud.className = 'btn-secondary active';
        btnCloud.style.background = 'rgba(168, 85, 247, 0.25)';
        btnCloud.style.borderColor = '#a855f7';
        btnCloud.style.color = '#fff';
      }
      if (btnLocal) {
        btnLocal.className = 'btn-secondary';
        btnLocal.style.background = 'transparent';
        btnLocal.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        btnLocal.style.color = '#cbd5e1';
      }
    }
    setupStreamDeckUrls();
  };

  function setupStreamDeckUrls() {
    const origin = (currentSdDomain === 'cloud') ? 'https://yuubearsama.online' : 'http://localhost:3000';
    const items = [
      { id: 'sd-url-page-toggle', path: '/api/audience-vote/streamdeck/page-toggle' },
      { id: 'sd-url-page-open', path: '/api/audience-vote/streamdeck/page-open' },
      { id: 'sd-url-page-close', path: '/api/audience-vote/streamdeck/page-close' },
      { id: 'sd-url-toggle', path: '/api/audience-vote/streamdeck/toggle' },
      { id: 'sd-url-open', path: '/api/audience-vote/streamdeck/open' },
      { id: 'sd-url-close', path: '/api/audience-vote/streamdeck/close' },
      { id: 'sd-url-reset', path: '/api/audience-vote/streamdeck/reset' }
    ];

    items.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) el.textContent = `${origin}${item.path}`;
    });
  }

  // Test Stream Deck action immediately from the browser
  window.testStreamDeckAction = async function(action, btn) {
    if (btn) btn.disabled = true;
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = 'กำลังสั่งการ...';
      btn.style.borderColor = '#38bdf8';
    }

    try {
      const now = Date.now();
      let successMsg = '';

      if (action === 'page-toggle') {
        const target = !(adminVoteState.isPageOpen !== false);
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/isPageOpen').set(target);
          await rtdb.ref('audience_vote/lastUpdated').set(now);
        }
        adminVoteState.isPageOpen = target;
        renderStatusAndStats();
        successMsg = target ? 'เปิดหน้าเว็บโหวตแล้ว' : 'ปิดหน้าเว็บโหวตและซ่อนปุ่มแล้ว';
      } else if (action === 'page-open') {
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/isPageOpen').set(true);
          await rtdb.ref('audience_vote/lastUpdated').set(now);
        }
        adminVoteState.isPageOpen = true;
        renderStatusAndStats();
        successMsg = 'เปิดหน้าเว็บโหวตแล้ว';
      } else if (action === 'page-close') {
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/isPageOpen').set(false);
          await rtdb.ref('audience_vote/lastUpdated').set(now);
        }
        adminVoteState.isPageOpen = false;
        renderStatusAndStats();
        successMsg = 'ปิดหน้าเว็บโหวตและซ่อนปุ่มแล้ว';
      } else if (action === 'toggle') {
        const target = !(adminVoteState.isOpen === true);
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/isOpen').set(target);
          await rtdb.ref('audience_vote/lastUpdated').set(now);
        }
        adminVoteState.isOpen = target;
        renderStatusAndStats();
        successMsg = target ? 'เปิดรับคะแนนโหวตแล้ว' : 'ปิดรับคะแนนโหวตแล้ว';
      } else if (action === 'open') {
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/isOpen').set(true);
          await rtdb.ref('audience_vote/lastUpdated').set(now);
        }
        adminVoteState.isOpen = true;
        renderStatusAndStats();
        successMsg = 'เปิดรับคะแนนโหวตแล้ว';
      } else if (action === 'close') {
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/isOpen').set(false);
          await rtdb.ref('audience_vote/lastUpdated').set(now);
        }
        adminVoteState.isOpen = false;
        renderStatusAndStats();
        successMsg = 'ปิดรับคะแนนโหวตแล้ว';
      } else if (action === 'reset') {
        const newEpoch = Date.now();
        if (typeof rtdb !== 'undefined') {
          await rtdb.ref('audience_vote/votes').remove();
          await rtdb.ref('audience_vote/resetEpoch').set(newEpoch);
          await rtdb.ref('audience_vote/lastUpdated').set(newEpoch);
        }
        adminVoteState.votes = [];
        adminVoteState.totalVotes = 0;
        adminVoteState.resetEpoch = newEpoch;
        (adminVoteState.zodiacStats || []).forEach(s => { s.count = 0; s.percentage = 0; });
        renderAll();
        successMsg = 'รีเซ็ตคะแนนโหวตเรียบร้อยแล้ว';
      }

      // Also call local server if running
      try {
        fetch(`http://localhost:3000/api/audience-vote/streamdeck/${action}`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
      } catch (e) {}

      if (btn) {
        btn.innerHTML = 'ทำงานแล้ว';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#6ee7b7';
      }
      showToast(successMsg || 'สั่งการเรียบร้อย');
    } catch (err) {
      console.error('Test action error:', err);
      showToast('เกิดข้อผิดพลาดในการสั่งการ');
    } finally {
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = origHtml;
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.disabled = false;
        }
      }, 1500);
    }
  };

  window.copyStreamDeckLink = function(elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = 'คัดลอกแล้ว';
      btn.style.borderColor = '#10b981';
      btn.style.color = '#6ee7b7';
      showToast('คัดลอกลิงก์ Stream Deck สำเร็จ');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }).catch(err => {
      showToast('ไม่สามารถคัดลอกได้');
    });
  };

  // Toggle page access open/close
  window.adminTogglePageStatus = async function() {
    const btn = document.getElementById('btn-toggle-page');
    try {
      if (btn) btn.disabled = true;
      const targetState = !(adminVoteState.isPageOpen !== false);

      if (typeof rtdb !== 'undefined') {
        await rtdb.ref('audience_vote/isPageOpen').set(targetState);
      }
      try {
        await fetch('/api/audience-vote/admin/toggle-page', { method: 'POST' });
      } catch(e) {}

      adminVoteState.isPageOpen = targetState;
      renderStatusAndStats();
      showToast(targetState ? 'เปิดการเข้าถึงหน้าเว็บโหวตแล้ว' : 'ปิดการเข้าถึงหน้าเว็บและซ่อนปุ่มแล้ว');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะหน้าเว็บ');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Toggle round open/close
  window.adminToggleVoteStatus = async function() {
    const btn = document.getElementById('btn-toggle-vote');
    try {
      if (btn) btn.disabled = true;
      const targetState = !(adminVoteState.isOpen === true);

      if (typeof rtdb !== 'undefined') {
        await rtdb.ref('audience_vote/isOpen').set(targetState);
      }
      try {
        await fetch('/api/audience-vote/admin/toggle', { method: 'POST' });
      } catch(e) {}

      adminVoteState.isOpen = targetState;
      renderStatusAndStats();
      showToast(targetState ? 'เปิดรับคะแนนโหวตแล้ว' : 'ปิดรับคะแนนโหวตแล้ว');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Reset all votes in current round
  window.adminResetVotes = async function() {
    const confirmed = confirm('คำเตือน: คุณต้องการรีเซ็ตข้อมูลการโหวตทั้งหมดของรอบนี้ใช่หรือไม่?\n\n(คะแนนจะกลับเป็น 0 และผู้ใช้จะสามารถเริ่มโหวตใหม่ได้)');
    if (!confirmed) return;

    const btn = document.getElementById('btn-reset-vote');
    try {
      if (btn) btn.disabled = true;
      const newEpoch = Date.now();

      if (typeof rtdb !== 'undefined') {
        await rtdb.ref('audience_vote/votes').remove();
        await rtdb.ref('audience_vote/resetEpoch').set(newEpoch);
      }
      try {
        await fetch('/api/audience-vote/admin/reset', { method: 'POST' });
      } catch(e) {}

      adminVoteState.votes = [];
      adminVoteState.totalVotes = 0;
      adminVoteState.resetEpoch = newEpoch;
      (adminVoteState.zodiacStats || []).forEach(s => { s.count = 0; s.percentage = 0; });
      renderAll();
      showToast('รีเซ็ตข้อมูลการโหวตทั้งหมดเรียบร้อยแล้ว');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการรีเซ็ต');
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

  // Socket.IO event bindings for local server
  if (socket) {
    socket.on('audienceVote:update', function(state) {
      if (state) {
        adminVoteState = state;
        renderAll();
      }
    });
    socket.on('audienceVote:pageStatus', function(data) {
      if (data && typeof data.isPageOpen === 'boolean') {
        adminVoteState.isPageOpen = data.isPageOpen;
        renderStatusAndStats();
      }
    });
    socket.on('audienceVote:status', function(data) {
      if (data && typeof data.isOpen === 'boolean') {
        adminVoteState.isOpen = data.isOpen;
        renderStatusAndStats();
      }
    });
    socket.on('audienceVote:reset', function(data) {
      adminVoteState.votes = [];
      adminVoteState.totalVotes = 0;
      (adminVoteState.zodiacStats || []).forEach(s => { s.count = 0; s.percentage = 0; });
      renderAll();
    });
  }

  // Firebase Realtime Database listener for cloud hosting
  if (typeof rtdb !== 'undefined') {
    rtdb.ref('audience_vote').on('value', function(snap) {
      const val = snap.val();
      if (val) applyRtdbData(val);
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    loadAdminVoteState();
  });
})();
