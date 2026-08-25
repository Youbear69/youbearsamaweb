async function initAllZodiacPage() {
  initLiveCountdown('live-countdown');

  const grid = document.getElementById('zodiac-grid');
  if (!grid) return;
  
  // Show skeletons while loading
  grid.innerHTML = Array(12).fill(0).map(() => `
    <div class="zodiac-card skeleton" style="height: 90px;"></div>
  `).join('');

  try {
    const res = await fetch('/api/zodiac-stats');
    const result = await res.json();

    if (result.success && result.data) {
      grid.innerHTML = '';
      result.data.forEach(item => {
        const card = document.createElement('a');
        card.href = `/12vtubergame/zodiac/${item.key}`;
        const isUnknown = item.isUnknown || item.key === 'unknown';
        card.className = 'zodiac-card' + (isUnknown ? ' unknown-quota-card' : '');

        const iconContent = isUnknown
          ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
          : `<img src="/assets/images/white/${item.icon}" alt="${item.th} (${item.en})">`;

        const iconBoxStyle = isUnknown ? `style="background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.4);"` : '';
        const titleStyle = isUnknown ? `style="color: #fbbf24;"` : '';
        const dateStyle = isUnknown ? `style="color: #fde68a;"` : '';
        const countStyle = isUnknown ? `style="color: #fbbf24;"` : '';

        card.innerHTML = `
          <div class="zodiac-icon-box" ${iconBoxStyle}>
            ${iconContent}
          </div>
          <div class="zodiac-info">
            <div class="zodiac-name" ${titleStyle}>${item.th} (${item.en})</div>
            <div class="zodiac-date" ${dateStyle}>${item.dateRange}</div>
            <div class="zodiac-count"><span ${countStyle}>${item.count}</span> คน</div>
          </div>
        `;
        grid.appendChild(card);
      });
    } else {
      showToast('ไม่สามารถดึงข้อมูลโควต้าราศีได้', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllZodiacPage);
} else {
  initAllZodiacPage();
}
