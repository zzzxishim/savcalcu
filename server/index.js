import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = join(__dirname, 'savcalcu.db');

// Middleware
app.use(cors());
app.use(express.json());

let db;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT,
      price REAL DEFAULT 0,
      stock REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      cash REAL NOT NULL,
      change REAL NOT NULL,
      dateISO TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      dateISO TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  
  // Insert default settings if not exist
  try {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['custNo', '1']);
  } catch (e) {}
  
  saveDatabase();
  console.log('Database initialized successfully!');
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Initialize and start server
await initDatabase();

// ==================== PRODUCTS API ====================

// Get all products
app.get('/api/products', (req, res) => {
  try {
    const results = db.exec('SELECT * FROM products ORDER BY name');
    const products = results.length > 0 ? results[0].values.map(row => ({
      id: row[0], name: row[1], unit: row[2], price: row[3], stock: row[4]
    })) : [];
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add product
app.post('/api/products', (req, res) => {
  try {
    const { name, unit, price, stock } = req.body;
    db.run('INSERT INTO products (name, unit, price, stock) VALUES (?, ?, ?, ?)', [name, unit, price || 0, stock || 0]);
    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];
    saveDatabase();
    res.json({ id, name, unit, price, stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, price, stock } = req.body;
    db.run('UPDATE products SET name = ?, unit = ?, price = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [name, unit, price, stock, id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALES API ====================

// Get all sales
app.get('/api/sales', (req, res) => {
  try {
    const results = db.exec('SELECT * FROM sales ORDER BY id DESC');
    const sales = results.length > 0 ? results[0].values.map(row => ({
      id: row[0], items: JSON.parse(row[1]), total: row[2], cash: row[3], change: row[4], dateISO: row[5], date: row[6], time: row[7]
    })) : [];
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add sale
app.post('/api/sales', (req, res) => {
  try {
    const { items, total, cash, change, dateISO, date, time } = req.body;
    db.run('INSERT INTO sales (items, total, cash, change, dateISO, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [JSON.stringify(items), total, cash, change, dateISO, date, time]);
    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];
    
    // Update product stock
    items.forEach(item => {
      db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.id]);
    });
    
    saveDatabase();
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPENSES API ====================

// Get all expenses
app.get('/api/expenses', (req, res) => {
  try {
    const results = db.exec('SELECT * FROM expenses ORDER BY id DESC');
    const expenses = results.length > 0 ? results[0].values.map(row => ({
      id: row[0], category: row[1], description: row[2], amount: row[3], dateISO: row[4], date: row[5]
    })) : [];
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add expense
app.post('/api/expenses', (req, res) => {
  try {
    const { category, description, amount, dateISO, date } = req.body;
    db.run('INSERT INTO expenses (category, description, amount, dateISO, date) VALUES (?, ?, ?, ?, ?)', 
      [category, description, amount, dateISO, date]);
    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];
    saveDatabase();
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM expenses WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SETTINGS API ====================

// Get setting
app.get('/api/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const results = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
    const value = results.length > 0 && results[0].values.length > 0 ? results[0].values[0][0] : null;
    res.json({ value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set setting
app.post('/api/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
