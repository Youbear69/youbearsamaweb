const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { readData, writeData, getFirebaseAuth } = require('./db');
const {
  extractCleanHandle,
  cleanName,
  compactName,
  diceSimilarity,
  checkDuplicateOrSimilar,
  findDuplicateOrSimilar
} = require('./public/js/common');

const app = express();

const PORT = 3000;

const FIREBASE_WEB_API_KEY = 'AIzaSyBXj1EXxKUnk6TTvOFukF92PZitC5NqT8o';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure avatars uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve static assets from project root and public folder
app.use('/assets/images', express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Zodiac list metadata
const ZODIAC_METADATA = [
  { key: 'aquarius', th: 'กุมภ์', en: 'Aquarius', dateRange: '20 มกราคม – 18 กุมภาพันธ์', icon: 'aquarius.png' },
  { key: 'pisces', th: 'มีน', en: 'Pisces', dateRange: '19 กุมภาพันธ์ – 20 มีนาคม', icon: 'pisces.png' },
  { key: 'aries', th: 'เมษ', en: 'Aries', dateRange: '21 มีนาคม – 19 เมษายน', icon: 'aries.png' },
  { key: 'taurus', th: 'พฤษภ', en: 'Taurus', dateRange: '20 เมษายน – 20 พฤษภาคม', icon: 'taurus.png' },
  { key: 'gemini', th: 'เมถุน', en: 'Gemini', dateRange: '21 พฤษภาคม – 20 มิถุนายน', icon: 'gemini.png' },
  { key: 'cancer', th: 'กรกฎ', en: 'Cancer', dateRange: '21 มิถุนายน – 22 กรกฎาคม', icon: 'cancer.png' },
  { key: 'leo', th: 'สิงห์', en: 'Leo', dateRange: '23 กรกฎาคม – 22 สิงหาคม', icon: 'leo.png' },
  { key: 'virgo', th: 'กันย์', en: 'Virgo', dateRange: '23 สิงหาคม – 22 กันยายน', icon: 'virgo.png' },
  { key: 'libra', th: 'ตุลย์/ตุล', en: 'Libra', dateRange: '23 กันยายน – 22 ตุลาคม', icon: 'libra.png' },
  { key: 'scorpio', th: 'พิจิก', en: 'Scorpio', dateRange: '23 ตุลาคม – 21 พฤศจิกายน', icon: 'scorpio.png' },
  { key: 'sagittarius', th: 'ธนู', en: 'Sagittarius', dateRange: '22 พฤศจิกายน – 21 ธันวาคม', icon: 'sagittarius.png' },
  { key: 'capricorn', th: 'มังกร', en: 'Capricorn', dateRange: '22 ธันวาคม – 19 มกราคม', icon: 'capricorn.png' }
];

// Alphabetical Sorting: Thai (ก-ฮ) first, then English (A-Z)
function sortThaiEnglishServer(a, b, desc = false) {
  const nameA = ((typeof a === 'string' ? a : (a?.displayName || a?.xAccount || ''))).trim();
  const nameB = ((typeof b === 'string' ? b : (b?.displayName || b?.xAccount || ''))).trim();

  const isThaiA = /^[\u0E00-\u0E7F]/.test(nameA);
  const isThaiB = /^[\u0E00-\u0E7F]/.test(nameB);

  let res = 0;
  if (isThaiA && !isThaiB) {
    res = -1;
  } else if (!isThaiA && isThaiB) {
    res = 1;
  } else {
    res = nameA.localeCompare(nameB, 'th', { numeric: true, sensitivity: 'base' });
  }

  return desc ? -res : res;
}

// Parse social account URLs and handles
function parseSocialLinkServer(raw) {
  let text = (raw || '').trim();
  if (!text) return { type: 'x', url: '', username: '' };

  // 1. YouTube
  if (/youtube\.com|youtu\.be/i.test(text)) {
    let handle = text.replace(/^(https?:\/\/)?(www\.)?youtube\.com\//i, '').replace(/^@/, '');
    handle = handle.split('/')[0].split('?')[0].split('&')[0];
    let fullUrl = text.startsWith('http') ? text : `https://${text}`;
    return { type: 'youtube', url: fullUrl, username: handle || text };
  }

  // 2. TikTok
  if (/tiktok\.com/i.test(text)) {
    let handle = text.replace(/^(https?:\/\/)?(www\.)?tiktok\.com\/@?/i, '').replace(/^@/, '');
    handle = handle.split('/')[0].split('?')[0].split('&')[0];
    let fullUrl = text.startsWith('http') ? text : `https://${text}`;
    return { type: 'tiktok', url: fullUrl, username: handle || text };
  }

  // 3. X / Twitter
  let username = text
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^(twitter|x)\.com\//i, '')
    .replace(/^@+/, '')
    .split('/')[0]
    .split('?')[0]
    .split('&')[0]
    .split('#')[0]
    .trim();

  let fullUrl = username ? `https://x.com/${username}` : (text.startsWith('http') ? text : `https://${text}`);
  return { type: 'x', url: fullUrl, username: username };
}

// Download profile avatar from X/YouTube/TikTok, cache permanently on disk & return clean URL
async function downloadAndCacheAvatar(link, fallbackName, existingImageUrl = '', itemId = '') {
  // If user has a Firebase Storage URL (e.g. uploaded by admin), preserve it 100%!
  if (existingImageUrl && (existingImageUrl.includes('firebasestorage.googleapis.com') || existingImageUrl.startsWith('data:image'))) {
    return existingImageUrl;
  }

  const cleanLink = (link || '').trim();
  const parsed = parseSocialLinkServer(cleanLink);

  // Generate a safe, collision-resistant key
  let safeKey = (parsed.username || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  if (!safeKey || safeKey.length < 2) {
    const rawFallback = (fallbackName || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    safeKey = rawFallback.length >= 2 ? rawFallback : (itemId ? String(itemId).replace(/[^a-zA-Z0-9_-]/g, '_') : `user_${Date.now()}`);
  }

  const localFileName = `${safeKey}.jpg`;
  const localFilePath = path.join(UPLOADS_DIR, localFileName);
  const relativeUrl = `/uploads/avatars/${localFileName}`;

  // Check if existing file on disk is already a valid image (> 1KB, not SVG)
  const isLocalFileValid = () => {
    if (!fs.existsSync(localFilePath)) return false;
    try {
      const stats = fs.statSync(localFilePath);
      if (stats.size < 1000) return false;
      const head = fs.readFileSync(localFilePath, 'utf-8').slice(0, 100);
      if (head.includes('<svg') || head.includes('unavatar') || head.includes('<!DOCTYPE')) return false;
      return true;
    } catch (e) {
      return false;
    }
  };

  let remoteUrl = null;

  // 1. YouTube
  if (parsed.type === 'youtube') {
    try {
      let targetUrl = cleanLink.startsWith('http') ? cleanLink : 'https://' + cleanLink;
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const html = await res.text();
        const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        const yt3Match = html.match(/https:\/\/yt3\.googleusercontent\.com\/[a-zA-Z0-9_\-=]+/g);
        remoteUrl = (ogMatch ? ogMatch[1] : null) || (yt3Match ? yt3Match[0] : null);
      }
    } catch (e) {
      console.warn('YouTube avatar fetch failed:', e.message);
    }
  }
  // 2. TikTok
  else if (parsed.type === 'tiktok') {
    try {
      let targetUrl = cleanLink.startsWith('http') ? cleanLink : 'https://' + cleanLink;
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const html = await res.text();
        const avatarMatch = html.match(/https:\/\/[^"']*(?:tiktokcdn|avatar)[^"']*\.(?:jpeg|jpg|png|webp|image)[^"']*/i) ||
                            html.match(/"avatarLarger":"([^"]+)"/) ||
                            html.match(/"avatarMedium":"([^"]+)"/);
        if (avatarMatch) {
          remoteUrl = (avatarMatch[1] || avatarMatch[0]).replace(/\\u0026/g, '&').replace(/\\/g, '');
        }
      }
    } catch (e) {
      console.warn('TikTok avatar fetch failed:', e.message);
    }
  }
  // 3. X / Twitter
  else {
    const handle = parsed.username;
    if (handle) {
      // 3.1 Try VxTwitter API (fast & returns direct pbs.twimg CDN)
      try {
        const res = await fetch(`https://api.vxtwitter.com/${encodeURIComponent(handle)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const pUrl = data.user_profile_image_url || data.profile_image_url;
          if (pUrl) {
            remoteUrl = pUrl.replace('_normal.', '_400x400.').replace('_bigger.', '_400x400.');
          }
        }
      } catch (err) {
        // ignore
      }

      // 3.2 Try FxTwitter API
      if (!remoteUrl) {
        try {
          const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000)
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user && data.user.avatar_url) {
              remoteUrl = data.user.avatar_url.replace('_normal.', '_400x400.').replace('_bigger.', '_400x400.');
            }
          }
        } catch (err) {
          // ignore
        }
      }
    }
  }

  // Download image bytes and cache permanently on disk
  if (remoteUrl) {
    try {
      const imgRes = await fetch(remoteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000)
      });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const head = buffer.slice(0, 100).toString();
        // Strictly reject SVGs, dummy HTML or tiny buffers
        if (buffer.length > 1000 && !head.includes('<svg') && !head.includes('unavatar') && !head.includes('<!DOCTYPE')) {
          fs.writeFileSync(localFilePath, buffer);
          return `${relativeUrl}?v=${Date.now()}`;
        }
      }
    } catch (err) {
      console.warn(`Error downloading avatar bytes from ${remoteUrl}:`, err.message);
    }
  }

  // If local file already exists from previous valid download, NEVER delete or overwrite it!
  if (isLocalFileValid()) {
    return relativeUrl;
  }

  // If existing image URL is a valid remote image (not twimg or unavatar), preserve it
  if (existingImageUrl && !existingImageUrl.includes('unavatar.io')) {
    return existingImageUrl;
  }

  // Final fallback: Dicebear bot
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fallbackName || cleanLink || 'user')}`;
}

// 24-Hour (1 Day) Avatar Sync Routine
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let isSyncingAvatars = false;

async function syncAllAvatars(force = false) {
  if (isSyncingAvatars) return { updated: 0 };
  isSyncingAvatars = true;

  const db = readData();
  let updatedCount = 0;
  const now = Date.now();

  try {
    const processList = async (list, label) => {
      for (const item of list) {
        // NEVER overwrite custom admin uploaded Firebase Storage images
        if (item.imageUrl && (item.imageUrl.includes('firebasestorage.googleapis.com') || item.imageUrl.startsWith('data:image'))) {
          continue;
        }

        const lastUpdated = item.avatarFetchedAt ? new Date(item.avatarFetchedAt).getTime() : 0;
        const isExpired = (now - lastUpdated) > ONE_DAY_MS;

        // Check if file on disk exists and is valid
        let fileValidOnDisk = false;
        if (item.imageUrl && item.imageUrl.startsWith('/uploads/avatars/')) {
          const fname = item.imageUrl.replace('/uploads/avatars/', '').split('?')[0];
          const fpath = path.join(UPLOADS_DIR, fname);
          if (fs.existsSync(fpath)) {
            const size = fs.statSync(fpath).size;
            const head = fs.readFileSync(fpath, 'utf-8').slice(0, 100);
            if (size >= 1000 && !head.includes('<svg') && !head.includes('unavatar')) {
              fileValidOnDisk = true;
            }
          }
        }

        const needsSync = force || (!fileValidOnDisk) || (isExpired && !fileValidOnDisk);

        if (needsSync) {
          console.log(`[Avatar Sync] Checking avatar for ${label} "${item.displayName || item.xAccount}"...`);
          try {
            const newUrl = await downloadAndCacheAvatar(item.xAccount, item.displayName, item.imageUrl, item.id);
            if (newUrl && !newUrl.includes('dicebear') && newUrl !== item.imageUrl) {
              item.imageUrl = newUrl;
              item.avatarFetchedAt = new Date().toISOString();
              updatedCount++;
            }
          } catch (err) {
            console.warn(`[Avatar Sync] Error for ${item.xAccount}:`, err.message);
          }
          // Throttle 400ms to avoid hitting rate limits
          await new Promise(r => setTimeout(r, 400));
        }
      }
    };

    if (Array.isArray(db.registrations)) {
      await processList(db.registrations, 'Registration');
    }
    if (Array.isArray(db.proposals)) {
      await processList(db.proposals, 'Proposal');
    }

    if (updatedCount > 0) {
      writeData(db);
      console.log(`[Avatar Sync] Successfully refreshed ${updatedCount} avatars and synced to database!`);
    }
  } catch (err) {
    console.error('[Avatar Sync] Exception during sync:', err);
  } finally {
    isSyncingAvatars = false;
  }

  return { updated: updatedCount };
}

// Run initial avatar sync on startup and schedule every 30 minutes
setTimeout(() => {
  syncAllAvatars(false);
}, 2000);

setInterval(() => {
  syncAllAvatars(false);
}, 30 * 60 * 1000);

// Active admin sessions Map (token -> user data)
const activeAdminTokens = new Map();

// Middleware: Require Admin Authentication
function requireAdminAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'].trim();
  } else if (req.query && req.query.token) {
    token = req.query.token.trim();
  }

  if (token && activeAdminTokens.has(token)) {
    req.adminUser = activeAdminTokens.get(token);
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'กรุณาลงชื่อเข้าใช้ด้วยบัญชีแอดมินก่อนดำเนินการ'
  });
}

// ==========================================
// Admin Auth API Routes (Firebase Authentication)
// ==========================================

// Admin Login API (authenticates against Firebase Authentication)
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
    const fbRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPassword,
        returnSecureToken: true
      })
    });

    const fbData = await fbRes.json();

    if (!fbRes.ok || fbData.error) {
      console.warn('[Firebase Auth Login Failed]:', fbData.error ? fbData.error.message : 'Unknown error');
      
      // Local fallback credentials check from database
      const db = readData();
      const localAdmin = (db.settings && db.settings.adminAuth) ? db.settings.adminAuth : null;
      if (localAdmin && localAdmin.email && localAdmin.email.toLowerCase() === cleanEmail && localAdmin.password === cleanPassword) {
        const token = 'token_admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const sessionData = {
          email: cleanEmail,
          uid: 'local_admin_uid',
          loginAt: new Date().toISOString()
        };
        activeAdminTokens.set(token, sessionData);
        return res.json({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ (Local Authentication)',
          token,
          admin: {
            email: cleanEmail,
            uid: 'local_admin_uid'
          }
        });
      }

      let errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      if (fbData.error && fbData.error.message === 'EMAIL_NOT_FOUND') {
        errMsg = 'ไม่พบบัญชีอีเมลนี้ในระบบ';
      } else if (fbData.error && (fbData.error.message === 'INVALID_PASSWORD' || fbData.error.message === 'INVALID_LOGIN_CREDENTIALS')) {
        errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (fbData.error && fbData.error.message === 'USER_DISABLED') {
        errMsg = 'บัญชีผู้ใช้นี้ถูกปิดการใช้งาน';
      }
      return res.status(401).json({ success: false, message: errMsg });
    }

    // Verify token with Firebase Admin SDK
    const authAdmin = getFirebaseAuth();
    let uid = fbData.localId;
    if (authAdmin && fbData.idToken) {
      try {
        const decoded = await authAdmin.verifyIdToken(fbData.idToken);
        uid = decoded.uid;
      } catch (err) {
        console.warn('Verify ID token warning:', err.message);
      }
    }

    const token = 'token_admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      email: fbData.email || cleanEmail,
      uid: uid,
      idToken: fbData.idToken,
      refreshToken: fbData.refreshToken,
      loginAt: new Date().toISOString()
    };

    activeAdminTokens.set(token, sessionData);

    res.json({
      success: true,
      message: 'เข้าสู่ระบบผ่าน Firebase Authentication สำเร็จ',
      token,
      admin: {
        email: sessionData.email,
        uid: sessionData.uid
      }
    });
  } catch (err) {
    console.error('Firebase Auth Exception:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับบริการ Firebase Authentication' });
  }
});

