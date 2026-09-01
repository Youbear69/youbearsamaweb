async function initRegisterPage() {
  const zodiacContainer = document.getElementById('zodiac-selector');
  const hiddenZodiac = document.getElementById('zodiacKey');
  const btnPreSubmit = document.getElementById('btn-pre-submit');
  const confirmModal = document.getElementById('confirm-modal');
  const modalLiveInfo = document.getElementById('modal-live-info');
  const btnModalCancel = document.getElementById('modal-btn-cancel');
  const btnModalConfirm = document.getElementById('modal-btn-confirm');

  if (!btnPreSubmit) return;

  // Render 12 Zodiac interactive selection cards
  if (zodiacContainer && hiddenZodiac) {
    zodiacContainer.innerHTML = '';
    ZODIAC_LIST.forEach(z => {
      const card = document.createElement('div');
      card.className = 'zodiac-select-card';
      card.setAttribute('data-key', z.key);
      card.innerHTML = `
        <div class="zodiac-select-icon">
          <img src="/assets/images/white/${z.icon}" alt="${z.th}">
        </div>
        <div class="zodiac-select-info">
          <div class="zodiac-select-name">${z.th} (${z.en})</div>
          <div class="zodiac-select-date">${z.dateRange}</div>
        </div>
        <div class="zodiac-select-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;

      card.onclick = () => {
        zodiacContainer.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        hiddenZodiac.value = z.key;
      };

      zodiacContainer.appendChild(card);
    });
  }

  // Fetch settings for closed status & modal live date
  try {
    const settings = await fbGetSettings();
    const isRegOpen = settings ? (settings.isRegistrationOpen !== false) : true;
    const formContainer = document.getElementById('register-form-container');
    const closedBox = document.getElementById('register-closed-box');
    const closedText = document.getElementById('register-closed-msg-text');

    if (!isRegOpen) {
      if (formContainer) formContainer.style.display = 'none';
      if (closedBox) {
        closedBox.style.display = 'block';
        if (closedText) closedText.textContent = settings.registrationClosedMessage || 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย';
      }
    } else {
      if (formContainer) formContainer.style.display = 'block';
      if (closedBox) closedBox.style.display = 'none';
    }

    if (settings && modalLiveInfo) {
      modalLiveInfo.innerHTML = `
        <strong>กำหนดการไลฟ์:</strong> ${settings.liveDateDisplay || 'เร็วๆ นี้'}<br>
        <div style="margin-top:0.6rem; color: #b8b3cf; white-space: pre-wrap; word-break: break-word;">${settings.popupMessage || ''}</div>
      `;
    }
  } catch (e) {
    console.error(e);
  }

  // Pre-submit validation and show popup
  btnPreSubmit.onclick = () => {
    const xAccount = document.getElementById('xAccount').value.trim();
    const displayName = document.getElementById('displayName').value.trim();
    const zodiacKey = hiddenZodiac ? hiddenZodiac.value : '';

    if (!xAccount) {
      showToast('กรุณากรอกชื่อบัญชีหรือลิงก์ X ของคุณ', 'error');
      document.getElementById('xAccount').focus();
      return;
    }

    if (!displayName) {
      showToast('กรุณากรอกชื่อสำหรับเรียกในไลฟ์', 'error');
      document.getElementById('displayName').focus();
      return;
    }

    if (!zodiacKey) {
      showToast('กรุณากดเลือกราศีของคุณ (1 ราศี)', 'error');
      if (zodiacContainer) zodiacContainer.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Show confirmation modal
    if (confirmModal) confirmModal.classList.add('show');
  };

  // Cancel Modal
  if (btnModalCancel && confirmModal) {
    btnModalCancel.onclick = () => {
      confirmModal.classList.remove('show');
    };
  }

  // Confirm and Submit to Backend
  if (btnModalConfirm) {
    btnModalConfirm.onclick = async () => {
      const xAccount = document.getElementById('xAccount').value.trim();
      const displayName = document.getElementById('displayName').value.trim();
      const zodiacKey = hiddenZodiac ? hiddenZodiac.value : '';

      btnModalConfirm.disabled = true;
      btnModalConfirm.textContent = 'กำลังบันทึก...';

      try {
        await fbAddRegistration({ xAccount, displayName, zodiacKey });

        if (confirmModal) confirmModal.classList.remove('show');
        showToast('ลงทะเบียนสำเร็จ! กำลังกลับสู่หน้าแรก...', 'success');
        setTimeout(() => {
          if (typeof navigateTo === 'function') {
            navigateTo('/12vtubergame');
          } else {
            window.location.href = '/12vtubergame';
          }
        }, 1500);
      } catch (err) {
        console.error(err);
        showToast('ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้', 'error');
        btnModalConfirm.disabled = false;
        btnModalConfirm.textContent = 'ตกลง';
      }
    };
  }

  // Close modal when clicking outside box
  if (confirmModal) {
    confirmModal.onclick = (e) => {
      if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegisterPage);
} else {
  initRegisterPage();
}
