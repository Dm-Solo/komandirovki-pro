import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const uploadsDir = path.join(dataDir, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __db: DatabaseSync | undefined;
}

function createSchema(db: DatabaseSync) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      destination TEXT NOT NULL,
      purpose TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      estimated_budget REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      comment TEXT,
      approval_steps TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trip_id TEXT REFERENCES trips(id),
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      purpose TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      comment TEXT,
      ai_summary TEXT,
      voice_transcript TEXT,
      approval_steps TEXT NOT NULL DEFAULT '[]',
      bitrix_item_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      report_id TEXT,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      file_type TEXT,
      path TEXT NOT NULL,
      duration REAL,
      created_at INTEGER NOT NULL
    );
  `);

  const reportColumns = db.prepare("PRAGMA table_info(reports)").all() as { name: string }[];
  if (!reportColumns.some((c) => c.name === "bitrix_item_id")) {
    db.exec("ALTER TABLE reports ADD COLUMN bitrix_item_id TEXT");
  }
  if (!reportColumns.some((c) => c.name === "trip_id")) {
    db.exec("ALTER TABLE reports ADD COLUMN trip_id TEXT REFERENCES trips(id)");
  }
  if (!reportColumns.some((c) => c.name === "voice_transcript")) {
    db.exec("ALTER TABLE reports ADD COLUMN voice_transcript TEXT");
  }
}

function seed(db: DatabaseSync) {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) return;

  const now = Date.now();
  const passwordHash = bcrypt.hashSync("12345", 10);
  const userId = "u1";
  db.prepare(
    "INSERT INTO users (id, login, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, "anna", passwordHash, "Анна Кузнецова", "Менеджер проектов");

  const insertReport = db.prepare(`
    INSERT INTO reports (id, user_id, title, destination, purpose, start_date, end_date, amount, status, comment, approval_steps, created_at)
    VALUES (@id, @user_id, @title, @destination, @purpose, @start_date, @end_date, @amount, @status, @comment, @approval_steps, @created_at)
  `);

  const reports = [
    {
      id: "r1", title: "Командировка в Казань", destination: "Казань, Россия", purpose: "conference",
      start_date: "2026-06-01", end_date: "2026-06-03", amount: 12000, status: "approved", comment: "",
      approval_steps: JSON.stringify([
        { label: "Отправлено", name: "Вы", status: "done" },
        { label: "Руководитель", name: "Смирнова Е.В.", status: "done" },
        { label: "Бухгалтерия", name: "Петрова А.С.", status: "done" },
      ]),
    },
    {
      id: "r2", title: "Встреча с клиентом, Минск", destination: "Минск, Беларусь", purpose: "client",
      start_date: "2026-06-26", end_date: "2026-06-28", amount: 8400, status: "pending", comment: "",
      approval_steps: JSON.stringify([
        { label: "Отправлено", name: "Вы", status: "done" },
        { label: "Руководитель", name: "Смирнова Е.В.", status: "done" },
        { label: "Бухгалтерия", name: "Петрова А.С.", status: "pending" },
      ]),
    },
    {
      id: "r3", title: "Обучение, Санкт-Петербург", destination: "Санкт-Петербург, Россия", purpose: "training",
      start_date: "2026-07-04", end_date: "2026-07-05", amount: 15200, status: "draft", comment: "",
      approval_steps: "[]",
    },
    {
      id: "r4", title: "Командировка в Новосибирск", destination: "Новосибирск, Россия", purpose: "other",
      start_date: "2026-05-13", end_date: "2026-05-15", amount: 21000, status: "rejected", comment: "",
      approval_steps: JSON.stringify([
        { label: "Отправлено", name: "Вы", status: "done" },
        { label: "Руководитель", name: "Смирнова Е.В.", status: "rejected" },
        { label: "Бухгалтерия", name: "—", status: "waiting" },
      ]),
    },
  ];
  for (const r of reports) {
    insertReport.run({ ...r, user_id: userId, created_at: now });
  }

  const insertTrip = db.prepare(`
    INSERT INTO trips (id, user_id, destination, purpose, start_date, end_date, estimated_budget, status, comment, approval_steps, created_at)
    VALUES (@id, @user_id, @destination, @purpose, @start_date, @end_date, @estimated_budget, @status, @comment, @approval_steps, @created_at)
  `);

  const trips = [
    {
      id: "t1", destination: "Сочи, Россия", purpose: "client", start_date: "2026-07-20", end_date: "2026-07-22",
      estimated_budget: 35000, status: "approved", comment: "",
      approval_steps: JSON.stringify([
        { label: "Отправлено", name: "Вы", status: "done" },
        { label: "Руководитель", name: "Смирнова Е.В.", status: "done" },
      ]),
    },
    {
      id: "t2", destination: "Екатеринбург, Россия", purpose: "conference", start_date: "2026-08-10", end_date: "2026-08-12",
      estimated_budget: 22000, status: "pending", comment: "",
      approval_steps: JSON.stringify([
        { label: "Отправлено", name: "Вы", status: "done" },
        { label: "Руководитель", name: "Смирнова Е.В.", status: "pending" },
      ]),
    },
  ];
  for (const t of trips) {
    insertTrip.run({ ...t, user_id: userId, created_at: now });
  }
}

function getDb(): DatabaseSync {
  if (!global.__db) {
    const db = new DatabaseSync(path.join(dataDir, "app.db"));
    createSchema(db);
    seed(db);
    global.__db = db;
  }
  return global.__db;
}

// Lazy proxy: importing this module must not touch the filesystem or open
// the database. Next.js imports route modules at build time (e.g. while
// "collecting page data"), and a build-time DB open can collide with a
// separately running dev server holding the same SQLite file. The real
// connection is created on first actual use (db.prepare(...), etc.).
export const db = new Proxy({} as DatabaseSync, {
  get(_target, prop, _receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export const UPLOADS_DIR = uploadsDir;
