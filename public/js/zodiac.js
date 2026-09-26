let cachedZodiacProposedMembers = [];

async function initZodiacPage() {
  // Extract sign from pathname or query param
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let signKey = '';
  if (pathParts.length >= 2 && pathParts[0] === 'zodiac') {
    signKey = decodeURIComponent(pathParts[1]);
  } else if (pathParts.length >= 3 && pathParts[1] === 'zodiac') {
    signKey = decodeURIComponent(pathParts[2]);
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    signKey = urlParams.get('sign') || 'pisces';
  }

  const iconBox = document.getElementById('zodiac-icon-box');
  const titleText = document.getElementById('zodiac-title-text');
  const dateText = document.getElementById('zodiac-date-text');
  const grid = document.getElementById('participants-grid');
  const filterBar = document.getElementById('proposed-filter-bar');
  const filterSelect = document.getElementById('proposed-zodiac-select');
  const bottomCta = document.getElementById('zodiac-bottom-cta');
  const closedBox = document.getElementById('zodiac-closed-box');
  const closedText = document.getElementById('zodiac-closed-msg-text');

  if (!grid || !titleText) return;

  // Show placeholder skeletons
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="participant-card skeleton" style="height: 380px;"></div>
  `).join('');

  try {
    const [result, settings] = await Promise.all([
      fbGetZodiacDetail(signKey),
      fbGetSettings()
    ]);

    // Handle Registration open/closed status
    const isRegOpen = settings ? (settings.isRegistrationOpen !== false) : true;
    const closedMsg = (settings && settings.registrationClosedMessage) ? settings.registrationClosedMessage : 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย';

    if (!isRegOpen) {
      if (bottomCta) bottomCta.style.display = 'none';
      if (closedBox) {
        closedBox.style.display = 'inline-flex';
        if (closedText) closedText.textContent = closedMsg;
      }
    } else {
      if (bottomCta) bottomCta.style.display = 'block';
      if (closedBox) closedBox.style.display = 'none';
    }

    if (!result || !result.zodiac) {
      titleText.textContent = 'ไม่พบข้อมูลราศี';
      grid.innerHTML = `
        <div class="empty-state">
          <h3>ไม่พบข้อมูลราศีที่ระบุ</h3>
          <p>กรุณากลับไปเลือกราศีใหม่ที่หน้าโควต้ารวม</p>
        </div>
      `;
      if (filterBar) filterBar.style.display = 'none';
      return;
    }

    const zodiac = result.zodiac;
    const isProposed = zodiac.isProposed || zodiac.key === 'proposed';

    if (isProposed) {
      document.title = `วีทูบเบอร์ที่เสนอชื่อ - ศึก 12 วีทูบเบอร์`;
    } else {
      document.title = `โควต้าราศี : ${zodiac.th} (${zodiac.en}) - ศึก 12 วีทูบเบอร์`;
    }

    // Render Header Info
    if (iconBox) {
      if (isProposed) {
        iconBox.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#fbbf24;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>`;
      } else {
        iconBox.innerHTML = `<img src="/assets/images/white/${zodiac.icon}" alt="${zodiac.th}">`;
      }
    }

    if (isProposed) {
      titleText.textContent = `วีทูบเบอร์ที่เสนอชื่อ`;
    } else {
      titleText.textContent = `โควต้าราศี : ${zodiac.th} (${zodiac.en})`;
    }

    if (dateText) dateText.textContent = zodiac.dateRange || '';

    // Render Members
    let members = result.members || [];
    if (typeof sortThaiEnglish === 'function') {
      members.sort(sortThaiEnglish);
    }

    if (isProposed) {
      cachedZodiacProposedMembers = members;
      if (grid) grid.classList.add('proposed-cards-mode');

      // Fetch initial likes & start real-time listener
      if (typeof fbGetProposalLikes === 'function') {
        try {
          cachedZodiacProposalLikes = await fbGetProposalLikes() || {};
        } catch (e) {
          cachedZodiacProposalLikes = {};
        }
      }
      if (typeof fbListenProposalLikes === 'function' && !zodiacLikesUnsubscribe) {
        zodiacLikesUnsubscribe = fbListenProposalLikes((likesMap) => {
          cachedZodiacProposalLikes = likesMap || {};
          updateAllZodiacCardLikes(cachedZodiacProposalLikes);
        });
      }

      if (filterBar && filterSelect) {
        filterBar.style.display = 'flex';
        // Populate dropdown
        const countByZodiac = { unknown: 0 };
        ZODIAC_LIST.forEach(z => { countByZodiac[z.key] = 0; });
        members.forEach(m => {
          const k = m.zodiacKey || 'unknown';
          countByZodiac[k] = (countByZodiac[k] || 0) + 1;
        });

        let opts = `<option value="">ทุกราศี (ทั้งหมด) (${members.length} คน)</option>`;
        opts += `<option value="unknown">ไม่ทราบราศี (Unknown) (${countByZodiac.unknown || 0} คน)</option>`;
        ZODIAC_LIST.forEach(z => {
          opts += `<option value="${z.key}">ราศี${z.th} (${z.en}) (${countByZodiac[z.key] || 0} คน)</option>`;
        });
        filterSelect.innerHTML = opts;
        filterSelect.value = '';

        filterSelect.onchange = () => {
          renderZodiacProposedFiltered(filterSelect.value, grid);
        };
      }
      renderZodiacProposedCards(members, grid);
    } else {
      if (grid) grid.classList.remove('proposed-cards-mode');
      if (filterBar) filterBar.style.display = 'none';
      renderStandardZodiacCards(members, grid, zodiac);
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
  }
}

