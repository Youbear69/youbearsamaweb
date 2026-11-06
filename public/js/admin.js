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
  let allLikesMap = {};
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
      initChatManagement();
      initRandom12LogsManagement();
      loadAdminRoster();
    } else {
      if (chatListenerRef && typeof rtdb !== 'undefined') {
        rtdb.ref('chat').off('value', chatListenerRef);
        chatListenerRef = null;
      }
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
      const [regs, props, stats, settings, likes] = await Promise.all([
        fbGetRegistrations(),
        fbGetProposals(),
        fbGetZodiacStats(),
        fbGetSettings(),
        typeof fbGetProposalLikes === 'function' ? fbGetProposalLikes() : {}
      ]);

      allRegistrations = regs || [];
      allProposals = props || [];
      allLikesMap = likes || {};

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

      // Update main nav tab badge
      const tabBadgeMembers = document.getElementById('tab-badge-members');
      if (tabBadgeMembers) tabBadgeMembers.textContent = totalCombined;

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
    } else if (sortVal === 'likes-desc') {
      filtered.sort((a, b) => {
        const lA = (a.entryType === 'proposal') ? (allLikesMap[a.id] || 0) : -1;
        const lB = (b.entryType === 'proposal') ? (allLikesMap[b.id] || 0) : -1;
        if (lB !== lA) return lB - lA;
        return sortDate(a, b, true);
      });
    } else if (sortVal === 'likes-asc') {
      filtered.sort((a, b) => {
        const lA = (a.entryType === 'proposal') ? (allLikesMap[a.id] || 0) : 999999;
        const lB = (b.entryType === 'proposal') ? (allLikesMap[b.id] || 0) : 999999;
        if (lA !== lB) return lA - lB;
        return sortDate(a, b, true);
      });
    } else {
      // date-desc (default)
      filtered.sort((a, b) => sortDate(a, b, true));
    }

    // 4. Render Table Body
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
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
        ? `<img src="${escapeHtml(avatarUrl)}" alt="thumb" style="width: 34px; height: 34px; border-radius: 8px; object-fit: cover; vertical-align: middle; margin-right: 8px; border: 1.5px solid ${isProp ? 'rgba(251,191,36,0.45)' : 'rgba(168,85,247,0.45)'};" onerror="if(typeof handleAvatarError==='function'){handleAvatarError(this, '${escapeHtml(item.xAccount||'')}', '${escapeHtml(item.displayName||'')}');}else{this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.displayName || 'user')}';}">`
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

      // Heart column
      let heartHtml = '';
      if (isProp) {
        const currentCount = (allLikesMap && allLikesMap[item.id] !== undefined)
          ? allLikesMap[item.id]
          : (item.likes || 0);
        heartHtml = `
          <div class="admin-heart-control" data-id="${item.id}">
            <button type="button" class="btn-heart-adjust btn-heart-minus" data-id="${item.id}" title="ลดหัวใจ -1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button type="button" class="admin-heart-count-badge" data-id="${item.id}" data-name="${escapeHtml(item.displayName || '')}" data-count="${currentCount}" title="คลิกเพื่อแก้ไขตัวเลขโดยตรง">
              <span class="heart-emoji">❤️</span>
              <span class="heart-num" id="heart-count-${item.id}">${currentCount}</span>
            </button>
            <button type="button" class="btn-heart-adjust btn-heart-plus" data-id="${item.id}" title="เพิ่มหัวใจ +1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button type="button" class="btn-heart-reset" data-id="${item.id}" data-name="${escapeHtml(item.displayName || '')}" title="รีเซ็ตเป็น 0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
            </button>
          </div>
        `;
      } else {
        heartHtml = `<span style="color: var(--text-muted); opacity: 0.5;">-</span>`;
      }

      return `
        <tr>
          <td class="col-idx" style="color: var(--text-muted);">${index + 1}</td>
          <td class="col-name">
            ${thumbHtml}
            <strong style="color: ${isProp ? '#fcd34d' : '#ffffff'};">${isProp ? '⭐ ' : ''}${escapeHtml(item.displayName || '-')}</strong>
          </td>
          <td class="col-social">
            <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" style="color: ${isProp ? '#60a5fa' : '#c77dff'}; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span>${escapeHtml(item.xAccount)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </td>
          <td class="col-zodiac" style="color: ${isUnknown ? '#fcd34d' : '#c4b5fd'};">${escapeHtml(zodiacLabel)}</td>
          <td class="col-date" style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
          <td class="col-hearts">${heartHtml}</td>
          <td class="col-status">${statusHtml}</td>
          <td class="col-actions">
            <div style="display: flex; gap: 0.4rem; align-items: center; justify-content: center;">
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

    // Attach heart minus listeners
    tableBody.querySelectorAll('.btn-heart-minus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        adminChangeLikes(id, -1);
      };
    });

    // Attach heart plus listeners
    tableBody.querySelectorAll('.btn-heart-plus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        adminChangeLikes(id, 1);
      };
    });

    // Attach heart count badge click listener (prompt custom count)
    tableBody.querySelectorAll('.admin-heart-count-badge').forEach(badge => {
      badge.onclick = (e) => {
        e.stopPropagation();
        const id = badge.getAttribute('data-id');
        const name = badge.getAttribute('data-name');
        const count = parseInt(badge.getAttribute('data-count') || '0', 10);
        adminPromptSetLikes(id, count, name);
      };
    });

    // Attach heart reset listeners
    tableBody.querySelectorAll('.btn-heart-reset').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        adminResetLikes(id, name);
      };
    });
  }

  // Heart Count Management Functions
  async function adminChangeLikes(proposalId, delta) {
    const current = (allLikesMap && allLikesMap[proposalId] !== undefined)
      ? allLikesMap[proposalId]
      : 0;
    const newCount = Math.max(0, current + delta);
    if (current === 0 && delta < 0) return; // already 0

    allLikesMap[proposalId] = newCount;
    const countEl = document.getElementById(`heart-count-${proposalId}`);
    if (countEl) countEl.textContent = newCount;
    const badge = document.querySelector(`.admin-heart-count-badge[data-id="${proposalId}"]`);
    if (badge) badge.setAttribute('data-count', newCount);

    try {
      if (typeof fbSetProposalLikes === 'function') {
        await fbSetProposalLikes(proposalId, newCount);
      }
    } catch (err) {
      console.error('Failed to change likes:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกจำนวนหัวใจ', 'error');
    }
  }

  async function adminPromptSetLikes(proposalId, currentCount, name) {
    const promptVal = prompt(`ระบุจำนวนหัวใจใหม่สำหรับ "${name}":`, currentCount || 0);
    if (promptVal === null) return;
    const newCount = parseInt(promptVal.trim(), 10);
    if (isNaN(newCount) || newCount < 0) {
      showToast('กรุณาระบุตัวเลขจำนวนเต็มบวกหรือ 0', 'error');
      return;
    }

    allLikesMap[proposalId] = newCount;
    const countEl = document.getElementById(`heart-count-${proposalId}`);
    if (countEl) countEl.textContent = newCount;
    const badge = document.querySelector(`.admin-heart-count-badge[data-id="${proposalId}"]`);
    if (badge) badge.setAttribute('data-count', newCount);

    try {
      if (typeof fbSetProposalLikes === 'function') {
        await fbSetProposalLikes(proposalId, newCount);
      }
      showToast(`เปลี่ยนจำนวนหัวใจของ "${name}" เป็น ${newCount} เรียบร้อย`, 'success');
    } catch (err) {
      console.error('Failed to set likes:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกจำนวนหัวใจ', 'error');
    }
  }

  async function adminResetLikes(proposalId, name) {
    if (!confirm(`คุณต้องการรีเซ็ตจำนวนหัวใจของ "${name}" ให้กลับเป็น 0 หรือไม่?`)) return;

    allLikesMap[proposalId] = 0;
    const countEl = document.getElementById(`heart-count-${proposalId}`);
    if (countEl) countEl.textContent = 0;
    const badge = document.querySelector(`.admin-heart-count-badge[data-id="${proposalId}"]`);
    if (badge) badge.setAttribute('data-count', 0);

    try {
      if (typeof fbResetProposalLikes === 'function') {
        await fbResetProposalLikes(proposalId);
      }
      showToast(`รีเซ็ตจำนวนหัวใจของ "${name}" เป็น 0 เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error('Failed to reset likes:', err);
      showToast('เกิดข้อผิดพลาดในการรีเซ็ตหัวใจ', 'error');
    }
  }

  // Real-time listener for proposal likes
  if (typeof fbListenProposalLikes === 'function') {
    fbListenProposalLikes((updatedLikes) => {
      allLikesMap = updatedLikes || {};
      for (const [id, count] of Object.entries(allLikesMap)) {
        const countEl = document.getElementById(`heart-count-${id}`);
        if (countEl) countEl.textContent = count;
        const badge = document.querySelector(`.admin-heart-count-badge[data-id="${id}"]`);
        if (badge) badge.setAttribute('data-count', count);
      }
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

  // Reset All Likes Button
  const btnResetAllLikes = document.getElementById('btn-reset-all-likes');
  if (btnResetAllLikes) {
    btnResetAllLikes.onclick = async () => {
      const confirmFirst = confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตจำนวนหัวใจของทุกคนทั้งหมดเป็น 0 ?\n(การกระทำนี้จะเปลี่ยนหัวใจของทุกคนในระบบเป็น 0)');
      if (!confirmFirst) return;

      try {
        btnResetAllLikes.disabled = true;
        if (typeof fbResetAllProposalLikes === 'function') {
          await fbResetAllProposalLikes();
        }
        allLikesMap = {};
        showToast('รีเซ็ตหัวใจทุกคนเป็น 0 เรียบร้อยแล้ว', 'success');
        renderUnifiedTable();
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการรีเซ็ตหัวใจทั้งหมด', 'error');
      } finally {
        btnResetAllLikes.disabled = false;
      }
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

  // ==========================================
  // Live Chat Management Logic (Admin Log & Deletion)
  // ==========================================
  const chatTableBody = document.getElementById('admin-chat-table-body');
  const chatCountEl = document.getElementById('admin-chat-count');
  const chatSearchInput = document.getElementById('admin-chat-search');
  const chatFilterRole = document.getElementById('admin-chat-filter-role');
  const btnClearAllChat = document.getElementById('btn-clear-all-chat');
  
  let allChatList = [];
  let chatListenerRef = null;

  function initChatManagement() {
    if (chatListenerRef && typeof rtdb !== 'undefined') {
      rtdb.ref('chat').off('value', chatListenerRef);
    }

    if (typeof rtdb !== 'undefined' && rtdb) {
      chatListenerRef = rtdb.ref('chat').orderByChild('timestamp').limitToLast(500).on('value', (snap) => {
        const data = snap.val();
        allChatList = [];
        if (data) {
          Object.keys(data).forEach(key => {
            const item = data[key];
            if (item && item.message) {
              const badWord = typeof containsProfanity === 'function' ? containsProfanity(item.message) : null;
              if (badWord) {
                // Auto-delete from Firebase RTDB
                rtdb.ref('chat/' + key).remove().catch(() => {});
                return;
              }
            }
            allChatList.push({
              key: key,
              ...item
            });
          });
          // Sort newest first
          allChatList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }
        const tabBadgeChat = document.getElementById('tab-badge-chat');
        if (tabBadgeChat) tabBadgeChat.textContent = allChatList.length;
        renderChatTable();
      }, (err) => {
        console.error('Chat sync error:', err);
        if (chatTableBody) {
          chatTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171; padding: 2rem;">เกิดข้อผิดพลาดในการโหลดแชท: ${err.message}</td></tr>`;
        }
      });
    }
  }

  function renderChatTable() {
    if (!chatTableBody) return;

    const query = (chatSearchInput ? chatSearchInput.value : '').toLowerCase().trim();
    const roleFilter = chatFilterRole ? chatFilterRole.value : '';

    const filtered = allChatList.filter(item => {
      // Search by message, username, or display name
      const matchSearch = !query ||
        (item.message && item.message.toLowerCase().includes(query)) ||
        (item.username && item.username.toLowerCase().includes(query)) ||
        (item.displayName && item.displayName.toLowerCase().includes(query));

      // Role filter
      let matchRole = true;
      if (roleFilter === 'admin') matchRole = Boolean(item.isAdmin);
      else if (roleFilter === 'vtuber') matchRole = Boolean(item.isVtuber && !item.isAdmin);
      else if (roleFilter === 'normal') matchRole = !item.isAdmin && !item.isVtuber;

      return matchSearch && matchRole;
    });

    if (chatCountEl) chatCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
      chatTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
            ${allChatList.length === 0 ? 'ยังไม่มีข้อความแชทในระบบ' : 'ไม่พบข้อความแชทตามเงื่อนไขที่ค้นหา'}
          </td>
        </tr>`;
      return;
    }

    chatTableBody.innerHTML = filtered.map(msg => {
      // Timestamp
      let timeStr = '-';
      if (msg.timestamp) {
        const d = new Date(msg.timestamp);
        const pad = (n) => String(n).padStart(2, '0');
        timeStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }

      // Role badge
      let roleBadge = '<span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.8rem; background: rgba(59, 130, 246, 0.18); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3);">💬 ผู้ใช้ทั่วไป</span>';
      let nameColor = '#ede9fe';

      if (msg.isAdmin) {
        roleBadge = '<span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.8rem; background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.45); font-weight: 700;">👑 แอดมิน</span>';
        nameColor = '#facc15';
      } else if (msg.isVtuber) {
        roleBadge = '<span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.8rem; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.45); font-weight: 700;">✨ วีทูบเบอร์</span>';
        nameColor = '#4ade80';
      }

      const displayName = escapeHtml(msg.displayName || msg.username || '-');
      const username = escapeHtml(msg.username || '-');
      const messageText = escapeHtml(msg.message || '');

      let mediaPreviewHtml = '';
      if (msg.imageUrl) {
        mediaPreviewHtml = `
          <div style="margin-top: 6px;">
            <a href="${escapeHtml(msg.imageUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 0.82rem; font-weight: 600; text-decoration: none; transition: all 0.2s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>🖼️ ดูรูปภาพแนบ</span>
            </a>
          </div>
        `;
      }

      return `
        <tr>
          <td style="color: #94a3b8; font-size: 0.88rem; white-space: nowrap;">${timeStr}</td>
          <td>
            <div style="font-weight: 700; color: ${nameColor}; font-size: 0.98rem;">${displayName}</div>
            ${username !== displayName ? `<div style="font-size: 0.82rem; color: #94a3b8;">@${username}</div>` : ''}
          </td>
          <td>${roleBadge}</td>
          <td style="word-break: break-word; color: #ffffff; font-size: 0.96rem; max-width: 340px; line-height: 1.4;">
            ${messageText ? `<div>${messageText}</div>` : ''}
            ${mediaPreviewHtml}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-action-delete" onclick="window.adminDeleteChatMessage('${msg.key}')" title="ลบข้อความนี้" style="padding: 0.4rem 0.7rem; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; transition: all 0.2s ease;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>ลบ</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Delete single chat message
  window.adminDeleteChatMessage = async function(key) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อความนี้?')) return;
    try {
      await rtdb.ref('chat/' + key).remove();
      showToast('ลบข้อความสำเร็จ', 'success');
    } catch (err) {
      console.error('Delete chat message failed:', err);
      showToast('เกิดข้อผิดพลาดในการลบ: ' + err.message, 'error');
    }
  };

  // Clear all chat messages
  if (btnClearAllChat) {
    btnClearAllChat.onclick = async () => {
      if (!confirm('⚠️ คำเตือน: คุณต้องการล้างข้อความแชททั้งหมดใช่หรือไม่?\\n(การกระทำนี้ไม่สามารถย้อนกลับได้)')) return;
      try {
        await rtdb.ref('chat').remove();
        showToast('ล้างข้อความแชททั้งหมดเรียบร้อยแล้ว', 'success');
      } catch (err) {
        console.error('Clear chat messages failed:', err);
        showToast('เกิดข้อผิดพลาดในการล้างแชท: ' + err.message, 'error');
      }
    };
  }

  // Search & filter event listeners
  if (chatSearchInput) {
    chatSearchInput.addEventListener('input', renderChatTable);
  }
  if (chatFilterRole) {
    chatFilterRole.addEventListener('change', renderChatTable);
  }

  // ==========================================
  // Admin Main Navigation Tabs Switching
  // ==========================================
  function switchAdminMainTab(tabKey) {
    const tabs = document.querySelectorAll('.admin-main-tab-btn');
    const panes = document.querySelectorAll('.admin-tab-pane');

    tabs.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    panes.forEach(pane => {
      if (pane.id === `admin-pane-${tabKey}`) {
        pane.style.display = 'block';
        pane.classList.add('active');
      } else {
        pane.style.display = 'none';
        pane.classList.remove('active');
      }
    });

    if (tabKey === 'random12' && typeof window.loadRandom12Logs === 'function') {
      window.loadRandom12Logs();
    }
    if (tabKey === 'roster' && typeof window.loadAdminRoster === 'function') {
      window.loadAdminRoster();
    }
    if (tabKey === 'links' && typeof window.renderAdminLinksDirectory === 'function') {
      window.renderAdminLinksDirectory();
    }
  }
  window.switchAdminMainTab = switchAdminMainTab;

  // ==========================================
  // Random 12 Logs Management
  // ==========================================
  function initRandom12LogsManagement() {
    const logsListEl = document.getElementById('random12-logs-list');
    const logsEmptyEl = document.getElementById('random12-logs-empty');
    const badgeRandom12 = document.getElementById('tab-badge-random12');
    const btnRefreshLogs = document.getElementById('btn-refresh-random12-logs');
    const btnClearAllLogs = document.getElementById('btn-clear-all-random12-logs');

    let random12LogsCache = [];

    async function loadRandom12Logs() {
      if (!logsListEl) return;
      try {
        let localLogs = [];
        let firebaseLogs = [];

        // 1. Fetch from local machine server disk
        try {
          const res = await fetch('/api/random12/logs');
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.data)) {
              localLogs = data.data;
            }
          }
        } catch (e) {
          console.warn('Local log fetch notice:', e);
        }

        // 2. Fetch from Firebase RTDB online
        try {
          if (typeof fbGetRandom12Logs === 'function') {
            firebaseLogs = await fbGetRandom12Logs();
          } else {
            const snap = await rtdb.ref('random12_logs').once('value');
            const val = snap.val();
            firebaseLogs = val ? Object.values(val) : [];
          }
        } catch (e) {
          console.warn('Firebase log fetch notice:', e);
        }

        // Merge unique by id
        const map = new Map();
        localLogs.forEach(l => { if (l && l.id) map.set(l.id, l); });
        firebaseLogs.forEach(l => { if (l && l.id) map.set(l.id, l); });

        random12LogsCache = Array.from(map.values());
        random12LogsCache.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (badgeRandom12) {
          badgeRandom12.textContent = random12LogsCache.length;
        }

        renderRandom12Logs();
      } catch (err) {
        console.error('Failed to load random12 logs:', err);
      }
    }
    window.loadRandom12Logs = loadRandom12Logs;

    function renderRandom12Logs() {
      if (!logsListEl) return;

      if (!random12LogsCache || random12LogsCache.length === 0) {
        if (logsEmptyEl) logsEmptyEl.style.display = 'block';
        logsListEl.innerHTML = '';
        return;
      }

      if (logsEmptyEl) logsEmptyEl.style.display = 'none';

      logsListEl.innerHTML = random12LogsCache.map(log => {
        let timeStr = '-';
        if (log.timestamp) {
          const d = new Date(log.timestamp);
          const pad = n => String(n).padStart(2, '0');
          timeStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }

        const isReg = log.mode === 'registered';
        const modeBadge = isReg
          ? '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; background: rgba(124, 58, 237, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4);">👤 สุ่มลงทะเบียน</span>'
          : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4);">⭐ สุ่มเสนอชื่อ</span>';

        const results = log.results || [];

        const zodiacsHtml = results.map(r => {
          const winnersList = (r.winners || []).map(w => {
            const avatar = w.imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(w.displayName || '?')}&backgroundColor=7c3aed&textColor=ffffff`;
            return `
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 8px; padding: 4px 8px; font-size: 0.82rem; min-width: 0; overflow: hidden;">
                <img src="${escapeHtml(avatar)}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=VT&backgroundColor=7c3aed&textColor=ffffff'">
                <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <span style="color: #ffffff; font-weight: 600;">${escapeHtml(w.displayName)}</span>
                  ${w.xAccount ? `<span style="color: #94a3b8; font-size: 0.72rem; margin-left: 4px;">@${escapeHtml(w.xAccount.replace(/^https?:\/\/(x|twitter)\.com\//, '').replace(/^@/, ''))}</span>` : ''}
                </div>
              </div>
            `;
          }).join('');

          return `
            <div style="background: rgba(15, 9, 36, 0.6); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #a78bfa; display: flex; align-items: center; justify-content: space-between;">
                <span>ราศี${escapeHtml(r.zodiacNameTh || r.zodiacKey)} (${escapeHtml(r.zodiacNameEn || '')})</span>
                <span style="font-size: 0.75rem; color: #cbd5e1; background: rgba(139, 92, 246, 0.2); padding: 1px 7px; border-radius: 10px;">${(r.winners || []).length} คน</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${winnersList || '<span style="color: #64748b; font-size: 0.78rem;">ไม่มีผู้สุ่มได้</span>'}
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="admin-card" style="padding: 1.2rem; border: 1.5px solid rgba(139, 92, 246, 0.28); background: rgba(21, 12, 51, 0.75); margin-bottom: 0;">
            <!-- Top Bar of Log Card -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(139, 92, 246, 0.2); padding-bottom: 0.8rem;">
              <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                <span style="color: #ffffff; font-size: 0.95rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  ${timeStr}
                </span>
                ${modeBadge}
                <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; background: rgba(56, 189, 248, 0.15); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.35); font-weight: 600;">
                  สุ่มราศีละ ${log.picksPerZodiac || 1} คน
                </span>
                <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; background: rgba(52, 211, 153, 0.15); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.35); font-weight: 600;">
                  รวมได้ทั้งหมด ${log.totalWinners || 0} คน (${log.zodiacCount || results.length} ราศี)
                </span>
              </div>
              <button type="button" onclick="window.adminDeleteRandom12Log('${log.id}')" class="btn-propose" style="padding: 0.35rem 0.8rem; font-size: 0.85rem; border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; background: rgba(239, 68, 68, 0.12); display: inline-flex; align-items: center; gap: 4px;" title="ลบรายการนี้">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>ลบรายการนี้</span>
              </button>
            </div>

            <!-- 12 Zodiac Winners Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
              ${zodiacsHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    window.adminDeleteRandom12Log = async function(id) {
      if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการสุ่มรายการนี้?')) return;
      try {
        await Promise.allSettled([
          fetch('/api/random12/logs/' + encodeURIComponent(id), { method: 'DELETE' }),
          typeof fbDeleteRandom12Log === 'function' ? fbDeleteRandom12Log(id) : rtdb.ref('random12_logs/' + id).remove()
        ]);
        showToast('ลบประวัติการสุ่มสำเร็จ', 'success');
        loadRandom12Logs();
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลบ: ' + err.message, 'error');
      }
    };

    if (btnClearAllLogs) {
      btnClearAllLogs.onclick = async () => {
        if (!confirm('⚠️ คำเตือน: คุณต้องการล้างประวัติการสุ่ม 12 ราศีทั้งหมดใช่หรือไม่?\n(การกระทำนี้จะล้างประวัติทั้งบนเครื่องนี้และบนระบบออนไลน์อย่างถาวร)')) return;
        try {
          await Promise.allSettled([
            fetch('/api/random12/logs', { method: 'DELETE' }),
            typeof fbClearAllRandom12Logs === 'function' ? fbClearAllRandom12Logs() : rtdb.ref('random12_logs').remove()
          ]);
          showToast('ล้างประวัติการสุ่มทั้งหมดเรียบร้อยแล้ว', 'success');
          loadRandom12Logs();
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการล้างประวัติ: ' + err.message, 'error');
        }
      };
    }

    if (btnRefreshLogs) {
      btnRefreshLogs.onclick = () => {
        loadRandom12Logs();
        showToast('รีเฟรชประวัติการสุ่มแล้ว', 'success');
      };
    }

    // Initial load
    loadRandom12Logs();
  }

  // ==========================================
  // 12 Zodiac Roster Management
  // ==========================================
  let adminRosterData = { registered: {}, nominated: {} };
  let adminRosterCat = 'registered';
  let activePickTarget = null; // { zodiacKey, index }
  let currentRosterPickMode = 'matching'; // 'matching' | 'all' | 'custom'

  const SAFE_ZODIACS = (typeof ZODIAC_LIST !== 'undefined' && ZODIAC_LIST.length) ? ZODIAC_LIST : [
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

  async function loadAdminRoster() {
    try {
      const res = await fetch('/api/roster');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          adminRosterData = json.data;
          if (!adminRosterData.registered) adminRosterData.registered = {};
          if (!adminRosterData.nominated) adminRosterData.nominated = {};

          updateRosterCountBadges();
          renderAdminRoster();
        }
      }
    } catch (err) {
      console.error('Failed to load admin roster:', err);
      showToast('ไม่สามารถดึงข้อมูลรายชื่อผู้ได้เล่นได้', 'error');
    }
  }
  window.loadAdminRoster = loadAdminRoster;

  function updateRosterCountBadges() {
    let regCount = 0;
    let nomCount = 0;
    Object.values(adminRosterData.registered || {}).forEach(arr => regCount += (arr || []).length);
    Object.values(adminRosterData.nominated || {}).forEach(arr => nomCount += (arr || []).length);

    const badge = document.getElementById('tab-badge-roster');
    if (badge) badge.textContent = regCount + nomCount;

    const lblReg = document.getElementById('count-label-registered');
    if (lblReg) lblReg.textContent = regCount;

    const lblNom = document.getElementById('count-label-nominated');
    if (lblNom) lblNom.textContent = nomCount;

    const ind = document.getElementById('admin-roster-total-indicator');
    if (ind) {
      const curCount = (adminRosterCat === 'registered') ? regCount : nomCount;
      ind.textContent = `รวมทั้งหมดในกลุ่มนี้: ${curCount} คน`;
    }
  }

  function switchAdminRosterCategory(cat) {
    adminRosterCat = cat;
    const btnReg = document.getElementById('admin-roster-tab-registered');
    const btnNom = document.getElementById('admin-roster-tab-nominated');

    if (cat === 'registered') {
      if (btnReg) {
        btnReg.className = 'btn-secondary active';
        btnReg.style.background = 'rgba(168, 85, 247, 0.2)';
        btnReg.style.borderColor = 'rgba(168, 85, 247, 0.6)';
        btnReg.style.color = '#fff';
      }
      if (btnNom) {
        btnNom.className = 'btn-secondary';
        btnNom.style.background = 'transparent';
        btnNom.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        btnNom.style.color = '#cbd5e1';
      }
    } else {
      if (btnNom) {
        btnNom.className = 'btn-secondary active';
        btnNom.style.background = 'rgba(236, 72, 153, 0.2)';
        btnNom.style.borderColor = 'rgba(244, 114, 182, 0.6)';
        btnNom.style.color = '#fff';
      }
      if (btnReg) {
        btnReg.className = 'btn-secondary';
        btnReg.style.background = 'transparent';
        btnReg.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        btnReg.style.color = '#cbd5e1';
      }
    }
    updateRosterCountBadges();
    renderAdminRoster();
  }
  window.switchAdminRosterCategory = switchAdminRosterCategory;

  // Batch set number of player slots for all 12 signs in current category
  window.batchSetRosterSlots = function(targetCount) {
    if (!adminRosterData[adminRosterCat]) adminRosterData[adminRosterCat] = {};
    const catData = adminRosterData[adminRosterCat];

    SAFE_ZODIACS.forEach(z => {
      if (!catData[z.key]) catData[z.key] = [];
      const currentArr = catData[z.key];

      if (currentArr.length < targetCount) {
        // Add slots
        while (currentArr.length < targetCount) {
          currentArr.push({
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            displayName: '',
            xAccount: '',
            imageUrl: ''
          });
        }
      } else if (currentArr.length > targetCount) {
        // Trim excess slots
        catData[z.key] = currentArr.slice(0, targetCount);
      }
    });

    updateRosterCountBadges();
    renderAdminRoster();
    showToast(`ปรับจำนวนผู้เล่นเป็นราศีละ ${targetCount} คน เรียบร้อย (อย่าลืมกดบันทึก)`, 'info');
  };

  function renderAdminRoster() {
    const grid = document.getElementById('admin-roster-zodiac-grid');
    if (!grid) return;

    const currentCatData = adminRosterData[adminRosterCat] || {};

    grid.innerHTML = SAFE_ZODIACS.map(z => {
      const players = currentCatData[z.key] || [];
      const count = players.length;

      let playersHtml = players.map((p, idx) => {
        const avatar = p.imageUrl || '/assets/images/mascot/not-speak.png';
        return `
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
              <span style="font-size: 0.78rem; font-weight: 700; color: #a78bfa;">ช่อง #${idx + 1}</span>
              <button type="button" class="btn-secondary" style="padding: 1px 7px; font-size: 0.75rem; color: #fca5a5; border-color: rgba(239, 68, 68, 0.35); background: rgba(239,68,68,0.08);" onclick="removeAdminRosterPlayer('${z.key}', ${idx})" title="ลบช่องนี้">
                ✕ ลบช่อง
              </button>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <img src="${escapeHtml(avatar)}" onerror="this.onerror=null; this.src='/assets/images/mascot/not-speak.png';" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(168,85,247,0.5); flex-shrink: 0;" title="${escapeHtml(p.displayName || 'VTuber')}">
              <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <input type="text" class="form-input" style="padding: 4px 8px; font-size: 0.92rem;" placeholder="ชื่อ VTuber" value="${escapeHtml(p.displayName || '')}" oninput="updateRosterField('${z.key}', ${idx}, 'displayName', this.value)">
                <input type="text" class="form-input" style="padding: 4px 8px; font-size: 0.85rem;" placeholder="ลิงก์ X หรือ @username" value="${escapeHtml(p.xAccount || '')}" oninput="updateRosterField('${z.key}', ${idx}, 'xAccount', this.value)">
              </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <input type="text" class="form-input" style="padding: 3px 8px; font-size: 0.82rem; flex: 1;" placeholder="URL รูปภาพโปรไฟล์" value="${escapeHtml(p.imageUrl || '')}" oninput="updateRosterField('${z.key}', ${idx}, 'imageUrl', this.value)">
              <button type="button" class="btn-secondary" style="padding: 3px 10px; font-size: 0.82rem; white-space: nowrap; border-color: #a855f7; color: #e9d5ff; background: rgba(168,85,247,0.15);" onclick="openRosterPickModal('${z.key}', ${idx})">
                👥 เลือกคน
              </button>
            </div>
          </div>
        `;
      }).join('');

      if (players.length === 0) {
        playersHtml = `<div style="text-align: center; color: var(--text-muted); padding: 1.2rem 0; font-size: 0.88rem;">ยังไม่มีช่องผู้เล่นในราศีนี้ (กดปุ่ม + เพิ่มช่อง)</div>`;
      }

      return `
        <div class="admin-card" style="padding: 1rem; border: 1.5px solid rgba(139, 92, 246, 0.3); border-radius: 16px; background: rgba(18, 12, 38, 0.65);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="/assets/images/white/${z.icon}" style="width: 22px; height: 22px; object-fit: contain;">
              <strong style="color: #fff; font-size: 1.05rem;">${z.th}</strong>
              <span style="color: #a78bfa; font-size: 0.88rem;">(${z.en})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="background: rgba(139, 92, 246, 0.25); color: #cbd5e1; padding: 2px 8px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;">${count} คน</span>
              <button type="button" class="btn-primary" style="padding: 3px 9px; font-size: 0.82rem; font-weight: 700;" onclick="addAdminRosterPlayer('${z.key}')">
                + เพิ่มช่อง
              </button>
            </div>
          </div>
          <div>${playersHtml}</div>
        </div>
      `;
    }).join('');
  }
  window.renderAdminRoster = renderAdminRoster;

  window.updateRosterField = function(zodiacKey, idx, field, val) {
    if (!adminRosterData[adminRosterCat]) adminRosterData[adminRosterCat] = {};
    if (!adminRosterData[adminRosterCat][zodiacKey]) adminRosterData[adminRosterCat][zodiacKey] = [];
    if (adminRosterData[adminRosterCat][zodiacKey][idx]) {
      adminRosterData[adminRosterCat][zodiacKey][idx][field] = val;
    }
  };

  window.addAdminRosterPlayer = function(zodiacKey) {
    if (!adminRosterData[adminRosterCat]) adminRosterData[adminRosterCat] = {};
    if (!adminRosterData[adminRosterCat][zodiacKey]) adminRosterData[adminRosterCat][zodiacKey] = [];
    adminRosterData[adminRosterCat][zodiacKey].push({
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      displayName: '',
      xAccount: '',
      imageUrl: ''
    });
    updateRosterCountBadges();
    renderAdminRoster();
  };

  window.removeAdminRosterPlayer = function(zodiacKey, idx) {
    if (adminRosterData[adminRosterCat] && adminRosterData[adminRosterCat][zodiacKey]) {
      adminRosterData[adminRosterCat][zodiacKey].splice(idx, 1);
      updateRosterCountBadges();
      renderAdminRoster();
    }
  };

  // Open Picker Modal
  window.openRosterPickModal = function(zodiacKey, idx) {
    activePickTarget = { zodiacKey, index: idx };
    const modal = document.getElementById('roster-pick-modal');
    if (!modal) return;

    const zMeta = SAFE_ZODIACS.find(z => z.key === zodiacKey) || { th: zodiacKey, en: '' };
    const titleEl = document.getElementById('roster-pick-title');
    if (titleEl) {
      titleEl.textContent = `เลือกผู้เล่นสำหรับราศี${zMeta.th} (${zMeta.en}) - ช่อง #${idx + 1}`;
    }

    modal.classList.add('show');
    const searchInput = document.getElementById('roster-pick-search');
    if (searchInput) searchInput.value = '';

    // Reset custom inputs
    const cName = document.getElementById('custom-roster-name');
    const cX = document.getElementById('custom-roster-x');
    const cImg = document.getElementById('custom-roster-image');
    const cPrev = document.getElementById('custom-roster-preview-img');
    if (cName) cName.value = '';
    if (cX) cX.value = '';
    if (cImg) cImg.value = '';
    if (cPrev) cPrev.src = '/assets/images/mascot/not-speak.png';

    setRosterPickMode('matching');
  };

  window.closeRosterPickModal = function() {
    const modal = document.getElementById('roster-pick-modal');
    if (modal) modal.classList.remove('show');
    activePickTarget = null;
  };

  window.setRosterPickMode = function(mode) {
    currentRosterPickMode = mode;
    const btnMatch = document.getElementById('roster-mode-matching');
    const btnAll = document.getElementById('roster-mode-all');
    const btnCustom = document.getElementById('roster-mode-custom');
    const listSection = document.getElementById('roster-pick-list-section');
    const customSection = document.getElementById('roster-pick-custom-section');

    const zMeta = activePickTarget ? SAFE_ZODIACS.find(z => z.key === activePickTarget.zodiacKey) : null;
    if (btnMatch && zMeta) {
      btnMatch.textContent = `🎯 ตรงตามราศี (${zMeta.th})`;
    }

    [btnMatch, btnAll, btnCustom].forEach(b => {
      if (!b) return;
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.borderColor = 'rgba(255,255,255,0.15)';
      b.style.color = '#cbd5e1';
    });

    if (mode === 'matching') {
      if (btnMatch) {
        btnMatch.classList.add('active');
        btnMatch.style.background = 'rgba(168,85,247,0.25)';
        btnMatch.style.borderColor = '#a855f7';
        btnMatch.style.color = '#fff';
      }
      if (listSection) listSection.style.display = 'block';
      if (customSection) customSection.style.display = 'none';
      renderRosterPickList();
    } else if (mode === 'all') {
      if (btnAll) {
        btnAll.classList.add('active');
        btnAll.style.background = 'rgba(168,85,247,0.25)';
        btnAll.style.borderColor = '#a855f7';
        btnAll.style.color = '#fff';
      }
      if (listSection) listSection.style.display = 'block';
      if (customSection) customSection.style.display = 'none';
      renderRosterPickList();
    } else if (mode === 'custom') {
      if (btnCustom) {
        btnCustom.classList.add('active');
        btnCustom.style.background = 'rgba(56,189,248,0.25)';
        btnCustom.style.borderColor = '#38bdf8';
        btnCustom.style.color = '#fff';
      }
      if (listSection) listSection.style.display = 'none';
      if (customSection) customSection.style.display = 'block';
    }
  };

  window.filterRosterApplicants = function(query) {
    renderRosterPickList(query);
  };

  function renderRosterPickList(query) {
    const listEl = document.getElementById('roster-pick-list');
    if (!listEl) return;

    const q = (query !== undefined ? query : (document.getElementById('roster-pick-search')?.value || '')).toLowerCase().trim();
    const all = [
      ...(allRegistrations || []).map(r => ({ ...r, source: 'ลงทะเบียน' })),
      ...(allProposals || []).map(p => ({ ...p, source: 'เสนอชื่อ' }))
    ];

    let filtered = all.filter(item => {
      // Sign matching
      if (currentRosterPickMode === 'matching' && activePickTarget) {
        if (item.zodiacKey !== activePickTarget.zodiacKey) return false;
      }
      if (!q) return true;
      const name = (item.displayName || '').toLowerCase();
      const xAcc = (item.xAccount || '').toLowerCase();
      const zod = (item.zodiacNameTh || '').toLowerCase();
      return name.includes(q) || xAcc.includes(q) || zod.includes(q);
    });

    if (filtered.length === 0) {
      const modeText = currentRosterPickMode === 'matching' ? 'ในราศีนี้' : '';
      listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">ไม่พบรายชื่อผู้สมัคร${modeText} ${q ? `ที่ตรงกับ "${escapeHtml(q)}"` : ''}<br><span style="font-size: 0.85rem; color: #a78bfa;">สามารถกดแท็บ "เลือกใครก็ได้" หรือ "เพิ่มคนใหม่เอง" ได้</span></div>`;
      return;
    }

    listEl.innerHTML = filtered.slice(0, 80).map(item => {
      const avatar = item.imageUrl || '/assets/images/mascot/not-speak.png';
      const zodLabel = item.zodiacNameTh || 'ไม่ทราบราศี';
      const isTargetZodiac = activePickTarget && item.zodiacKey === activePickTarget.zodiacKey;

      return `
        <div onclick="selectApplicantForRoster('${item.id}', '${item.source}')" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid ${isTargetZodiac ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}; border-radius: 10px; cursor: pointer; transition: all 0.15s;" onmouseover="this.style.background='rgba(139,92,246,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
          <img src="${escapeHtml(avatar)}" onerror="this.onerror=null; this.src='/assets/images/mascot/not-speak.png';" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1.5px solid ${isTargetZodiac ? '#a855f7' : 'rgba(255,255,255,0.1)'};">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.displayName || 'VTuber')}</div>
            <div style="font-size: 0.8rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.xAccount || '')}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
            <span style="font-size: 0.78rem; background: ${isTargetZodiac ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}; color: ${isTargetZodiac ? '#c4b5fd' : '#94a3b8'}; padding: 2px 7px; border-radius: 10px;">${escapeHtml(zodLabel)}</span>
            <span style="font-size: 0.72rem; color: ${item.source === 'ลงทะเบียน' ? '#38bdf8' : '#fbbf24'};">${item.source}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  window.selectApplicantForRoster = function(id, source) {
    if (!activePickTarget) return;
    const { zodiacKey, index } = activePickTarget;

    const list = (source === 'ลงทะเบียน') ? allRegistrations : allProposals;
    const applicant = list.find(m => m.id === id);
    if (!applicant) return;

    if (!adminRosterData[adminRosterCat]) adminRosterData[adminRosterCat] = {};
    if (!adminRosterData[adminRosterCat][zodiacKey]) adminRosterData[adminRosterCat][zodiacKey] = [];
    if (adminRosterData[adminRosterCat][zodiacKey][index]) {
      adminRosterData[adminRosterCat][zodiacKey][index].displayName = applicant.displayName || '';
      adminRosterData[adminRosterCat][zodiacKey][index].xAccount = applicant.xAccount || '';
      adminRosterData[adminRosterCat][zodiacKey][index].imageUrl = applicant.imageUrl || '';
    }

    closeRosterPickModal();
    renderAdminRoster();
    showToast(`เลือก "${applicant.displayName}" สำเร็จ`, 'success');
  };

  // Fetch avatar for custom VTuber form
  window.fetchCustomRosterAvatar = async function() {
    const xInput = document.getElementById('custom-roster-x');
    const nameInput = document.getElementById('custom-roster-name');
    const imgInput = document.getElementById('custom-roster-image');
    const prevImg = document.getElementById('custom-roster-preview-img');

    const xVal = (xInput ? xInput.value : '').trim();
    const nameVal = (nameInput ? nameInput.value : '').trim();

    if (!xVal) {
      showToast('กรุณากรอกลิงก์ X หรือ @username ก่อนกดดึงรูป', 'error');
      return;
    }

    showToast('กำลังดึงรูปโปรไฟล์จาก X...', 'info');
    try {
      const res = await fetch('/api/roster/fetch-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xAccount: xVal, displayName: nameVal })
      });
      const data = await res.json();
      if (data && data.success && data.imageUrl) {
        if (imgInput) imgInput.value = data.imageUrl;
        if (prevImg) prevImg.src = data.imageUrl;
        showToast('ดึงรูปโปรไฟล์สำเร็จ!', 'success');
      } else {
        showToast('ไม่สามารถดึงรูปโปรไฟล์ได้ สามารถกรอก URL เองได้', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการดึงรูป', 'error');
    }
  };

  window.submitCustomRosterPlayer = function() {
    if (!activePickTarget) return;
    const { zodiacKey, index } = activePickTarget;

    const nameInput = document.getElementById('custom-roster-name');
    const xInput = document.getElementById('custom-roster-x');
    const imgInput = document.getElementById('custom-roster-image');

    const nameVal = (nameInput ? nameInput.value : '').trim();
    const xVal = (xInput ? xInput.value : '').trim();
    const imgVal = (imgInput ? imgInput.value : '').trim();

    if (!nameVal) {
      showToast('กรุณาระบุชื่อ VTuber', 'error');
      return;
    }

    if (!adminRosterData[adminRosterCat]) adminRosterData[adminRosterCat] = {};
    if (!adminRosterData[adminRosterCat][zodiacKey]) adminRosterData[adminRosterCat][zodiacKey] = [];
    if (adminRosterData[adminRosterCat][zodiacKey][index]) {
      adminRosterData[adminRosterCat][zodiacKey][index].displayName = nameVal;
      adminRosterData[adminRosterCat][zodiacKey][index].xAccount = xVal;
      adminRosterData[adminRosterCat][zodiacKey][index].imageUrl = imgVal;
    }

    closeRosterPickModal();
    renderAdminRoster();
    showToast(`เพิ่ม "${nameVal}" ลงในช่องเรียบร้อย`, 'success');
  };

  window.saveAdminRoster = async function() {
    const btn = document.getElementById('btn-save-roster');
    try {
      if (btn) btn.disabled = true;

      const user = fbAuth.currentUser;
      let token = '';
      if (user) {
        token = await user.getIdToken();
      }

      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-dev': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ roster: adminRosterData })
      });

      const json = await res.json();
      if (json.success) {
        showToast('บันทึกรายชื่อผู้ได้เล่นสำเร็จเรียบร้อย!', 'success');
      } else {
        showToast('เกิดข้อผิดพลาด: ' + (json.message || 'ไม่สามารถบันทึกได้'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.resetAdminRosterToDefault = async function() {
    if (!confirm('คุณต้องการรีเซ็ตรายชื่อผู้ได้เล่นเป็นค่าเริ่มต้นตามภาพตัวอย่างใช่หรือไม่?\n(ข้อมูลที่แก้ไขไว้จะถูกแทนที่ด้วยข้อมูลตั้งต้น)')) {
      return;
    }

    try {
      const user = fbAuth.currentUser;
      let token = '';
      if (user) {
        token = await user.getIdToken();
      }

      const res = await fetch('/api/roster/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-dev': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const json = await res.json();
      if (json.success) {
        adminRosterData = json.data;
        updateRosterCountBadges();
        renderAdminRoster();
        showToast('รีเซ็ตรายชื่อเป็นค่าเริ่มต้นสำเร็จ!', 'success');
      } else {
        showToast('เกิดข้อผิดพลาด: ' + (json.message || 'ไม่สามารถรีเซ็ตได้'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  };

  // ==========================================
  // Links Directory (Tab 7)
  // ==========================================
  window.renderAdminLinksDirectory = function() {
    const container = document.getElementById('admin-links-directory-container');
    if (!container) return;

    const origin = window.location.origin;

    const sections = [
      {
        title: 'หน้าสำหรับคนดู / ผู้ชมทั่วไป (Public Pages)',
        color: '#a855f7',
        items: [
          {
            title: 'หน้าหลัก ศึก 12 วีทูบเบอร์ (Home)',
            path: '/12vtubergame',
            desc: 'หน้าหลักของกิจกรรม โชว์รายชื่อผู้ได้เล่น 12 ราศี แชทสด และปุ่มลงทะเบียน/เสนอชื่อ',
            badge: 'หน้าหลัก'
          },
          {
            title: 'หน้าโหวตราศีสำหรับคนดู (Audience Vote)',
            path: '/12vtubergame/audience-vote',
            desc: 'หน้าโหวตให้ผู้ชมทางบ้านเลือกราศีที่ชื่นชอบ 1 ราศี มีระบบถามชื่อและล็อคคำตอบทันที',
            badge: 'โหวตคนดู'
          },
          {
            title: 'หน้าลงทะเบียนตรงสำหรับวีทูบเบอร์ (Register)',
            path: '/12vtubergame/register',
            desc: 'หน้าฟอร์มลงทะเบียนเข้าร่วมกิจกรรม ศึก 12 วีทูบเบอร์',
            badge: 'ลงทะเบียน'
          },
          {
            title: 'หน้าโควต้ารวม 12 ราศี (All Zodiac Quota)',
            path: '/12vtubergame/allzodiac',
            desc: 'หน้าสรุปจำนวนผู้สมัครในแต่ละราศี และหมวดวีทูบเบอร์ที่ถูกเสนอชื่อ',
            badge: 'โควต้า'
          },
          {
            title: 'มินิเกม ศึก 12 วีทูบเบอร์ (Mini Game)',
            path: '/12vtubergame/minigame',
            desc: 'หน้าเล่นมินิเกมสะสมการ์ด/เกมทาย',
            badge: 'เกม'
          },
          {
            title: 'กระดานวาดรูปเสรี (FreeBoard)',
            path: '/freeboard',
            desc: 'กระดานวาดรูปออนไลน์แบบ Interactive Canvas',
            badge: 'เครื่องมือ'
          }
        ]
      },
      {
        title: 'หน้าควบคุมสำหรับแอดมิน (Admin Control Pages)',
        color: '#f59e0b',
        items: [
          {
            title: 'ระบบจัดการหลังบ้าน แอดมินพาเนล (Admin Panel)',
            path: '/12vtubergame/adminpanel',
            desc: 'จัดการรายชื่อผู้สมัคร, แชทสด, กำหนดการ, จัดการผู้ได้เล่น (Roster) และรหัสผ่าน',
            badge: 'แอดมินหลัก'
          },
          {
            title: 'แอดมินจัดการโหวตคนดู (Audience Vote Admin)',
            path: '/12vtubergame/audience-vote-admin',
            desc: 'ดูผลโหวตสดของคนดูแบบเรียลไทม์ เปิด/ปิดระบบโหวต รีเซ็ตการโหวต และรวมลิงก์ Stream Deck',
            badge: 'แอดมินโหวต'
          },
          {
            title: 'หน้าระบบสุ่ม 12 ราศี (Random 12 VTuber)',
            path: '/12vtubergame/random12ad',
            desc: 'หน้าระบบสุ่มตัวแทน 12 ราศี สำหรับเปิดไลฟ์สตรีม พร้อมเอฟเฟกต์หมุนสุ่ม',
            badge: 'ระบบสุ่ม'
          },
          {
            title: 'แอดมินควบคุมโหวตผู้เล่น 12 คน (Player Vote Admin)',
            path: '/setting12vote',
            desc: 'หน้าจัดการโหวตสำหรับผู้เล่น 12 คนในเกม',
            badge: 'โหวตผู้เล่น'
          },
          {
            title: 'หน้าโหวตสำหรับผู้เล่น 12 คน (Player Vote Site)',
            path: '/12vtubervotesite',
            desc: 'หน้าระบบโหวตลับสำหรับตัวแทน 12 ราศี',
            badge: 'โหวตผู้เล่น'
          }
        ]
      },
      {
        title: 'หน้า Overlay สำหรับ OBS / ไลฟ์สตรีม (OBS Browser Overlays)',
        color: '#10b981',
        items: [
          {
            title: 'Overlay ผลโหวตคนดู (Audience Vote OBS Overlay)',
            path: '/12vtubergame/audience-vote-overlay',
            desc: 'หน้าจอผลโหวตคนดูแบบโปร่งแสง Responsive ขยายตามขนาดหน้าจอ โชว์เฉพาะราศีที่มีคนเลือก พร้อมอนิเมชั่นตัวเลขสด ชิดขวามีขอบและเงาบาง',
            badge: 'OBS Overlay'
          }
        ]
      },
      {
        title: 'ลิงก์ควบคุม Stream Deck (Direct HTTP Trigger)',
        color: '#38bdf8',
        items: [
          {
            title: 'สลับเปิด/ปิดหน้าเว็บโหวต (Page Toggle)',
            path: '/api/audience-vote/streamdeck/page-toggle',
            desc: 'คำสั่งสลับการเข้าถึงหน้าเว็บโหวตคนดู (หากปิดไว้ คนดูจะไม่สามารถเข้าหน้าโหวตได้และซ่อนปุ่ม)',
            badge: 'Stream Deck'
          },
          {
            title: 'บังคับเปิดหน้าเว็บโหวต (Page Open)',
            path: '/api/audience-vote/streamdeck/page-open',
            desc: 'คำสั่งเปิดการเข้าถึงหน้าเว็บโหวตคนดู',
            badge: 'Stream Deck'
          },
          {
            title: 'บังคับปิดหน้าเว็บโหวต (Page Close)',
            path: '/api/audience-vote/streamdeck/page-close',
            desc: 'คำสั่งปิดการเข้าถึงหน้าเว็บโหวตคนดูและซ่อนปุ่ม',
            badge: 'Stream Deck'
          },
          {
            title: 'สลับเปิด/ปิดรอบโหวต (Round Toggle)',
            path: '/api/audience-vote/streamdeck/toggle',
            desc: 'คำสั่งสลับสถานะเปิด หรือ ปิดรับโหวตคนดูในรอบปัจจุบัน',
            badge: 'Stream Deck'
          },
          {
            title: 'บังคับเปิดรอบโหวต (Round Open)',
            path: '/api/audience-vote/streamdeck/open',
            desc: 'คำสั่งบังคับเปิดรับคะแนนโหวตคนดูในรอบปัจจุบัน',
            badge: 'Stream Deck'
          },
          {
            title: 'บังคับปิดรอบโหวต (Round Close)',
            path: '/api/audience-vote/streamdeck/close',
            desc: 'คำสั่งบังคับปิดรับคะแนนโหวตคนดูในรอบปัจจุบัน',
            badge: 'Stream Deck'
          },
          {
            title: 'รีเซ็ตการโหวตคนดู (Round Reset)',
            path: '/api/audience-vote/streamdeck/reset',
            desc: 'คำสั่งล้างข้อมูลโหวตคนดูทั้งหมดให้เริ่มรอบใหม่ทันที',
            badge: 'Stream Deck'
          }
        ]
      }
    ];

    container.innerHTML = sections.map(sec => {
      const itemsHtml = sec.items.map(item => {
        const fullUrl = `${origin}${item.path}`;
        const inputId = 'copy_input_' + Math.random().toString(36).substr(2, 7);

        return `
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 14px; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.8rem; transition: all 0.2s;" onmouseover="this.style.borderColor='${sec.color}'; this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.09)'; this.style.background='rgba(255,255,255,0.03)'">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
              <div>
                <strong style="color: #ffffff; font-size: 1.05rem;">${escapeHtml(item.title)}</strong>
                <p style="color: #94a3b8; font-size: 0.88rem; margin-top: 0.2rem; line-height: 1.4;">${escapeHtml(item.desc)}</p>
              </div>
              <span style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.1); color: ${sec.color}; border: 1px solid ${sec.color}44;">
                ${escapeHtml(item.badge)}
              </span>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="${inputId}" class="form-input" readonly value="${escapeHtml(fullUrl)}" style="font-size: 0.86rem; padding: 0.4rem 0.8rem; color: #7dd3fc; background: rgba(0,0,0,0.3); font-family: monospace;" onclick="this.select()">
              <button type="button" class="btn-secondary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; white-space: nowrap; border-color: ${sec.color}66; color: #fff;" onclick="adminCopyLinkText('${inputId}', this)">
                📋 คัดลอก
              </button>
              <a href="${escapeHtml(item.path)}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; white-space: nowrap; text-decoration: none;">
                เปิด ↗
              </a>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div>
          <h3 style="color: ${sec.color}; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>${sec.title}</span>
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem;">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');
  };

  window.adminCopyLinkText = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ คัดลอกแล้ว!';
      btn.style.borderColor = '#10b981';
      btn.style.color = '#6ee7b7';
      showToast('คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว', 'success');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }).catch(err => {
      showToast('ไม่สามารถคัดลอกได้', 'error');
    });
  };

  // Toggle Profanity Filter List accordion
  window.toggleProfanityList = function() {
    const container = document.getElementById('profanity-chips-container');
    const chevron = document.getElementById('profanity-toggle-icon');
    if (!container) return;

    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'flex' : 'none';
    if (chevron) {
      chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
  initAdminPage();
}
