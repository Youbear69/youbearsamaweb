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
    const res = await fetch(`/api/zodiac/${encodeURIComponent(signKey)}`);
    const result = await res.json();

    if (!result.success || !result.zodiac) {
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
    document.title = `โควต้าราศี : ${zodiac.th} (${zodiac.en}) - ศึก 12 วีทูบเบอร์`;

    // Render Header Info
    if (iconBox) iconBox.innerHTML = `<img src="/assets/images/white/${zodiac.icon}" alt="${zodiac.th}">`;
    titleText.textContent = `โควต้าราศี : ${zodiac.th} (${zodiac.en})`;
    if (dateText) dateText.textContent = zodiac.dateRange;

    // Render Members
    const members = result.members || [];
    if (members.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>ยังไม่มีผู้ลงทะเบียนในราศีนี้</h3>
          <p>คุณอาจจะเป็นคนแรกที่ได้ร่วมเป็นตัวแทนของราศี ${zodiac.th} (${zodiac.en})</p>
          <div style="margin-top: 2rem;">
            <a href="/12vtubergame/register" class="btn-primary">ลงทะเบียน</a>
          </div>
        </div>
      `;
    } else {
      grid.innerHTML = '';
      members.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'participant-card';

        // Extract X username from URL or text
        let rawX = (m.xAccount || '').trim();
        let username = rawX
          .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '')
          .replace(/^@/, '')
          .split('/')[0]
          .split('?')[0];

        // Avatar source: unavatar for X / twitter with fallback
        const xAvatarUrl = username ? `https://unavatar.io/x/${username}?fallback=https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || m.displayName)}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName)}`;

        let xLink = rawX;
        if (!xLink.startsWith('http')) {
          xLink = 'https://x.com/' + username;
        }

        card.innerHTML = `
          <a href="${escapeHtml(xLink)}" target="_blank" rel="noopener noreferrer" class="participant-card-link">
            <img src="${escapeHtml(xAvatarUrl)}" 
                 alt="${escapeHtml(m.displayName)}" 
                 class="participant-bg-img"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName)}';">
            <div class="participant-fade-overlay"></div>
            <div class="participant-content">
              <div class="participant-name" title="${escapeHtml(m.displayName)}">
                ${escapeHtml(m.displayName)}
              </div>
              <div class="participant-meta">
                ลงทะเบียนราศี ${escapeHtml(zodiac.th)} (${escapeHtml(zodiac.en)})
              </div>
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
