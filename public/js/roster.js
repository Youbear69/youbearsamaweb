// ==========================================================================
// 12 VTuber Roster Showcase Controller (หน้าแรกแสดงผู้ได้เล่น 12 ราศี)
// ==========================================================================

const ROSTER_ZODIACS = [
  { key: 'aquarius', th: 'ราศีกุมภ์', en: 'Aquarius', icon: 'aquarius.png' },
  { key: 'pisces', th: 'ราศีมีน', en: 'Pisces', icon: 'pisces.png' },
  { key: 'aries', th: 'ราศีเมษ', en: 'Aries', icon: 'aries.png' },
  { key: 'taurus', th: 'ราศีพฤษภ', en: 'Taurus', icon: 'taurus.png' },
  { key: 'gemini', th: 'ราศีเมถุน', en: 'Gemini', icon: 'gemini.png' },
  { key: 'cancer', th: 'ราศีกรกฎ', en: 'Cancer', icon: 'cancer.png' },
  { key: 'leo', th: 'ราศีสิงห์', en: 'Leo', icon: 'leo.png' },
  { key: 'virgo', th: 'ราศีกันย์', en: 'Virgo', icon: 'virgo.png' },
  { key: 'libra', th: 'ราศีตุลย์/ตุล', en: 'Libra', icon: 'libra.png' },
  { key: 'scorpio', th: 'ราศีพิจิก', en: 'Scorpio', icon: 'scorpio.png' },
  { key: 'sagittarius', th: 'ราศีธนู', en: 'Sagittarius', icon: 'sagittarius.png' },
  { key: 'capricorn', th: 'ราศีมังกร', en: 'Capricorn', icon: 'capricorn.png' }
];

let rosterData = {
  registered: {},
  nominated: {}
};

let currentRosterMode = localStorage.getItem('roster_view_mode') || 'registered';

// Initialize Roster & Numerical Ticker on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  loadRosterData();
  initSocketListener();
  initNumericalTicker();
});

// Load roster data from server API with local storage backup and static JSON fallback
async function loadRosterData() {
  let loaded = false;
  try {
    const res = await fetch('/api/roster');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && (Object.keys(json.data.registered || {}).length > 0 || Object.keys(json.data.nominated || {}).length > 0)) {
        rosterData = json.data;
        localStorage.setItem('cached_roster_data', JSON.stringify(rosterData));
        loaded = true;
      }
    }
  } catch (err) {
    console.warn('Could not fetch /api/roster, attempting cache/static fallback:', err);
  }

  if (!loaded) {
    const cached = localStorage.getItem('cached_roster_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && (Object.keys(parsed.registered || {}).length > 0 || Object.keys(parsed.nominated || {}).length > 0)) {
          rosterData = parsed;
          loaded = true;
        }
      } catch (e) {}
    }
  }

  // Fallback to static local file for complete offline/local support
  if (!loaded) {
    try {
      const staticRes = await fetch('/data/roster_default.json');
      if (staticRes.ok) {
        const staticJson = await staticRes.json();
        if (staticJson) {
          rosterData = staticJson;
          localStorage.setItem('cached_roster_data', JSON.stringify(rosterData));
          loaded = true;
        }
      }
    } catch (e) {
      console.warn('Could not load /data/roster_default.json:', e);
    }
  }

  // Render view with current mode
  switchRosterView(currentRosterMode);
}

// Realtime socket listener
function initSocketListener() {
  if (typeof io !== 'undefined') {
    try {
      const socket = io();
      socket.on('rosterUpdated', (newRoster) => {
        if (newRoster) {
          rosterData = newRoster;
          renderCurrentRoster();
        }
      });
    } catch (e) {
      console.warn('Socket connection for roster not established:', e);
    }
  }
}