let cachedZodiacProposalLikes = {};
let zodiacLikesUnsubscribe = null;

function formatZodiacLikeCount(val) {
  const num = Math.max(0, parseInt(val, 10) || 0);
  return num < 10 ? '0' + num : String(num);
}

function getZodiacLikedProposals() {
  try {
    const raw = localStorage.getItem('vtuber_liked_proposals');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function markZodiacProposalLiked(id) {
  try {
    const list = getZodiacLikedProposals();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('vtuber_liked_proposals', JSON.stringify(list));
    }
  } catch (e) {}
}

function isZodiacProposalLiked(id) {
  return getZodiacLikedProposals().includes(id);
}

function createZodiacFloatingHeart(btn) {
  try {
    const rect = btn.getBoundingClientRect();
    const heart = document.createElement('div');
    heart.className = 'floating-heart-burst';
    heart.textContent = '❤️';
    const randomOffset = (Math.random() - 0.5) * 24;
    heart.style.left = `${rect.left + rect.width / 2 + randomOffset}px`;
    heart.style.top = `${rect.top}px`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 950);
  } catch (e) {}
}

async function handleZodiacProposalLikeClick(event, proposalId) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (!proposalId) return;

  const btn = event.currentTarget || event.target.closest('.proposed-hcard-heart');
  if (btn) {
    btn.classList.add('heart-pop');
    setTimeout(() => btn.classList.remove('heart-pop'), 400);
    createZodiacFloatingHeart(btn);
  }

  const currentCount = cachedZodiacProposalLikes[proposalId] || 0;
  const newCount = currentCount + 1;
  cachedZodiacProposalLikes[proposalId] = newCount;
  markZodiacProposalLiked(proposalId);

  if (btn) {
    btn.classList.add('is-liked');
    const svg = btn.querySelector('.heart-icon-svg');
    if (svg) svg.setAttribute('fill', '#ff477e');
    const countSpan = btn.querySelector('.heart-count-text');
    if (countSpan) countSpan.textContent = `: ${formatZodiacLikeCount(newCount)}`;
  }

  if (typeof fbLikeProposal === 'function') {
    try {
      const res = await fbLikeProposal(proposalId);
      if (res && typeof res.count === 'number') {
        cachedZodiacProposalLikes[proposalId] = res.count;
        if (btn) {
          const countSpan = btn.querySelector('.heart-count-text');
          if (countSpan) countSpan.textContent = `: ${formatZodiacLikeCount(res.count)}`;
        }
      }
    } catch (err) {
      console.warn('Like submission error:', err);
    }
  }
}

