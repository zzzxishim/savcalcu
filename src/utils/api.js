// API utility for communicating with backend

const DEFAULT_PRODUCTION_API_URL = 'https://savcalcu-1.onrender.com/api';
const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL = (
  !configuredApiUrl || configuredApiUrl.includes('your-render-service')
    ? import.meta.env.DEV
      ? '/api'
      : DEFAULT_PRODUCTION_API_URL
    : configuredApiUrl
).replace(/\/$/, '');

const getLocalData = (key) => {
  try {
    const data = localStorage.getItem('savcalcu_' + key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setLocalData = (key, data) => {
  try {
    localStorage.setItem('savcalcu_' + key, JSON.stringify(data));
  } catch {}
};

// Generic fetch wrapper with retry for Render cold starts and GET cache fallback.
async function fetchAPI(endpoint, options = {}) {
  const isGet = !options.method || options.method === 'GET';
  const dataKey = endpoint.replace(/^\/+/, '');

  const attemptFetch = async () => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (isGet && Array.isArray(result)) {
      setLocalData(dataKey, result);
    }
    return result;
  };

  try {
    return await attemptFetch();
  } catch (error) {
    console.warn(`API Error [${endpoint}]: ${error.message}. Retrying in 3 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      return await attemptFetch();
    } catch (retryError) {
      console.error(`API Error [${endpoint}] after retry:`, retryError);
      if (isGet) {
        return getLocalData(dataKey);
      }
      throw retryError;
    }
  }
}

// Products API
export const productsAPI = {
  getAll: () => fetchAPI('/products'),
  create: (product) =>
    fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  update: (id, product) =>
    fetchAPI(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
  delete: (id) => fetchAPI(`/products/${id}`, { method: 'DELETE' }),
  updateStock: (id, stock) =>
    fetchAPI(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    }),
};

// Sales API - with localStorage sync for offline sale capture
export const salesAPI = {
  getAll: () => fetchAPI('/sales'),
  create: (sale) =>
    fetchAPI('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),
  update: (id, sale) =>
    fetchAPI(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sale),
    }),
  delete: (id) => fetchAPI(`/sales/${id}`, { method: 'DELETE' }),
};

// Expenses API
export const expensesAPI = {
  getAll: () => fetchAPI('/expenses'),
  create: (expense) =>
    fetchAPI('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    }),
  delete: (id) => fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),
};

// Settings API
export const settingsAPI = {
  get: (key) => fetchAPI(`/settings/${key}`),
  set: (key, value) =>
    fetchAPI('/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value: String(value) }),
    }),
};

// Backup API
export const backupAPI = {
  export: () => fetchAPI('/backup'),
  restore: (backup) =>
    fetchAPI('/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backup),
    }),
};

export default { productsAPI, salesAPI, expensesAPI, settingsAPI, backupAPI };
