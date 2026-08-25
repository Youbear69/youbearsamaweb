// Zodiac Metadata
const ZODIAC_LIST = [
  { key: 'aquarius', th: 'กุมภ์', en: 'Aquarius', dateRange: '20 มกราคม – 18 กุมภาพันธ์', icon: 'aquarius.png' },
  { key: 'pisces', th: 'มีน', en: 'Pisces', dateRange: '19 กุมภาพันธ์ – 20 มีนาคม', icon: 'pisces.png' },
  { key: 'aries', th: 'เมษ', en: 'Aries', dateRange: '21 มีนาคม – 19 เมษายน', icon: 'aries.png' },
  { key: 'taurus', th: 'พฤษภ', en: 'Taurus', dateRange: '20 เมษายน – 20 พฤษภาคม', icon: 'taurus.png' },
  { key: 'gemini', th: 'เมถุน', en: 'Gemini', dateRange: '21 พฤษภาคม – 20 มิถุนายน', icon: 'gemini.png' },
  { key: 'cancer', th: 'กรกฎ', en: 'Cancer', dateRange: '21 มิถุนายน – 22 กรกฎาคม', icon: 'cancer.png' },
  { key: 'leo', th: 'สิงห์', en: 'Leo', dateRange: '23 กรกฎาคม – 22 สิงหาคม', icon: 'leo.png' },
  { key: 'virgo', th: 'กันย์', en: 'Virgo', dateRange: '23 สิงหาคม – 22 กันยายน', icon: 'virgo.png' },
  { key: 'libra', th: 'ตุลย์/ตุล', en: 'Libra', dateRange: '23 กันยายน – 22 ตุลาคม', icon: 'libra.png' },
  { key: 'scorpio', th: 'พิจิก', en: 'Scorpio', dateRange: '23 ตุลาคม – 21 พฤศจิกายน', icon: 'scorpio.png' },
  { key: 'sagittarius', th: 'ธนู', en: 'Sagittarius', dateRange: '22 พฤศจิกายน – 21 ธันวาคม', icon: 'sagittarius.png' },
  { key: 'capricorn', th: 'มังกร', en: 'Capricorn', dateRange: '22 ธันวาคม – 19 มกราคม', icon: 'capricorn.png' }
];

// Show Toast Notification
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Calculate countdown to live date & close date from settings
async function initLiveCountdown() {
  const liveEl = document.getElementById('live-countdown');
  const liveLabelEl = document.getElementById('live-date-label');
  const closeEl = document.getElementById('close-countdown');
  const closeLabelEl = document.getElementById('close-date-label');

  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (!data.success || !data.data) return;

    const s = data.data;

    // Update labels if provided
    if (liveLabelEl && s.liveDateDisplay) {
      liveLabelEl.textContent = `วันไลฟ์ : ${s.liveDateDisplay}`;
    }
    if (closeLabelEl && s.closeDateDisplay) {
      closeLabelEl.textContent = `ปิดรับสมัคร : ${s.closeDateDisplay}`;
    }

    const liveTarget = s.liveDate ? new Date(s.liveDate) : new Date("2026-11-14T14:00:00.000Z");
    const closeTarget = s.closeDate ? new Date(s.closeDate) : new Date("2026-10-01T23:59:59.000Z");

    function updateTimers() {
      const now = new Date();

      // Live Timer
      if (liveEl) {
        const diffLive = liveTarget - now;
        if (diffLive <= 0) {
          liveEl.textContent = 'ไลฟ์ในอีก : 00 เดือน 00 วัน';
        } else {
          const daysTotal = Math.floor(diffLive / (1000 * 60 * 60 * 24));
          const months = Math.floor(daysTotal / 30);
          const days = daysTotal % 30;
          const pad = (n) => String(n).padStart(2, '0');
          liveEl.textContent = `ไลฟ์ในอีก : ${pad(months)} เดือน ${pad(days)} วัน`;
        }
      }

      // Close Timer
      if (closeEl) {
        const diffClose = closeTarget - now;
        if (diffClose <= 0) {
          closeEl.textContent = 'ปิดรับสมัครแล้ว';
        } else {
          const daysTotal = Math.floor(diffClose / (1000 * 60 * 60 * 24));
          const months = Math.floor(daysTotal / 30);
          const days = daysTotal % 30;
          const pad = (n) => String(n).padStart(2, '0');
          closeEl.textContent = `ปิดรับในอีก : ${pad(months)} เดือน ${pad(days)} วัน`;
        }
      }
    }

    updateTimers();
    setInterval(updateTimers, 60000);
  } catch (err) {
    console.error('Failed to load countdown settings:', err);
  }
}

// ==========================================
// Seamless Background Music (5% Volume)
// ==========================================
let globalAudio = null;