// Admin Verify Token API
app.get('/api/admin/verify', (req, res) => {
  let token = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'].trim();
  } else if (req.query && req.query.token) {
    token = req.query.token.trim();
  }

  if (token && activeAdminTokens.has(token)) {
    const adminUser = activeAdminTokens.get(token);
    return res.json({ success: true, admin: { email: adminUser.email, uid: adminUser.uid } });
  }

  return res.status(401).json({ success: false, message: 'เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ' });
});

// Admin Logout API
app.post('/api/admin/logout', (req, res) => {
  let token = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'].trim();
  }

  if (token) {
    activeAdminTokens.delete(token);
  }

  res.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
});

// Admin Change Credentials API (Updates user in Firebase Authentication)
app.post('/api/admin/change-credentials', requireAdminAuth, async (req, res) => {
  const { newEmail, newPassword } = req.body || {};
  const authAdmin = getFirebaseAuth();

  if (!authAdmin) {
    return res.status(500).json({ success: false, message: 'ระบบ Firebase Authentication ยังไม่พร้อมใช้งาน' });
  }

  if (!newEmail && !newPassword) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลใหม่หรือรหัสผ่านใหม่ที่ต้องการเปลี่ยน' });
  }

  try {
    const uid = req.adminUser.uid;
    const updatePayload = {};
    if (newEmail && newEmail.trim()) updatePayload.email = newEmail.trim().toLowerCase();
    if (newPassword && newPassword.trim()) updatePayload.password = newPassword.trim();

    const updatedUser = await authAdmin.updateUser(uid, updatePayload);

    // Update active session email
    if (updatedUser.email) {
      req.adminUser.email = updatedUser.email;
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้ใช้ในระบบ Firebase Authentication เรียบร้อยแล้ว',
      admin: { email: updatedUser.email, uid: updatedUser.uid }
    });
  } catch (err) {
    console.error('Update Firebase Auth User error:', err);
    res.status(400).json({ success: false, message: err.message || 'ไม่สามารถอัปเดตข้อมูลใน Firebase Auth ได้' });
  }
});

