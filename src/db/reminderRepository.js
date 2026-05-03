import * as SQLite from 'expo-sqlite';
import { scheduleReminder, cancelReminderNotification } from '../services/notificationService';

const DB_NAME = 'baby_records.db';
let dbPromise = null;

function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initReminders() {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'feed',
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      repeat TEXT NOT NULL DEFAULT 'daily',
      notification_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default reminders if empty
  const rows = await db.getAllAsync('SELECT COUNT(*) AS total FROM reminders;');
  if ((rows?.[0]?.total || 0) === 0) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const defaults = [
      { type: 'feed', title: '母乳喂养', time: '08:00', repeat: 'daily' },
      { type: 'feed', title: '配方奶喂养', time: '12:00', repeat: 'daily' },
      { type: 'diaper', title: '换尿布', time: '10:00', repeat: 'daily' },
    ];

    for (const r of defaults) {
      const notificationId = await scheduleReminder({ id: `seed_${Date.now()}`, ...r });
      const ins = await db.runAsync(
        `INSERT INTO reminders (type, title, time, enabled, repeat, notification_id, created_at) VALUES (?, ?, ?, 1, ?, ?, ?);`,
        r.type, r.title, r.time, r.repeat, notificationId, fmt(now)
      );
    }
  }
}

export async function getAllReminders() {
  await initReminders();
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM reminders ORDER BY time ASC;');
  return (rows || []).map((r) => ({ ...r, enabled: !!r.enabled }));
}

export async function addReminder({ type, title, time, repeat = 'daily' }) {
  await initReminders();
  const db = await getDatabase();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // 先插入获取真实数据库 ID
  const result = await db.runAsync(
    `INSERT INTO reminders (type, title, time, enabled, repeat, notification_id, created_at) VALUES (?, ?, ?, 1, ?, ?, ?);`,
    type, title, time, repeat, null, createdAt
  );
  const dbId = result.lastInsertRowId;

  // 用真实 ID 调度通知
  const notificationId = await scheduleReminder({ id: String(dbId), type, title, time });
  await db.runAsync('UPDATE reminders SET notification_id=? WHERE id=?;', notificationId, dbId);

  return dbId;
}

export async function updateReminder(id, { title, time, repeat, enabled }) {
  await initReminders();
  const db = await getDatabase();

  // 获取旧的 notification_id
  const rows = await db.getAllAsync('SELECT * FROM reminders WHERE id=?;', id);
  const reminder = rows?.[0];

  if (reminder?.notification_id) {
    await cancelReminderNotification(reminder.notification_id);
  }

  if (enabled !== false) {
    const newId = await scheduleReminder({ id: String(id), type: reminder?.type, title, time });
    await db.runAsync(
      `UPDATE reminders SET title=?, time=?, repeat=?, enabled=?, notification_id=? WHERE id=?;`,
      title, time, repeat ?? 'daily', enabled ? 1 : 0, newId, id
    );
  } else {
    await db.runAsync(
      `UPDATE reminders SET title=?, time=?, repeat=?, enabled=? WHERE id=?;`,
      title, time, repeat ?? 'daily', enabled ? 1 : 0, id
    );
  }
}

export async function toggleReminder(id, enabled) {
  await initReminders();
  const db = await getDatabase();

  // 查找该提醒的 notification_id
  const rows = await db.getAllAsync('SELECT * FROM reminders WHERE id=?;', id);
  const reminder = rows?.[0];

  if (reminder?.notification_id) {
    if (!enabled) {
      await cancelReminderNotification(reminder.notification_id);
    } else {
      await cancelReminderNotification(reminder.notification_id);
      const newId = await scheduleReminder({ ...reminder, id: String(reminder.id) });
      await db.runAsync('UPDATE reminders SET notification_id=? WHERE id=?;', newId, id);
      return;
    }
  } else if (enabled) {
    // 没有记录过 notification_id，需要新建
    const newId = await scheduleReminder({ ...reminder, id: String(reminder.id) });
    await db.runAsync('UPDATE reminders SET notification_id=? WHERE id=?;', newId, id);
  }

  await db.runAsync('UPDATE reminders SET enabled=? WHERE id=?;', enabled ? 1 : 0, id);
}

export async function deleteReminder(id) {
  await initReminders();
  const db = await getDatabase();

  // 查找该提醒的 notification_id 并取消通知
  const rows = await db.getAllAsync('SELECT * FROM reminders WHERE id=?;', id);
  const reminder = rows?.[0];
  if (reminder?.notification_id) {
    await cancelReminderNotification(reminder.notification_id);
  }

  await db.runAsync('DELETE FROM reminders WHERE id=?;', id);
}
