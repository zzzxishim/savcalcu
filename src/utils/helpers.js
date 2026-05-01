// Date utility functions

// Check if two dates are the same day
export const isSameDay = (a, b) => a.toDateString() === b.toDateString();

// Get start of week (Sunday)
export const startOfWeek = (d) => {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
};

// Get start of month
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// Get start of year
export const startOfYear = (d) => new Date(d.getFullYear(), 0, 1);

// Filter records by period
export const filterByPeriod = (records, period, customDate) => {
  const now = new Date();
  return records.filter((r) => {
    const d = new Date(r.dateISO);
    if (period === 'today') return isSameDay(d, now);
    if (period === 'week') return d >= startOfWeek(now) && d <= now;
    if (period === 'month') return d >= startOfMonth(now) && d <= now;
    if (period === 'year') return d >= startOfYear(now) && d <= now;
    if (period === 'custom' && customDate) return isSameDay(d, new Date(customDate + 'T00:00:00'));
    return true;
  });
};

// Generate sample sales data
export const makeSampleSales = () => {
  const now = new Date();
  const s = [];
  let id = 1;

  for (let d = 6; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    const n = Math.floor(Math.random() * 4) + 2;

    for (let t = 0; t < n; t++) {
      const pool = [
        { id: 1, name: 'Rice', unit: 'per kg', price: 55, qty: parseFloat((Math.random() * 2 + 0.5).toFixed(1)) },
        { id: 4, name: 'Hotdog', unit: 'per pc', price: 10, qty: Math.floor(Math.random() * 5) + 1 },
        { id: 2, name: 'Bear Brand Small', unit: 'per can', price: 15, qty: Math.floor(Math.random() * 3) + 1 },
        { id: 7, name: 'Instant Noodles', unit: 'per pack', price: 15, qty: Math.floor(Math.random() * 4) + 1 },
      ];

      const items = pool.filter(() => Math.random() > 0.4).slice(0, 3);
      if (!items.length) items.push(pool[0]);

      const total = parseFloat(items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2));
      const cash = parseFloat((total + Math.floor(Math.random() * 50)).toFixed(2));

      s.push({
        id: id++,
        items,
        total,
        cash,
        change: parseFloat((cash - total).toFixed(2)),
        dateISO: day.toISOString(),
        date: day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: `${Math.floor(Math.random() * 10 + 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
      });
    }
  }

  return s.reverse();
};

// Generate sample expenses data
export const makeSampleExpenses = () => {
  const now = new Date();
  return [
    {
      id: 1,
      category: 'Restocking',
      description: 'Rice sack 50kg',
      amount: 2750,
      dateISO: new Date(now - 2 * 86400000).toISOString(),
      date: new Date(now - 2 * 86400000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      id: 2,
      category: 'Bills',
      description: 'Electricity bill',
      amount: 1200,
      dateISO: new Date(now - 5 * 86400000).toISOString(),
      date: new Date(now - 5 * 86400000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      id: 3,
      category: 'Delivery',
      description: 'Supplier delivery fee',
      amount: 150,
      dateISO: new Date(now - 86400000).toISOString(),
      date: new Date(now - 86400000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
  ];
};