// ==========================================
// General API Routes
// ==========================================

app.get('/api/zodiac-list', (req, res) => {
  res.json({ success: true, data: ZODIAC_METADATA });
});

app.get('/api/settings', (req, res) => {
  const db = readData();
  const safeSettings = {
    ...db.settings,
    isRegistrationOpen: db.settings.isRegistrationOpen !== undefined ? db.settings.isRegistrationOpen : true,
    registrationClosedMessage: db.settings.registrationClosedMessage || "ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย"
  };
  delete safeSettings.adminAuth;
  res.json({ success: true, data: safeSettings });
});

app.post('/api/settings', requireAdminAuth, (req, res) => {
  const { liveDate, liveDateDisplay, closeDate, closeDateDisplay, popupMessage, isRegistrationOpen, registrationClosedMessage } = req.body;
  const db = readData();
  db.settings = {
    ...db.settings,
    ...(liveDate !== undefined && { liveDate }),
    ...(liveDateDisplay !== undefined && { liveDateDisplay }),
    ...(closeDate !== undefined && { closeDate }),
    ...(closeDateDisplay !== undefined && { closeDateDisplay }),
    ...(popupMessage !== undefined && { popupMessage }),
    ...(isRegistrationOpen !== undefined && { isRegistrationOpen: Boolean(isRegistrationOpen) }),
    ...(registrationClosedMessage !== undefined && { registrationClosedMessage })
  };
  writeData(db);
  const safeSettings = { ...db.settings };
  delete safeSettings.adminAuth;
  res.json({ success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว', data: safeSettings });
});

app.get('/api/zodiac-stats', (req, res) => {
  const db = readData();
  const counts = {};
  ZODIAC_METADATA.forEach(z => { counts[z.key] = 0; });
  
  (db.registrations || []).forEach(reg => {
    if (counts[reg.zodiacKey] !== undefined) {
      counts[reg.zodiacKey]++;
    }
  });

  const approvedProposals = (db.proposals || []).filter(p => p.approved);

  const list = ZODIAC_METADATA.map(z => ({
    ...z,
    count: counts[z.key] || 0
  }));

  if (approvedProposals.length > 0) {
    list.push({
      key: 'proposed',
      th: 'วีทูบเบอร์ที่เสนอชื่อ',
      en: 'Proposed',
      dateRange: 'วีทูบเบอร์ที่ถูกเสนอชื่อเข้าร่วม',
      icon: null,
      count: approvedProposals.length,
      isProposed: true
    });
  }

  const totalRegistered = (db.registrations || []).length;
  const totalApprovedProps = approvedProposals.length;

  res.json({
    success: true,
    total: totalRegistered + totalApprovedProps,
    data: list
  });
});

app.get('/api/zodiac/:sign', (req, res) => {
  const signKey = (req.params.sign || '').toLowerCase().trim();

  if (signKey === 'proposed') {
    const zodiacInfo = {
      key: 'proposed',
      th: 'วีทูบเบอร์ที่เสนอชื่อ',
      en: 'Proposed',
      dateRange: 'วีทูบเบอร์ที่ถูกเสนอชื่อเข้าร่วม',
      icon: null,
      isProposed: true
    };

    const db = readData();
    const approvedProposals = (db.proposals || []).filter(p => p.approved).map(p => {
      const zMeta = ZODIAC_METADATA.find(z => z.key === p.zodiacKey);
      return {
        id: p.id,
        xAccount: p.xAccount,
        displayName: p.displayName || p.xAccount.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '').replace(/^@/, '') || 'VTuber ที่ถูกเสนอ',
        zodiacKey: p.zodiacKey || 'unknown',
        zodiacNameTh: zMeta ? zMeta.th : 'ไม่ทราบราศี',
        zodiacNameEn: zMeta ? zMeta.en : 'Unknown',
        zodiacLabel: zMeta ? `ราศี${zMeta.th} (${zMeta.en})` : 'ไม่ทราบราศี',
        imageUrl: p.imageUrl || null,
        registeredAt: p.createdAt || p.registeredAt,
        isProposal: true
      };
    });

    return res.json({
      success: true,
      zodiac: zodiacInfo,
      count: approvedProposals.length,
      members: approvedProposals
    });
  }

  if (signKey === 'unknown') {
    const zodiacInfo = {
      key: 'unknown',
      th: 'ไม่ทราบราศี',
      en: 'Unknown',
      dateRange: 'วีทูบเบอร์ที่ไม่ระบุราศี',
      icon: 'unknown',
      isUnknown: true
    };

    const db = readData();
    const approvedProposals = (db.proposals || []).filter(
      p => p.approved && (p.zodiacKey === 'unknown' || !p.zodiacKey)
    ).map(p => ({
      id: p.id,
      xAccount: p.xAccount,
      displayName: p.displayName || p.xAccount.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '').replace(/^@/, '') || 'VTuber ที่ถูกเสนอ',
      zodiacKey: 'unknown',
      zodiacNameTh: 'ไม่ทราบราศี',
      zodiacNameEn: 'Unknown',
      zodiacLabel: 'ไม่ทราบราศี',
      imageUrl: p.imageUrl || null,
      registeredAt: p.createdAt || p.registeredAt,
      isProposal: true
    }));

    approvedProposals.sort(sortThaiEnglishServer);

    return res.json({
      success: true,
      zodiac: zodiacInfo,
      count: approvedProposals.length,
      members: approvedProposals
    });
  }

  const zodiacInfo = ZODIAC_METADATA.find(
    z => z.key.toLowerCase() === signKey || z.th === signKey || z.en.toLowerCase() === signKey
  );

  if (!zodiacInfo) {
    return res.status(404).json({ success: false, message: 'ไม่พบราศีที่ระบุ' });
  }

  const db = readData();
  const registeredMembers = (db.registrations || []).filter(
    r => (r.zodiacKey || '').toLowerCase() === zodiacInfo.key.toLowerCase()
  );

  registeredMembers.sort(sortThaiEnglishServer);

  res.json({
    success: true,
    zodiac: zodiacInfo,
    count: registeredMembers.length,
    members: registeredMembers
  });
});

