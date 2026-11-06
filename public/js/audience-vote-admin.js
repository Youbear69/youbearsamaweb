// Audience Vote Admin Script
(function() {
  const socket = (typeof io === 'function') ? io() : null;
  let adminVoteState = { isPageOpen: true, isOpen: true, totalVotes: 0, zodiacStats: [], votes: [] };

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

  async function loadAdminVoteState() {
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
      console.error('Failed to load admin vote state:', err);
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
      countEl.textContent = adminVoteState.totalVotes || 0;
    }

    if (btnTogglePage) {
      btnTogglePage.className = `btn-action-admin ${isPageOpen ? 'btn-danger-outline' : 'btn-success-outline'}`;
      btnTogglePage.textContent = isPageOpen ? 'ปิดการเข้าถึงหน้าเว็บ' : 'เปิดให้เข้าสู่หน้าเว็บ';
    }

    if (btnToggleVote) {
      btnToggleVote.className = `btn-action-admin ${isRoundOpen ? 'btn-danger-outline' : 'btn-success-outline'}`;
      btnToggleVote.textContent = isRoundOpen ? 'ปิดรับคะแนนรอบนี้' : 'เปิดรับคะแนนรอบนี้';
    }
  }

  function renderTallyGrid() {
    const grid = document.getElementById('admin-tally-grid');
    if (!grid) return;

    const stats = adminVoteState.zodiacStats || [];

    grid.innerHTML = stats.map(s => {
      const hasVotes = s.count > 0;
      return `
        <div class="tally-card ${hasVotes ? 'has-votes' : ''}">
          <div class="tally-card-header">
            <div class="tally-zodiac-title">
              <img src="/white/${s.icon}" onerror="this.onerror=null; this.src='/assets/images/white/${s.icon}';" class="tally-zodiac-icon" alt="${s.th}">
              <div>
                <strong style="color: #fff; font-size: 1.05rem;">${s.th}</strong>
                <span style="color: #a78bfa; font-size: 0.8rem; margin-left: 4px;">(${s.en})</span>
              </div>
            </div>
            <div class="tally-percentage-big">${s.percentage}%</div>
          </div>

          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${s.percentage}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; color: #cbd5e1; margin-top: 2px;">
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
             (v.zodiacNameTh && v.zodiacNameTh.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2.2rem 1rem;">
            ${votes.length === 0 ? 'ยังไม่มีข้อมูลการโหวตในรอบนี้' : 'ไม่พบรายชื่อที่ค้นหา'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((v, idx) => {
      let timeStr = '-';
      if (v.timestamp) {
        const d = new Date(v.timestamp);
        const pad = n => String(n).padStart(2, '0');
        timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }

      return `
        <tr>
          <td style="color: var(--text-muted);">${idx + 1}</td>
          <td style="color: #94a3b8; font-size: 0.88rem;">${timeStr}</td>
          <td style="font-weight: 700; color: #ffffff;">${escapeHtml(v.username)}</td>
          <td>
            <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.4); color: #d8b4fe; font-size: 0.85rem; font-weight: 600;">
              ราศี${escapeHtml(v.zodiacNameTh || v.zodiacKey)}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  function setupStreamDeckUrls() {
    const origin = window.location.origin;
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
      const res = await fetch('/api/audience-vote/admin/toggle-page', { method: 'POST' });
      const json = await res.json();
      if (json && json.success) {
        adminVoteState.isPageOpen = json.isPageOpen;
        renderStatusAndStats();
        showToast(json.message || 'เปลี่ยนสถานะหน้าเว็บเรียบร้อย');
      }
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
      const res = await fetch('/api/audience-vote/admin/toggle', { method: 'POST' });
      const json = await res.json();
      if (json && json.success) {
        adminVoteState.isOpen = json.isOpen;
        renderStatusAndStats();
        showToast(json.message || 'เปลี่ยนสถานะรอบโหวตเรียบร้อย');
      }
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
      const res = await fetch('/api/audience-vote/admin/reset', { method: 'POST' });
      const json = await res.json();
      if (json && json.success) {
        adminVoteState.votes = [];
        adminVoteState.totalVotes = 0;
        (adminVoteState.zodiacStats || []).forEach(s => { s.count = 0; s.percentage = 0; });
        renderAll();
        showToast('รีเซ็ตข้อมูลการโหวตทั้งหมดเรียบร้อยแล้ว');
      }
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

  // Socket.IO
  if (socket) {
    socket.on('audienceVote:update', (data) => {
      if (data) {
        adminVoteState = data;
        renderAll();
      }
    });

    socket.on('audienceVote:pageStatus', (data) => {
      if (data) {
        adminVoteState.isPageOpen = data.isPageOpen;
        renderStatusAndStats();
      }
    });

    socket.on('audienceVote:status', (data) => {
      if (data) {
        adminVoteState.isOpen = data.isOpen;
        renderStatusAndStats();
      }
    });

    socket.on('audienceVote:reset', () => {
      adminVoteState.votes = [];
      adminVoteState.totalVotes = 0;
      (adminVoteState.zodiacStats || []).forEach(s => { s.count = 0; s.percentage = 0; });
      renderAll();
      showToast('รีเซ็ตการโหวตแล้ว');
    });
  }

  document.addEventListener('DOMContentLoaded', loadAdminVoteState);
})();