// Switch between 'registered', 'nominated', and 'both'
function switchRosterView(mode) {
  currentRosterMode = mode;
  localStorage.setItem('roster_view_mode', mode);

  // Update Buttons
  const btnReg = document.getElementById('tab-btn-registered');
  const btnNom = document.getElementById('tab-btn-nominated');
  const btnBoth = document.getElementById('tab-btn-both');

  if (btnReg) btnReg.className = 'roster-tab-btn' + (mode === 'registered' ? ' active' : '');
  if (btnNom) btnNom.className = 'roster-tab-btn' + (mode === 'nominated' ? ' active-nominated' : '');
  if (btnBoth) btnBoth.className = 'roster-tab-btn' + (mode === 'both' ? ' active' : '');

  renderCurrentRoster();
}

function renderCurrentRoster() {
  const container = document.getElementById('roster-content-container');
  if (!container) return;

  if (currentRosterMode === 'both') {
    container.innerHTML = `
      <div class="roster-compare-wrapper">
        <!-- Column 1: Registered -->
        <div class="roster-compare-col">
          <div class="roster-header-title-wrap">
            <h2 class="roster-main-title title-registered">ลงทะเบียน (24 คน)</h2>
          </div>
          <div class="roster-grid">
            ${generateZodiacCardsHtml('registered')}
          </div>
        </div>

        <!-- Column 2: Nominated -->
        <div class="roster-compare-col">
          <div class="roster-header-title-wrap">
            <h2 class="roster-main-title title-nominated">เสนอรายชื่อ (36 คน)</h2>
          </div>
          <div class="roster-grid">
            ${generateZodiacCardsHtml('nominated')}
          </div>
        </div>
      </div>
    `;
  } else {
    const isNom = (currentRosterMode === 'nominated');
    const gridColsClass = isNom ? 'grid-4-cols' : '';

    container.innerHTML = `
      <div class="roster-grid ${gridColsClass}">
        ${generateZodiacCardsHtml(currentRosterMode)}
      </div>
    `;
  }
}

