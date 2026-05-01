// API utility for communicating with backend (production: Render backend)

const API_URL = "https://savcalcu-backend.onrender.com/api";

// Generic fetch wrapper
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Products API
export const productsAPI = {
  getAll: () => fetchAPI('/products'),
  create: (product) => fetchAPI('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  update: (id, product) => fetchAPI(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  delete: (id) => fetchAPI(`/products/${id}`, { method: 'DELETE' }),
  updateStock: (id, stock) => fetchAPI(`/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  }),
};

// Sales API
export const salesAPI = {
  getAll: () => fetchAPI('/sales'),
  create: (sale) => fetchAPI('/sales', {
    method: 'POST',
    body: JSON.stringify(sale),
  }),
};

// Expenses API
export const expensesAPI = {
  getAll: () => fetchAPI('/expenses'),
  create: (expense) => fetchAPI('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  }),
  delete: (id) => fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),
};

// Settings API
export const settingsAPI = {
  get: (key) => fetchAPI(`/settings/${key}`),
  set: (key, value) => fetchAPI('/settings', {
    method: 'POST',
    body: JSON.stringify({ key, value: String(value) }),
  }),
};

export default { productsAPI, salesAPI, expensesAPI, settingsAPI };
