// ==========================================
// Homepage Popups & Timers Controller
// ==========================================

let currentZodiacStats = [];
let appSettings = {};

// Modal Open/Close Controls
function openRegisterModal() {
  const modal = document.getElementById('modal-register');
  if (modal) {
    modal.classList.add('show');
    initZodiacCardPicker('pop-zodiac-selector', 'pop-zodiacKey');
  }
}

function closeRegisterModal() {
  const modal = document.getElementById('modal-register');
  if (modal) modal.classList.remove('show');
}

function openProposeModal() {
  const modal = document.getElementById('modal-propose');
  if (modal) {
    modal.classList.add('show');
    initProposeZodiacPicker('propose-zodiac-selector', 'propose-zodiacKey');
  }
}

function closeProposeModal() {
  const modal = document.getElementById('modal-propose');
  if (modal) modal.classList.remove('show');
}

function openQuotaModal() {
  const modal = document.getElementById('modal-quota');
  if (modal) {
    modal.classList.add('show');
    backToQuotaGrid();
    loadQuotaData();
  }
}

function closeQuotaModal() {
  const modal = document.getElementById('modal-quota');
  if (modal) modal.classList.remove('show');
}

function openRegisterFromQuota() {
  closeQuotaModal();
  setTimeout(() => {
    openRegisterModal();
  }, 200);
}

function backToQuotaGrid() {
  const gridView = document.getElementById('quota-view-grid');
  const detailView = document.getElementById('quota-view-detail');
  if (gridView) gridView.style.display = 'block';
  if (detailView) detailView.style.display = 'none';
}

// ==========================================
// Interactive Zodiac Card Picker for Registration
// ==========================================
function initZodiacCardPicker(containerId, hiddenInputId) {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;

  if (container.children.length > 0) return; // already rendered

  container.innerHTML = '';
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
      // Single select: remove selected from all cards in this container
      container.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      hiddenInput.value = z.key;
    };

    container.appendChild(card);
  });
}

// ==========================================
// Interactive Zodiac Card Picker for Propose (12 + Unknown)
// ==========================================
function initProposeZodiacPicker(containerId, hiddenInputId) {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;

  if (container.children.length > 0) return; // already rendered

  container.innerHTML = '';

  // 12 Zodiacs
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
      container.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      hiddenInput.value = z.key;
    };

    container.appendChild(card);
  });

  // Unknown Zodiac Card
  const unknownCard = document.createElement('div');
  unknownCard.className = 'zodiac-select-card unknown-card';
  unknownCard.setAttribute('data-key', 'unknown');
  unknownCard.innerHTML = `
    <div class="zodiac-select-icon" style="background: rgba(251, 191, 36, 0.15); color: #fbbf24;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    <div class="zodiac-select-info">
      <div class="zodiac-select-name" style="color: #fbbf24;">ไม่ทราบราศี (Unknown)</div>
      <div class="zodiac-select-date" style="color: #fde68a;">หากไม่ทราบวันเกิด/ราศีของวีทูบเบอร์ท่านนี้</div>
    </div>
    <div class="zodiac-select-check">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `;

  unknownCard.onclick = () => {
    container.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));
    unknownCard.classList.add('selected');
    hiddenInput.value = 'unknown';
  };

  container.appendChild(unknownCard);
}

// Load Quota 12 Zodiacs
async function loadQuotaData() {
  const grid = document.getElementById('pop-zodiac-grid');
  if (!grid) return;

  grid.innerHTML = Array(12).fill(0).map(() => `
    <div class="zodiac-card skeleton" style="height: 85px;"></div>
  `).join('');

  try {
    const data = await fbGetZodiacStats();
    currentZodiacStats = data;
    renderQuotaGrid(data);
  } catch (err) {
    console.error('Failed to load zodiac quota:', err);
    showToast('เกิดข้อผิดพลาดในการโหลดโควต้าราศี', 'error');
  }
}

