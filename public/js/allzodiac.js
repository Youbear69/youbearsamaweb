async function initAllZodiacPage() {
  initLiveCountdown('live-countdown');

  const grid = document.getElementById('zodiac-grid');
  if (!grid) return;
  
  // Show skeletons while loading
  grid.innerHTML = Array(12).fill(0).map(() => `
    <div class="zodiac-card skeleton" style="height: 90px;"></div>
  `).join('');

  try {
    const data = await fbGetZodiacStats();

    if (data) {
      grid.innerHTML = '';
      data.forEach(item => {
        const card = document.createElement('a');
        card.href = `/12vtubergame/zodiac/${item.key}`;
        const isProposed = item.isProposed || item.key === 'proposed';
        card.className = 'zodiac-card' + (isProposed ? ' proposed-quota-card' : '');

        const iconContent = isProposed
          ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
          : `<img src="/assets/images/white/${item.icon}" alt="${item.nameTh || item.th} (${item.nameEn || item.en})">`;

        const iconBoxStyle = isProposed ? `style="background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.4);"` : '';
        const titleStyle = isProposed ? `style="color: #fbbf24;"` : '';
        const dateStyle = isProposed ? `style="color: #fde68a;"` : '';
        const countStyle = isProposed ? `style="color: #fbbf24;"` : '';

        card.innerHTML = `
          <div class="zodiac-icon-box" ${iconBoxStyle}>
            ${iconContent}
          </div>
          <div class="zodiac-info">
            <div class="zodiac-name" ${titleStyle}>${item.nameTh || item.th}${isProposed ? '' : ` (${item.nameEn || item.en})`}</div>
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
