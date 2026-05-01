// Color Palette
export const C = {
  bg: '#080e1c',
  surface: '#0f1a2e',
  card: '#152035',
  border: '#1c2d45',
  accent: '#f59e0b',
  accentSoft: '#1f1500',
  green: '#10b981',
  greenSoft: '#031a10',
  red: '#f43f5e',
  redSoft: '#1f0510',
  blue: '#38bdf8',
  blueSoft: '#031824',
  purple: '#a78bfa',
  text: '#e2e8f0',
  muted: '#64748b',
  dim: '#1c2d45',
  white: '#f8fafc',
};

// Format currency
export const fmt = (n) => `₱${Number(n).toFixed(2)}`;

// Format currency with k suffix
export const fmtK = (n) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n.toFixed(0)}`;

// Low stock threshold
export const LOW = 10;

// Periods for filtering
export const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
];

// Expense categories
export const EXP_CATS = ['Restocking', 'Bills', 'Delivery', 'Others'];

// Category colors
export const CAT_COLOR = {
  Restocking: C.blue,
  Bills: C.accent,
  Delivery: C.green,
  Others: C.purple,
};

// Category icons
export const CAT_ICON = {
  Restocking: '🛒',
  Bills: '💡',
  Delivery: '🚚',
  Others: '📦',
};

// Tab definitions
export const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'pos', label: 'POS', icon: 'cart' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'expenses', label: 'Expenses', icon: 'money' },
  { id: 'report', label: 'Report', icon: 'report' },
];

// Sample products
export const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Rice', unit: 'per kg', price: 55, stock: 100 },
  { id: 2, name: 'Bear Brand Small', unit: 'per can', price: 15, stock: 60 },
  { id: 3, name: 'Bear Brand Big', unit: 'per can', price: 65, stock: 8 },
  { id: 4, name: 'Hotdog', unit: 'per pc', price: 10, stock: 50 },
  { id: 5, name: 'Chicken', unit: 'per kg', price: 100, stock: 5 },
  { id: 6, name: 'Cooking Oil 1L', unit: 'per bottle', price: 95, stock: 15 },
  { id: 7, name: 'Instant Noodles', unit: 'per pack', price: 15, stock: 80 },
  { id: 8, name: 'Sugar 1kg', unit: 'per pack', price: 70, stock: 0 },
  { id: 9, name: 'Canned Sardines', unit: 'per can', price: 25, stock: 40 },
  { id: 10, name: 'Frozen Pork', unit: 'per kg', price: 130, stock: 12 },
];
