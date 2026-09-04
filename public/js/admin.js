// ==========================================
// Edit Modal Functions (Global Scope)
// ==========================================

function openEditModal(entryType, entryData) {
  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  document.getElementById('edit-entry-id').value = entryData.id;
  document.getElementById('edit-entry-type').value = entryType;
  document.getElementById('edit-displayName').value = entryData.displayName || '';
  document.getElementById('edit-xAccount').value = entryData.xAccount || '';

  // Populate zodiac dropdown
  const zodiacSelect = document.getElementById('edit-zodiacKey');
  if (zodiacSelect) {
    zodiacSelect.innerHTML = '';
    if (entryType === 'proposal') {
      zodiacSelect.innerHTML += `<option value="unknown">ไม่ทราบราศี (Unknown)</option>`;
    }
    ZODIAC_LIST.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z.key;
      opt.textContent = `${z.th} (${z.en})`;
      zodiacSelect.appendChild(opt);
    });
    zodiacSelect.value = entryData.zodiacKey || (entryType === 'proposal' ? 'unknown' : ZODIAC_LIST[0].key);
  }

  // Image preview
  const previewContainer = document.getElementById('edit-image-preview');
  const previewImg = document.getElementById('edit-image-preview-img');
  const clearBtn = document.getElementById('btn-clear-image');
  const urlInput = document.getElementById('edit-imageUrl');

  if (entryData.imageUrl) {
    previewContainer.style.display = 'block';
    previewImg.src = entryData.imageUrl;
    clearBtn.style.display = 'inline-block';
    urlInput.value = entryData.imageUrl;
  } else {
    previewContainer.style.display = 'none';
    previewImg.src = '';
    clearBtn.style.display = 'none';
    urlInput.value = '';
  }

  // Reset file input
  const fileInput = document.getElementById('edit-imageFile');
  if (fileInput) fileInput.value = '';
  const fileName = document.getElementById('file-upload-name');
  if (fileName) fileName.textContent = '';

  // Reset to URL tab
  switchImageTab('url');

  modal.classList.add('show');
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.classList.remove('show');
}

function switchImageTab(tab) {
  const urlTab = document.getElementById('img-tab-url');
  const fileTab = document.getElementById('img-tab-file');
  const urlInput = document.getElementById('img-input-url');
  const fileInput = document.getElementById('img-input-file');

  if (tab === 'url') {
    urlTab.classList.add('active');
    fileTab.classList.remove('active');
    urlInput.style.display = 'block';
    fileInput.style.display = 'none';
  } else {
    urlTab.classList.remove('active');
    fileTab.classList.add('active');
    urlInput.style.display = 'none';
    fileInput.style.display = 'block';
  }
}

function clearEditImage() {
  document.getElementById('edit-imageUrl').value = '';
  document.getElementById('edit-image-preview').style.display = 'none';
  document.getElementById('edit-image-preview-img').src = '';
  document.getElementById('btn-clear-image').style.display = 'none';
  const fileInput = document.getElementById('edit-imageFile');
  if (fileInput) fileInput.value = '';
  const fileName = document.getElementById('file-upload-name');
  if (fileName) fileName.textContent = '';
}

// ==========================================
// Main Admin Init
// ==========================================