function renderQuotaGrid(data) {
  const grid = document.getElementById('pop-zodiac-grid');
  if (!grid) return;

  grid.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    const isProposed = item.isProposed || item.key === 'proposed';
    card.className = 'zodiac-card' + (isProposed ? ' proposed-quota-card' : '');
    card.onclick = () => showZodiacDetail(item.key);

    const iconContent = isProposed
      ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
      : `<img src="/assets/images/white/${item.icon}" alt="${item.th} (${item.en})">`;

    const iconBoxStyle = isProposed ? `style="background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.4);"` : '';
    const titleStyle = isProposed ? `style="color: #fbbf24;"` : '';
    const dateStyle = isProposed ? `style="color: #fde68a;"` : '';
    const countStyle = isProposed ? `style="color: #fbbf24;"` : '';

    card.innerHTML = `
      <div class="zodiac-icon-box" ${iconBoxStyle}>
        ${iconContent}
      </div>
      <div class="zodiac-info">
        <div class="zodiac-name" ${titleStyle}>${item.th}${isProposed ? '' : ` (${item.en})`}</div>
        <div class="zodiac-date" ${dateStyle}>${item.dateRange}</div>
        <div class="zodiac-count"><span ${countStyle}>${item.count}</span> คน</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Cached proposed members for instant dropdown filtering
let cachedProposedMembers = [];

// Show Participants of a Single Zodiac
async function showZodiacDetail(signKey) {
  const gridView = document.getElementById('quota-view-grid');
  const detailView = document.getElementById('quota-view-detail');
  const iconBox = document.getElementById('pop-detail-icon-box');
  const titleText = document.getElementById('pop-detail-title-text');
  const dateText = document.getElementById('pop-detail-date-text');
  const grid = document.getElementById('pop-participants-grid');
  const proposedFilterBar = document.getElementById('pop-proposed-filter-bar');
  const proposedSelect = document.getElementById('pop-proposed-zodiac-select');

  if (gridView) gridView.style.display = 'none';
  if (detailView) detailView.style.display = 'block';

  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="participant-card skeleton" style="height: 280px;"></div>
  `).join('');

  try {
    const result = await fbGetZodiacDetail(signKey);

    if (!result || !result.zodiac) {
      titleText.textContent = 'ไม่พบข้อมูลราศี';
      grid.innerHTML = `<div class="empty-state"><h3>ไม่พบข้อมูลราศี</h3></div>`;
      if (proposedFilterBar) proposedFilterBar.style.display = 'none';
      return;
    }

    const zodiac = result.zodiac;
    const isProposed = zodiac.isProposed || zodiac.key === 'proposed';

    if (iconBox) {
      if (isProposed) {
        iconBox.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#fbbf24;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>`;
      } else if (zodiac.isUnknown || zodiac.key === 'unknown') {
        iconBox.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#fbbf24;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>`;
      } else {
        iconBox.innerHTML = `<img src="/assets/images/white/${zodiac.icon}" alt="${zodiac.th}" style="width:100%;height:100%;object-fit:contain;">`;
      }
    }
    if (titleText) titleText.textContent = isProposed ? 'วีทูบเบอร์ที่เสนอชื่อ' : `โควต้าราศี : ${zodiac.th} (${zodiac.en})`;
    if (dateText) dateText.textContent = zodiac.dateRange || '';

    let members = result.members || [];
    if (typeof sortThaiEnglish === 'function') {
      members.sort(sortThaiEnglish);
    }

    if (isProposed) {
      cachedProposedMembers = members;
      if (proposedFilterBar && proposedSelect) {
        proposedFilterBar.style.display = 'flex';
        // Populate dropdown with zodiac options and counts
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
        proposedSelect.innerHTML = opts;
        proposedSelect.value = '';

        proposedSelect.onchange = () => {
          filterAndRenderProposedModal(proposedSelect.value);
        };
      }
      renderProposedGridCards(members, grid);
    } else {
      if (proposedFilterBar) proposedFilterBar.style.display = 'none';
      renderStandardZodiacGridCards(members, grid, zodiac);
    }
  } catch (err) {
    console.error('Failed to load zodiac members:', err);
    showToast('เกิดข้อผิดพลาดในการโหลดรายชื่อ', 'error');
  }
}

function filterAndRenderProposedModal(filterZodiacKey) {
  const grid = document.getElementById('pop-participants-grid');
  if (!grid) return;

  let filtered = cachedProposedMembers;
  if (filterZodiacKey) {
    if (filterZodiacKey === 'unknown') {
      filtered = cachedProposedMembers.filter(m => m.zodiacKey === 'unknown' || !m.zodiacKey);
    } else {
      filtered = cachedProposedMembers.filter(m => m.zodiacKey === filterZodiacKey);
    }
  }

  renderProposedGridCards(filtered, grid, filterZodiacKey);
}

function renderProposedGridCards(members, grid, filterKey = '') {
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
        <p>ลองเสนอชื่อวีทูบเบอร์ที่คุณอยากให้มาร่วมศึก 12 วีทูบเบอร์!</p>
        <div style="margin-top: 1.5rem;">
          <button type="button" class="btn-propose" onclick="openProposeModal()" style="margin: 0 auto;">
            เสนอวีทูบเบอร์
          </button>
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
             onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || 'user')}';">
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

