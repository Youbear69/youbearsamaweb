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
      if (filterBar) filterBar.style.display = 'none';
      renderStandardZodiacCards(members, grid, zodiac);
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
  }
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
    card.className = 'participant-card proposal-card';

    const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(m.xAccount) : { url: m.xAccount || '#', type: 'x' };
    const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(m) : (m.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user');
    const clickUrl = parsedSocial.url || m.xAccount || '#';
    const label = m.zodiacLabel || (m.zodiacKey === 'unknown' ? 'ไม่ทราบราศี' : (m.zodiacNameTh ? `ราศี${m.zodiacNameTh}` : 'ไม่ทราบราศี'));

    card.innerHTML = `
      <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" class="participant-card-link">
        <img src="${escapeHtml(avatarUrl)}" 
             alt="${escapeHtml(m.displayName)}" 
             class="participant-bg-img"
             loading="lazy"
             onerror="if(typeof handleAvatarError==='function'){handleAvatarError(this, '${escapeHtml(m.xAccount||'')}', '${escapeHtml(m.displayName||'')}');}else{this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || 'user')}';}">
        <div class="participant-fade-overlay"></div>
        <div class="participant-content">
          <div class="participant-name" title="${escapeHtml(m.displayName)}">
            ⭐ ${escapeHtml(m.displayName)}
          </div>
          <div class="participant-meta">${escapeHtml(label)}</div>
        </div>
      </a>
    `;
    grid.appendChild(card);
  });
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
          <div class="participant-name" title="${escapeHtml(m.displayName)}">
            ${escapeHtml(m.displayName)}
          </div>
          <div class="participant-meta">ลงทะเบียนราศี ${escapeHtml(zodiac.th)} (${escapeHtml(zodiac.en)})</div>
        </div>
      </a>
    `;
    grid.appendChild(card);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initZodiacPage);
} else {
  initZodiacPage();
}
