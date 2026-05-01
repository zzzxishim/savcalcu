import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://savcalcu.vercel.app';

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  console.error('DATABASE_URL is not set. Database operations will fail until this environment variable is provided.');
}

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

function ensureDatabase(res) {
  if (!pool) {
    res.status(500).json({ error: 'Database is not configured. Set DATABASE_URL in your environment.' });
    return false;
  }
  return true;
}

async function initDatabase() {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT,
      price REAL DEFAULT 0,
      stock REAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      items JSONB NOT NULL,
      total REAL NOT NULL,
      cash REAL NOT NULL,
      change REAL NOT NULL,
      "dateISO" TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      "dateISO" TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await pool.query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO NOTHING
    `,
    ['custNo', '1']
  );

  console.log('Database initialized successfully!');
}

if (pool) {
  await initDatabase();
}

// ==================== PRODUCTS API ====================

app.get('/api/products', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY name');
    const products = rows.map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      price: row.price,
      stock: row.stock,
    }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { name, unit, price, stock } = req.body;
    const {
      rows: [product],
    } = await pool.query(
      `
        INSERT INTO products (name, unit, price, stock)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [name, unit, price || 0, stock || 0]
    );

    res.json({
      id: product.id,
      name,
      unit,
      price: price || 0,
      stock: stock || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { id } = req.params;
    const { name, unit, price, stock } = req.body;

    await pool.query(
      `
        UPDATE products
        SET name = $1,
            unit = $2,
            price = $3,
            stock = $4,
            updated_at = NOW()
        WHERE id = $5
      `,
      [name, unit, price, stock, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product stock
app.patch('/api/products/:id/stock', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { id } = req.params;
    const { stock } = req.body;
    await pool.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALES API ====================

app.get('/api/sales', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { rows } = await pool.query('SELECT * FROM sales ORDER BY id DESC');
    const sales = rows.map((row) => ({
      id: row.id,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      total: row.total,
      cash: row.cash,
      change: row.change,
      dateISO: row.dateISO,
      date: row.date,
      time: row.time,
    }));
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', async (req, res) => {
  if (!ensureDatabase(res)) return;

  const client = await pool.connect();

  try {
    const { items, total, cash, change, dateISO, date, time } = req.body;

    await client.query('BEGIN');

    const {
      rows: [sale],
    } = await client.query(
      `
        INSERT INTO sales (items, total, cash, change, "dateISO", date, time)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [JSON.stringify(items), total, cash, change, dateISO, date, time]
    );

    for (const item of items) {
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
        item.qty,
        item.id,
      ]);
    }

    await client.query('COMMIT');

    res.json({ id: sale.id });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ==================== EXPENSES API ====================

app.get('/api/expenses', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY id DESC');
    const expenses = rows.map((row) => ({
      id: row.id,
      category: row.category,
      description: row.description,
      amount: row.amount,
      dateISO: row.dateISO,
      date: row.date,
    }));
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { category, description, amount, dateISO, date } = req.body;

    const {
      rows: [expense],
    } = await pool.query(
      `
        INSERT INTO expenses (category, description, amount, "dateISO", date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [category, description, amount, dateISO, date]
    );

    res.json({ id: expense.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SETTINGS API ====================

app.get('/api/settings/:key', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { key } = req.params;
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    const value = rows.length > 0 ? rows[0].value : null;
    res.json({ value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { key, value } = req.body;
    await pool.query(
      `
        INSERT INTO settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `,
      [key, String(value)]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
