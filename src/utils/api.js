// API utility for communicating with backend (production: Render backend)

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "https://savcalcu-1.onrender.com/api";

// Generic fetch wrapper with retry for Render cold-start
async function fetchAPI(endpoint, options = {}) {
  const attemptFetch = async () => {
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
  };

  try {
    return await attemptFetch();
  } catch (error) {
    console.warn(`API Error [${endpoint}]: ${error.message}. Retrying in 3 seconds for Render cold-start...`);
    // Wait 3 seconds and retry once
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      return await attemptFetch();
    } catch (retryError) {
      console.error(`API Error [${endpoint}] (after retry):`, retryError);
      throw retryError;
    }
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
