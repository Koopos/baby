import * as SQLite from 'expo-sqlite';

const DB_NAME = 'baby_records.db';
let dbPromise = null;
let initialized = false;

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

async function ensureColumn(db, columnName, columnDefinition) {
  const rows = await db.getAllAsync('PRAGMA table_info(records);');
  const hasColumn = (rows || []).some((row) => row.name === columnName);
  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE records ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}

const seedRecords = [
  { feedType: '母乳', duration: 20, notes: '状态不错', solidFood: '', createdAt: '2024-05-20 08:00:00' },
  { feedType: '辅食', duration: 15, notes: '吃得很好', solidFood: '米粉 + 苹果泥', createdAt: '2024-05-20 12:30:00' },
  { feedType: '配方奶', duration: 18, notes: '', solidFood: '', createdAt: '2024-05-21 09:00:00' },
];

export async function initDatabase() {
  if (initialized) {
    return;
  }

  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL DEFAULT 'feeding',
      feed_type TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      solid_food TEXT,
      vaccine_dose TEXT,
      hospital TEXT,
      vaccinated_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Backward-compatible migration for existing databases.
  await ensureColumn(db, 'record_type', "TEXT NOT NULL DEFAULT 'feeding'");
  await ensureColumn(db, 'vaccine_dose', 'TEXT');
  await ensureColumn(db, 'hospital', 'TEXT');
  await ensureColumn(db, 'vaccinated_at', 'TEXT');

  const countRow = await db.getFirstAsync('SELECT COUNT(*) AS total FROM records;');
  if ((countRow?.total || 0) === 0) {
    for (const item of seedRecords) {
      await db.runAsync(
        `INSERT INTO records (feed_type, duration, notes, solid_food, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        item.feedType,
        item.duration,
        item.notes,
        item.solidFood,
        item.createdAt
      );
    }
  }

  initialized = true;
}

export async function addRecord({ feedType, duration, notes, solidFood }) {
  await initDatabase();
  const db = await getDatabase();
  const createdAt = formatLocalDateTime(new Date());
  await db.runAsync(
    `INSERT INTO records (record_type, feed_type, duration, notes, solid_food, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    'feeding',
    feedType,
    Number.parseInt(duration, 10) || 0,
    notes?.trim() || '',
    solidFood?.trim() || '',
    createdAt
  );
}

export async function addVaccineRecord({ vaccineName, vaccineDose, hospital, notes, vaccinatedAt }) {
  await initDatabase();
  const db = await getDatabase();
  const createdAt = formatLocalDateTime(new Date());
  const dateTime = vaccinatedAt?.trim() ? vaccinatedAt.trim() : createdAt;
  await db.runAsync(
    `INSERT INTO records (
      record_type,
      feed_type,
      duration,
      notes,
      solid_food,
      vaccine_dose,
      hospital,
      vaccinated_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    'vaccine',
    vaccineName?.trim() || '未命名疫苗',
    0,
    notes?.trim() || '',
    '',
    vaccineDose?.trim() || '',
    hospital?.trim() || '',
    dateTime,
    createdAt
  );
}

export async function getAllRecords() {
  await initDatabase();
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM records ORDER BY created_at DESC;');
  return rows || [];
}

export async function getRecordsByDate(dateKey) {
  await initDatabase();
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM records
     WHERE DATE(created_at) = ?
     ORDER BY created_at ASC;`,
    dateKey
  );
  return rows || [];
}

export async function getRecordDateKeys() {
  await initDatabase();
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT DISTINCT DATE(created_at) AS date_key
     FROM records
     ORDER BY date_key DESC;`
  );
  return (rows || []).map((item) => item.date_key).filter(Boolean);
}

export async function getSolidFoodRecordsByMonth(year, month) {
  await initDatabase();
  const db = await getDatabase();
  const monthPrefix = `${year}-${pad(month)}`;
  const rows = await db.getAllAsync(
    `SELECT DATE(created_at) AS date_key, solid_food, created_at
     FROM records
     WHERE record_type = 'feeding'
       AND feed_type = '辅食'
       AND TRIM(COALESCE(solid_food, '')) != ''
       AND strftime('%Y-%m', created_at) = ?
     ORDER BY created_at ASC;`,
    monthPrefix
  );
  return rows || [];
}
