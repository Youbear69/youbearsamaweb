/**
 * audience-vote-overlay.js
 * OBS Live Overlay for 12 VTuber Audience Voting
 * Reactive, responsive, real-time Socket.IO synchronization
 */

(function () {
  'use strict';

  const ZODIAC_MAP = {
    aquarius: { th: 'กุมภ์', en: 'Aquarius', icon: 'aquarius.png' },
    pisces: { th: 'มีน', en: 'Pisces', icon: 'pisces.png' },
    aries: { th: 'เมษ', en: 'Aries', icon: 'aries.png' },
    taurus: { th: 'พฤษภ', en: 'Taurus', icon: 'taurus.png' },
    gemini: { th: 'เมถุน', en: 'Gemini', icon: 'gemini.png' },
    cancer: { th: 'กรกฎ', en: 'Cancer', icon: 'cancer.png' },
    leo: { th: 'สิงห์', en: 'Leo', icon: 'leo.png' },
    virgo: { th: 'กันย์', en: 'Virgo', icon: 'virgo.png' },
    libra: { th: 'ตุลย์', en: 'Libra', icon: 'libra.png' },
    scorpio: { th: 'พิจิก', en: 'Scorpio', icon: 'scorpio.png' },
    sagittarius: { th: 'ธนู', en: 'Sagittarius', icon: 'sagittarius.png' },
    capricorn: { th: 'มังกร', en: 'Capricorn', icon: 'capricorn.png' }
  };

  const container = document.getElementById('overlay-items-row');
  const previewHint = document.getElementById('preview-hint');

  // Check URL query for preview mode
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get('preview') === '1';

  // Store current rendered state: key -> { count, percentage, elem }
  const currentItems = new Map();

  function animateNumber(element, start, end, suffix = '', duration = 400) {
    if (start === end) {
      element.textContent = `${end}${suffix}`;
      return;
    }
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const ease = 1 - (1 - progress) * (1 - progress);
      const val = Math.round(start + (end - start) * ease);
      element.textContent = `${val}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.textContent = `${end}${suffix}`;
      }
    }
    requestAnimationFrame(tick);
  }

  function renderStats(stats) {
    if (!container) return;

    // Filter only zodiacs that have at least 1 vote
    const activeStats = (stats || []).filter(s => s && s.count > 0);

    // If preview mode and no votes, show preview mock
    if (isPreview && activeStats.length === 0) {
      if (previewHint) previewHint.style.display = 'block';
      return;
    } else if (previewHint) {
      previewHint.style.display = 'none';
    }

    const incomingKeys = new Set(activeStats.map(s => s.key || s.zodiacId));

    // 1. Remove items that no longer have votes
    for (const [key, item] of currentItems.entries()) {
      if (!incomingKeys.has(key)) {
        if (item.elem) {
          item.elem.classList.add('fade-out');
          setTimeout(() => {
            if (item.elem && item.elem.parentNode) {
              item.elem.parentNode.removeChild(item.elem);
            }
          }, 380);
        }
        currentItems.delete(key);
      }
    }

    // 2. Add or update active zodiac items
    activeStats.forEach((stat) => {
      const key = stat.key || stat.zodiacId;
      const meta = ZODIAC_MAP[key] || { th: key, en: key, icon: `${key}.png` };
      const current = currentItems.get(key);

      if (!current) {
        // Create new item with entrance animation
        const itemElem = document.createElement('div');
        itemElem.className = 'overlay-zodiac-item';
        itemElem.id = `zodiac-item-${key}`;
        itemElem.setAttribute('data-key', key);

        itemElem.innerHTML = `
          <div class="overlay-icon-wrap">
            <img class="overlay-icon-img" src="/white/${meta.icon}" alt="${meta.th}" onerror="this.onerror=null; this.src='/assets/images/white/${meta.icon}';">
          </div>
          <div class="overlay-text-col">
            <div class="overlay-percentage-num" id="pct-${key}">${stat.percentage}%</div>
            <div class="overlay-count-subtext" id="cnt-${key}">จาก ${stat.count} คน</div>
          </div>
        `;

        container.appendChild(itemElem);

        currentItems.set(key, {
          count: stat.count,
          percentage: stat.percentage,
          elem: itemElem
        });
      } else {
        // Update existing item
        const pctElem = document.getElementById(`pct-${key}`);
        const cntElem = document.getElementById(`cnt-${key}`);

        if (pctElem && current.percentage !== stat.percentage) {
          animateNumber(pctElem, current.percentage, stat.percentage, '%', 450);
          pctElem.classList.remove('num-pulse');
          void pctElem.offsetWidth; // trigger reflow
          pctElem.classList.add('num-pulse');
        }

        if (cntElem && current.count !== stat.count) {
          cntElem.textContent = `จาก ${stat.count} คน`;
          cntElem.classList.remove('num-pulse');
          void cntElem.offsetWidth;
          cntElem.classList.add('num-pulse');
        }

        current.count = stat.count;
        current.percentage = stat.percentage;
      }
    });
  }

  function handleReset() {
    // Animate fade-out on all active items and clear
    for (const [, item] of currentItems.entries()) {
      if (item.elem) {
        item.elem.classList.add('fade-out');
      }
    }

    setTimeout(() => {
      if (container) container.innerHTML = '';
      currentItems.clear();
      if (isPreview && previewHint) {
        previewHint.style.display = 'block';
      }
    }, 400);
  }

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

  let overlayLastEpoch = 0;

  function calculateStatsFromRtdb(val) {
    if (!val) {
      handleReset();
      return;
    }
    const epoch = val.resetEpoch || 0;
    if (epoch > overlayLastEpoch && overlayLastEpoch > 0) {
      handleReset();
    }
    overlayLastEpoch = epoch;

    const votesObj = val.votes || {};
    const votesArr = Array.isArray(votesObj) ? votesObj : Object.values(votesObj);
    const totalVotes = votesArr.length;

    if (totalVotes === 0) {
      handleReset();
      return;
    }

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
        icon: z.icon,
        count: cnt,
        percentage: totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0
      };
    });

    renderStats(zodiacStats);
  }

  // Firebase Realtime Database live listener for cloud hosting
  if (typeof rtdb !== 'undefined') {
    rtdb.ref('audience_vote').on('value', snap => {
      const val = snap.val();
      calculateStatsFromRtdb(val);
    });
  }

  // Socket.IO real-time connection
  const socket = typeof io === 'function' ? io() : null;

  if (socket) {
    socket.on('audienceVote:init', (data) => {
      if (data && data.zodiacStats) {
        renderStats(data.zodiacStats);
      }
    });

    socket.on('audienceVote:update', (data) => {
      if (data && data.zodiacStats) {
        renderStats(data.zodiacStats);
      }
    });

    socket.on('audienceVote:reset', () => {
      handleReset();
    });
  }

  // Initial fetch as reliable fallback
  fetch('/api/audience-vote/state')
    .then(r => r.json())
    .then(res => {
      if (res && res.success && res.data && res.data.zodiacStats) {
        renderStats(res.data.zodiacStats);
      }
    })
    .catch(err => {
      console.warn('[Overlay] Initial state fetch error:', err);
    });

})();
