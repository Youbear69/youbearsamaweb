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
  const val = snap.val() || {};
  return {
    isRegistrationOpen: val.isRegistrationOpen !== undefined ? val.isRegistrationOpen : true,
    registrationClosedMessage: val.registrationClosedMessage || "ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย",
    liveDate: val.liveDate || "2026-11-14T14:00:00.000Z",
    liveDateDisplay: val.liveDateDisplay || "14/11/2026 เวลา 21:00 น.",
    closeDate: val.closeDate || "2026-10-01T16:59:59.000Z",
    closeDateDisplay: val.closeDateDisplay || "1/10/2026",
    popupMessage: val.popupMessage || ""
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
  const settings = await fbGetSettings();
  if (settings.isRegistrationOpen === false) {
    throw new Error(settings.registrationClosedMessage || 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย');
  }

  const id = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const zodiac = ZODIAC_METADATA.find(z => z.key === data.zodiacKey);

  let imageUrl = data.imageUrl;
  if (!imageUrl && data.xAccount) {
    const parsed = typeof parseSocialLink === 'function' ? parseSocialLink(data.xAccount) : { username: '' };
    if (parsed.username) {
      imageUrl = `/uploads/avatars/${parsed.username.toLowerCase()}.jpg`;
      try {
        const res = await fetch(`https://api.vxtwitter.com/${encodeURIComponent(parsed.username)}`, {
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const vData = await res.json();
          const pUrl = vData.user_profile_image_url || vData.profile_image_url;
          if (pUrl) {
            imageUrl = pUrl.replace('_normal.', '_400x400.').replace('_bigger.', '_400x400.');
          }
        }
      } catch (e) {
        // Fall back to local path
      }
    }
  }
  if (!imageUrl) {
    imageUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl({ xAccount: data.xAccount, displayName: data.displayName }) : '';
  }

  const registration = {
    id: id,
    xAccount: data.xAccount,
    displayName: data.displayName,
    imageUrl: imageUrl,
    zodiacKey: data.zodiacKey,
    zodiacNameTh: zodiac ? zodiac.th : data.zodiacKey,
    zodiacNameEn: zodiac ? zodiac.en : data.zodiacKey,
    registeredAt: new Date().toISOString()
  };

  // =========================================================================
  // หากวีที่ถูกเสนอชื่อมา แล้วมาลงทะเบียนเอง: ให้ปิดชื่อออกจากระบบเสนอ แล้วเข้าลงทะเบียนแทน
  // และคงรูปภาพเดิมที่เคยมีไว้
  // =========================================================================
  try {
    const propSnap = await rtdb.ref('proposals').once('value');
    const propVal = propSnap.val();
    if (propVal) {
      const propsArr = Array.isArray(propVal) ? propVal.filter(Boolean) : Object.values(propVal);
      let updatedProps = false;
      propsArr.forEach(p => {
        const isSim = typeof checkDuplicateOrSimilar === 'function'
          ? checkDuplicateOrSimilar(p, registration).isMatch
          : (p.xAccount && registration.xAccount && p.xAccount.toLowerCase().trim() === registration.xAccount.toLowerCase().trim());

        if (isSim) {
          p.approved = false; // ปิดชื่อออกจากระบบเสนอ
          p.convertedToRegId = registration.id;
          p.convertedAt = new Date().toISOString();
          p.statusNote = 'ย้ายไปลงทะเบียนแล้ว';
          if (p.imageUrl && (!registration.imageUrl || registration.imageUrl.includes('dicebear'))) {
            registration.imageUrl = p.imageUrl;
          }
          updatedProps = true;
        }
      });
      if (updatedProps) {
        await rtdb.ref('proposals').set(propsArr);
      }
    }
  } catch (err) {
    console.error('Error closing matching proposals on registration:', err);
  }

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

// Add a proposal (auto-checks duplicate & hides from proposed page if duplicate or already registered)
async function fbAddProposal(data) {
  const settings = await fbGetSettings();
  if (settings && settings.isRegistrationOpen === false) {
    throw new Error(settings.registrationClosedMessage || 'ขณะนี้ได้ปิดรับลงทะเบียนเรียบร้อย');
  }

  const id = 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const zodiacKey = data.zodiacKey || 'unknown';
  const zodiac = ZODIAC_METADATA.find(z => z.key === zodiacKey);
  
  let displayName = (data.displayName || '').trim();
  if (!displayName && data.xAccount) {
    displayName = data.xAccount
      .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '')
      .replace(/^@/, '')
      .split('/')[0]
      .split('?')[0] || data.xAccount;
  }

  let imageUrl = data.imageUrl;
  if (!imageUrl && data.xAccount) {
    const parsed = typeof parseSocialLink === 'function' ? parseSocialLink(data.xAccount) : { username: '' };
    if (parsed.username) {
      imageUrl = `/uploads/avatars/${parsed.username.toLowerCase()}.jpg`;
      try {
        const res = await fetch(`https://api.vxtwitter.com/${encodeURIComponent(parsed.username)}`, {
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const vData = await res.json();
          const pUrl = vData.user_profile_image_url || vData.profile_image_url;
          if (pUrl) {
            imageUrl = pUrl.replace('_normal.', '_400x400.').replace('_bigger.', '_400x400.');
          }
        }
      } catch (e) {
        // Fall back to local path
      }
    }
  }
  if (!imageUrl) {
    imageUrl = typeof resolveAvatarUrl === 'function' ? resolveAvatarUrl({ xAccount: data.xAccount, displayName: displayName }) : '';
  }

  // Check duplicates against:
  // 1) Registered VTubers (if already registered, auto-hide from proposed)
  // 2) Existing Proposals (if already proposed, auto-hide subsequent duplicates)
  let isDuplicate = false;
  let duplicateReason = null;
  let matchedDetail = null;

  try {
    const regs = await fbGetRegistrations();
    const existingProps = await fbGetProposals();

    const candidate = {
      xAccount: data.xAccount,
      displayName: displayName
    };

    // Check against registrations first
    const regMatch = typeof findDuplicateOrSimilar === 'function'
      ? findDuplicateOrSimilar(candidate, regs)
      : null;

    if (regMatch) {
      isDuplicate = true;
      duplicateReason = 'registered';
      matchedDetail = regMatch.detail || regMatch.matchItem.displayName;
    } else {
      // Check against proposals that are either approved or already recorded
      const propMatch = typeof findDuplicateOrSimilar === 'function'
        ? findDuplicateOrSimilar(candidate, existingProps)
        : null;

      if (propMatch) {
        isDuplicate = true;
        duplicateReason = 'already_proposed';
        matchedDetail = propMatch.detail || propMatch.matchItem.displayName;
      }
    }
  } catch (checkErr) {
    console.warn('Error during duplicate check:', checkErr);
  }

  // หากลงทะเบียนชื่อเดิมหรือคล้ายกัน ให้ลงชื่อได้ปกติ แต่ระบบจะปิดชื่อไว้ไม่โชว์เข้าหน้าเสนอวี
  const shouldApprove = !isDuplicate;

  const proposal = {
    id: id,
    xAccount: data.xAccount,
    displayName: displayName,
    imageUrl: imageUrl,
    zodiacKey: zodiacKey,
    zodiacNameTh: zodiac ? zodiac.th : (zodiacKey === 'unknown' ? 'ไม่ทราบ' : zodiacKey),
    zodiacNameEn: zodiac ? zodiac.en : (zodiacKey === 'unknown' ? 'Unknown' : zodiacKey),
    approved: shouldApprove, // Auto-hide if duplicate
    isDuplicate: isDuplicate,
    duplicateReason: duplicateReason,
    matchedTarget: matchedDetail,
    statusNote: isDuplicate ? (duplicateReason === 'registered' ? 'ลงทะเบียนแล้ว (ปิดชื่ออัตโนมัติ)' : 'ชื่อซ้ำ (ปิดชื่ออัตโนมัติ)') : null,
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

// Batch scan and clean duplicates in database
async function fbBatchCleanDuplicates() {
  const regs = await fbGetRegistrations();
  const snap = await rtdb.ref('proposals').once('value');
  const propVal = snap.val();
  if (!propVal) return { convertedCount: 0, duplicateCount: 0, totalProposals: 0 };

  const propsArr = Array.isArray(propVal) ? propVal.filter(Boolean) : Object.values(propVal);
  let convertedCount = 0;
  let duplicateCount = 0;

  // 1. Check against registrations: any proposed member who is also in registrations -> close from proposals
  for (const p of propsArr) {
    const regMatch = typeof findDuplicateOrSimilar === 'function'
      ? findDuplicateOrSimilar(p, regs)
      : null;

    if (regMatch) {
      if (p.approved || !p.convertedToRegId) {
        p.approved = false;
        p.convertedToRegId = regMatch.matchItem.id;
        p.statusNote = 'ย้ายไปลงทะเบียนแล้ว';
        convertedCount++;
      }
    }
  }

  // 2. Check among proposals: keep earliest approved, hide subsequent duplicates
  const seen = [];
  for (const p of propsArr) {
    if (p.convertedToRegId || p.statusNote === 'ย้ายไปลงทะเบียนแล้ว') continue;

    const propMatch = typeof findDuplicateOrSimilar === 'function'
      ? findDuplicateOrSimilar(p, seen)
      : null;

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
  }

  await rtdb.ref('proposals').set(propsArr);
  return { convertedCount, duplicateCount, totalProposals: propsArr.length };
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
    if (typeof sortThaiEnglish === 'function') {
      members.sort(sortThaiEnglish);
    }
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
  if (typeof sortThaiEnglish === 'function') {
    regMembers.sort(sortThaiEnglish);
  }

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
  let csv = 'ประเภท,ID,X Account,ชื่อ,ราศี (TH),ราศี (EN),วันที่สมัคร,สถานะ,หมายเหตุ\n';
  registrations.forEach(r => {
    csv += `ลงทะเบียนตรง,${r.id},"${r.xAccount}","${r.displayName || ''}",${r.zodiacNameTh || ''},${r.zodiacNameEn || ''},${r.registeredAt || ''},ผ่านเข้าร่วม,-\n`;
  });
  proposals.forEach(p => {
    const status = p.approved ? 'อนุมัติ (โชว์หน้าแรก)' : 'ซ่อนอยู่';
    const note = p.convertedToRegId ? 'ย้ายไปลงทะเบียนแล้ว' : (p.isDuplicate ? 'ชื่อซ้ำ' : '-');
    csv += `เสนอชื่อ,${p.id},"${p.xAccount}","${p.displayName || ''}",${p.zodiacNameTh || ''},${p.zodiacNameEn || ''},${p.proposedAt || ''},${status},${note}\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vtubergame_data_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
