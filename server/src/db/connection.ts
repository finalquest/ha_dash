import Database from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: BetterSqlite3Database | null = null;

const resolveDatabasePath = () => {
  const defaultUrl = process.env.NODE_ENV === 'test' ? 'sqlite://:memory:' : 'sqlite://./data/app.db';
  const url = process.env.DATABASE_URL || defaultUrl;
  if (!url.startsWith('sqlite://')) {
    throw new Error('DATABASE_URL must start with sqlite://');
  }
  const filePath = url.replace('sqlite://', '');
  if (filePath === ':memory:') {
    return filePath;
  }
  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  return absolutePath;
};

const runMigrations = (db: BetterSqlite3Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metric_groups (
      id TEXT PRIMARY KEY,
      base_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      area_id TEXT,
      device_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metric_group_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      friendly_name TEXT,
      area_id TEXT,
      FOREIGN KEY (group_id) REFERENCES metric_groups(id) ON DELETE CASCADE,
      UNIQUE(group_id, metric_type)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      card_type TEXT NOT NULL,
      config_json TEXT NOT NULL,
      title TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const getDb = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = resolveDatabasePath();
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  runMigrations(dbInstance);
  return dbInstance;
};
