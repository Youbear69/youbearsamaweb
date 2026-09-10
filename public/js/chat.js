// ==========================================
// Live Chat System (Firebase Realtime Database)
// ==========================================

// Admin credentials mapping
const ADMIN_USERS = {
  'yuubear67': { displayName: 'Yuubear', isAdmin: true }
};

// Maximum allowed media attachment file size: 10MB
const MAX_MEDIA_SIZE = 10 * 1024 * 1024;

// Current attached media for admin
let currentChatAttachment = null;

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
  const attachBtn = document.getElementById('btn-chat-attach');

  if (!usernameInput || !statusEl) return;

  const username = usernameInput.value.trim();
  if (!username) {
    statusEl.innerHTML = '';
    if (attachBtn) attachBtn.style.display = 'none';
    if (currentChatAttachment) removeChatAttachment();
    return;
  }

  // 1. Admin Check
  if (isAdminUser(username)) {
    statusEl.innerHTML = '<span class="chat-status-admin">👑 แอดมิน (ไม่มีดีเลย์ / แนบสื่อได้)</span>';
    if (attachBtn) attachBtn.style.display = 'flex';
    return;
  } else {
    // Non-admin: hide attach button and clear any attached files
    if (attachBtn) attachBtn.style.display = 'none';
    if (currentChatAttachment) removeChatAttachment();
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

// ==========================================
// Admin Media Attachment Handling (Max 10MB)
// ==========================================

// Trigger file input dialog (admin only)
function triggerChatFileSelect() {
  const username = (document.getElementById('chat-username')?.value || '').trim();
  if (!isAdminUser(username)) {
    showToast('⚠️ การแนบรูปภาพอนุญาตเฉพาะแอดมินเท่านั้น', 'warning');
    return;
  }
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.click();
}

// File input selection event
function handleChatFileSelect(input) {
  if (input && input.files && input.files[0]) {
    processChatMediaFile(input.files[0]);
  }
}

// Process media file from picker, drag & drop, or clipboard paste
function processChatMediaFile(file) {
  if (!file) return;

  const username = (document.getElementById('chat-username')?.value || '').trim();
  if (!isAdminUser(username)) {
    showToast('⚠️ การแนบรูปภาพอนุญาตเฉพาะแอดมินเท่านั้น', 'warning');
    return;
  }

  // Size limit: 10MB
  if (file.size > MAX_MEDIA_SIZE) {
    showToast('❌ ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน 10MB)', 'error');
    return;
  }

  // MIME type validation
  if (!file.type || !file.type.startsWith('image/')) {
    showToast('⚠️ กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, GIF, WebP)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentChatAttachment = {
      file: file,
      dataUrl: e.target.result,
      name: file.name || 'image.png',
      size: file.size
    };
    showChatAttachmentPreview();
    showToast('แนบรูปภาพเรียบร้อยแล้ว', 'success');
  };
  reader.onerror = () => {
    showToast('ไม่สามารถอ่านไฟล์รูปภาพได้', 'error');
  };
  reader.readAsDataURL(file);
}

// Render preview box of attached image
function showChatAttachmentPreview() {
  const previewBox = document.getElementById('chat-attachment-preview');
  const img = document.getElementById('chat-attachment-img');
  const nameEl = document.getElementById('chat-attachment-name');
  const sizeEl = document.getElementById('chat-attachment-size');
  if (!previewBox || !currentChatAttachment) return;

  if (img) img.src = currentChatAttachment.dataUrl;
  if (nameEl) nameEl.textContent = currentChatAttachment.name || 'image.png';
  if (sizeEl) {
    const sizeKb = Math.round(currentChatAttachment.size / 1024);
    sizeEl.textContent = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';
  }
  previewBox.style.display = 'flex';
}

// Cancel / remove current attached image
function removeChatAttachment() {
  currentChatAttachment = null;
  const previewBox = document.getElementById('chat-attachment-preview');
  if (previewBox) previewBox.style.display = 'none';
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.value = '';
}

// Upload attached image to Firebase Storage or server endpoint
async function uploadChatAttachment(attachment, username) {
  if (!attachment) return null;

  // 1. Try Firebase Storage if available
  try {
    if (typeof fbUploadImage === 'function' && typeof fbStorage !== 'undefined' && fbStorage) {
      const url = await fbUploadImage(attachment.file, 'chat-media');
      if (url) return url;
    }
  } catch (err) {
    console.warn('Firebase Storage upload failed, falling back to server API:', err);
  }

  // 2. Try Server API /api/chat/upload
  try {
    const res = await fetch('/api/chat/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: attachment.dataUrl,
        username: username
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) return data.url;
    }
  } catch (err) {
    console.warn('Server chat upload failed:', err);
  }

  // 3. Fallback to dataUrl directly if small enough (< 1.5MB)
  if (attachment.dataUrl && attachment.size < 1.5 * 1024 * 1024) {
    return attachment.dataUrl;
  }

  throw new Error('ไม่สามารถบันทึกรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
}

// Lightbox Modal functions
function openChatImageLightbox(src) {
  const modal = document.getElementById('modal-chat-lightbox');
  const img = document.getElementById('chat-lightbox-img');
  if (modal && img && src) {
    img.src = src;
    modal.classList.add('show');
  }
}

function closeChatImageLightbox() {
  const modal = document.getElementById('modal-chat-lightbox');
  if (modal) {
    modal.classList.remove('show');
    const img = document.getElementById('chat-lightbox-img');
    if (img) img.src = '';
  }
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
async function sendChatMessage() {
  const usernameInput = document.getElementById('chat-username');
  const messageInput = document.getElementById('chat-message-input');
  const sendBtn = document.getElementById('btn-send-chat');
  
  if (!usernameInput || !messageInput) return;
  
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();
  
  if (!username) {
    showToast('กรุณาใส่ชื่อผู้ใช้', 'error');
    usernameInput.focus();
    return;
  }
  
  // Can send message OR image
  if (!message && !currentChatAttachment) {
    showToast('กรุณาพิมพ์ข้อความหรือแนบรูปภาพ', 'error');
    messageInput.focus();
    return;
  }

  // Auto-delete profanity: check if message contains vulgar words
  if (message) {
    const profaneWord = typeof containsProfanity === 'function' ? containsProfanity(message) : null;
    if (profaneWord) {
      messageInput.value = '';
      messageInput.focus();
      showToast(`⚠️ ข้อความมีคำไม่สุภาพ ("${profaneWord}") ระบบได้ลบข้อความออกอัตโนมัติ`, 'error');
      return;
    }
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

  // Upload attachment if any (Admin only)
  let uploadedImageUrl = null;
  if (currentChatAttachment) {
    if (!isSenderAdmin) {
      showToast('⚠️ การแนบรูปภาพอนุญาตเฉพาะแอดมินเท่านั้น', 'error');
      removeChatAttachment();
      return;
    }

    const origBtnHtml = sendBtn ? sendBtn.innerHTML : '';
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span style="font-size: 0.75rem; font-weight: 700;">ส่งรูป...</span>';
    }

    try {
      uploadedImageUrl = await uploadChatAttachment(currentChatAttachment, username);
    } catch (err) {
      console.error('Failed to upload image:', err);
      showToast(err.message || 'ไม่สามารถอัปโหลดรูปภาพได้', 'error');
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = origBtnHtml;
      }
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = origBtnHtml;
    }
  }
  
  // Get user info for display
  const userInfo = getChatUserInfo(username);
  
  // Build chat message data
  const chatData = {
    username: username,
    displayName: userInfo.displayName,
    message: message || '',
    imageUrl: uploadedImageUrl || null,
    isAdmin: userInfo.isAdmin,
    isVtuber: userInfo.isVtuber,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Send to Firebase
  if (typeof rtdb !== 'undefined' && rtdb) {
    rtdb.ref('chat').push(chatData)
      .then(() => {
        messageInput.value = '';
        removeChatAttachment();
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

  // 1. Instant Cache Pre-render: Keep chat visible immediately without blinking or waiting
  try {
    const cached = localStorage.getItem('chat_messages_cache');
    if (cached && container.children.length === 0) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        container.innerHTML = '';
        parsed.forEach(msg => {
          container.appendChild(createChatMessageElement(msg));
        });
        container.scrollTop = container.scrollHeight;
      }
    }
  } catch (e) {}
  
  // Remove existing listener
  if (chatListener && typeof rtdb !== 'undefined' && rtdb) {
    rtdb.ref('chat').off('value', chatListener);
  }

  function renderMessagesList(messages) {
    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ เริ่มพูดคุยกันเลย!</div>';
      return;
    }

    container.innerHTML = '';
    messages.forEach(msg => {
      const msgEl = createChatMessageElement(msg);
      container.appendChild(msgEl);
    });
    
    // Auto scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Cache locally
    try {
      localStorage.setItem('chat_messages_cache', JSON.stringify(messages.slice(-100)));
    } catch (e) {}
  }
  
  if (typeof rtdb !== 'undefined' && rtdb) {
    // Listen for up to 200 messages in Firebase Realtime Database (retains chat history long-term)
    chatListener = rtdb.ref('chat').orderByChild('timestamp').limitToLast(200).on('value', async (snap) => {
      const data = snap.val();
      
      if (!data) {
        // Fallback: If Firebase is temporarily empty or resetting, check server backup
        try {
          const res = await fetch('/api/chat/history');
          if (res.ok) {
            const json = await res.json();
            if (json && json.success && json.data && Object.keys(json.data).length > 0) {
              const fallbackMsgs = Object.entries(json.data).map(([k, v]) => ({ ...v, _key: k }));
              fallbackMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              renderMessagesList(fallbackMsgs);
              return;
            }
          }
        } catch (e) {}

        container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ เริ่มพูดคุยกันเลย!</div>';
        return;
      }
      
      const messages = [];
      Object.entries(data).forEach(([key, msg]) => {
        if (!msg) return;

        // Auto-delete from Firebase RTDB if message text contains profanity
        if (msg.message) {
          const badWord = typeof containsProfanity === 'function' ? containsProfanity(msg.message) : null;
          if (badWord) {
            rtdb.ref('chat').child(key).remove().catch(() => {});
            return;
          }
        }

        messages.push({ ...msg, _key: key });
      });

      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      renderMessagesList(messages);
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
  
  // Message text
  if (msg.message) {
    const textEl = document.createElement('div');
    textEl.className = 'chat-message-text';
    textEl.textContent = msg.message;
    bubbleEl.appendChild(textEl);
  }

  // Attached image (Admin media)
  if (msg.imageUrl) {
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'chat-media-container';
    mediaContainer.title = 'คลิกเพื่อดูภาพขนาดเต็ม';
    mediaContainer.onclick = () => openChatImageLightbox(msg.imageUrl);

    const img = document.createElement('img');
    img.src = msg.imageUrl;
    img.alt = 'รูปภาพแนบโดยแอดมิน';
    img.className = 'chat-media-img';
    img.loading = 'lazy';
    mediaContainer.appendChild(img);
    bubbleEl.appendChild(mediaContainer);
  }
  
  wrapper.appendChild(headerEl);
  wrapper.appendChild(bubbleEl);
  
  return wrapper;
}

// Drag & Drop and Clipboard Paste Initialization (Admin Only)
function initChatDragAndDropAndPaste() {
  const chatInputArea = document.getElementById('chat-input-area');
  const dragOverlay = document.getElementById('chat-drag-overlay');
  const chatModal = document.getElementById('modal-chat');

  if (chatInputArea) {
    let dragCounter = 0;

    chatInputArea.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const username = (document.getElementById('chat-username')?.value || '').trim();
      if (!isAdminUser(username)) return;
      dragCounter++;
      if (dragOverlay) dragOverlay.style.display = 'flex';
    });

    chatInputArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const username = (document.getElementById('chat-username')?.value || '').trim();
      if (!isAdminUser(username)) return;
      if (dragOverlay) dragOverlay.style.display = 'flex';
    });

    chatInputArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (dragOverlay) dragOverlay.style.display = 'none';
      }
    });

    chatInputArea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      if (dragOverlay) dragOverlay.style.display = 'none';

      const username = (document.getElementById('chat-username')?.value || '').trim();
      if (!isAdminUser(username)) {
        showToast('⚠️ การแนบรูปภาพอนุญาตเฉพาะแอดมินเท่านั้น', 'warning');
        return;
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processChatMediaFile(files[0]);
      }
    });
  }

  // Clipboard Paste listener
  document.addEventListener('paste', (e) => {
    const chatModal = document.getElementById('modal-chat');
    if (!chatModal || !chatModal.classList.contains('show')) return;

    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') !== -1) {
        const username = (document.getElementById('chat-username')?.value || '').trim();
        if (!isAdminUser(username)) {
          showToast('⚠️ การแนบรูปภาพอนุญาตเฉพาะแอดมินเท่านั้น', 'warning');
          return;
        }

        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processChatMediaFile(file);
          break;
        }
      }
    }
  });
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

  // Initialize Drag & Drop and Clipboard paste
  initChatDragAndDropAndPaste();
});

// Expose functions to window for onclick handlers
window.triggerChatFileSelect = triggerChatFileSelect;
window.handleChatFileSelect = handleChatFileSelect;
window.removeChatAttachment = removeChatAttachment;
window.openChatImageLightbox = openChatImageLightbox;
window.closeChatImageLightbox = closeChatImageLightbox;
