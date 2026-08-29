// ==========================================
// Firebase Client-Side Configuration
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBXj1EXxKUnk6TTvOFukF92PZitC5NqT8o",
  authDomain: "vtubergame-676dc.firebaseapp.com",
  databaseURL: "https://vtubergame-676dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vtubergame-676dc",
  storageBucket: "vtubergame-676dc.firebasestorage.app"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database();
const fbAuth = firebase.auth();
const fbStorage = (typeof firebase.storage === 'function') ? firebase.storage() : null;

// Zodiac metadata (same as server.js)
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

// ==========================================
// Firebase RTDB Helper Functions
// ==========================================

// Read settings from RTDB
async function fbGetSettings() {
  const snap = await rtdb.ref('settings').once('value');
  return snap.val() || {
    liveDate: "2026-11-14T14:00:00.000Z",
    liveDateDisplay: "14/11/2026 เวลา 21:00 น.",
    closeDate: "2026-10-01T16:59:59.000Z",
    closeDateDisplay: "1/10/2026",
    popupMessage: ""
  };
}

// Write settings to RTDB
async function fbSaveSettings(settings) {
  await rtdb.ref('settings').update(settings);
}

// Get all registrations as array
async function fbGetRegistrations() {
  const snap = await rtdb.ref('registrations').once('value');
  const val = snap.val();
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val);
}

// Add a registration
async function fbAddRegistration(data) {
  const id = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const zodiac = ZODIAC_METADATA.find(z => z.key === data.zodiacKey);
  const registration = {
    id: id,
    xAccount: data.xAccount,
    displayName: data.displayName,
    zodiacKey: data.zodiacKey,
    zodiacNameTh: zodiac ? zodiac.th : data.zodiacKey,
    zodiacNameEn: zodiac ? zodiac.en : data.zodiacKey,
    registeredAt: new Date().toISOString()
  };
  const snap = await rtdb.ref('registrations').once('value');
  const existing = snap.val();
  let arr = [];
  if (existing) {
    arr = Array.isArray(existing) ? existing.filter(Boolean) : Object.values(existing);
  }
  arr.push(registration);
  await rtdb.ref('registrations').set(arr);
  return registration;
}

// Delete a registration by id
async function fbDeleteRegistration(id) {
  const regs = await fbGetRegistrations();
  const filtered = regs.filter(r => r.id !== id);
  await rtdb.ref('registrations').set(filtered.length > 0 ? filtered : null);
}

// Update registration zodiac
async function fbUpdateRegistrationZodiac(id, zodiacKey) {
  const regs = await fbGetRegistrations();
  const reg = regs.find(r => r.id === id);
  if (!reg) throw new Error('Not found');
  const zodiac = ZODIAC_METADATA.find(z => z.key === zodiacKey);
  reg.zodiacKey = zodiacKey;
  reg.zodiacNameTh = zodiac ? zodiac.th : zodiacKey;
  reg.zodiacNameEn = zodiac ? zodiac.en : zodiacKey;
  await rtdb.ref('registrations').set(regs);
  return reg;
}

// Update registration full data (name, link, zodiac, image)
async function fbUpdateRegistration(id, data) {
  const regs = await fbGetRegistrations();
  const reg = regs.find(r => r.id === id);
  if (!reg) throw new Error('Not found');
  if (data.displayName !== undefined) reg.displayName = data.displayName;
  if (data.xAccount !== undefined) reg.xAccount = data.xAccount;
  if (data.zodiacKey !== undefined) {
    const zodiac = ZODIAC_METADATA.find(z => z.key === data.zodiacKey);
    reg.zodiacKey = data.zodiacKey;
    reg.zodiacNameTh = zodiac ? zodiac.th : data.zodiacKey;
    reg.zodiacNameEn = zodiac ? zodiac.en : data.zodiacKey;
  }
  if (data.imageUrl !== undefined) reg.imageUrl = data.imageUrl;
  await rtdb.ref('registrations').set(regs);
  return reg;
}

