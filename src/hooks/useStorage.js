import { useState, useEffect } from 'react';

// Custom hook for localStorage operations
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, value]);

  return [value, setValue];
}

// Wrapper functions for the storage API
async function load(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

async function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export { load, save };