app.post('/api/register', async (req, res) => {
  const db = readData();
  const settings = db.settings || {};
  if (settings.isRegistrationOpen === false) {
    return res.status(403).json({
      success: false,
      message: settings.registrationClosedMessage || 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย'
    });
  }

  const { xAccount, displayName, zodiacKey, imageUrl } = req.body;

  if (!xAccount || !displayName || !zodiacKey) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }

  const zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === zodiacKey.toLowerCase());
  if (!zodiacInfo) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกรังสี/ราศีที่ถูกต้อง' });
  }

  const resolvedAvatar = imageUrl || await downloadAndCacheAvatar(xAccount, displayName);

  const newEntry = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    xAccount: xAccount.trim(),
    displayName: displayName.trim(),
    imageUrl: resolvedAvatar,
    avatarFetchedAt: new Date().toISOString(),
    zodiacKey: zodiacInfo.key,
    zodiacNameTh: zodiacInfo.th,
    zodiacNameEn: zodiacInfo.en,
    registeredAt: new Date().toISOString()
  };

  db.registrations = db.registrations || [];
  db.registrations.unshift(newEntry);

  // หากวีที่ถูกเสนอชื่อมา แล้วมาลงทะเบียนเอง: ให้ปิดชื่อออกจากระบบเสนอ แล้วเข้าลงทะเบียนแทน
  if (Array.isArray(db.proposals)) {
    db.proposals.forEach(p => {
      const match = checkDuplicateOrSimilar(p, newEntry);
      if (match.isMatch) {
        p.approved = false;
        p.convertedToRegId = newEntry.id;
        p.convertedAt = new Date().toISOString();
        p.statusNote = 'ย้ายไปลงทะเบียนแล้ว';
        if (p.imageUrl && (!newEntry.imageUrl || newEntry.imageUrl.includes('dicebear'))) {
          newEntry.imageUrl = p.imageUrl;
        }
      }
    });
  }

  writeData(db);

  res.json({
    success: true,
    message: 'ลงทะเบียนสำเร็จเรียบร้อยแล้ว!',
    data: newEntry
  });
});