function initBGM() {
  if (!globalAudio) {
    globalAudio = new Audio('/audio/bgm.mp3');
    globalAudio.loop = true;
    globalAudio.volume = 0.05; // 5% Soft Volume

    // Restore playback position if available
    const savedTime = parseFloat(sessionStorage.getItem('bgm_time') || '0');
    if (!isNaN(savedTime) && savedTime > 0) {
      globalAudio.currentTime = savedTime;
    }

    const isMuted = localStorage.getItem('bgm_muted') === 'true';
    globalAudio.muted = isMuted;

    // Track time periodically
    globalAudio.addEventListener('timeupdate', () => {
      sessionStorage.setItem('bgm_time', String(globalAudio.currentTime));
    });

    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('bgm_time', String(globalAudio.currentTime));
      sessionStorage.setItem('bgm_playing', String(!globalAudio.paused));
    });
  }

  // Create or reuse sound toggle button
  let soundBtn = document.getElementById('bgm-toggle-btn');
  if (!soundBtn) {
    soundBtn = document.createElement('button');
    soundBtn.id = 'bgm-toggle-btn';
    soundBtn.className = 'bgm-toggle-btn';
    soundBtn.title = 'เปิด/ปิด เสียงเพลงประกอบ';
    soundBtn.setAttribute('aria-label', 'Toggle background music');
    document.body.appendChild(soundBtn);
  }

  function updateIcon() {
    if (globalAudio.muted || globalAudio.paused) {
      soundBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      `;
      soundBtn.classList.add('muted');
    } else {
      soundBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      `;
      soundBtn.classList.remove('muted');
    }
  }

  updateIcon();

  // Autoplay attempt
  if (!globalAudio.muted && globalAudio.paused) {
    globalAudio.play().then(updateIcon).catch(() => {});
  }

  // Unlock on user action
  const unlockAudio = () => {
    if (!globalAudio.muted && globalAudio.paused) {
      globalAudio.play().then(updateIcon).catch(() => {});
    }
  };

  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });

  soundBtn.onclick = (e) => {
    e.stopPropagation();
    if (globalAudio.paused) {
      globalAudio.muted = false;
      globalAudio.play().then(() => {
        localStorage.setItem('bgm_muted', 'false');
        updateIcon();
      });
    } else {
      globalAudio.muted = !globalAudio.muted;
      localStorage.setItem('bgm_muted', globalAudio.muted ? 'true' : 'false');
      if (!globalAudio.muted && globalAudio.paused) {
        globalAudio.play();
      }
      updateIcon();
    }
  };
}

// ==========================================
// Seamless Client-Side Page Transition (SPA)
// Keeps music playing continuously across pages
// ==========================================
function initSeamlessNavigation() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || link.target === '_blank') {
      return;
    }

    // Intercept internal page navigation
    e.preventDefault();
    navigateTo(href);
  });

  window.addEventListener('popstate', () => {
    loadPage(window.location.pathname + window.location.search, false);
  });
}

function navigateTo(url) {
  if (url === window.location.pathname + window.location.search) return;
  history.pushState(null, '', url);
  loadPage(url, true);
}

async function loadPage(url, push = false) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      window.location.href = url;
      return;
    }
    const htmlText = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Update document title
    document.title = doc.title;

    // Update body class (e.g. page-home)
    document.body.className = doc.body.className;

    // Swap main content
    const currentMain = document.querySelector('main');
    const newMain = doc.querySelector('main');
    if (currentMain && newMain) {
      currentMain.replaceWith(newMain);
    }

    // Swap modal if exists in new page
    const existingModal = document.getElementById('confirm-modal');
    const newModal = doc.getElementById('confirm-modal');
    if (existingModal && newModal) {
      existingModal.replaceWith(newModal);
    } else if (!existingModal && newModal) {
      document.body.appendChild(newModal);
    } else if (existingModal && !newModal) {
      existingModal.remove();
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Initialize scripts for the new page
    runPageScripts(url);

  } catch (err) {
    console.error('Seamless transition failed, falling back:', err);
    window.location.href = url;
  }
}

function runPageScripts(url) {
  const p = url.split('?')[0];

  // Countdown timer init if present
  initLiveCountdown('live-countdown');

  // Load and execute corresponding script dynamically
  if (p === '/12vtubergame' || p === '/12vtubergame/' || p === '/' || p === '/index.html') {
    // Homepage init — no extra script needed
  } else if (p === '/12vtubergame/register' || p === '/register') {
    loadScript('/js/register.js');
  } else if (p === '/12vtubergame/allzodiac' || p === '/allzodiac') {
    loadScript('/js/allzodiac.js');
  } else if (p.includes('/zodiac/') || p.includes('/zodiac')) {
    loadScript('/js/zodiac.js');
  } else if (p === '/12vtubergame/adminpanel' || p === '/adminpanel') {
    loadScript('/js/admin.js');
  }
}

function loadScript(src) {
  // Remove old instance if exists
  const oldScript = document.querySelector(`script[src="${src}"]`);
  if (oldScript) oldScript.remove();

  const script = document.createElement('script');
  script.src = src + '?t=' + Date.now();
  document.body.appendChild(script);
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initBGM();
  initSeamlessNavigation();
});
