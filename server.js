const express = require('express');
const cors = require('cors');
const path = require('path');
const { readData, writeData, getFirebaseAuth } = require('./db');

const app = express();
const PORT = 3000;

const FIREBASE_WEB_API_KEY = 'AIzaSyBXj1EXxKUnk6TTvOFukF92PZitC5NqT8o';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from project root and public folder
app.use('/assets/images', express.static(path.join(__dirname)));
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
      console.error('[Firebase Auth Login Failed]:', fbData.error ? fbData.error.message : 'Unknown error');
      let errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้องตามระบบ Firebase Authentication';
      if (fbData.error && fbData.error.message === 'EMAIL_NOT_FOUND') {
        errMsg = 'ไม่พบบัญชีอีเมลนี้ในระบบ Firebase Authentication';
      } else if (fbData.error && fbData.error.message === 'INVALID_PASSWORD' || fbData.error && fbData.error.message === 'INVALID_LOGIN_CREDENTIALS') {
        errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (fbData.error && fbData.error.message === 'USER_DISABLED') {
        errMsg = 'บัญชีผู้ใช้นี้ถูกปิดการใช้งานในระบบ Firebase Authentication';
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
  const safeSettings = { ...db.settings };
  delete safeSettings.adminAuth;
  res.json({ success: true, data: safeSettings });
});

app.post('/api/settings', requireAdminAuth, (req, res) => {
  const { liveDate, liveDateDisplay, closeDate, closeDateDisplay, popupMessage } = req.body;
  const db = readData();
  db.settings = {
    ...db.settings,
    ...(liveDate && { liveDate }),
    ...(liveDateDisplay && { liveDateDisplay }),
    ...(closeDate && { closeDate }),
    ...(closeDateDisplay && { closeDateDisplay }),
    ...(popupMessage && { popupMessage })
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

  res.json({
    success: true,
    zodiac: zodiacInfo,
    count: registeredMembers.length,
    members: registeredMembers
  });
});

app.post('/api/register', (req, res) => {
  const { xAccount, displayName, zodiacKey } = req.body;

  if (!xAccount || !displayName || !zodiacKey) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }

  const zodiacInfo = ZODIAC_METADATA.find(z => z.key.toLowerCase() === zodiacKey.toLowerCase());
  if (!zodiacInfo) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกรังสี/ราศีที่ถูกต้อง' });
  }

  const db = readData();
  const newEntry = {
    id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    xAccount: xAccount.trim(),
    displayName: displayName.trim(),
    zodiacKey: zodiacInfo.key,
    zodiacNameTh: zodiacInfo.th,
    zodiacNameEn: zodiacInfo.en,
    registeredAt: new Date().toISOString()
  };

  db.registrations = db.registrations || [];
  db.registrations.unshift(newEntry);
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

// ==========================================
// Proposal API Routes (เสนอวีทูบเบอร์)
// ==========================================

app.post('/api/propose', (req, res) => {
  const { xAccount, displayName, zodiacKey } = req.body;

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

  const db = readData();
  db.proposals = db.proposals || [];

  const newProposal = {
    id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    xAccount: cleanX,
    displayName: finalDisplayName,
    zodiacKey: zKey,
    zodiacNameTh: zNameTh,
    zodiacNameEn: zNameEn,
    approved: false, // Default false: won't show on homepage until admin checks checkbox
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
  const rows = ['ID,ประเภท,ชื่อบัญชี X,ชื่อสำหรับเรียกในไลฟ์,ราศี (ไทย),ราศี (อังกฤษ),สถานะอนุมัติ,วันที่บันทึก'];
  
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
      sanitize(new Date(r.registeredAt).toLocaleString('th-TH'))
    ].join(','));
  });

  (db.proposals || []).forEach(p => {
    const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    rows.push([
      sanitize(p.id),
      sanitize('เสนอชื่อ'),
      sanitize(p.xAccount),
      sanitize(p.displayName || '-'),
      sanitize(p.zodiacNameTh),
      sanitize(p.zodiacNameEn),
      sanitize(p.approved ? 'อนุมัติแสดงหน้าแรก' : 'รอตรวจสอบ'),
      sanitize(new Date(p.createdAt).toLocaleString('th-TH'))
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
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// 12 Vtuber Game subpath (yuubearsama.online/12vtubergame)
app.get('/12vtubergame', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/12vtubergame/register', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'register.html');
  console.log('Attempting to serve:', filePath);
  res.sendFile(filePath, (err) => {
    if (err) console.error('File error:', err);
  });
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

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Server is running!`);
  console.log(`Landing:    http://localhost:${PORT}`);
  console.log(`12 Vtuber:  http://localhost:${PORT}/12vtubergame`);
  console.log(`Admin:      http://localhost:${PORT}/12vtubergame/adminpanel`);
  console.log(`====================================================`);
});
