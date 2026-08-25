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
  const tableBody = document.getElementById('admin-table-body');
  const statTotal = document.getElementById('stat-total');
  const statProposals = document.getElementById('stat-proposals');
  const statApproved = document.getElementById('stat-approved');
  const statTop = document.getElementById('stat-top');
  const btnRefresh = document.getElementById('btn-refresh');

  const proposalSearchInput = document.getElementById('proposal-search');
  const proposalFilterStatus = document.getElementById('proposal-filter-status');
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
    if (dashboardView) dashboardView.style.display = 'block';
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
          if (s.count > maxCount) {
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

    const filtered = allRegistrations.filter(r => {
      const matchZodiac = !filter || r.zodiacKey === filter;
      const matchSearch = !search || 
        (r.displayName && r.displayName.toLowerCase().includes(search)) ||
        (r.xAccount && r.xAccount.toLowerCase().includes(search)) ||
        (r.zodiacNameTh && r.zodiacNameTh.toLowerCase().includes(search));
      return matchZodiac && matchSearch;
    });

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
      let xLink = r.xAccount;
      if (!xLink.startsWith('http')) {
        xLink = 'https://x.com/' + xLink.replace(/^@/, '');
      }

      const dateStr = new Date(r.registeredAt).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const optionsHtml = ZODIAC_LIST.map(z => 
        `<option value="${z.key}" ${z.key === r.zodiacKey ? 'selected' : ''}>${z.th} (${z.en})</option>`
      ).join('');

      return `
        <tr>
          <td style="color: var(--text-muted);">${index + 1}</td>
          <td><strong>${escapeHtml(r.displayName)}</strong></td>
          <td>
            <a href="${escapeHtml(xLink)}" target="_blank" rel="noopener noreferrer" style="color: #c77dff; text-decoration: none;">
              ${escapeHtml(r.xAccount)}
            </a>
          </td>
          <td>
            <select class="admin-zodiac-select reg-zodiac-change" data-id="${r.id}" style="background: #1e153b; color: #e2e8f0; border: 1.5px solid rgba(168,85,247,0.35); border-radius: 8px; padding: 0.35rem 0.6rem; font-size: 0.95rem; cursor: pointer;">
              ${optionsHtml}
            </select>
          </td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
          <td>
            <button class="btn-delete btn-delete-reg" data-id="${r.id}" data-name="${escapeHtml(r.displayName)}">ลบ</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach zodiac change listeners for registrations
    tableBody.querySelectorAll('.reg-zodiac-change').forEach(select => {
      select.onchange = async () => {
        const id = select.getAttribute('data-id');
        const newZodiacKey = select.value;
        try {
          await fbUpdateRegistrationZodiac(id, newZodiacKey);
          showToast('เปลี่ยนราศีเรียบร้อยแล้ว', 'success');
          loadAdminData();
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการเปลี่ยนราศี', 'error');
        }
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

    const filtered = allProposals.filter(p => {
      const matchStatus = !statusFilter || 
        (statusFilter === 'approved' && p.approved) || 
        (statusFilter === 'pending' && !p.approved);

      const matchSearch = !search || 
        (p.xAccount && p.xAccount.toLowerCase().includes(search)) ||
        (p.displayName && p.displayName.toLowerCase().includes(search)) ||
        (p.zodiacNameTh && p.zodiacNameTh.toLowerCase().includes(search));

      return matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
      proposalsTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ไม่พบข้อมูลการเสนอวีทูบเบอร์ตามเงื่อนไขที่ระบุ
          </td>
        </tr>
      `;
      return;
    }

    proposalsTableBody.innerHTML = filtered.map((p, index) => {
      let xLink = p.xAccount;
      if (!xLink.startsWith('http')) {
        xLink = 'https://x.com/' + xLink.replace(/^@/, '');
      }

      const dateStr = new Date(p.proposedAt || p.createdAt || Date.now()).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const isUnknown = p.zodiacKey === 'unknown' || !p.zodiacKey;

      const propOptionsHtml = `
        <option value="unknown" ${isUnknown ? 'selected' : ''}>ไม่ทราบราศี (Unknown)</option>
        ${ZODIAC_LIST.map(z => `<option value="${z.key}" ${z.key === p.zodiacKey ? 'selected' : ''}>${z.th} (${z.en})</option>`).join('')}
      `;

      return `
        <tr>
          <td style="color: var(--text-muted);">${index + 1}</td>
          <td>
            <a href="${escapeHtml(xLink)}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span>${escapeHtml(p.xAccount)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </td>
          <td>
            <select class="admin-zodiac-select prop-zodiac-change" data-id="${p.id}" style="background: ${isUnknown ? '#33230a' : '#1e153b'}; color: ${isUnknown ? '#fcd34d' : '#c084fc'}; border: 1.5px solid ${isUnknown ? 'rgba(245,158,11,0.5)' : 'rgba(168,85,247,0.4)'}; border-radius: 8px; padding: 0.35rem 0.6rem; font-size: 0.95rem; cursor: pointer; font-weight: 600;">
              ${propOptionsHtml}
            </select>
          </td>
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
            <button class="btn-delete btn-delete-prop" data-id="${p.id}" data-account="${escapeHtml(p.xAccount)}">ลบ</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach zodiac change listeners for proposals
    proposalsTableBody.querySelectorAll('.prop-zodiac-change').forEach(select => {
      select.onchange = async () => {
        const id = select.getAttribute('data-id');
        const newZodiacKey = select.value;
        try {
          await fbUpdateProposalZodiac(id, newZodiacKey);
          showToast('เปลี่ยนราศีเรียบร้อยแล้ว', 'success');
          loadAdminData();
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการเปลี่ยนราศี', 'error');
        }
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

  if (proposalSearchInput) proposalSearchInput.oninput = renderProposalsTable;
  if (proposalFilterStatus) proposalFilterStatus.onchange = renderProposalsTable;

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
  initAdminPage();
}