function updateAllZodiacCardLikes(likesMap) {
  if (!likesMap) return;
  const cards = document.querySelectorAll('.proposed-hcard');
  cards.forEach(card => {
    const id = card.getAttribute('data-id');
    if (id && likesMap[id] !== undefined) {
      const count = likesMap[id];
      const countSpan = card.querySelector('.heart-count-text');
      if (countSpan) {
        countSpan.textContent = `: ${formatZodiacLikeCount(count)}`;
      }
    }
  });
}

function renderZodiacProposedFiltered(filterKey, grid) {
  let filtered = cachedZodiacProposedMembers;
  if (filterKey) {
    if (filterKey === 'unknown') {
      filtered = cachedZodiacProposedMembers.filter(m => m.zodiacKey === 'unknown' || !m.zodiacKey);
    } else {
      filtered = cachedZodiacProposedMembers.filter(m => m.zodiacKey === filterKey);
    }
  }
  renderZodiacProposedCards(filtered, grid, filterKey);
}

function renderZodiacProposedCards(members, grid, filterKey = '') {
  if (members.length === 0) {
    let emptyMsg = 'ยังไม่มีวีทูบเบอร์ที่เสนอชื่อ';
    if (filterKey) {
      const zMeta = ZODIAC_LIST.find(z => z.key === filterKey);
      emptyMsg = filterKey === 'unknown' 
        ? 'ไม่พบวีทูบเบอร์ที่เสนอชื่อในหมวด "ไม่ทราบราศี"' 
        : `ไม่พบวีทูบเบอร์ที่เสนอชื่อในราศี${zMeta ? zMeta.th : filterKey}`;
    }
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>${emptyMsg}</h3>
        <p>ลองเสนอชื่อวีทูบเบอร์ที่คุณอยากให้มาร่วมกิจกรรมนี้!</p>
        <div style="margin-top: 2rem;">
          <a href="/12vtubergame" class="btn-propose" style="margin: 0 auto; display: inline-flex;">เสนอวีทูบเบอร์</a>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  members.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'proposed-hcard';
    card.setAttribute('data-id', m.id);

    const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(m.xAccount) : { url: m.xAccount || '#', type: 'x' };
    const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(m) : (m.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user');
    const clickUrl = parsedSocial.url || m.xAccount || '#';

    let zodiacDisplay = 'ไม่ทราบราศี';
    if (m.zodiacKey && m.zodiacKey !== 'unknown') {
      const zMeta = ZODIAC_LIST.find(z => z.key === m.zodiacKey);
      if (zMeta) {
        zodiacDisplay = `ราศี${zMeta.th}`;
      } else if (m.zodiacNameTh) {
        zodiacDisplay = m.zodiacNameTh.startsWith('ราศี') ? m.zodiacNameTh : `ราศี${m.zodiacNameTh}`;
      }
    }

    const count = cachedZodiacProposalLikes[m.id] || 0;
    const isLiked = isZodiacProposalLiked(m.id);

    card.innerHTML = `
      <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" class="proposed-hcard-avatar-wrap" title="ดูโปรไฟล์ ${escapeHtml(m.displayName)}">
        <img src="${escapeHtml(avatarUrl)}" 
             alt="${escapeHtml(m.displayName)}" 
             class="proposed-hcard-avatar"
             loading="lazy"
             onerror="if(typeof handleAvatarError==='function'){handleAvatarError(this, '${escapeHtml(m.xAccount||'')}', '${escapeHtml(m.displayName||'')}');}else{this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || 'user')}';}">
      </a>
      <div class="proposed-hcard-info">
        <div class="proposed-hcard-name-wrap">
          <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" class="proposed-hcard-name" title="${escapeHtml(m.displayName)}">
            ${escapeHtml(m.displayName)}
          </a>
        </div>
        <div class="proposed-hcard-zodiac">${escapeHtml(zodiacDisplay)}</div>
      </div>
      <button type="button" class="proposed-hcard-heart ${isLiked ? 'is-liked' : ''}" 
              onclick="handleZodiacProposalLikeClick(event, '${escapeHtml(m.id)}')" 
              title="ส่งหัวใจให้ ${escapeHtml(m.displayName)}"
              aria-label="ส่งหัวใจให้ ${escapeHtml(m.displayName)}">
        <svg class="heart-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="${isLiked ? '#ff477e' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span class="heart-count-text">: ${formatZodiacLikeCount(count)}</span>
      </button>
    `;
    grid.appendChild(card);
  });

  initZodiacNameMarquees(grid);
}

