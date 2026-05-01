// Quick script to add sample products
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'savcalcu.db');

async function seed() {
  const SQL = await initSqlJs();
  
  // Check if database exists
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT,
        price REAL DEFAULT 0,
        stock REAL DEFAULT 0
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        items TEXT,
        total REAL,
        cash REAL,
        change REAL,
        dateISO TEXT,
        date TEXT,
        time TEXT
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        description TEXT,
        amount REAL,
        dateISO TEXT,
        date TEXT
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  }
  
  // Check existing products
  const existing = db.exec('SELECT COUNT(*) as count FROM products');
  const count = existing[0]?.values[0][0] || 0;
  console.log('Current products:', count);
  
  if (count < 10) {
    const products = [
      { name: 'Rice', unit: 'per kg', price: 55, stock: 100 },
      { name: 'Bear Brand Small', unit: 'per can', price: 15, stock: 60 },
      { name: 'Bear Brand Big', unit: 'per can', price: 65, stock: 8 },
      { name: 'Hotdog', unit: 'per pc', price: 10, stock: 50 },
      { name: 'Chicken', unit: 'per kg', price: 100, stock: 5 },
      { name: 'Cooking Oil 1L', unit: 'per bottle', price: 95, stock: 15 },
      { name: 'Instant Noodles', unit: 'per pack', price: 15, stock: 80 },
      { name: 'Sugar 1kg', unit: 'per pack', price: 70, stock: 0 },
      { name: 'Canned Sardines', unit: 'per can', price: 25, stock: 40 },
      { name: 'Frozen Pork', unit: 'per kg', price: 130, stock: 12 },
    ];
    
    for (const p of products) {
      db.run('INSERT INTO products (name, unit, price, stock) VALUES (?, ?, ?, ?)', [p.name, p.unit, p.price, p.stock]);
    }
    
    console.log('✅ Added', products.length, 'sample products');
  }
  
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  
  process.exit(0);
}

seed();
