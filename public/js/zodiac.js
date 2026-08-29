async function initZodiacPage() {
  // Extract sign from pathname or query param
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let signKey = '';
  if (pathParts.length >= 2 && pathParts[0] === 'zodiac') {
    signKey = decodeURIComponent(pathParts[1]);
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    signKey = urlParams.get('sign') || 'pisces';
  }

  const iconBox = document.getElementById('zodiac-icon-box');
  const titleText = document.getElementById('zodiac-title-text');
  const dateText = document.getElementById('zodiac-date-text');
  const grid = document.getElementById('participants-grid');

  if (!grid || !titleText) return;

  // Show placeholder skeletons
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="participant-card skeleton" style="height: 380px;"></div>
  `).join('');

  try {
    const result = await fbGetZodiacDetail(signKey);

    if (!result || !result.zodiac) {
      titleText.textContent = 'ไม่พบข้อมูลราศี';
      grid.innerHTML = `
        <div class="empty-state">
          <h3>ไม่พบข้อมูลราศีที่ระบุ</h3>
          <p>กรุณากลับไปเลือกราศีใหม่ที่หน้าโควต้ารวม</p>
        </div>
      `;
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

    if (members.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>${isProposed ? 'ยังไม่มีวีทูบเบอร์ที่เสนอชื่อ' : 'ยังไม่มีผู้ลงทะเบียนในราศีนี้'}</h3>
          <p>${isProposed ? 'ลองเสนอชื่อวีทูบเบอร์ที่คุณอยากให้มาร่วมกิจกรรมนี้!' : `คุณอาจจะเป็นคนแรกที่ได้ร่วมเป็นตัวแทนของราศี ${zodiac.th} (${zodiac.en})`}</p>
          <div style="margin-top: 2rem;">
            <a href="/12vtubergame/register" class="btn-primary">ลงทะเบียน</a>
          </div>
        </div>
      `;
    } else {
      grid.innerHTML = '';
      members.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'participant-card' + (m.isProposal ? ' proposal-card' : '');

        const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(m.xAccount) : { url: m.xAccount || '#', type: 'x' };
        const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(m) : (m.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user');
        const clickUrl = parsedSocial.url || m.xAccount || '#';

        // Build zodiac label for the line below the name
        let zodiacLabelHtml = '';
        if (isProposed) {
          // For proposed VTubers, show their individual zodiac
          const label = m.zodiacLabel || 'ไม่ทราบราศี';
          zodiacLabelHtml = `<div class="participant-meta">${escapeHtml(label)}</div>`;
        } else {
          zodiacLabelHtml = `<div class="participant-meta">ลงทะเบียนราศี ${escapeHtml(zodiac.th)} (${escapeHtml(zodiac.en)})</div>`;
        }

        card.innerHTML = `
          <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" class="participant-card-link">
            <img src="${escapeHtml(avatarUrl)}" 
                 alt="${escapeHtml(m.displayName)}" 
                 class="participant-bg-img"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || 'user')}';">
            <div class="participant-fade-overlay"></div>
            <div class="participant-content">
              <div class="participant-name" title="${escapeHtml(m.displayName)}">
                ${m.isProposal ? '⭐ ' : ''}${escapeHtml(m.displayName)}
              </div>
              ${zodiacLabelHtml}
            </div>
          </a>
        `;
        grid.appendChild(card);
      });
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initZodiacPage);
} else {
  initZodiacPage();
}