// Get all proposals as array
async function fbGetProposals() {
  const snap = await rtdb.ref('proposals').once('value');
  const val = snap.val();
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val);
}

// Add a proposal
async function fbAddProposal(data) {
  const id = 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const zodiacKey = data.zodiacKey || 'unknown';
  const zodiac = ZODIAC_METADATA.find(z => z.key === zodiacKey);
  const proposal = {
    id: id,
    xAccount: data.xAccount,
    zodiacKey: zodiacKey,
    zodiacNameTh: zodiac ? zodiac.th : (zodiacKey === 'unknown' ? 'ไม่ทราบ' : zodiacKey),
    zodiacNameEn: zodiac ? zodiac.en : (zodiacKey === 'unknown' ? 'Unknown' : zodiacKey),
    approved: false,
    proposedAt: new Date().toISOString()
  };
  const snap = await rtdb.ref('proposals').once('value');
  const existing = snap.val();
  let arr = [];
  if (existing) {
    arr = Array.isArray(existing) ? existing.filter(Boolean) : Object.values(existing);
  }
  arr.push(proposal);
  await rtdb.ref('proposals').set(arr);
  return proposal;
}

// Toggle proposal approval
async function fbToggleProposalApproval(id) {
  const proposals = await fbGetProposals();
  const p = proposals.find(x => x.id === id);
  if (!p) throw new Error('Not found');
  p.approved = !p.approved;
  await rtdb.ref('proposals').set(proposals);
  return p;
}

// Delete proposal
async function fbDeleteProposal(id) {
  const proposals = await fbGetProposals();
  const filtered = proposals.filter(p => p.id !== id);
  await rtdb.ref('proposals').set(filtered.length > 0 ? filtered : null);
}

// Update proposal zodiac
async function fbUpdateProposalZodiac(id, zodiacKey) {
  const proposals = await fbGetProposals();
  const p = proposals.find(x => x.id === id);
  if (!p) throw new Error('Not found');
  const zodiac = ZODIAC_METADATA.find(z => z.key === zodiacKey);
  p.zodiacKey = zodiacKey;
  p.zodiacNameTh = zodiac ? zodiac.th : (zodiacKey === 'unknown' ? 'ไม่ทราบ' : zodiacKey);
  p.zodiacNameEn = zodiac ? zodiac.en : (zodiacKey === 'unknown' ? 'Unknown' : zodiacKey);
  await rtdb.ref('proposals').set(proposals);
  return p;
}

// Update proposal full data (name, link, zodiac, image)
async function fbUpdateProposal(id, data) {
  const proposals = await fbGetProposals();
  const p = proposals.find(x => x.id === id);
  if (!p) throw new Error('Not found');
  if (data.displayName !== undefined) p.displayName = data.displayName;
  if (data.xAccount !== undefined) p.xAccount = data.xAccount;
  if (data.zodiacKey !== undefined) {
    const zodiac = ZODIAC_METADATA.find(z => z.key === data.zodiacKey);
    p.zodiacKey = data.zodiacKey;
    p.zodiacNameTh = zodiac ? zodiac.th : (data.zodiacKey === 'unknown' ? 'ไม่ทราบ' : data.zodiacKey);
    p.zodiacNameEn = zodiac ? zodiac.en : (data.zodiacKey === 'unknown' ? 'Unknown' : data.zodiacKey);
  }
  if (data.imageUrl !== undefined) p.imageUrl = data.imageUrl;
  await rtdb.ref('proposals').set(proposals);
  return p;
}

