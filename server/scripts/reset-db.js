#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const defaultUrl = process.env.NODE_ENV === 'test' ? 'sqlite://:memory:' : 'sqlite://./data/app.db';
const url = process.env.DATABASE_URL || defaultUrl;
if (!url.startsWith('sqlite://')) {
  console.error('DATABASE_URL must start with sqlite://');
  process.exit(1);
}
const filePath = url.replace('sqlite://', '');
let dbPath = filePath;
if (filePath !== ':memory:') {
  dbPath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
DROP TABLE IF EXISTS dashboard_cards;
DROP TABLE IF EXISTS dashboards;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS metric_group_entities;
DROP TABLE IF EXISTS metric_groups;
`);

console.log('Database tables dropped. They will be recreated on next server start.');