let zodiacResizeObserver = null;

function initZodiacNameMarquees(container) {
  if (!container) return;

  const updateMarquees = () => {
    const cards = container.querySelectorAll('.proposed-hcard, .participant-card');
    cards.forEach(card => {
      const wrap = card.querySelector('.proposed-hcard-name-wrap, .participant-name-wrap');
      const nameEl = card.querySelector('.proposed-hcard-name, .participant-name');
      if (!wrap || !nameEl) return;

      nameEl.classList.remove('is-overflowing');
      wrap.classList.remove('has-overflow');
      nameEl.style.removeProperty('--marquee-dist');
      nameEl.style.removeProperty('--marquee-duration');

      const wrapWidth = wrap.clientWidth;
      const textWidth = nameEl.scrollWidth;
      const diff = textWidth - wrapWidth;

      if (diff > 4) {
        const dist = Math.ceil(diff + 10);
        const duration = Math.max(6.5, 4.2 + (dist / 20));
        nameEl.style.setProperty('--marquee-dist', `${dist}px`);
        nameEl.style.setProperty('--marquee-duration', `${duration.toFixed(2)}s`);
        nameEl.classList.add('is-overflowing');
        wrap.classList.add('has-overflow');
      }
    });
  };

  requestAnimationFrame(updateMarquees);
  setTimeout(updateMarquees, 120);
  setTimeout(updateMarquees, 350);

  if (typeof ResizeObserver !== 'undefined') {
    if (zodiacResizeObserver) {
      zodiacResizeObserver.disconnect();
    }
    zodiacResizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateMarquees);
    });
    zodiacResizeObserver.observe(container);
  }
}


function renderStandardZodiacCards(members, grid, zodiac) {
  if (members.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>ยังไม่มีผู้ลงทะเบียนในราศีนี้</h3>
        <p>คุณอาจจะเป็นคนแรกที่ได้ร่วมเป็นตัวแทนของราศี ${zodiac.th} (${zodiac.en})</p>
        <div style="margin-top: 2rem;">
          <a href="/12vtubergame/register" class="btn-primary">ลงทะเบียน</a>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  members.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'participant-card';

    const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(m.xAccount) : { url: m.xAccount || '#', type: 'x' };
    const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(m) : (m.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user');
    const clickUrl = parsedSocial.url || m.xAccount || '#';

    card.innerHTML = `
      <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" class="participant-card-link">
        <img src="${escapeHtml(avatarUrl)}" 
             alt="${escapeHtml(m.displayName)}" 
             class="participant-bg-img"
             loading="lazy"
             onerror="if(typeof handleAvatarError==='function'){handleAvatarError(this, '${escapeHtml(m.xAccount||'')}', '${escapeHtml(m.displayName||'')}');}else{this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || 'user')}';}">
        <div class="participant-fade-overlay"></div>
        <div class="participant-content">
          <div class="participant-name-wrap">
            <div class="participant-name" title="${escapeHtml(m.displayName)}">
              ${escapeHtml(m.displayName)}
            </div>
          </div>
          <div class="participant-meta">ลงทะเบียนราศี ${escapeHtml(zodiac.th)} (${escapeHtml(zodiac.en)})</div>
        </div>
      </a>
    `;
    grid.appendChild(card);
  });

  // Initialize marquee for long overflowing names in registration cards
  initZodiacNameMarquees(grid);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initZodiacPage);
} else {
  initZodiacPage();
}
