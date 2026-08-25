const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getAuth } = require('firebase-admin/auth');

const DB_DIR = path.join(__dirname, 'database');
const DB_FILE = path.join(DB_DIR, 'data.json');
const KEY_FILE = path.join(__dirname, 'vtubergame-676dc-firebase-adminsdk-fbsvc-082a608eba.json');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial fallback structure
const initialData = {
  settings: {
    liveDate: "2026-11-14T14:00:00.000Z",
    liveDateDisplay: "14/11/2026 เวลา 21:00 น.",
    closeDate: "2026-10-01T16:59:59.000Z",
    closeDateDisplay: "1/10/2026",
    popupMessage: "ไลฟ์จะมีขึ้นในวันและเวลาที่กำหนด หากมีคนลงทะเบียนราศีของคุณเยอะ ทางทีมงานจะติดต่อกลับเพื่อสอบถามความสะดวกในการร่วมไลฟ์อีกครั้ง",
    adminAuth: {
      email: "admin@vtubergame.com",
      password: "admin1234"
    }
  },
  registrations: [
    {
      id: "demo-1",
      xAccount: "https://x.com/YuubearVT",
      displayName: "Yuubear",
      zodiacKey: "pisces",
      zodiacNameTh: "มีน",
      zodiacNameEn: "Pisces",
      registeredAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: "demo-2",
      xAccount: "https://x.com/KeroriRaika",
      displayName: "Kerori Raika",
      zodiacKey: "pisces",
      zodiacNameTh: "มีน",
      zodiacNameEn: "Pisces",
      registeredAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  proposals: []
};

// In-memory data store for fast synchronous access
let memoryData = null;

function loadLocalFile() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(initialData));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.proposals) parsed.proposals = [];
    if (!parsed.registrations) parsed.registrations = [];
    if (!parsed.settings) parsed.settings = initialData.settings;
    if (!parsed.settings.adminAuth) parsed.settings.adminAuth = initialData.settings.adminAuth;
    return parsed;
  } catch (err) {
    console.error('Error reading local file database:', err);
    return JSON.parse(JSON.stringify(initialData));
  }
}

function saveLocalFile(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local file database:', err);
  }
}

memoryData = loadLocalFile();

// ==========================================
// Firebase Realtime Database Integration
// ==========================================
let firebaseAuth = null;

try {
  if (fs.existsSync(KEY_FILE)) {
    const serviceAccount = require(KEY_FILE);
    const dbUrl = `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;

    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: dbUrl
    }, 'vtuber_firebase_app');

    const db = getDatabase(app);
    rtdbRef = db.ref('/');
    firebaseAuth = getAuth(app);

    console.log(`[Firebase] Connected to Realtime Database & Auth`);

    // Listen for real-time updates from Firebase
    rtdbRef.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const settings = val.settings || (memoryData ? memoryData.settings : initialData.settings);
        if (!settings.adminAuth) {
          settings.adminAuth = (memoryData && memoryData.settings && memoryData.settings.adminAuth)
            ? memoryData.settings.adminAuth
            : initialData.settings.adminAuth;
          // Sync adminAuth to Firebase if missing
          rtdbRef.child('settings/adminAuth').set(settings.adminAuth);
        }
        memoryData = {
          settings: settings,
          registrations: Array.isArray(val.registrations)
            ? val.registrations
            : (val.registrations ? Object.values(val.registrations) : []),
          proposals: Array.isArray(val.proposals)
            ? val.proposals
            : (val.proposals ? Object.values(val.proposals) : [])
        };
        saveLocalFile(memoryData);
        console.log('[Firebase Realtime] Synced data from Firebase RTDB');
      } else {
        // If Firebase is completely empty, seed it with current local data
        console.log('[Firebase Realtime] Initializing Firebase RTDB with initial data...');
        rtdbRef.set(memoryData);
      }
    }, (error) => {
      console.error('[Firebase Realtime] Error listening to updates:', error.message);
    });
  } else {
    console.warn('[Firebase] Key file not found, running with local file storage');
  }
} catch (err) {
  console.error('[Firebase] Initialization error:', err.message);
}

function readData() {
  if (!memoryData) {
    memoryData = loadLocalFile();
  }
  return memoryData;
}

function writeData(data) {
  memoryData = {
    settings: data.settings || initialData.settings,
    registrations: data.registrations || [],
    proposals: data.proposals || []
  };

  saveLocalFile(memoryData);

  // Asynchronously sync to Firebase Realtime Database
  if (rtdbRef) {
    rtdbRef.set(memoryData).catch(err => {
      console.error('[Firebase Realtime] Error syncing write to Firebase:', err.message);
    });
  }

  return true;
}

module.exports = {
  readData,
  writeData,
  getFirebaseAuth: () => firebaseAuth
};
