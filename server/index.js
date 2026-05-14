import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  'https://savcalcu.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

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
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

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

app.get('/api/health', (req, res) => {
  res.json({ ok: true, databaseConfigured: Boolean(pool) });
});

// ==================== BACKUP API ====================

app.get('/api/backup', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const [products, sales, expenses, settings] = await Promise.all([
      pool.query('SELECT id, name, unit, price, stock FROM products ORDER BY id'),
      pool.query('SELECT id, items, total, cash, change, "dateISO", date, time FROM sales ORDER BY id'),
      pool.query('SELECT id, category, description, amount, "dateISO", date FROM expenses ORDER BY id'),
      pool.query('SELECT key, value FROM settings ORDER BY key'),
    ]);

    res.json({
      app: 'SavCalcu',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        products: products.rows,
        sales: sales.rows,
        expenses: expenses.rows,
        settings: Object.fromEntries(settings.rows.map((row) => [row.key, row.value])),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backup/restore', async (req, res) => {
  if (!ensureDatabase(res)) return;

  const backup = req.body;
  const data = backup?.data || backup;

  if (!data || !Array.isArray(data.products) || !Array.isArray(data.sales) || !Array.isArray(data.expenses)) {
    res.status(400).json({ error: 'Invalid SavCalcu backup file.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM sales');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM settings');

    for (const product of data.products) {
      await client.query(
        `
          INSERT INTO products (id, name, unit, price, stock)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          product.id,
          product.name || '',
          product.unit || '',
          Number(product.price) || 0,
          Number(product.stock) || 0,
        ]
      );
    }

    for (const sale of data.sales) {
      await client.query(
        `
          INSERT INTO sales (id, items, total, cash, change, "dateISO", date, time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          sale.id,
          JSON.stringify(sale.items || []),
          Number(sale.total) || 0,
          Number(sale.cash) || 0,
          Number(sale.change) || 0,
          sale.dateISO || new Date().toISOString(),
          sale.date || '',
          sale.time || '',
        ]
      );
    }

    for (const expense of data.expenses) {
      await client.query(
        `
          INSERT INTO expenses (id, category, description, amount, "dateISO", date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          expense.id,
          expense.category || 'Other',
          expense.description || '',
          Number(expense.amount) || 0,
          expense.dateISO || new Date().toISOString(),
          expense.date || '',
        ]
      );
    }

    const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    const settingEntries = Object.entries({ custNo: '1', ...settings });
    for (const [key, value] of settingEntries) {
      await client.query(
        `
          INSERT INTO settings (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `,
        [key, String(value)]
      );
    }

    await client.query(`SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1), (SELECT COUNT(*) > 0 FROM products))`);
    await client.query(`SELECT setval(pg_get_serial_sequence('sales', 'id'), COALESCE((SELECT MAX(id) FROM sales), 1), (SELECT COUNT(*) > 0 FROM sales))`);
    await client.query(`SELECT setval(pg_get_serial_sequence('expenses', 'id'), COALESCE((SELECT MAX(id) FROM expenses), 1), (SELECT COUNT(*) > 0 FROM expenses))`);

    await client.query('COMMIT');
    res.json({
      success: true,
      counts: {
        products: data.products.length,
        sales: data.sales.length,
        expenses: data.expenses.length,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

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

app.put('/api/sales/:id', async (req, res) => {
  if (!ensureDatabase(res)) return;

  try {
    const { id } = req.params;
    const { cash, change } = req.body;

    await pool.query(
      `
        UPDATE sales
        SET cash = $1,
            change = $2
        WHERE id = $3
      `,
      [Number(cash) || 0, Number(change) || 0, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  if (!ensureDatabase(res)) return;

  const client = await pool.connect();

  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT items FROM sales WHERE id = $1', [id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Sale not found.' });
      return;
    }

    const items = typeof rows[0].items === 'string' ? JSON.parse(rows[0].items) : rows[0].items;
    for (const item of items || []) {
      await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [
        Number(item.qty) || 0,
        item.id,
      ]);
    }

    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({ success: true });
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