// Get zodiac stats (count per zodiac) — registrations only (no proposals mixed in)
async function fbGetZodiacStats() {
  const regs = await fbGetRegistrations();
  const proposals = await fbGetProposals();
  const approvedProposals = proposals.filter(p => p.approved);

  const stats = ZODIAC_METADATA.map(z => {
    // Count only registrations for the 12 zodiac cards
    const count = regs.filter(r => r.zodiacKey === z.key).length;
    return {
      key: z.key,
      th: z.th,
      en: z.en,
      nameTh: z.th,
      nameEn: z.en,
      dateRange: z.dateRange,
      icon: z.icon,
      count: count
    };
  });

  // Add "วีทูบเบอร์ที่เสนอชื่อ" card — counts ALL approved proposals
  if (approvedProposals.length > 0) {
    stats.push({
      key: 'proposed',
      th: 'วีทูบเบอร์ที่เสนอชื่อ',
      en: 'Proposed',
      nameTh: 'วีทูบเบอร์ที่เสนอชื่อ',
      nameEn: 'Proposed',
      dateRange: 'วีทูบเบอร์ที่ถูกเสนอชื่อเข้าร่วม',
      icon: null,
      count: approvedProposals.length,
      isProposed: true
    });
  }

  return stats;
}

// Get zodiac detail (registrations + approved proposals for a specific sign)
async function fbGetZodiacDetail(sign) {
  const regs = await fbGetRegistrations();
  const proposals = await fbGetProposals();
  const approvedProposals = proposals.filter(p => p.approved);

  // Handle "proposed" — show ALL approved proposals
  if (sign === 'proposed') {
    const zodiac = {
      key: 'proposed',
      th: 'วีทูบเบอร์ที่เสนอชื่อ',
      en: 'Proposed',
      dateRange: 'วีทูบเบอร์ที่ถูกเสนอชื่อเข้าร่วม',
      icon: null,
      isProposed: true
    };
    const members = approvedProposals.map(p => {
      const zMeta = ZODIAC_METADATA.find(z => z.key === p.zodiacKey);
      return {
        ...p,
        displayName: p.displayName || p.xAccount,
        isProposal: true,
        zodiacLabel: zMeta ? `ราศี${zMeta.th} (${zMeta.en})` : 'ไม่ทราบราศี'
      };
    });
    return { zodiac, members, count: members.length };
  }

  // Handle unknown zodiac separately
  let zodiac;
  if (sign === 'unknown') {
    zodiac = {
      key: 'unknown',
      th: 'ไม่ทราบราศี',
      en: 'Unknown',
      dateRange: '',
      icon: null,
      isUnknown: true
    };
  } else {
    zodiac = ZODIAC_METADATA.find(z => z.key === sign);
  }

  // Only registrations for zodiac detail (proposals are in their own section)
  const regMembers = regs.filter(r => r.zodiacKey === sign);

  return {
    zodiac: zodiac || { key: sign, th: sign, en: sign, dateRange: '', icon: sign + '.png' },
    members: regMembers,
    count: regMembers.length
  };
}

// Upload image to Firebase Storage and return download URL
async function fbUploadImage(file, folder) {
  const fileName = folder + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = fbStorage.ref(fileName);
  const snapshot = await storageRef.put(file);
  const downloadUrl = await snapshot.ref.getDownloadURL();
  return downloadUrl;
}

// Export registrations and proposals as CSV
function fbExportCSV(registrations, proposals) {
  let csv = 'ประเภท,ID,X Account,ชื่อ,ราศี (TH),ราศี (EN),วันที่สมัคร,สถานะ\n';
  registrations.forEach(r => {
    csv += `ลงทะเบียน,${r.id},"${r.xAccount}","${r.displayName || ''}",${r.zodiacNameTh || ''},${r.zodiacNameEn || ''},${r.registeredAt || ''},-\n`;
  });
  proposals.forEach(p => {
    csv += `เสนอชื่อ,${p.id},"${p.xAccount}","${p.displayName || ''}",${p.zodiacNameTh || ''},${p.zodiacNameEn || ''},${p.proposedAt || ''},${p.approved ? 'อนุมัติ' : 'รอพิจารณา'}\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vtubergame_data_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