app.get('/api/registrations', requireAdminAuth, (req, res) => {
  const db = readData();
  res.json({
    success: true,
    total: (db.registrations || []).length,
    data: db.registrations || []
  });
});

app.delete('/api/registrations/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const db = readData();
  const initialLength = (db.registrations || []).length;
  db.registrations = (db.registrations || []).filter(r => r.id !== id);

  if (db.registrations.length === initialLength) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการลบ' });
  }

  writeData(db);
  res.json({ success: true, message: 'ลบรายการสำเร็จ' });
});

// Admin Sync & Refresh All Avatars API
app.post('/api/admin/sync-avatars', requireAdminAuth, async (req, res) => {
  try {
    const result = await syncAllAvatars(true);
    res.json({
      success: true,
      message: `อัปเดตและบันทึกรูปโปรไฟล์เรียบร้อยแล้ว (${result.updated} รายการ)`,
      data: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตรูปโปรไฟล์' });
  }
});

// ==========================================
// Proposal API Routes (เสนอวีทูบเบอร์)
// ==========================================

app.post('/api/propose', async (req, res) => {
  const db = readData();
  const settings = db.settings || {};
  if (settings.isRegistrationOpen === false) {
    return res.status(403).json({
      success: false,
      message: settings.registrationClosedMessage || 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย'
    });
  }

  const { xAccount, displayName, zodiacKey, imageUrl } = req.body;

  if (!xAccount || !xAccount.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกลิงก์หรือชื่อบัญชี X ของวีทูบเบอร์' });
  }

  const cleanX = xAccount.trim();
  let zKey = (zodiacKey || 'unknown').toLowerCase().trim();
  let zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === zKey);

  let zNameTh = 'ไม่ทราบราศี';
  let zNameEn = 'Unknown';

  if (zodiacInfo) {
    zKey = zodiacInfo.key;
    zNameTh = zodiacInfo.th;
    zNameEn = zodiacInfo.en;
  } else {
    zKey = 'unknown';
  }

  // Derive simple display name from X account or use provided displayName
  let autoDisplayName = cleanX
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '')
    .replace(/^@/, '')
    .split('/')[0]
    .split('?')[0] || cleanX;

  let finalDisplayName = (displayName && displayName.trim()) ? displayName.trim() : autoDisplayName;
  const resolvedAvatar = imageUrl || await downloadAndCacheAvatar(cleanX, finalDisplayName);

  db.proposals = db.proposals || [];

  // ตรวจสอบชื่อซ้ำ:
  // 1) หากซ้ำกับผู้ลงทะเบียน -> ปิดชื่อไว้
  // 2) หากซ้ำกับข้อเสนอที่มีอยู่แล้ว -> ปิดชื่อไว้
  let isDuplicate = false;
  let duplicateReason = null;
  let matchedDetail = null;

  const candidate = {
    xAccount: cleanX,
    displayName: finalDisplayName
  };

  const regMatch = findDuplicateOrSimilar(candidate, db.registrations || []);
  if (regMatch) {
    isDuplicate = true;
    duplicateReason = 'registered';
    matchedDetail = regMatch.detail || regMatch.matchItem.displayName;
  } else {
    const propMatch = findDuplicateOrSimilar(candidate, db.proposals || []);
    if (propMatch) {
      isDuplicate = true;
      duplicateReason = 'already_proposed';
      matchedDetail = propMatch.detail || propMatch.matchItem.displayName;
    }
  }

  // หากลงทะเบียนชื่อเดิมหรือคล้ายกัน ให้ลงชื่อได้ปกติ แต่ระบบจะปิดชื่อไว้ไม่โชว์เข้าหน้าเสนอวี
  const shouldApprove = !isDuplicate;

  const newProposal = {
    id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    xAccount: cleanX,
    displayName: finalDisplayName,
    imageUrl: resolvedAvatar,
    avatarFetchedAt: new Date().toISOString(),
    zodiacKey: zKey,
    zodiacNameTh: zNameTh,
    zodiacNameEn: zNameEn,
    approved: shouldApprove, // ปิดชื่อไว้ไม่โชว์เข้าหน้าเสนอวีหากซ้ำ
    isDuplicate: isDuplicate,
    duplicateReason: duplicateReason,
    matchedTarget: matchedDetail,
    statusNote: isDuplicate ? (duplicateReason === 'registered' ? 'ลงทะเบียนแล้ว (ปิดชื่ออัตโนมัติ)' : 'ชื่อซ้ำ (ปิดชื่ออัตโนมัติ)') : null,
    createdAt: new Date().toISOString()
  };

  db.proposals.unshift(newProposal);
  writeData(db);

  res.json({
    success: true,
    message: 'เสนอชื่อวีทูบเบอร์สำเร็จเรียบร้อยแล้ว! ขอบคุณสำหรับข้อมูล',
    data: newProposal
  });
});