async function initAdminPage() {
  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const userEmailBadge = document.getElementById('admin-user-email');
  const btnLogout = document.getElementById('btn-logout');
  const btnExportCsv = document.getElementById('btn-export-csv');

  const filterZodiac = document.getElementById('admin-filter-zodiac');
  const searchInput = document.getElementById('admin-search');
  const sortRegistrations = document.getElementById('admin-sort-registrations');
  const tableBody = document.getElementById('admin-table-body');
  const statTotal = document.getElementById('stat-total');
  const statProposals = document.getElementById('stat-proposals');
  const statApproved = document.getElementById('stat-approved');
  const statTop = document.getElementById('stat-top');
  const btnRefresh = document.getElementById('btn-refresh');

  const proposalSearchInput = document.getElementById('proposal-search');
  const proposalFilterStatus = document.getElementById('proposal-filter-status');
  const sortProposals = document.getElementById('proposal-sort');
  const proposalsTableBody = document.getElementById('proposals-table-body');

  const settingsForm = document.getElementById('settings-form');
  const settingLiveDate = document.getElementById('settingLiveDate');
  const settingLiveDisplay = document.getElementById('settingLiveDisplay');
  const settingPopupMessage = document.getElementById('settingPopupMessage');
  const changeCredsForm = document.getElementById('change-credentials-form');

  let allRegistrations = [];
  let allProposals = [];
  let currentViewMode = 'all'; // 'all' | 'direct' | 'proposed'

  // Tab View Switcher Elements
  const tabViewAll = document.getElementById('tab-view-all');
  const tabViewDirect = document.getElementById('tab-view-direct');
  const tabViewProposed = document.getElementById('tab-view-proposed');
  const countTabAll = document.getElementById('count-tab-all');
  const countTabDirect = document.getElementById('count-tab-direct');
  const countTabProposed = document.getElementById('count-tab-proposed');
  const adminViewTitle = document.getElementById('admin-view-title');
  const adminViewDesc = document.getElementById('admin-view-desc');
  const filterStatusBox = document.getElementById('admin-filter-status-box');
  const filterStatus = document.getElementById('admin-filter-status');
  const sortSelect = document.getElementById('admin-sort');

  // Stats Elements
  const statCombined = document.getElementById('stat-combined');

  // Registration Open/Close Form Elements
  const regStatusForm = document.getElementById('reg-status-form');
  const toggleRegStatus = document.getElementById('toggle-reg-status');
  const regStatusIndicator = document.getElementById('admin-reg-status-indicator');
  const settingClosedMessage = document.getElementById('settingClosedMessage');

  // Populate Zodiac filter dropdown
  if (filterZodiac) {
    let opts = '<option value="">ทุกราศี (ทั้งหมด)</option>';
    opts += '<option value="unknown">ไม่ทราบราศี (Unknown)</option>';
    ZODIAC_LIST.forEach(z => {
      opts += `<option value="${z.key}">${z.th} (${z.en})</option>`;
    });
    filterZodiac.innerHTML = opts;
  }

  function updateRegStatusIndicator(isOpen) {
    if (!regStatusIndicator) return;
    if (isOpen) {
      regStatusIndicator.className = 'admin-status-indicator status-open';
      regStatusIndicator.innerHTML = '<span>🟢 กำลังเปิดรับสมัคร (Open)</span>';
    } else {
      regStatusIndicator.className = 'admin-status-indicator status-closed';
      regStatusIndicator.innerHTML = '<span>🔴 ปิดรับสมัครแล้ว (Closed)</span>';
    }
  }

  if (toggleRegStatus) {
    toggleRegStatus.onchange = () => {
      updateRegStatusIndicator(toggleRegStatus.checked);
    };
  }

  // Tab switcher click handlers
  function switchViewMode(mode) {
    currentViewMode = mode;
    [tabViewAll, tabViewDirect, tabViewProposed].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    if (mode === 'all') {
      if (tabViewAll) tabViewAll.classList.add('active');
      if (adminViewTitle) adminViewTitle.textContent = 'รายชื่อทั้งหมด (All Members)';
      if (adminViewDesc) adminViewDesc.textContent = 'แสดงรายชื่อทั้งผู้ลงทะเบียนตรงและวีทูบเบอร์ที่ถูกเสนอชื่อ';
      if (filterStatusBox) filterStatusBox.style.display = 'none';
    } else if (mode === 'direct') {
      if (tabViewDirect) tabViewDirect.classList.add('active');
      if (adminViewTitle) adminViewTitle.textContent = 'รายชื่อผู้ลงทะเบียนตรง (Direct Registrations)';
      if (adminViewDesc) adminViewDesc.textContent = 'แสดงเฉพาะรายชื่อผู้ที่กดลงทะเบียนเข้าร่วมกิจกรรมด้วยตนเอง';
      if (filterStatusBox) filterStatusBox.style.display = 'none';
    } else if (mode === 'proposed') {
      if (tabViewProposed) tabViewProposed.classList.add('active');
      if (adminViewTitle) adminViewTitle.textContent = 'รายการเสนอวีทูบเบอร์ (Proposed VTubers)';
      if (adminViewDesc) adminViewDesc.textContent = 'แสดงเฉพาะรายชื่อวีทูบเบอร์ที่ถูกเสนอชื่อเข้ามาโดยแฟนคลับ/คอมมูนิตี้';
      if (filterStatusBox) filterStatusBox.style.display = 'block';
    }

    renderUnifiedTable();
  }

  if (tabViewAll) tabViewAll.onclick = () => switchViewMode('all');
  if (tabViewDirect) tabViewDirect.onclick = () => switchViewMode('direct');
  if (tabViewProposed) tabViewProposed.onclick = () => switchViewMode('proposed');

  function showLoginView() {
    if (loginView) loginView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
  }

  function showDashboardView() {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'contents';
  }

  // Firebase Auth State Listener
  fbAuth.onAuthStateChanged((user) => {
    if (user) {
      if (userEmailBadge) {
        userEmailBadge.textContent = user.email || 'Admin';
      }
      showDashboardView();
      loadAdminData();
    } else {
      showLoginView();
    }
  });

  // Login Form Submission with Firebase Auth
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      if (!email || !password) {
        showToast('กรุณากรอกอีเมลและรหัสผ่าน', 'error');
        return;
      }

      try {
        await fbAuth.signInWithEmailAndPassword(email, password);
        showToast('เข้าสู่ระบบสำเร็จ', 'success');
      } catch (err) {
        console.error('Login error:', err);
        let errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        if (err.code === 'auth/user-not-found') {
          errMsg = 'ไม่พบบัญชีอีเมลนี้ในระบบ Firebase Auth';
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        } else if (err.code === 'auth/too-many-requests') {
          errMsg = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่';
        }
        showToast(errMsg, 'error');
      }
    };
  }

  // Logout Handler
  if (btnLogout) {
    btnLogout.onclick = async () => {
      try {
        await fbAuth.signOut();
        showToast('ออกจากระบบเรียบร้อยแล้ว');
      } catch (e) {
        console.error(e);
      }
    };
  }

  // Change Admin Password / Email Form Submission
  if (changeCredsForm) {
    changeCredsForm.onsubmit = async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('change-curr-pass').value.trim();
      const newEmail = document.getElementById('change-new-email').value.trim();
      const newPassword = document.getElementById('change-new-pass').value.trim();

      const user = fbAuth.currentUser;
      if (!user) {
        showToast('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
      }

      try {
        // Re-authenticate
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(cred);

        if (newEmail && newEmail !== user.email) {
          await user.updateEmail(newEmail);
        }
        if (newPassword) {
          await user.updatePassword(newPassword);
        }

        showToast('เปลี่ยนข้อมูลการเข้าสู่ระบบสำเร็จ', 'success');
        if (userEmailBadge && newEmail) {
          userEmailBadge.textContent = newEmail;
        }
        changeCredsForm.reset();
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาด: ' + (err.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง'), 'error');
      }
    };
  }

  // Export CSV
  if (btnExportCsv) {
    btnExportCsv.onclick = (e) => {
      e.preventDefault();
      fbExportCSV(allRegistrations, allProposals);
    };
  }

  // Load Data
  async function loadAdminData() {
    try {
      const [regs, props, stats, settings] = await Promise.all([
        fbGetRegistrations(),
        fbGetProposals(),
        fbGetZodiacStats(),
        fbGetSettings()
      ]);

      allRegistrations = regs || [];
      allProposals = props || [];

      // Update stat pills
      const totalDirect = allRegistrations.length;
      const totalProposed = allProposals.length;
      const totalCombined = totalDirect + totalProposed;
      const approvedCount = allProposals.filter(p => p.approved).length;

      if (statCombined) statCombined.textContent = totalCombined;
      if (statTotal) statTotal.textContent = totalDirect;
      if (statProposals) statProposals.textContent = totalProposed;
      if (statApproved) statApproved.textContent = approvedCount;

      // Update tab counter badges
      if (countTabAll) countTabAll.textContent = totalCombined;
      if (countTabDirect) countTabDirect.textContent = totalDirect;
      if (countTabProposed) countTabProposed.textContent = totalProposed;

      if (stats && statTop) {
        let maxCount = 0;
        let topSign = '-';
        stats.forEach(s => {
          if (s.count > maxCount && !s.isProposed) {
            maxCount = s.count;
            topSign = `${s.nameTh || s.th} (${s.count} คน)`;
          }
        });
        statTop.textContent = maxCount > 0 ? topSign : 'ยังไม่มี';
      }

      // Registration Open/Close Settings
      if (settings) {
        const isRegOpen = settings.isRegistrationOpen !== false;
        if (toggleRegStatus) toggleRegStatus.checked = isRegOpen;
        updateRegStatusIndicator(isRegOpen);
        if (settingClosedMessage) {
          settingClosedMessage.value = settings.registrationClosedMessage || 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย';
        }

        const pad = (n) => String(n).padStart(2, '0');

        if (settings.liveDate && settingLiveDate) {
          const d = new Date(settings.liveDate);
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          settingLiveDate.value = localIso;
        }
        if (settingLiveDisplay) settingLiveDisplay.value = settings.liveDateDisplay || '';

        const settingCloseDate = document.getElementById('settingCloseDate');
        const settingCloseDisplay = document.getElementById('settingCloseDisplay');

        if (settings.closeDate && settingCloseDate) {
          const d = new Date(settings.closeDate);
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          settingCloseDate.value = localIso;
        }
        if (settingCloseDisplay) settingCloseDisplay.value = settings.closeDateDisplay || '';

        if (settingPopupMessage) settingPopupMessage.value = settings.popupMessage || '';
      }

      renderUnifiedTable();
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ดูแลระบบ', 'error');
    }
  }

  // Render Unified Table according to currentViewMode
  function renderUnifiedTable() {
    if (!tableBody) return;

    const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const filterZ = filterZodiac ? filterZodiac.value : '';
    const statusF = filterStatus ? filterStatus.value : '';
    const sortVal = sortSelect ? sortSelect.value : 'date-desc';

    // 1. Build list according to currentViewMode
    let list = [];
    if (currentViewMode === 'all') {
      const taggedRegs = allRegistrations.map(r => ({ ...r, entryType: 'registration' }));
      const taggedProps = allProposals.map(p => ({ ...p, entryType: 'proposal' }));
      list = [...taggedRegs, ...taggedProps];
    } else if (currentViewMode === 'direct') {
      list = allRegistrations.map(r => ({ ...r, entryType: 'registration' }));
    } else if (currentViewMode === 'proposed') {
      list = allProposals.map(p => ({ ...p, entryType: 'proposal' }));
    }

    // 2. Filter by search, zodiac, and status
    let filtered = list.filter(item => {
      // Search
      const matchSearch = !search ||
        (item.displayName && item.displayName.toLowerCase().includes(search)) ||
        (item.xAccount && item.xAccount.toLowerCase().includes(search)) ||
        (item.zodiacNameTh && item.zodiacNameTh.toLowerCase().includes(search));

      // Zodiac
      let matchZodiac = true;
      if (filterZ) {
        if (filterZ === 'unknown') {
          matchZodiac = item.zodiacKey === 'unknown' || !item.zodiacKey;
        } else {
          matchZodiac = item.zodiacKey === filterZ;
        }
      }

      // Status (for proposals)
      let matchStatus = true;
      if (currentViewMode === 'proposed' && statusF) {
        if (statusF === 'approved') matchStatus = Boolean(item.approved);
        if (statusF === 'pending') matchStatus = !item.approved;
        if (statusF === 'converted') matchStatus = Boolean(item.convertedToRegId || item.statusNote === 'ย้ายไปลงทะเบียนแล้ว');
        if (statusF === 'duplicate') matchStatus = Boolean(item.isDuplicate && !item.convertedToRegId);
      }

      return matchSearch && matchZodiac && matchStatus;
    });

    // 3. Apply sorting
    if (sortVal === 'name-asc') {
      filtered.sort((a, b) => sortThaiEnglish(a, b, false));
    } else if (sortVal === 'name-desc') {
      filtered.sort((a, b) => sortThaiEnglish(a, b, true));
    } else if (sortVal === 'date-asc') {
      filtered.sort((a, b) => sortDate(a, b, false));
    } else {
      // date-desc (default)
      filtered.sort((a, b) => sortDate(a, b, true));
    }

    // 4. Render Table Body
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
            ไม่พบข้อมูลตามเงื่อนไขที่ระบุ
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((item, index) => {
      const isProp = item.entryType === 'proposal';
      const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(item.xAccount) : { url: item.xAccount || '#', type: 'x' };
      const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(item) : (item.imageUrl || '');
      const clickUrl = parsedSocial.url || item.xAccount || '#';

      const dateStr = new Date(item.registeredAt || item.proposedAt || item.createdAt || Date.now()).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const isUnknown = item.zodiacKey === 'unknown' || !item.zodiacKey;
      const zodiacInfo = !isUnknown ? ZODIAC_LIST.find(z => z.key === item.zodiacKey) : null;
      const zodiacLabel = zodiacInfo ? `${zodiacInfo.th} (${zodiacInfo.en})` : 'ไม่ทราบราศี';

      // Thumbnail preview
      const thumbHtml = avatarUrl 
        ? `<img src="${escapeHtml(avatarUrl)}" alt="thumb" style="width: 34px; height: 34px; border-radius: 8px; object-fit: cover; vertical-align: middle; margin-right: 8px; border: 1.5px solid ${isProp ? 'rgba(251,191,36,0.45)' : 'rgba(168,85,247,0.45)'};" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.displayName || 'user')}';">`
        : '';

      // Status / Approve Column
      let statusHtml = '';
      if (isProp) {
        let noteBadge = '';
        if (item.convertedToRegId || item.statusNote === 'ย้ายไปลงทะเบียนแล้ว') {
          noteBadge = `<div style="margin-top: 4px;"><span style="font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 4px; padding: 2px 6px; display: inline-block;">👤 ย้ายไปลงทะเบียนแล้ว</span></div>`;
        } else if (item.isDuplicate) {
          noteBadge = `<div style="margin-top: 4px;"><span style="font-size: 0.75rem; background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; padding: 2px 6px; display: inline-block;">⚠️ ชื่อซ้ำ (ปิดอัตโนมัติ)</span></div>`;
        }

        statusHtml = `
          <label class="admin-checkbox-label">
            <input type="checkbox" class="admin-toggle-checkbox prop-approve-checkbox" data-id="${item.id}" ${item.approved ? 'checked' : ''}>
            <span style="font-size: 0.95rem; color: ${item.approved ? '#6ee7b7' : '#94a3b8'};">
              ${item.approved ? 'โชว์หน้าแรก' : 'ซ่อนอยู่'}
            </span>
          </label>
          ${noteBadge}
        `;
      } else {
        statusHtml = `
          <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.95rem; color: #6ee7b7; font-weight: 600;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ผ่านเข้าร่วม
          </span>
        `;
      }

      return `
        <tr>
          <td style="color: var(--text-muted);">${index + 1}</td>
          <td>
            ${thumbHtml}
            <strong style="color: ${isProp ? '#fcd34d' : '#ffffff'};">${isProp ? '⭐ ' : ''}${escapeHtml(item.displayName || '-')}</strong>
          </td>
          <td>
            <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" style="color: ${isProp ? '#60a5fa' : '#c77dff'}; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span>${escapeHtml(item.xAccount)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </td>
          <td style="color: ${isUnknown ? '#fcd34d' : '#c4b5fd'};">${escapeHtml(zodiacLabel)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
          <td>${statusHtml}</td>
          <td>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button class="btn-edit btn-edit-entry" data-id="${item.id}" data-type="${item.entryType}" title="แก้ไข">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-delete btn-delete-entry" data-id="${item.id}" data-type="${item.entryType}" data-name="${escapeHtml(item.displayName || item.xAccount)}">ลบ</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach edit listeners
    tableBody.querySelectorAll('.btn-edit-entry').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const type = btn.getAttribute('data-type');
        const entry = (type === 'registration') 
          ? allRegistrations.find(r => r.id === id)
          : allProposals.find(p => p.id === id);
        if (entry) openEditModal(type, entry);
      };
    });

    // Attach delete listeners
    tableBody.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const type = btn.getAttribute('data-type');
        const name = btn.getAttribute('data-name');
        const label = (type === 'registration') ? 'ผู้ลงทะเบียน' : 'รายการเสนอชื่อ';

        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล${label} "${name}" ?`)) {
          try {
            if (type === 'registration') {
              await fbDeleteRegistration(id);
            } else {
              await fbDeleteProposal(id);
            }
            showToast('ลบรายการสำเร็จ', 'success');
            loadAdminData();
          } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
          }
        }
      };
    });

    // Attach proposal approve toggle listeners
    tableBody.querySelectorAll('.prop-approve-checkbox').forEach(chk => {
      chk.onchange = async () => {
        const id = chk.getAttribute('data-id');
        try {
          const updated = await fbToggleProposalApproval(id);
          showToast(updated.approved ? 'อนุมัติการเสนอชื่อแล้ว' : 'ยกเลิกการอนุมัติแล้ว', 'success');
          const prop = allProposals.find(p => p.id === id);
          if (prop) prop.approved = updated.approved;
          const approvedCount = allProposals.filter(p => p.approved).length;
          if (statApproved) statApproved.textContent = approvedCount;
          renderUnifiedTable();
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
          chk.checked = !chk.checked;
        }
      };
    });
  }

  // Filter & Search input listeners
  if (searchInput) searchInput.oninput = renderUnifiedTable;
  if (filterZodiac) filterZodiac.onchange = renderUnifiedTable;
  if (filterStatus) filterStatus.onchange = renderUnifiedTable;
  if (sortSelect) sortSelect.onchange = renderUnifiedTable;

  if (btnRefresh) {
    btnRefresh.onclick = () => {
      showToast('กำลังรีเฟรชข้อมูล...');
      loadAdminData();
    };
  }

  // Batch Clean Duplicates & Migrate Registered VTubers Button
  const btnCleanDuplicates = document.getElementById('btn-clean-duplicates');
  if (btnCleanDuplicates) {
    btnCleanDuplicates.onclick = async () => {
      btnCleanDuplicates.disabled = true;
      btnCleanDuplicates.innerHTML = '<span>กำลังสแกน...</span>';
      showToast('กำลังสแกนและตรวจสอบรายชื่อซ้ำ / ย้ายไปลงทะเบียน...', 'info');

      try {
        let result = null;
        if (typeof fbBatchCleanDuplicates === 'function') {
          result = await fbBatchCleanDuplicates();
        } else {
          const user = fbAuth.currentUser;
          let token = '';
          if (user) token = await user.getIdToken();
          const res = await fetch('/api/admin/clean-duplicates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          const json = await res.json();
          result = json.data;
        }

        const msg = result
          ? `สแกนเรียบร้อย: ปิดชื่อที่ย้ายไปลงทะเบียน ${result.convertedCount} รายการ, ปิดชื่อซ้ำ ${result.duplicateCount} รายการ`
          : 'สแกนและปรับปรุงข้อมูลชื่อซ้ำเรียบร้อยแล้ว!';
        showToast(msg, 'success');
        await loadAdminData();
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการสแกนข้อมูลชื่อซ้ำ', 'error');
      } finally {
        btnCleanDuplicates.disabled = false;
        btnCleanDuplicates.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>สแกนชื่อซ้ำ / ย้ายไปลงทะเบียน</span>
        `;
      }
    };
  }

  // Sync / Refresh All Avatars Button
  const btnSyncAvatars = document.getElementById('btn-sync-avatars');
  if (btnSyncAvatars) {
    btnSyncAvatars.onclick = async () => {
      btnSyncAvatars.disabled = true;
      btnSyncAvatars.textContent = 'กำลังอัปเดตรูป...';
      showToast('กำลังดาวน์โหลดและอัปเดตรูปโปรไฟล์ X ของทุกคน...', 'info');

      try {
        const user = fbAuth.currentUser;
        let token = '';
        if (user) {
          token = await user.getIdToken();
        }

        const res = await fetch('/api/admin/sync-avatars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'อัปเดตรูปโปรไฟล์ทั้งหมดเรียบร้อยแล้ว!', 'success');
          loadAdminData();
        } else {
          showToast(data.message || 'เกิดข้อผิดพลาดในการอัปเดต', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
      } finally {
        btnSyncAvatars.disabled = false;
        btnSyncAvatars.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          อัปเดตรูปโปรไฟล์ X
        `;
      }
    };
  }

  // Registration Open/Close Form Save
  if (regStatusForm) {
    regStatusForm.onsubmit = async (e) => {
      e.preventDefault();
      const isOpen = toggleRegStatus ? toggleRegStatus.checked : true;
      const closedMsg = settingClosedMessage ? settingClosedMessage.value.trim() : 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย';

      try {
        await fbSaveSettings({
          isRegistrationOpen: isOpen,
          registrationClosedMessage: closedMsg
        });
        showToast(`บันทึกสถานะเรียบร้อย: ${isOpen ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}`, 'success');
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการบันทึกสถานะรับสมัคร', 'error');
      }
    };
  }

  // Settings Save
  if (settingsForm) {
    settingsForm.onsubmit = async (e) => {
      e.preventDefault();
      const settingCloseDate = document.getElementById('settingCloseDate');
      const settingCloseDisplay = document.getElementById('settingCloseDisplay');

      const liveDate = settingLiveDate.value ? new Date(settingLiveDate.value).toISOString() : undefined;
      const liveDateDisplay = settingLiveDisplay.value.trim();

      const closeDate = settingCloseDate && settingCloseDate.value ? new Date(settingCloseDate.value).toISOString() : undefined;
      const closeDateDisplay = settingCloseDisplay ? settingCloseDisplay.value.trim() : undefined;

      const popupMessage = settingPopupMessage.value.trim();

      try {
        const payload = {};
        if (liveDate) payload.liveDate = liveDate;
        if (liveDateDisplay) payload.liveDateDisplay = liveDateDisplay;
        if (closeDate) payload.closeDate = closeDate;
        if (closeDateDisplay) payload.closeDateDisplay = closeDateDisplay;
        if (popupMessage !== undefined) payload.popupMessage = popupMessage;

        await fbSaveSettings(payload);
        showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
      }
    };
  }

  // ==========================================
  // Edit Modal Save Handler
  // ==========================================
  const btnSaveEdit = document.getElementById('btn-save-edit');
  if (btnSaveEdit) {
    btnSaveEdit.onclick = async () => {
      const entryId = document.getElementById('edit-entry-id').value;
      const entryType = document.getElementById('edit-entry-type').value;
      const displayName = document.getElementById('edit-displayName').value.trim();
      const xAccount = document.getElementById('edit-xAccount').value.trim();
      const zodiacKey = document.getElementById('edit-zodiacKey').value;
      let imageUrl = document.getElementById('edit-imageUrl').value.trim();
      const imageFile = document.getElementById('edit-imageFile').files[0];

      if (!displayName) {
        showToast('กรุณากรอกชื่อ', 'error');
        return;
      }
      if (!xAccount) {
        showToast('กรุณากรอกลิงก์ X', 'error');
        return;
      }

      btnSaveEdit.disabled = true;
      btnSaveEdit.textContent = 'กำลังบันทึก...';

      try {
        // If file is selected, upload first
        if (imageFile) {
          showToast('กำลังอัปโหลดรูปภาพ...', 'info');
          imageUrl = await fbUploadImage(imageFile, 'vtuber-images');
        }

        const updateData = {
          displayName,
          xAccount,
          zodiacKey,
          imageUrl: imageUrl || ''
        };

        if (entryType === 'registration') {
          await fbUpdateRegistration(entryId, updateData);
        } else {
          await fbUpdateProposal(entryId, updateData);
        }

        showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
        closeEditModal();
        loadAdminData();
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || ''), 'error');
      } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.textContent = 'บันทึก';
      }
    };
  }

  // File input change listener for preview
  const editImageFile = document.getElementById('edit-imageFile');
  if (editImageFile) {
    editImageFile.onchange = () => {
      const file = editImageFile.files[0];
      const fileName = document.getElementById('file-upload-name');
      const previewContainer = document.getElementById('edit-image-preview');
      const previewImg = document.getElementById('edit-image-preview-img');
      const clearBtn = document.getElementById('btn-clear-image');

      if (file) {
        if (fileName) fileName.textContent = file.name;
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = 'block';
          clearBtn.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Edit modal backdrop click
  const editModal = document.getElementById('edit-modal');
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
  initAdminPage();
}
