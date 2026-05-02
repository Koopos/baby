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

export async function getRecordsByMonth(year, month) {
  await initDatabase();
  const db = await getDatabase();
  const monthPrefix = `${year}-${pad(month)}`;
  const rows = await db.getAllAsync(
    `SELECT * FROM records
     WHERE strftime('%Y-%m', created_at) = ?
     ORDER BY created_at ASC;`,
    monthPrefix
  );
  return rows || [];
}

export async function getRecordById(id) {
  await initDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM records WHERE id = ?;', id);
  return row;
}

export async function updateRecord(id, { feedType, duration, notes, solidFood, diaperType, stoolConsistency }) {
  await initDatabase();
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE records
     SET feed_type = ?, duration = ?, notes = ?, solid_food = ?
     WHERE id = ?;`,
    feedType,
    Number.parseInt(duration, 10) || 0,
    notes?.trim() || '',
    solidFood?.trim() || '',
    id
  );
}

export async function updateVaccineRecord(id, { vaccineName, vaccineDose, hospital, notes, vaccinatedAt }) {
  await initDatabase();
  const db = await getDatabase();
  const dateTime = vaccinatedAt?.trim() ? vaccinatedAt.trim() : new Date().toLocaleString('zh-CN');
  await db.runAsync(
    `UPDATE records
     SET feed_type = ?, vaccine_dose = ?, hospital = ?, notes = ?, vaccinated_at = ?
     WHERE id = ?;`,
    vaccineName?.trim() || '未命名疫苗',
    vaccineDose?.trim() || '',
    hospital?.trim() || '',
    notes?.trim() || '',
    dateTime,
    id
  );
}

export async function updateDiaperRecord(id, { diaperType, stoolConsistency, notes }) {
  await initDatabase();
  const db = await getDatabase();
  const diaperText = diaperType || '';
  await db.runAsync(
    `UPDATE records
     SET feed_type = ?, solid_food = ?, notes = ?
     WHERE id = ?;`,
    diaperText,
    stoolConsistency || '',
    notes?.trim() || '',
    id
  );
}

export async function addADRecord({ isTaken, dosage, recordedAt, notes }) {
  await initDatabase();
  const db = await getDatabase();
  const createdAt = formatLocalDateTime(new Date());
  const dateTime = recordedAt?.trim() ? recordedAt.trim() : createdAt;
  await db.runAsync(
    `INSERT INTO records (
      record_type, feed_type, duration, notes, solid_food, created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
    'feeding',
    'AD',
    isTaken ? 1 : 0,
    isTaken ? '已服用' : '未服用',
    dosage?.trim() || '',
    dateTime
  );
}

export async function updateADRecord(id, { isTaken, dosage, recordedAt, notes }) {
  await initDatabase();
  const db = await getDatabase();
  const dateTime = recordedAt?.trim() ? recordedAt.trim() : formatLocalDateTime(new Date());
  await db.runAsync(
    `UPDATE records
     SET duration = ?, notes = ?, solid_food = ?, created_at = ?
     WHERE id = ?;`,
    isTaken ? 1 : 0,
    isTaken ? '已服用' : '未服用',
    dosage?.trim() || '',
    dateTime,
    id
  );
}

export async function clearAllRecords() {
  await initDatabase();
  const db = await getDatabase();
  await db.runAsync('DELETE FROM records;');
}

export async function deleteRecord(id) {
  await initDatabase();
  const db = await getDatabase();
  await db.runAsync('DELETE FROM records WHERE id = ?;', id);
}

export async function getAllRecordsForExport() {
  await initDatabase();
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM records ORDER BY created_at ASC;');
  return rows || [];
}

// ─── Baby Profile ───────────────────────────────────────────
export async function initBabyProfile() {
  await initDatabase();
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS baby_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '小宝贝',
      gender TEXT DEFAULT '男',
      birthday TEXT DEFAULT '2023-11-01',
      avatar_emoji TEXT DEFAULT '👶',
      next_checkup TEXT DEFAULT '',
      weight TEXT DEFAULT '',
      height TEXT DEFAULT '',
      development TEXT DEFAULT '良好'
    );
  `);
  // Migrate: add weight/height/development columns if missing (existing table)
  await ensureColumn(db, 'weight', 'TEXT DEFAULT ""');
  await ensureColumn(db, 'height', 'TEXT DEFAULT ""');
  await ensureColumn(db, 'development', "TEXT DEFAULT '良好'");
  // Ensure default row exists
  const row = await db.getFirstAsync('SELECT id FROM baby_profile WHERE id = 1;');
  if (!row) {
    await db.runAsync(
      `INSERT INTO baby_profile (id, name, gender, birthday, avatar_emoji, next_checkup, weight, height, development)
       VALUES (1, '小宝贝', '男', '2023-11-01', '👶', '', '', '', '良好');`
    );
  }
}

export async function getBabyProfile() {
  await initBabyProfile();
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM baby_profile WHERE id = 1;');
  return row;
}

export async function updateBabyProfile({ name, gender, birthday, avatarEmoji, nextCheckup, weight, height, development }) {
  await initBabyProfile();
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE baby_profile SET name=?, gender=?, birthday=?, avatar_emoji=?, next_checkup=?, weight=?, height=?, development=? WHERE id=1;`,
    name?.trim() || '小宝贝',
    gender || '男',
    birthday || '2023-11-01',
    avatarEmoji || '👶',
    nextCheckup?.trim() || '',
    weight?.trim() || '',
    height?.trim() || '',
    development || '良好'
  );
}

export async function seedTestRecords() {
  await initDatabase();
  const db = await getDatabase();

  const records = [
    { date: '2026-04-01', food: '米粉' },
    { date: '2026-04-02', food: '米粉' },
    { date: '2026-04-03', food: '米粉' },
    { date: '2026-04-04', food: '米粉' },
    { date: '2026-04-05', food: '米粉' },
    { date: '2026-04-06', food: '米粉' },
    { date: '2026-04-07', food: '米粉' },
    { date: '2026-04-08', food: '米粉' },
    { date: '2026-04-09', food: '米粉' },
    { date: '2026-04-10', food: '亚麻籽油' },
    { date: '2026-04-11', food: '亚麻籽油' },
    { date: '2026-04-12', food: '亚麻籽油' },
    { date: '2026-04-13', food: '亚麻籽油' },
    { date: '2026-04-14', food: '亚麻籽油' },
    { date: '2026-04-15', food: '亚麻籽油' },
    { date: '2026-04-16', food: '菠菜' },
    { date: '2026-04-17', food: '菠菜' },
    { date: '2026-04-18', food: '菠菜' },
    { date: '2026-04-19', food: '南瓜' },
    { date: '2026-04-20', food: '南瓜' },
    { date: '2026-04-21', food: '南瓜' },
    { date: '2026-04-22', food: '山药' },
    { date: '2026-04-23', food: '山药' },
    { date: '2026-04-24', food: '山药' },
    { date: '2026-04-25', food: '猪肉' },
    { date: '2026-04-26', food: '猪肉' },
    { date: '2026-04-27', food: '猪肉' },
    { date: '2026-04-28', food: '猪肉' },
    { date: '2026-04-29', food: '山药' },
    { date: '2026-04-30', food: '山药' },
    { date: '2026-05-01', food: '菠菜' },
    { date: '2026-05-02', food: '菠菜' },
  ];

  for (const item of records) {
    await db.runAsync(
      `INSERT INTO records (record_type, feed_type, duration, notes, solid_food, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      'feeding', '辅食', 15, '', item.food, `${item.date} 10:00:00`
    );
  }

  return records.length;
}