// Admin Batch Clean & Migrate Duplicates API
app.post('/api/admin/clean-duplicates', requireAdminAuth, (req, res) => {
  const db = readData();
  db.registrations = db.registrations || [];
  db.proposals = db.proposals || [];

  let convertedCount = 0;
  let duplicateCount = 0;

  // 1. Check against registrations: any proposed member who is also in registrations -> close from proposals
  db.proposals.forEach(p => {
    const regMatch = findDuplicateOrSimilar(p, db.registrations);
    if (regMatch) {
      if (p.approved || !p.convertedToRegId) {
        p.approved = false;
        p.convertedToRegId = regMatch.matchItem.id;
        p.statusNote = 'ย้ายไปลงทะเบียนแล้ว';
        convertedCount++;
      }
    }
  });

  // 2. Check among proposals: keep earliest approved, hide subsequent duplicates
  const seen = [];
  db.proposals.forEach(p => {
    if (p.convertedToRegId || p.statusNote === 'ย้ายไปลงทะเบียนแล้ว') return;

    const propMatch = findDuplicateOrSimilar(p, seen);
    if (propMatch) {
      if (p.approved || !p.isDuplicate) {
        p.approved = false;
        p.isDuplicate = true;
        p.duplicateReason = 'already_proposed';
        p.matchedTarget = propMatch.detail || propMatch.matchItem.displayName;
        p.statusNote = 'ชื่อซ้ำ (ปิดชื่ออัตโนมัติ)';
        duplicateCount++;
      }
    } else {
      seen.push(p);
    }
  });

  writeData(db);

  res.json({
    success: true,
    message: `สแกนสำเร็จ: ปิดชื่อที่ย้ายไปลงทะเบียน ${convertedCount} รายการ, ปิดชื่อที่ซ้ำซ้อน ${duplicateCount} รายการ`,
    data: { convertedCount, duplicateCount, totalProposals: db.proposals.length }
  });
});