function renderStandardZodiacGridCards(members, grid, zodiac) {
  if (members.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>ยังไม่มีผู้ลงทะเบียนในราศีนี้</h3>
        <p>คุณอาจจะเป็นคนแรกที่ได้ร่วมเป็นตัวแทนของราศี ${zodiac.th} (${zodiac.en})</p>
        <div style="margin-top: 1.5rem;" class="empty-register-cta">
          <button type="button" class="btn-primary" onclick="openRegisterFromQuota()">ลงทะเบียน</button>
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
             onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || 'user')}';">
        <div class="participant-fade-overlay"></div>
        <div class="participant-content">
          <div class="participant-name" title="${escapeHtml(m.displayName)}">
            ${escapeHtml(m.displayName)}
          </div>
        </div>
      </a>
    `;
    grid.appendChild(card);
  });
}

// Setup Form Handlers
function setupPopupRegister() {
  const btnPreSubmit = document.getElementById('btn-pop-pre-submit');
  const confirmModal = document.getElementById('confirm-modal');
  const modalLiveInfo = document.getElementById('modal-live-info');
  const btnModalCancel = document.getElementById('modal-btn-cancel');
  const btnModalConfirm = document.getElementById('modal-btn-confirm');

  if (!btnPreSubmit) return;

  btnPreSubmit.onclick = () => {
    const xAccount = document.getElementById('pop-xAccount').value.trim();
    const displayName = document.getElementById('pop-displayName').value.trim();
    const zodiacKey = document.getElementById('pop-zodiacKey').value;

    if (!xAccount) {
      showToast('กรุณากรอกชื่อบัญชีหรือลิงก์ X ของคุณ', 'error');
      document.getElementById('pop-xAccount').focus();
      return;
    }

    if (!displayName) {
      showToast('กรุณากรอกชื่อสำหรับเรียกในไลฟ์', 'error');
      document.getElementById('pop-displayName').focus();
      return;
    }

    if (!zodiacKey) {
      showToast('กรุณากดเลือกราศีของคุณ (1 ราศี)', 'error');
      const selector = document.getElementById('pop-zodiac-selector');
      if (selector) selector.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (modalLiveInfo && appSettings) {
      modalLiveInfo.innerHTML = `
        <strong>กำหนดการไลฟ์:</strong> ${appSettings.liveDateDisplay || '14/11/2026 เวลา 21:00 น.'}<br>
        <div style="margin-top:0.6rem; color: #b8b3cf; white-space: pre-wrap; word-break: break-word;">${appSettings.popupMessage || ''}</div>
      `;
    }

    if (confirmModal) confirmModal.classList.add('show');
  };

  if (btnModalCancel) {
    btnModalCancel.onclick = () => {
      if (confirmModal) confirmModal.classList.remove('show');
    };
  }

  if (btnModalConfirm) {
    btnModalConfirm.onclick = async () => {
      const xAccount = document.getElementById('pop-xAccount').value.trim();
      const displayName = document.getElementById('pop-displayName').value.trim();
      const zodiacKey = document.getElementById('pop-zodiacKey').value;

      btnModalConfirm.disabled = true;
      btnModalConfirm.textContent = 'กำลังบันทึก...';

      try {
        await fbAddRegistration({ xAccount, displayName, zodiacKey });

        if (confirmModal) confirmModal.classList.remove('show');
        closeRegisterModal();
        // Reset form
        document.getElementById('popup-register-form').reset();
        document.getElementById('pop-zodiacKey').value = '';
        const selector = document.getElementById('pop-zodiac-selector');
        if (selector) selector.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));
        
        showToast('ลงทะเบียนสำเร็จเรียบร้อยแล้ว!', 'success');
        // Reload quota counts in background
        loadQuotaData();
      } catch (err) {
        console.error(err);
        showToast('ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้', 'error');
      } finally {
        btnModalConfirm.disabled = false;
        btnModalConfirm.textContent = 'ตกลง';
      }
    };
  }

  // Backdrop clicks
  const regModal = document.getElementById('modal-register');
  if (regModal) {
    regModal.addEventListener('click', (e) => {
      if (e.target === regModal) closeRegisterModal();
    });
  }

  const quotaModal = document.getElementById('modal-quota');
  if (quotaModal) {
    quotaModal.addEventListener('click', (e) => {
      if (e.target === quotaModal) closeQuotaModal();
    });
  }

  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) confirmModal.classList.remove('show');
    });
  }
}

// Setup Propose VTuber Form Handlers
function setupPopupPropose() {
  const btnProposeSubmit = document.getElementById('btn-propose-submit');
  const proposeModal = document.getElementById('modal-propose');
  const xAccountInput = document.getElementById('propose-xAccount');
  const displayNameInput = document.getElementById('propose-displayName');
  const hiddenZodiac = document.getElementById('propose-zodiacKey');

  if (!btnProposeSubmit) return;

  btnProposeSubmit.onclick = async () => {
    const xAccount = (xAccountInput ? xAccountInput.value : '').trim();
    const displayName = (displayNameInput ? displayNameInput.value : '').trim();
    const zodiacKey = (hiddenZodiac ? hiddenZodiac.value : '') || 'unknown';

    if (!xAccount) {
      showToast('กรุณากรอกลิงก์ X หรือชื่อบัญชี X ของวีทูบเบอร์', 'error');
      if (xAccountInput) xAccountInput.focus();
      return;
    }

    if (!displayName) {
      showToast('กรุณากรอกชื่อวีทูบเบอร์ที่เสนอ', 'error');
      if (displayNameInput) displayNameInput.focus();
      return;
    }

    btnProposeSubmit.disabled = true;
    btnProposeSubmit.textContent = 'กำลังส่งข้อมูล...';

    try {
      await fbAddProposal({ xAccount, displayName, zodiacKey });

      closeProposeModal();
      if (xAccountInput) xAccountInput.value = '';
      if (displayNameInput) displayNameInput.value = '';
      if (hiddenZodiac) hiddenZodiac.value = '';
      const selector = document.getElementById('propose-zodiac-selector');
      if (selector) selector.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));

      showToast('เสนอชื่อวีทูบเบอร์สำเร็จเรียบร้อยแล้ว! ขอบคุณสำหรับข้อมูล', 'success');
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้', 'error');
    } finally {
      btnProposeSubmit.disabled = false;
      btnProposeSubmit.textContent = 'ส่งข้อมูล';
    }
  };

  if (proposeModal) {
    proposeModal.addEventListener('click', (e) => {
      if (e.target === proposeModal) closeProposeModal();
    });
  }
}

// Setup Time Badges & Countdown
function applyRegistrationOpenState(settings) {
  const btnRegister = document.getElementById('btn-register-home');
  const btnPropose = document.getElementById('btn-propose-home');
  const closedBox = document.getElementById('home-registration-closed-box');
  const closedText = document.getElementById('home-closed-msg-text');
  const quotaCta = document.getElementById('quota-cta-container');
  const quotaDetailCta = document.getElementById('quota-detail-cta-container');

  const isOpen = settings ? (settings.isRegistrationOpen !== false) : true;
  const msg = (settings && settings.registrationClosedMessage) ? settings.registrationClosedMessage : 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย';

  if (isOpen) {
    if (btnRegister) btnRegister.style.display = 'inline-flex';
    if (btnPropose) btnPropose.style.display = 'inline-flex';
    if (closedBox) closedBox.style.display = 'none';
    if (quotaCta) quotaCta.style.display = 'block';
    if (quotaDetailCta) quotaDetailCta.style.display = 'block';
  } else {
    if (btnRegister) btnRegister.style.display = 'none';
    if (btnPropose) btnPropose.style.display = 'none';
    if (closedBox) {
      closedBox.style.display = 'inline-flex';
      if (closedText) closedText.textContent = msg;
    }
    if (quotaCta) quotaCta.style.display = 'none';
    if (quotaDetailCta) quotaDetailCta.style.display = 'none';
  }
}

// Setup Time Badges & Countdown
async function setupTimeBadges() {
  const closeLabel = document.getElementById('close-date-label');
  const closeCountdown = document.getElementById('close-countdown');
  const liveLabel = document.getElementById('live-date-label');
  const liveCountdown = document.getElementById('live-countdown');
  const quotaModalCountdown = document.getElementById('quota-modal-live-countdown');

  try {
    appSettings = await fbGetSettings();
    if (appSettings) {
      applyRegistrationOpenState(appSettings);

      const closeDate = new Date(appSettings.closeDate || "2026-10-01T23:59:59.000Z");
      const liveDate = new Date(appSettings.liveDate || "2026-11-14T14:00:00.000Z");

      if (closeLabel) {
        closeLabel.textContent = `ปิดรับสมัคร : ${appSettings.closeDateDisplay || '1/10/2026'}`;
      }
      if (liveLabel) {
        liveLabel.textContent = `วันไลฟ์ : ${appSettings.liveDateDisplay || '14/11/2026 เวลา 21:00 น.'}`;
      }

      function updateAllTimers() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');

        // Close Date Countdown
        const diffClose = closeDate - now;
        if (closeCountdown) {
          if (diffClose <= 0) {
            closeCountdown.textContent = 'ปิดรับสมัครเรียบร้อยแล้ว';
          } else {
            const totalDays = Math.floor(diffClose / (1000 * 60 * 60 * 24));
            const months = Math.floor(totalDays / 30);
            const days = totalDays % 30;
            closeCountdown.textContent = `ปิดรับในอีก : ${pad(months)} เดือน ${pad(days)} วัน`;
          }
        }

        // Live Date Countdown
        const diffLive = liveDate - now;
        if (diffLive <= 0) {
          const finishedText = 'เริ่มไลฟ์แล้ว';
          if (liveCountdown) liveCountdown.textContent = finishedText;
          if (quotaModalCountdown) quotaModalCountdown.textContent = finishedText;
        } else {
          const totalDays = Math.floor(diffLive / (1000 * 60 * 60 * 24));
          const months = Math.floor(totalDays / 30);
          const days = totalDays % 30;
          const text = `ไลฟ์ในอีก : ${pad(months)} เดือน ${pad(days)} วัน`;
          if (liveCountdown) liveCountdown.textContent = text;
          if (quotaModalCountdown) quotaModalCountdown.textContent = text;
        }
      }

      updateAllTimers();
      setInterval(updateAllTimers, 60000);
    }
  } catch (err) {
    console.error('Failed to load settings timers:', err);
  }

  // Realtime settings listener
  if (typeof rtdb !== 'undefined' && rtdb) {
    rtdb.ref('settings').on('value', (snap) => {
      const val = snap.val();
      if (val) {
        appSettings = { ...appSettings, ...val };
        applyRegistrationOpenState(appSettings);
      }
    });
  }
}

// ==========================================
// Interactive Yuubear Mascot & Speech Popups
// (Center Idle <-> Shift-Right Speak Sequence)
// ==========================================
function setupYuubearMascotTalk() {
  const talkSection = document.getElementById('home-mascot-talk-section');
  const chibiImg = document.getElementById('home-chibi-img');
  const bubbleContainer = document.getElementById('mascot-speech-bubble-container');
  const bubbleImg = document.getElementById('mascot-speech-bubble-img');

  if (!talkSection || !chibiImg || !bubbleContainer || !bubbleImg) return;

  const CHIBI_SPEAK = '/assets/images/mascot/speak.png';
  const CHIBI_NOT_SPEAK = '/assets/images/mascot/not-speak.png';

  const POPUP_CHATS = [
    '/assets/images/popups/chat 1.png',
    '/assets/images/popups/chat 2.png',
    '/assets/images/popups/chat 3.png',
    '/assets/images/popups/chat 4.png'
  ];

  // Preload all assets
  [CHIBI_SPEAK, CHIBI_NOT_SPEAK, ...POPUP_CHATS].forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function runTalkRoutine() {
    while (true) {
      // 1. Center Idle State (Not Speaking)
      talkSection.classList.remove('speaking-mode');
      chibiImg.src = CHIBI_NOT_SPEAK;
      bubbleContainer.classList.remove('show');

      // Rest in center for 7 seconds before starting speech cycle
      await sleep(7000);

      // 2. Start speaking: Shift Chibi smoothly to the right and change pose to speak.png
      talkSection.classList.add('speaking-mode');
      chibiImg.src = CHIBI_SPEAK;

      // Small delay for slide transition before popup pops up
      await sleep(400);

      // 3. Cycle through all popups from chat 1 to chat 4
      for (let i = 0; i < POPUP_CHATS.length; i++) {
        bubbleImg.src = POPUP_CHATS[i];
        chibiImg.src = CHIBI_SPEAK;
        bubbleContainer.classList.add('show');

        // Show this popup for 5.5 seconds
        await sleep(5500);

        // If there are more popups, smooth transition between them (1.5s gap, total 7s per chat)
        if (i < POPUP_CHATS.length - 1) {
          bubbleContainer.classList.remove('show');
          await sleep(1500);
        }
      }

      // 4. All speech texts completed: close bubble & return to center as not-speak
      bubbleContainer.classList.remove('show');
      await sleep(400);

      chibiImg.src = CHIBI_NOT_SPEAK;
      talkSection.classList.remove('speaking-mode'); // Slide back to center

      // Rest interval after returning to center
      await sleep(1000);
    }
  }

  // Initial trigger after page load
  setTimeout(() => {
    runTalkRoutine().catch(console.error);
  }, 1000);
}

// Initialise
document.addEventListener('DOMContentLoaded', () => {
  setupPopupRegister();
  setupPopupPropose();
  setupTimeBadges();
  setupYuubearMascotTalk();
});
