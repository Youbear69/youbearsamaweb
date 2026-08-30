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

  // Populate Zodiac filter dropdown
  if (filterZodiac) {
    filterZodiac.innerHTML = '<option value="">ทุกราศี (ทั้งหมด)</option>';
    ZODIAC_LIST.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z.key;
      opt.textContent = `${z.th} (${z.en})`;
      filterZodiac.appendChild(opt);
    });
  }

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
      if (statTotal) statTotal.textContent = allRegistrations.length;
      renderRegistrationTable();

      allProposals = props || [];
      if (statProposals) statProposals.textContent = allProposals.length;
      const approvedCount = allProposals.filter(p => p.approved).length;
      if (statApproved) statApproved.textContent = approvedCount;
      renderProposalsTable();

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

      if (settings) {
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
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ดูแลระบบ', 'error');
    }
  }

  // Render Direct Registrations Table
  function renderRegistrationTable() {
    if (!tableBody) return;

    const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const filter = filterZodiac ? filterZodiac.value : '';
    const sortVal = sortRegistrations ? sortRegistrations.value : 'date-desc';

    let filtered = allRegistrations.filter(r => {
      const matchZodiac = !filter || r.zodiacKey === filter;
      const matchSearch = !search || 
        (r.displayName && r.displayName.toLowerCase().includes(search)) ||
        (r.xAccount && r.xAccount.toLowerCase().includes(search)) ||
        (r.zodiacNameTh && r.zodiacNameTh.toLowerCase().includes(search));
      return matchZodiac && matchSearch;
    });

    // Apply sorting
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

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ไม่พบข้อมูลผู้ลงทะเบียนตามเงื่อนไขที่ระบุ
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((r, index) => {
      const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(r.xAccount) : { url: r.xAccount || '#', type: 'x' };
      const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(r) : (r.imageUrl || '');
      const clickUrl = parsedSocial.url || r.xAccount || '#';

      const dateStr = new Date(r.registeredAt).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // Thumbnail preview
      const thumbHtml = avatarUrl 
        ? `<img src="${escapeHtml(avatarUrl)}" alt="thumb" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; vertical-align: middle; margin-right: 8px; border: 1px solid rgba(168,85,247,0.4);" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(r.displayName || 'user')}';">`
        : '';

      const zodiacInfo = ZODIAC_LIST.find(z => z.key === r.zodiacKey);
      const zodiacLabel = zodiacInfo ? `${zodiacInfo.th} (${zodiacInfo.en})` : (r.zodiacNameTh || r.zodiacKey);

      return `
        <tr>
          <td style="color: var(--text-muted);">${index + 1}</td>
          <td>${thumbHtml}<strong>${escapeHtml(r.displayName)}</strong></td>
          <td>
            <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" style="color: #c77dff; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>${escapeHtml(r.xAccount)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </td>
          <td style="color: #c4b5fd;">${escapeHtml(zodiacLabel)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
          <td>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button class="btn-edit btn-edit-reg" data-id="${r.id}" title="แก้ไข">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-delete btn-delete-reg" data-id="${r.id}" data-name="${escapeHtml(r.displayName)}">ลบ</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach edit listeners for registrations
    tableBody.querySelectorAll('.btn-edit-reg').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const entry = allRegistrations.find(r => r.id === id);
        if (entry) openEditModal('registration', entry);
      };
    });

    // Attach delete listeners
    tableBody.querySelectorAll('.btn-delete-reg').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ "${name}" ?`)) {
          try {
            await fbDeleteRegistration(id);
            showToast('ลบรายการสำเร็จ', 'success');
            loadAdminData();
          } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
          }
        }
      };
    });
  }

  // Render Proposed VTubers Table
  function renderProposalsTable() {
    if (!proposalsTableBody) return;

    const search = (proposalSearchInput ? proposalSearchInput.value : '').toLowerCase().trim();
    const statusFilter = proposalFilterStatus ? proposalFilterStatus.value : '';
    const sortVal = sortProposals ? sortProposals.value : 'date-desc';

    let filtered = allProposals.filter(p => {
      const matchStatus = !statusFilter || 
        (statusFilter === 'approved' && p.approved) || 
        (statusFilter === 'pending' && !p.approved);

      const matchSearch = !search || 
        (p.xAccount && p.xAccount.toLowerCase().includes(search)) ||
        (p.displayName && p.displayName.toLowerCase().includes(search)) ||
        (p.zodiacNameTh && p.zodiacNameTh.toLowerCase().includes(search));

      return matchStatus && matchSearch;
    });

    // Apply sorting
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

    if (filtered.length === 0) {
      proposalsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ไม่พบข้อมูลการเสนอวีทูบเบอร์ตามเงื่อนไขที่ระบุ
          </td>
        </tr>
      `;
      return;
    }

    proposalsTableBody.innerHTML = filtered.map((p, index) => {
      const parsedSocial = typeof parseSocialLink === 'function' ? parseSocialLink(p.xAccount) : { url: p.xAccount || '#', type: 'x' };
      const avatarUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl(p) : (p.imageUrl || '');
      const clickUrl = parsedSocial.url || p.xAccount || '#';

      const dateStr = new Date(p.proposedAt || p.createdAt || Date.now()).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const isUnknown = p.zodiacKey === 'unknown' || !p.zodiacKey;
      const zodiacInfo = !isUnknown ? ZODIAC_LIST.find(z => z.key === p.zodiacKey) : null;
      const zodiacLabel = zodiacInfo ? `${zodiacInfo.th} (${zodiacInfo.en})` : 'ไม่ทราบราศี';

      // Thumbnail preview
      const thumbHtml = avatarUrl 
        ? `<img src="${escapeHtml(avatarUrl)}" alt="thumb" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; vertical-align: middle; margin-right: 8px; border: 1px solid rgba(251,191,36,0.4);" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.displayName || 'user')}';">`
        : '';

      return `
        <tr>
          <td style="color: var(--text-muted);">${index + 1}</td>
          <td>${thumbHtml}<strong style="color: #fcd34d;">${escapeHtml(p.displayName || '-')}</strong></td>
          <td>
            <a href="${escapeHtml(clickUrl)}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span>${escapeHtml(p.xAccount)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </td>
          <td style="color: ${isUnknown ? '#fcd34d' : '#c4b5fd'};">${escapeHtml(zodiacLabel)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
          <td>
            <label class="admin-checkbox-label">
              <input type="checkbox" class="admin-toggle-checkbox prop-approve-checkbox" data-id="${p.id}" ${p.approved ? 'checked' : ''}>
              <span style="font-size: 0.95rem; color: ${p.approved ? '#6ee7b7' : '#94a3b8'};">
                ${p.approved ? 'โชว์หน้าแรก' : 'ซ่อนอยู่'}
              </span>
            </label>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button class="btn-edit btn-edit-prop" data-id="${p.id}" title="แก้ไข">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-delete btn-delete-prop" data-id="${p.id}" data-account="${escapeHtml(p.xAccount)}">ลบ</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach edit listeners for proposals
    proposalsTableBody.querySelectorAll('.btn-edit-prop').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const entry = allProposals.find(p => p.id === id);
        if (entry) openEditModal('proposal', entry);
      };
    });

    // Attach approve toggle listeners
    proposalsTableBody.querySelectorAll('.prop-approve-checkbox').forEach(chk => {
      chk.onchange = async () => {
        const id = chk.getAttribute('data-id');
        try {
          const updated = await fbToggleProposalApproval(id);
          showToast(updated.approved ? 'อนุมัติการเสนอชื่อแล้ว' : 'ยกเลิกการอนุมัติแล้ว', 'success');
          const prop = allProposals.find(p => p.id === id);
          if (prop) prop.approved = updated.approved;
          const approvedCount = allProposals.filter(p => p.approved).length;
          if (statApproved) statApproved.textContent = approvedCount;
          renderProposalsTable();
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
          chk.checked = !chk.checked;
        }
      };
    });

    // Attach delete listeners
    proposalsTableBody.querySelectorAll('.btn-delete-prop').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const account = btn.getAttribute('data-account');
        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการเสนอของ "${account}" ?`)) {
          try {
            await fbDeleteProposal(id);
            showToast('ลบรายการเสนอสำเร็จ', 'success');
            allProposals = allProposals.filter(p => p.id !== id);
            if (statProposals) statProposals.textContent = allProposals.length;
            const approvedCount = allProposals.filter(p => p.approved).length;
            if (statApproved) statApproved.textContent = approvedCount;
            renderProposalsTable();
          } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
          }
        }
      };
    });
  }

  // Filter & Search events
  if (searchInput) searchInput.oninput = renderRegistrationTable;
  if (filterZodiac) filterZodiac.onchange = renderRegistrationTable;
  if (sortRegistrations) sortRegistrations.onchange = renderRegistrationTable;

  if (proposalSearchInput) proposalSearchInput.oninput = renderProposalsTable;
  if (proposalFilterStatus) proposalFilterStatus.onchange = renderProposalsTable;
  if (sortProposals) sortProposals.onchange = renderProposalsTable;

  if (btnRefresh) {
    btnRefresh.onclick = () => {
      showToast('กำลังรีเฟรชข้อมูล...');
      loadAdminData();
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
