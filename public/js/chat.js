// ==========================================
// Live Chat System (Firebase Realtime Database)
// ==========================================

// Admin credentials mapping
const ADMIN_USERS = {
  'yuubear67': { displayName: 'Yuubear', isAdmin: true }
};

// Pre-configured test VTuber (ensures Miyuu433 works immediately without waiting for DB sync)
const INITIAL_KNOWN_VTUBERS = {
  'miyuu433': {
    displayName: 'Miyuu433',
    zodiacKey: 'sagittarius',
    xAccount: 'https://x.com/Miyuu433',
    cleanHandle: 'miyuu433'
  }
};

// VTuber data will be loaded from registrations & proposals
let knownVtubers = { ...INITIAL_KNOWN_VTUBERS };
let chatVerifiedUser = null;
let pendingVtuberUsername = '';
let selectedVerifyZodiac = '';

// Helper to extract clean handle from URL or handle string
function extractCleanUsername(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (typeof extractCleanHandle === 'function') {
    const h = extractCleanHandle(s);
    if (h) return h;
  }
  return s
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^(twitter|x)\.com\//i, '')
    .replace(/^@+/, '')
    .split('/')[0]
    .split('?')[0]
    .split('&')[0]
    .split('#')[0]
    .trim()
    .toLowerCase();
}

// Register a VTuber item into knownVtubers lookup table
function registerKnownVtuber(reg) {
  if (!reg) return;
  const zodiacKey = reg.zodiacKey || '';
  const xAccount = reg.xAccount || '';
  const displayName = reg.displayName || '';
  const handle = extractCleanUsername(xAccount);

  const item = {
    displayName: displayName || handle || xAccount,
    zodiacKey: zodiacKey,
    xAccount: xAccount,
    cleanHandle: handle
  };

  // 1. By display name
  if (displayName) {
    const lowerDisplay = displayName.toLowerCase().trim();
    knownVtubers[lowerDisplay] = item;
    const noSpace = lowerDisplay.replace(/[\s\-_/\\|()]+/g, '');
    if (noSpace) knownVtubers[noSpace] = item;
  }

  // 2. By clean handle (e.g. miyuu433, @miyuu433)
  if (handle) {
    knownVtubers[handle] = item;
    knownVtubers['@' + handle] = item;
  }

  // 3. By raw xAccount
  if (xAccount) {
    knownVtubers[xAccount.toLowerCase().trim()] = item;
  }
}

// Find a VTuber record from any input string
function getVtuberRecord(username) {
  if (!username) return null;
  const raw = String(username).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // 1. Direct match in dictionary
  if (knownVtubers[lower]) return knownVtubers[lower];

  // 2. Clean handle match
  const handle = extractCleanUsername(raw);
  if (handle) {
    if (knownVtubers[handle]) return knownVtubers[handle];
    if (knownVtubers['@' + handle]) return knownVtubers['@' + handle];
  }

  // 3. Normalized display name match
  const noSpace = lower.replace(/[\s\-_/\\|()]+/g, '');
  if (noSpace && knownVtubers[noSpace]) return knownVtubers[noSpace];

  // 4. Value scan (displayName contains or matches)
  for (const k in knownVtubers) {
    const item = knownVtubers[k];
    if (!item) continue;
    if (item.cleanHandle && handle && item.cleanHandle === handle) return item;
    if (item.displayName && item.displayName.toLowerCase().trim() === lower) return item;
  }

  return null;
}

// Check if username is a known VTuber
function isKnownVtuber(username) {
  return getVtuberRecord(username) !== null;
}

// Check if username is admin
function isAdminUser(username) {
  if (!username) return false;
  return ADMIN_USERS[username.trim().toLowerCase()] !== undefined;
}