app.get('/api/proposals', requireAdminAuth, (req, res) => {
  const db = readData();
  res.json({
    success: true,
    total: (db.proposals || []).length,
    data: db.proposals || []
  });
});

app.patch('/api/proposals/:id/toggle-approve', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;
  const db = readData();
  db.proposals = db.proposals || [];

  const proposal = db.proposals.find(p => p.id === id);
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการแก้ไข' });
  }

  if (typeof approved === 'boolean') {
    proposal.approved = approved;
  } else {
    proposal.approved = !proposal.approved;
  }

  writeData(db);
  res.json({
    success: true,
    message: proposal.approved ? 'อนุมัติให้แสดงผลหน้าแรกแล้ว' : 'ปิดการแสดงผลหน้าแรกแล้ว',
    data: proposal
  });
});

app.patch('/api/registrations/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { displayName, xAccount, zodiacKey, imageUrl } = req.body;
  const db = readData();
  db.registrations = db.registrations || [];

  const reg = db.registrations.find(r => r.id === id);
  if (!reg) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการผู้ลงทะเบียนที่ต้องการแก้ไข' });
  }

  if (displayName !== undefined) reg.displayName = displayName.trim();
  if (xAccount !== undefined) reg.xAccount = xAccount.trim();
  if (imageUrl !== undefined) reg.imageUrl = imageUrl.trim();

  if (zodiacKey !== undefined) {
    const zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === zodiacKey.toLowerCase());
    if (zodiacInfo) {
      reg.zodiacKey = zodiacInfo.key;
      reg.zodiacNameTh = zodiacInfo.th;
      reg.zodiacNameEn = zodiacInfo.en;
    }
  }

  writeData(db);
  res.json({
    success: true,
    message: 'อัปเดตข้อมูลผู้ลงทะเบียนเรียบร้อยแล้ว',
    data: reg
  });
});

app.patch('/api/registrations/:id/zodiac', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { zodiacKey } = req.body;
  const db = readData();
  db.registrations = db.registrations || [];

  const reg = db.registrations.find(r => r.id === id);
  if (!reg) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการผู้ลงทะเบียนที่ต้องการแก้ไข' });
  }

  const zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === (zodiacKey || '').toLowerCase());
  if (!zodiacInfo) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกรังสี/ราศีที่ถูกต้อง' });
  }

  reg.zodiacKey = zodiacInfo.key;
  reg.zodiacNameTh = zodiacInfo.th;
  reg.zodiacNameEn = zodiacInfo.en;

  writeData(db);
  res.json({
    success: true,
    message: `เปลี่ยนราศีของผู้ลงทะเบียนเป็น "${zodiacInfo.th}" เรียบร้อยแล้ว`,
    data: reg
  });
});

app.patch('/api/proposals/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { displayName, xAccount, zodiacKey, imageUrl } = req.body;
  const db = readData();
  db.proposals = db.proposals || [];

  const prop = db.proposals.find(p => p.id === id);
  if (!prop) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการเสนอวีทูบเบอร์ที่ต้องการแก้ไข' });
  }

  if (displayName !== undefined) prop.displayName = displayName.trim();
  if (xAccount !== undefined) prop.xAccount = xAccount.trim();
  if (imageUrl !== undefined) prop.imageUrl = imageUrl.trim();

  if (zodiacKey !== undefined) {
    let zKey = (zodiacKey || 'unknown').toLowerCase().trim();
    let zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === zKey);
    if (zKey === 'unknown' || !zodiacInfo) {
      prop.zodiacKey = 'unknown';
      prop.zodiacNameTh = 'ไม่ทราบราศี';
      prop.zodiacNameEn = 'Unknown';
    } else {
      prop.zodiacKey = zodiacInfo.key;
      prop.zodiacNameTh = zodiacInfo.th;
      prop.zodiacNameEn = zodiacInfo.en;
    }
  }

  writeData(db);
  res.json({
    success: true,
    message: 'อัปเดตข้อมูลการเสนอชื่อเรียบร้อยแล้ว',
    data: prop
  });
});

