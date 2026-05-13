import React, { useState, useEffect, useMemo, useRef } from 'react';
import { C, TABS, fmt } from './utils/constants';
import { productsAPI, salesAPI, expensesAPI, settingsAPI } from './utils/api';
import Ic from './components/Icons';
import { NumPad } from './components/UI';

// Screens
import HomeScreen from './screens/HomeScreen';
import POSScreen from './screens/POSScreen';
import ProductsScreen from './screens/ProductsScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import ReportScreen from './screens/ReportScreen';

export default function App() {
  const [tab, setTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('savcalcu_active_tab');
      return TABS.some(t => t.id === savedTab) ? savedTab : 'home';
    } catch {
      return 'home';
    }
  });
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [custNo, setCustNo] = useState(1);

  // Cart state for POS
  const [cart, setCart] = useState([]);
  const [receipt, setReceipt] = useState(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loaded = useRef(false);

  // Load data from backend on mount
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('savcalcu_active_tab', tab);
    } catch {}
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [productsData, salesData, expensesData, custNoData] = await Promise.all([
        productsAPI.getAll().catch(() => []),
        salesAPI.getAll().catch(() => []),
        expensesAPI.getAll().catch(() => []),
        settingsAPI.get('custNo').catch(() => ({ value: '1' })),
      ]);

      setProducts(productsData);
      setSales(salesData);
      setExpenses(expensesData);
      setCustNo(parseInt(custNoData?.value || '1'));
      
      loaded.current = true;
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to connect to server. Using offline mode.');
      // Continue with empty data in offline mode
      setProducts([]);
      setSales([]);
      setExpenses([]);
      setCustNo(1);
      loaded.current = true;
    } finally {
      setLoading(false);
    }
  };

  // Computed values
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  // Checkout function
  const handleCheckout = async (customerId, cartItems, cashReceived) => {
    if (!cartItems.length) return;
    
    const now = new Date();
    const tx = {
      id: customerId,
      items: cartItems.map(i => ({ ...i })),
      total: parseFloat(cartTotal.toFixed(2)),
      cash: cashReceived,
      change: parseFloat((cashReceived - cartTotal).toFixed(2)),
      dateISO: now.toISOString(),
      date: now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      // Save to backend
      await salesAPI.create(tx);
      
      // Update local products (stock will be updated on refresh)
      setProducts(prev => prev.map(p => {
        const ci = cartItems.find(i => i.id === p.id);
        return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
      }));
      
      // Update local sales state so new sales show immediately on reports/dashboard
      setSales(prev => [...prev, tx]);
      
      setCustNo(n => n + 1);
      settingsAPI.set('custNo', customerId + 1);
      
    } catch (err) {
      console.error('Error saving sale:', err);
      // Still show receipt but warn user
    }
    
    setReceipt(tx);
    setCart([]);
  };

  // Filtered data counts
  const filtSales = useMemo(() => sales, [sales]);

  // Show loading screen
  if (loading) {
    return (
      <div style={{
        background: C.bg,
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ fontSize: 50 }}>⏳</div>
        <div style={{ color: C.accent, fontWeight: 900, fontSize: 20, marginTop: 16 }}>Loading...</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>Connecting to server</div>
      </div>
    );
  }

  // Show error banner if offline
  const showOfflineBanner = error && !products.length;

  return (
    <div style={{
      background: C.bg,
      minHeight: '100vh',
      maxWidth: 480,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative'
    }}>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div style={{
          background: C.red + '20',
          borderBottom: `1px solid ${C.red}`,
          padding: '8px 14px',
          textAlign: 'center',
          fontSize: 12,
          color: C.red,
          fontWeight: 700,
        }}>
          ⚠️ Offline Mode - Data won't be saved
        </div>
      )}

      {/* Header */}
      <div style={{
        background: C.surface,
        padding: '14px 18px 12px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <div style={{ color: C.accent, fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>SavCalcu</div>
          <div style={{ color: C.dim, fontSize: 11, fontWeight: 600 }}>Family Borela</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {tab === 'pos' && <div style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>Customer <span style={{ color: C.accent }}>#{custNo}</span></div>}
          {tab === 'products' && <div style={{ color: C.muted, fontSize: 12 }}>{products.length} products</div>}
          {tab === 'expenses' && <div style={{ color: C.muted, fontSize: 12 }}>{expenses.length} entries</div>}
          {tab === 'report' && <div style={{ color: C.muted, fontSize: 12 }}>{filtSales.length} records</div>}
          {tab === 'home' && <div style={{ color: C.muted, fontSize: 12 }}>{new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
        </div>
      </div>

      {/* Screen Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 64 }}>
        {tab === 'home' && <HomeScreen sales={sales} expenses={expenses} products={products} />}
        {tab === 'pos' && (
          <POSScreen
            products={products}
            cart={cart}
            setCart={setCart}
            custNo={custNo}
            setCustNo={setCustNo}
            checkout={handleCheckout}
          />
        )}
        {tab === 'products' && <ProductsScreen products={products} setProducts={setProducts} />}
        {tab === 'expenses' && <ExpensesScreen expenses={expenses} setExpenses={setExpenses} />}
        {tab === 'report' && <ReportScreen sales={sales} expenses={expenses} />}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        zIndex: 30
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '10px 0 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              position: 'relative'
            }}>
            {tab === t.id && <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 28,
              height: 3,
              background: C.accent,
              borderRadius: '0 0 4px 4px'
            }} />}
            <Ic n={t.icon} size={21} color={tab === t.id ? C.accent : C.dim} />
            <span style={{ color: tab === t.id ? C.accent : C.dim, fontSize: 10, fontWeight: tab === t.id ? 800 : 600 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }} className="fade-in">
          <div style={{ background: 'rgba(0,0,0,0.85)', position: 'absolute', inset: 0 }} />
          <div className="scale-in" style={{
            background: C.card,
            borderRadius: 22,
            padding: 22,
            width: '100%',
            maxWidth: 340,
            position: 'relative',
            zIndex: 1,
            border: `1px solid ${C.border}`
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 50 }}>✅</div>
              <div style={{ color: C.green, fontWeight: 900, fontSize: 20, marginTop: 8 }}>Sale Complete!</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Customer #{receipt.id} · {receipt.time}</div>
            </div>
            <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
              {receipt.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderBottom: i < receipt.items.length - 1 ? `1px solid ${C.border}` : 'none'
                }}>
                  <span style={{ color: C.text, fontSize: 13 }}>{item.name} <span style={{ color: C.muted }}>×{item.qty}</span></span>
                  <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>₱{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', borderTop: `2px solid ${C.border}` }}>
                <span style={{ color: C.text, fontWeight: 900 }}>TOTAL</span>
                <span style={{ color: C.accent, fontWeight: 900, fontSize: 19 }}>₱{receipt.total.toFixed(2)}</span>
              </div>
              {receipt.cash > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px 10px' }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>Change</span>
                  <span style={{ color: C.green, fontWeight: 800, fontSize: 14 }}>₱{receipt.change.toFixed(2)}</span>
                </div>
              )}
            </div>
            <button onClick={() => setReceipt(null)} style={{
              width: '100%',
              background: C.accent,
              color: '#080e1c',
              border: 'none',
              borderRadius: 12,
              padding: '13px 20px',
              fontFamily: 'inherit',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer'
            }}>
              Next Customer →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