// Generate 12 Cards HTML for category with Gridwave diagonal wavefront
function generateZodiacCardsHtml(categoryKey) {
  const categoryData = (rosterData && rosterData[categoryKey]) || {};

  // Image 1: Gridwave specs (左上 → 右下へ波)
  // Formula: delay = (row + col) * 55ms
  let cols = 3;
  if (currentRosterMode === 'both') {
    cols = 2;
  } else if (categoryKey === 'nominated') {
    cols = 4;
  }

  return ROSTER_ZODIACS.map((z, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const waveDelay = (row + col) * 55; // (row + col) * 55ms diagonal wavefront

    const members = categoryData[z.key] || [];
    const countText = `${members.length} คน`;

    let membersHtml = '';
    if (members.length === 0) {
      membersHtml = `
        <div style="color: #64748b; font-size: 0.9rem; text-align: center; padding: 1rem 0;">
          ยังไม่มีรายชื่อในราศีนี้
        </div>
      `;
    } else {
      membersHtml = members.map(m => {
        const rawUrl = (m.xAccount || '').trim();
        let targetUrl = rawUrl;
        if (targetUrl && !targetUrl.startsWith('http')) {
          if (targetUrl.startsWith('@')) {
            targetUrl = `https://x.com/${targetUrl.substring(1)}`;
          } else {
            targetUrl = `https://${targetUrl}`;
          }
        }
        if (!targetUrl) targetUrl = '#';

        const handleDisplay = m.handle || (m.xAccount ? (m.xAccount.startsWith('@') ? m.xAccount : '@' + m.xAccount.replace(/https?:\/\/(x|twitter)\.com\//i, '').split('/')[0].split('?')[0]) : '');
        const avatarSrc = m.imageUrl || '/assets/images/mascot/not-speak.png';
        const displayName = escapeHtml(m.displayName || 'VTuber');

        return `
          <a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="roster-member-row" title="เปิดโปรไฟล์: ${displayName}">
            <img src="${escapeHtml(avatarSrc)}" alt="${displayName}" class="roster-member-avatar" onerror="this.onerror=null; this.src='/assets/images/mascot/not-speak.png';">
            <div class="roster-member-info">
              <span class="roster-member-name">${displayName}</span>
              ${handleDisplay ? `<span class="roster-member-handle">${escapeHtml(handleDisplay)}</span>` : ''}
            </div>
          </a>
        `;
      }).join('');
    }

    return `
      <div class="roster-card gridwave-card" data-zodiac="${z.key}" style="animation-delay: ${waveDelay}ms;">
        <div class="roster-card-header">
          <div class="roster-card-title-group">
            <img src="/assets/images/white/${z.icon}" alt="${z.th}" class="roster-card-icon" onerror="this.style.display='none';">
            <span class="roster-card-name">${z.th} <span>(${z.en})</span></span>
          </div>
          <span class="roster-card-badge">${countText}</span>
        </div>
        ${membersHtml}
      </div>
    `;
  }).join('');
}

// Cleanup gridwave animation once completed so hover effects are completely responsive
document.addEventListener('animationend', (e) => {
  if (e.animationName === 'gridWaveIn' && e.target && e.target.classList.contains('gridwave-card')) {
    e.target.style.opacity = '1';
    e.target.style.transform = 'none';
    e.target.classList.remove('gridwave-card');
  }
});

// ==========================================================================
// Numerical Ticker Countdown (วัน · ชั่วโมง · นาที · วินาที)
// Motion Guide: 等幅の桁 34px · easeOutCubic (cubic-bezier(0.33, 1, 0.68, 1))
// ==========================================================================
function initNumericalTicker() {
  const tickerEl = document.getElementById('live-ticker-countdown');
  if (!tickerEl) return;

  // Default target: 14 พฤศจิกายน 2569 เวลา 21:00 น. (UTC+7 / GMT+7)
  let targetTime = new Date('2026-11-14T21:00:00+07:00').getTime();

  // Also check if server or common settings provide liveDate
  if (typeof fbGetSettings === 'function') {
    fbGetSettings().then(s => {
      if (s && s.liveDate) {
        targetTime = new Date(s.liveDate).getTime();
      }
      if (s && s.liveDateDisplay) {
        const header = document.getElementById('live-date-label');
        if (header) header.textContent = `วันไลฟ์ : ${s.liveDateDisplay}`;
      }
    }).catch(() => {});
  }

  function updateTicker() {
    const now = Date.now();
    const diff = Math.max(0, targetTime - now);

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Days digits (support 2 or 3 digits)
    const daysStr = String(days);
    if (days >= 100) {
      const boxHundreds = document.querySelector('[data-digit-id="days-hundreds"]');
      if (boxHundreds) {
        boxHundreds.style.display = 'block';
        setTickerDigit('days-hundreds', parseInt(daysStr[0], 10));
        setTickerDigit('days-tens', parseInt(daysStr[1], 10));
        setTickerDigit('days-ones', parseInt(daysStr[2], 10));
      }
    } else {
      const boxHundreds = document.querySelector('[data-digit-id="days-hundreds"]');
      if (boxHundreds) boxHundreds.style.display = 'none';
      const paddedDays = daysStr.padStart(2, '0');
      setTickerDigit('days-tens', parseInt(paddedDays[0], 10));
      setTickerDigit('days-ones', parseInt(paddedDays[1], 10));
    }

    // Hours digits (2 digits)
    const hoursStr = String(hours).padStart(2, '0');
    setTickerDigit('hours-tens', parseInt(hoursStr[0], 10));
    setTickerDigit('hours-ones', parseInt(hoursStr[1], 10));

    // Minutes digits (2 digits)
    const minsStr = String(minutes).padStart(2, '0');
    setTickerDigit('mins-tens', parseInt(minsStr[0], 10));
    setTickerDigit('mins-ones', parseInt(minsStr[1], 10));

    // Seconds digits (2 digits)
    const secsStr = String(seconds).padStart(2, '0');
    setTickerDigit('secs-tens', parseInt(secsStr[0], 10));
    setTickerDigit('secs-ones', parseInt(secsStr[1], 10));
  }

  function setTickerDigit(id, val) {
    const box = document.querySelector(`[data-digit-id="${id}"]`);
    if (!box) return;
    const track = box.querySelector('.ticker-track');
    if (!track) return;
    const digit = isNaN(val) ? 0 : Math.max(0, Math.min(9, val));
    track.style.transform = `translateY(-${digit * 10}%)`;
  }

  updateTicker();
  setInterval(updateTicker, 1000);
}

// Utility HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