app.patch('/api/proposals/:id/zodiac', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { zodiacKey } = req.body;
  const db = readData();
  db.proposals = db.proposals || [];

  const prop = db.proposals.find(p => p.id === id);
  if (!prop) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการเสนอวีทูบเบอร์ที่ต้องการแก้ไข' });
  }

  let zKey = (zodiacKey || 'unknown').toLowerCase().trim();
  let zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === zKey);

  if (zKey === 'unknown' || !zodiacInfo) {
    prop.zodiacKey = 'unknown';
    prop.zodiacNameTh = 'ไม่ทราบราศี';
    prop.zodiacNameEn = 'Unknown';
  } else {
    prop.zodiacKey = zodiacInfo.key;
    prop.zodiacNameTh = zodiacInfo.th;
    prop.zodiacNameEn = zodiacInfo.en;
  }

  writeData(db);
  res.json({
    success: true,
    message: `เปลี่ยนราศีของวีทูบเบอร์ที่เสนอเป็น "${prop.zodiacNameTh}" เรียบร้อยแล้ว`,
    data: prop
  });
});

app.delete('/api/proposals/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const db = readData();
  const initialLength = (db.proposals || []).length;
  db.proposals = (db.proposals || []).filter(p => p.id !== id);

  if (db.proposals.length === initialLength) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการลบ' });
  }

  writeData(db);
  res.json({ success: true, message: 'ลบรายการเสนอสำเร็จ' });
});

app.get('/api/export-csv', requireAdminAuth, (req, res) => {
  const db = readData();
  const rows = ['ID,ประเภท,ชื่อบัญชี X,ชื่อสำหรับเรียกในไลฟ์,ราศี (ไทย),ราศี (อังกฤษ),สถานะอนุมัติ,หมายเหตุ,วันที่บันทึก'];
  
  (db.registrations || []).forEach(r => {
    const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    rows.push([
      sanitize(r.id),
      sanitize('ลงทะเบียนตรง'),
      sanitize(r.xAccount),
      sanitize(r.displayName),
      sanitize(r.zodiacNameTh),
      sanitize(r.zodiacNameEn),
      sanitize('ผ่านเข้าร่วม'),
      sanitize('-'),
      sanitize(new Date(r.registeredAt).toLocaleString('th-TH'))
    ].join(','));
  });

  (db.proposals || []).forEach(p => {
    const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    const statusStr = p.approved ? 'อนุมัติแสดงหน้าแรก' : 'ซ่อนอยู่';
    const noteStr = p.convertedToRegId ? 'ย้ายไปลงทะเบียนแล้ว' : (p.isDuplicate ? 'ชื่อซ้ำ' : '-');
    rows.push([
      sanitize(p.id),
      sanitize('เสนอชื่อ'),
      sanitize(p.xAccount),
      sanitize(p.displayName || '-'),
      sanitize(p.zodiacNameTh),
      sanitize(p.zodiacNameEn),
      sanitize(statusStr),
      sanitize(noteStr),
      sanitize(new Date(p.createdAt || p.proposedAt || Date.now()).toLocaleString('th-TH'))
    ].join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="vtuber_zodiac_all_data.csv"');
  res.send(csvContent);
});

// ==========================================
// Page Routes
// ==========================================

// Favicon handler (prevents browser 404 log)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Root landing page (yuubearsama.online)
app.get('/', (req, res) => {
  const landingPath = path.join(__dirname, 'public', 'landing.html');
  const gamePath = path.join(__dirname, 'public', '12vtubergame.html');
  if (fs.existsSync(landingPath)) {
    res.sendFile(landingPath);
  } else if (fs.existsSync(gamePath)) {
    res.sendFile(gamePath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// 12 Vtuber Game subpath (yuubearsama.online/12vtubergame)
app.get(['/12vtubergame', '/12vtubergame/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '12vtubergame.html'));
});

app.get('/12vtubergame/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/12vtubergame/allzodiac', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'allzodiac.html'));
});

app.get('/12vtubergame/zodiac', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'zodiac.html'));
});

app.get('/12vtubergame/zodiac/:sign', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'zodiac.html'));
});

app.get('/12vtubergame/adminpanel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adminpanel.html'));
});

app.get(['/12vtubergame/minigame', '/12vtubergame/minigame/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'minigame.html'));
});

// Keep old paths working too (backward compatibility)
app.get('/register', (req, res) => {
  res.redirect('/12vtubergame/register');
});

app.get('/allzodiac', (req, res) => {
  res.redirect('/12vtubergame/allzodiac');
});

app.get('/zodiac/:sign', (req, res) => {
  res.redirect(`/12vtubergame/zodiac/${req.params.sign}`);
});

app.get('/adminpanel', (req, res) => {
  res.redirect('/12vtubergame/adminpanel');
});

app.get(['/minigame', '/minigame/'], (req, res) => {
  res.redirect('/12vtubergame/minigame');
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Server is running!`);
  console.log(`Landing:    http://localhost:${PORT}`);
  console.log(`12 Vtuber:  http://localhost:${PORT}/12vtubergame`);
  console.log(`Admin:      http://localhost:${PORT}/12vtubergame/adminpanel`);
  console.log(`====================================================`);
});