// Update the real-time status badge next to the username input
function updateChatUsernameStatus() {
  const usernameInput = document.getElementById('chat-username');
  const statusEl = document.getElementById('chat-username-status');
  if (!usernameInput || !statusEl) return;

  const username = usernameInput.value.trim();
  if (!username) {
    statusEl.innerHTML = '';
    return;
  }

  // 1. Admin Check
  if (isAdminUser(username)) {
    statusEl.innerHTML = '<span class="chat-status-admin">👑 แอดมิน (ไม่มีดีเลย์)</span>';
    return;
  }

  // 2. Known VTuber Check
  const vtuberRecord = getVtuberRecord(username);
  if (vtuberRecord) {
    // Check if verified in localStorage
    const savedVerified = localStorage.getItem('chat_verified_vtuber');
    let isVerified = false;

    if (savedVerified) {
      try {
        const parsed = JSON.parse(savedVerified);
        if (parsed.isVtuber) {
          const matchHandle = parsed.cleanHandle && vtuberRecord.cleanHandle && parsed.cleanHandle === vtuberRecord.cleanHandle;
          const matchName = parsed.username && parsed.username.toLowerCase() === username.toLowerCase();
          if (matchHandle || matchName) {
            isVerified = true;
            chatVerifiedUser = parsed;
          }
        }
      } catch (e) {}
    }

    if (isVerified) {
      statusEl.innerHTML = `<span class="chat-status-vtuber-verified">✓ ยืนยันวีทูบเบอร์แล้ว (${vtuberRecord.displayName || username})</span>`;
    } else {
      const safeUser = username.replace(/'/g, "\\'");
      statusEl.innerHTML = `<span class="chat-status-vtuber-pending" onclick="openVtuberVerifyModal('${safeUser}')">🌟 ตรวจพบชื่อวีทูบเบอร์! (คลิกเพื่อยืนยันราศี)</span>`;
    }
    return;
  }

  // 3. Normal Viewer
  statusEl.innerHTML = '<span class="chat-status-normal">💬 ผู้ชมทั่วไป (ดีเลย์ 5 วินาที)</span>';
}

// Check username verification status, optionally opening verification modal
function checkUsernameVerification(triggerModalIfUnverified = false) {
  updateChatUsernameStatus();

  const usernameInput = document.getElementById('chat-username');
  if (!usernameInput) return;
  const username = usernameInput.value.trim();
  if (!username) return;

  if (isAdminUser(username)) return;

  const vtuberRecord = getVtuberRecord(username);
  if (vtuberRecord) {
    const savedVerified = localStorage.getItem('chat_verified_vtuber');
    let isVerified = false;

    if (savedVerified) {
      try {
        const parsed = JSON.parse(savedVerified);
        if (parsed.isVtuber) {
          const matchHandle = parsed.cleanHandle && vtuberRecord.cleanHandle && parsed.cleanHandle === vtuberRecord.cleanHandle;
          const matchName = parsed.username && parsed.username.toLowerCase() === username.toLowerCase();
          if (matchHandle || matchName) {
            isVerified = true;
            chatVerifiedUser = parsed;
          }
        }
      } catch (e) {}
    }

    if (!isVerified && triggerModalIfUnverified) {
      openVtuberVerifyModal(username);
    }
  }
}

// Chat modal controls
function openChatModal() {
  const modal = document.getElementById('modal-chat');
  if (modal) {
    modal.classList.add('show');
    loadChatMessages();
    // Restore saved username
    const savedUsername = localStorage.getItem('chat_username') || '';
    const usernameInput = document.getElementById('chat-username');
    if (usernameInput && savedUsername) {
      usernameInput.value = savedUsername;
      checkUsernameVerification(false);
    }
  }
}

function closeChatModal() {
  const modal = document.getElementById('modal-chat');
  if (modal) modal.classList.remove('show');
}

// VTuber verification modal
function openVtuberVerifyModal(username) {
  if (!username) return;
  const vtuberRecord = getVtuberRecord(username);
  pendingVtuberUsername = username;

  const modal = document.getElementById('modal-vtuber-verify');
  const text = document.getElementById('vtuber-verify-text');
  const grid = document.getElementById('vtuber-verify-zodiac-grid');
  
  const displayTitle = vtuberRecord?.displayName || username;
  if (text) {
    text.textContent = `คุณ "${displayTitle}" พบในข้อมูลวีทูบเบอร์ กรุณายืนยันราศีของคุณ`;
  }
  
  // Build zodiac selection grid
  if (grid) {
    grid.innerHTML = '';
    selectedVerifyZodiac = '';
    
    const list = (typeof ZODIAC_LIST !== 'undefined' && ZODIAC_LIST.length > 0)
      ? ZODIAC_LIST
      : (typeof ZODIAC_METADATA !== 'undefined' ? ZODIAC_METADATA : []);

    list.forEach(z => {
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
        grid.querySelectorAll('.zodiac-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedVerifyZodiac = z.key;
      };
      
      grid.appendChild(card);
    });
  }
  
  if (modal) modal.classList.add('show');
}

function closeVtuberVerifyModal() {
  const modal = document.getElementById('modal-vtuber-verify');
  if (modal) modal.classList.remove('show');
  pendingVtuberUsername = '';
  selectedVerifyZodiac = '';
}

function confirmVtuberZodiac() {
  if (!selectedVerifyZodiac) {
    showToast('กรุณาเลือกราศีของคุณ', 'error');
    return;
  }
  
  const vtuberData = getVtuberRecord(pendingVtuberUsername);
  if (vtuberData && vtuberData.zodiacKey === selectedVerifyZodiac) {
    // Verified! Set as verified VTuber
    chatVerifiedUser = {
      username: pendingVtuberUsername,
      displayName: vtuberData.displayName || pendingVtuberUsername,
      isVtuber: true,
      zodiacKey: selectedVerifyZodiac,
      cleanHandle: vtuberData.cleanHandle || ''
    };
    localStorage.setItem('chat_verified_vtuber', JSON.stringify(chatVerifiedUser));
    showToast('ยืนยันตัวตนสำเร็จ! ชื่อของคุณจะแสดงเป็นสีเขียว (VTuber)', 'success');
    closeVtuberVerifyModal();
    updateChatUsernameStatus();
  } else {
    showToast('ราศีไม่ตรงกับข้อมูลในระบบ กรุณาลองใหม่', 'error');
  }
}

// Load VTuber data from registrations & proposals
async function loadVtuberData() {
  // Always include initial known VTubers
  Object.keys(INITIAL_KNOWN_VTUBERS).forEach(k => {
    knownVtubers[k] = INITIAL_KNOWN_VTUBERS[k];
    knownVtubers['@' + k] = INITIAL_KNOWN_VTUBERS[k];
  });

  try {
    if (typeof rtdb !== 'undefined' && rtdb) {
      // 1. Load registrations
      const snap = await rtdb.ref('registrations').once('value');
      const data = snap.val();
      if (data) {
        const arr = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
        arr.forEach(registerKnownVtuber);
      }

      // 2. Load approved proposals
      const propSnap = await rtdb.ref('proposals').once('value');
      const propData = propSnap.val();
      if (propData) {
        const pArr = Array.isArray(propData) ? propData.filter(Boolean) : Object.values(propData);
        pArr.filter(p => p && p.approved).forEach(registerKnownVtuber);
      }
    }
  } catch (err) {
    console.warn('Failed to load vtuber data from RTDB:', err);
  }

  updateChatUsernameStatus();
}

// Get display info for a username
function getChatUserInfo(username) {
  const lowerUsername = username.toLowerCase().trim();
  
  // Admin check
  if (ADMIN_USERS[lowerUsername]) {
    return {
      displayName: ADMIN_USERS[lowerUsername].displayName,
      colorClass: 'chat-name-admin',
      isAdmin: true,
      isVtuber: false
    };
  }
  
  // Verified VTuber check
  const vtuberRecord = getVtuberRecord(username);
  if (chatVerifiedUser && chatVerifiedUser.isVtuber) {
    const matchHandle = chatVerifiedUser.cleanHandle && vtuberRecord && chatVerifiedUser.cleanHandle === vtuberRecord.cleanHandle;
    const matchName = chatVerifiedUser.username.toLowerCase() === lowerUsername;
    if (matchHandle || matchName) {
      return {
        displayName: chatVerifiedUser.displayName || vtuberRecord?.displayName || username,
        colorClass: 'chat-name-vtuber',
        isAdmin: false,
        isVtuber: true
      };
    }
  }
  
  // Normal user
  return {
    displayName: username,
    colorClass: 'chat-name-normal',
    isAdmin: false,
    isVtuber: false
  };
}

// Chat cooldown management
let chatCooldownTimer = null;
let chatCooldownEnd = 0;

function startChatCooldown(seconds) {
  chatCooldownEnd = Date.now() + (seconds * 1000);
  const sendBtn = document.getElementById('btn-send-chat');
  if (!sendBtn) return;

  sendBtn.disabled = true;
  sendBtn.classList.add('btn-chat-cooldown');
  const originalHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;

  if (chatCooldownTimer) clearInterval(chatCooldownTimer);

  function updateBtn() {
    const left = Math.ceil((chatCooldownEnd - Date.now()) / 1000);
    if (left <= 0) {
      clearInterval(chatCooldownTimer);
      chatCooldownTimer = null;
      sendBtn.disabled = false;
      sendBtn.classList.remove('btn-chat-cooldown');
      sendBtn.innerHTML = originalHtml;
    } else {
      sendBtn.innerHTML = `<span style="font-size: 0.82rem; font-weight: 700;">${left}s</span>`;
    }
  }

  updateBtn();
  chatCooldownTimer = setInterval(updateBtn, 1000);
}

// Send chat message
function sendChatMessage() {
  const usernameInput = document.getElementById('chat-username');
  const messageInput = document.getElementById('chat-message-input');
  
  if (!usernameInput || !messageInput) return;
  
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();
  
  if (!username) {
    showToast('กรุณาใส่ชื่อผู้ใช้', 'error');
    usernameInput.focus();
    return;
  }
  
  if (!message) {
    showToast('กรุณาพิมพ์ข้อความ', 'error');
    messageInput.focus();
    return;
  }

  // 5-second cooldown check: only apply to non-admin users
  const isSenderAdmin = isAdminUser(username);
  if (!isSenderAdmin) {
    const now = Date.now();
    if (chatCooldownEnd > now) {
      const waitSec = Math.ceil((chatCooldownEnd - now) / 1000);
      showToast(`กรุณารออีก ${waitSec} วินาที ก่อนส่งข้อความถัดไป`, 'warning');
      return;
    }
  }
  
  // Save username for next time
  localStorage.setItem('chat_username', username);
  
  // Check if username is a known VTuber and not yet verified
  const vtuberRecord = getVtuberRecord(username);
  if (vtuberRecord && !isSenderAdmin) {
    const savedVerified = localStorage.getItem('chat_verified_vtuber');
    let isVerified = false;

    if (savedVerified) {
      try {
        const parsed = JSON.parse(savedVerified);
        if (parsed.isVtuber) {
          const matchHandle = parsed.cleanHandle && vtuberRecord.cleanHandle && parsed.cleanHandle === vtuberRecord.cleanHandle;
          const matchName = parsed.username && parsed.username.toLowerCase() === username.toLowerCase();
          if (matchHandle || matchName) {
            isVerified = true;
            chatVerifiedUser = parsed;
          }
        }
      } catch (e) {}
    }

    if (!isVerified) {
      openVtuberVerifyModal(username);
      return;
    }
  }
  
  // Get user info for display
  const userInfo = getChatUserInfo(username);
  
  // Build chat message data
  const chatData = {
    username: username,
    displayName: userInfo.displayName,
    message: message,
    isAdmin: userInfo.isAdmin,
    isVtuber: userInfo.isVtuber,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Send to Firebase
  if (typeof rtdb !== 'undefined' && rtdb) {
    rtdb.ref('chat').push(chatData)
      .then(() => {
        messageInput.value = '';
        messageInput.focus();
        // Trigger 5-second delay for non-admin
        if (!isSenderAdmin) {
          startChatCooldown(5);
        }
      })
      .catch(err => {
        console.error('Failed to send chat message:', err);
        showToast('ไม่สามารถส่งข้อความได้ ลองใหม่อีกครั้ง', 'error');
      });
  }
}

// Load and listen to chat messages
let chatListener = null;

function loadChatMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  // Load vtuber data first
  loadVtuberData();
  
  // Check for saved verified user
  const savedVerified = localStorage.getItem('chat_verified_vtuber');
  if (savedVerified) {
    try {
      chatVerifiedUser = JSON.parse(savedVerified);
    } catch (e) {
      chatVerifiedUser = null;
    }
  }
  
  // Remove existing listener
  if (chatListener && typeof rtdb !== 'undefined' && rtdb) {
    rtdb.ref('chat').off('value', chatListener);
  }
  
  if (typeof rtdb !== 'undefined' && rtdb) {
    // Listen for last 50 messages
    chatListener = rtdb.ref('chat').orderByChild('timestamp').limitToLast(50).on('value', (snap) => {
      const data = snap.val();
      container.innerHTML = '';
      
      if (!data) {
        container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ เริ่มพูดคุยกันเลย!</div>';
        return;
      }
      
      const messages = Object.values(data).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      messages.forEach(msg => {
        const msgEl = createChatMessageElement(msg);
        container.appendChild(msgEl);
      });
      
      // Auto scroll to bottom
      container.scrollTop = container.scrollHeight;
    });
  }
}

// Create a chat message DOM element
function createChatMessageElement(msg) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-message-item';
  
  // Determine name styling
  let nameClass = 'chat-name-normal';
  let displayName = msg.displayName || msg.username;
  
  if (msg.isAdmin) {
    nameClass = 'chat-name-admin';
  } else if (msg.isVtuber) {
    nameClass = 'chat-name-vtuber';
  }
  
  // Header with Name & Timestamp (เช่น 10/9 - 03:30)
  const headerEl = document.createElement('div');
  headerEl.className = 'chat-message-header';

  const nameEl = document.createElement('span');
  nameEl.className = `chat-message-name ${nameClass}`;
  nameEl.textContent = `${displayName} :`;
  headerEl.appendChild(nameEl);

  if (msg.timestamp) {
    const d = new Date(msg.timestamp);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeEl = document.createElement('span');
    timeEl.className = 'chat-message-time';
    timeEl.textContent = `${day}/${month} - ${hours}:${minutes}`;
    headerEl.appendChild(timeEl);
  }
  
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'chat-message-bubble';
  bubbleEl.textContent = msg.message;
  
  wrapper.appendChild(headerEl);
  wrapper.appendChild(bubbleEl);
  
  return wrapper;
}

// Handle Enter keys & input events for live chat
document.addEventListener('DOMContentLoaded', () => {
  const msgInput = document.getElementById('chat-message-input');
  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  const usernameInput = document.getElementById('chat-username');
  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      checkUsernameVerification(false);
    });
    usernameInput.addEventListener('change', () => {
      checkUsernameVerification(true);
    });
    usernameInput.addEventListener('blur', () => {
      checkUsernameVerification(true);
    });
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkUsernameVerification(true);
        if (msgInput) msgInput.focus();
      }
    });
  }
  
  // Close chat modal on backdrop click
  const chatModal = document.getElementById('modal-chat');
  if (chatModal) {
    chatModal.addEventListener('click', (e) => {
      if (e.target === chatModal) closeChatModal();
    });
  }
  
  const verifyModal = document.getElementById('modal-vtuber-verify');
  if (verifyModal) {
    verifyModal.addEventListener('click', (e) => {
      if (e.target === verifyModal) closeVtuberVerifyModal();
    });
  }
});
