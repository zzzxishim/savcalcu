import React, { useMemo, useState } from 'react';
import { C, fmt } from '../utils/constants';
import { Btn, SearchBar, NumPad } from '../components/UI';

const POSScreen = ({ 
  products, 
  cart, 
  setCart, 
  custNo, 
  setCustNo,
  checkout 
}) => {
  const [posQ, setPosQ] = useState('');
  const [selectedProd, setSelectedProd] = useState(null);
  const [qtyInput, setQtyInput] = useState('1');
  const [cashMode, setCashMode] = useState(false);
  const [cashInput, setCashInput] = useState('');
const [calcMode, setCalcMode] = useState(false);
  const [calcValue, setCalcValue] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcHistory, setCalcHistory] = useState('');
  // Stacking calculator - stores equation like: ["5", "+", "10", "+", "13"]
  const [equation, setEquation] = useState([]);
  
  // Custom item state for calculator mode
  const [customItemName, setCustomItemName] = useState('');

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cashVal = parseFloat(cashInput) || 0;
  const changeVal = cashVal - cartTotal;

  const filtPos = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(posQ.toLowerCase())), 
    [products, posQ]
  );

  const performCalc = (op, val2) => {
    if (calcValue === null) return val2;
    const v1 = parseFloat(calcValue) || 0;
    const v2 = parseFloat(val2) || 0;
    let result = 0;
    switch (calcOp) {
      case '+': result = v1 + v2; break;
      case '-': result = v1 - v2; break;
      case '×': result = v1 * v2; break;
      case '÷': result = v2 !== 0 ? v1 / v2 : 0; break;
      default: result = v2;
    }
    return result.toFixed(2).replace(/\.?0+$/, '');
  };

// Calculate running total from equation + current input
  const calculateRunningTotal = () => {
    if (equation.length === 0 && !qtyInput) return null;
    
    // Build full equation: equation + current input
    let fullEq = [...equation];
    if (qtyInput) fullEq.push(qtyInput);
    
    if (fullEq.length === 0) return null;
    if (fullEq.length === 1 && !isNaN(parseFloat(fullEq[0]))) return parseFloat(fullEq[0]);
    
    let result = parseFloat(fullEq[0]) || 0;
    let op = null;
    
    for (let i = 1; i < fullEq.length; i++) {
      const token = fullEq[i];
      if (['+', '-', '×', '÷'].includes(token)) {
        op = token;
      } else if (op && !isNaN(parseFloat(token))) {
        const val = parseFloat(token);
        switch (op) {
          case '+': result += val; break;
          case '-': result -= val; break;
          case '×': result *= val; break;
          case '÷': result = val !== 0 ? result / val : 0; break;
        }
        op = null;
      }
    }
    return parseFloat(result.toFixed(2));
  };

  // Get display for stacking calculator
  const getCalcDisplay = () => {
    if (equation.length > 0 || qtyInput) {
      // Show the full equation being built
      const displayEq = [...equation];
      if (qtyInput) displayEq.push(qtyInput);
      return displayEq.join(' ');
    }
    if (calcHistory) return calcHistory;
    if (calcValue) return calcValue;
    return 'CALCULATOR';
  };

  const numpadPress = (key) => {
    if (calcMode && key === '=') {
      // Calculate full equation
      const fullEq = [...equation];
      if (qtyInput) fullEq.push(qtyInput);
      
      if (fullEq.length >= 3) {
        const result = calculateRunningTotal();
        if (result !== null) {
          const eqStr = fullEq.join(' ');
          setCalcHistory(`${eqStr} = ${result}`);
          setQtyInput(String(result));
          setEquation([]);
        }
      } else if (equation.length === 1) {
        // Just one number, show it as result
        setQtyInput(equation[0]);
        setEquation([]);
      }
      return;
    }
    
    if (calcMode && ['+', '-', '×', '÷'].includes(key)) {
      // If typing a number, add it to equation first
      if (qtyInput) {
        setEquation(prev => [...prev, qtyInput, key]);
        setQtyInput('');
      } else if (equation.length > 0 && equation[equation.length - 1] !== key) {
        // Replace last operator if new one pressed
        const lastOpIdx = equation.findIndex((t, i) => i > 0 && ['+', '-', '×', '÷'].includes(t));
        if (lastOpIdx >= 0) {
          setEquation(prev => {
            const updated = [...prev];
            updated[lastOpIdx] = key;
            return updated;
          });
        }
      }
      return;
    }
    
    if (cashMode) {
      setCashInput(prev => {
        if (key === '⌫') return prev.slice(0, -1);
        if (key === '.' && prev.includes('.')) return prev;
        if (key === 'C') return '';
        const next = prev + key;
        return next;
      });
    } else {
      setQtyInput(prev => {
        if (key === '⌫') return prev.length > 1 ? prev.slice(0, -1) : '0';
        if (key === '.') {
          if (prev.includes('.')) return prev;
          return prev + '.';
        }
if (key === 'C') {
          // Clear everything including equation stack
          setCalcValue(null);
          setCalcOp(null);
          setCalcHistory('');
          setEquation([]);
          return '0';
        }
        if (prev === '0') return key;
        return prev + key;
      });
    }
  };

  const confirmQty = () => {
    if (!selectedProd) return;
    const q = parseFloat(qtyInput) || 0;
    if (q <= 0) { setSelectedProd(null); return; }
    const maxQ = selectedProd.stock;
    const finalQ = parseFloat(Math.min(q, maxQ).toFixed(2));
    setCart(prev => {
      const ex = prev.find(i => i.id === selectedProd.id);
      if (ex) return prev.map(i => i.id === selectedProd.id ? { ...i, qty: finalQ } : i);
      return [...prev, { ...selectedProd, qty: finalQ }];
    });
    setSelectedProd(null);
    setQtyInput('1');
    setCashMode(true);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const selectProduct = (p) => {
    if (p.stock <= 0) return;
    const existing = cart.find(i => i.id === p.id);
    setQtyInput(existing ? String(existing.qty) : '1');
    setSelectedProd(p);
    setCashMode(false);
  };

  // Add custom item from calculator to cart
  const addCustomItem = () => {
    const q = parseFloat(qtyInput) || 0;
    if (q <= 0) return;
    
    const customItem = {
      id: Date.now(),
      name: customItemName || 'Custom Item',
      unit: 'per pc',
      price: parseFloat(q.toFixed(2)),
      qty: 1,
      isCustom: true
    };
    
    setCart(prev => [...prev, customItem]);
    setQtyInput('1');
    setCustomItemName('');
    setCalcValue(null);
    setCalcOp(null);
    setCalcHistory('');
    setCashMode(true);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: C.surface, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>CUSTOMER #{custNo}</div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{
              background: C.redSoft, border: 'none', borderRadius: 8, padding: '4px 10px',
              color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>Clear all</button>
          )}
        </div>

        {cart.length > 0 ? (
          <div style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4 }}>
            {cart.map(item => (
              <div key={item.id} onClick={() => selectProduct(item)}
                style={{
                  flexShrink: 0,
                  background: selectedProd?.id === item.id ? C.accent + '20' : C.card,
                  border: `1.5px solid ${selectedProd?.id === item.id ? C.accent : C.border}`,
                  borderRadius: 12, padding: '7px 10px', cursor: 'pointer', minWidth: 110
                }}>
                <div style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{item.name}</div>
                <div style={{ color: C.accent, fontSize: 12, fontWeight: 900 }}>×{item.qty}</div>
                <div style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>₱{(item.price * item.qty).toFixed(2)}</div>
                <button onClick={e => { e.stopPropagation(); removeFromCart(item.id); }}
                  style={{ marginTop: 4, background: 'none', border: 'none', color: C.muted, fontSize: 10, cursor: 'pointer' }}>
                  remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>Tap a product below 👇</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{cart.length} items</div>
          <div style={{ color: C.accent, fontWeight: 900, fontSize: 24 }}>₱{cartTotal.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ background: C.surface, padding: '12px 14px', borderBottom: `2px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={() => { setCashMode(false); setCalcMode(false); setSelectedProd(null); }}
            style={{
              flex: 1, padding: '8px', borderRadius: 10, border: 'none', fontWeight: 800,
              background: !cashMode && !calcMode ? C.accent : C.card, color: !cashMode && !calcMode ? '#080e1c' : C.muted
            }}>
            QTY
          </button>
          <button onClick={() => { setCashMode(false); setCalcMode(true); setSelectedProd(null); setCustomItemName(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: 10, border: 'none', fontWeight: 800,
              background: calcMode && !cashMode ? C.purple : C.card, color: calcMode && !cashMode ? C.white : C.muted
            }}>
            CALC
          </button>
          <button onClick={() => { setCashMode(true); setCalcMode(false); setSelectedProd(null); }}
            style={{
              flex: 1, padding: '8px', borderRadius: 10, border: 'none', fontWeight: 800,
              background: cashMode ? C.green : C.card, color: cashMode ? '#020f08' : C.muted
            }}>
            CASH
          </button>
        </div>

<div style={{ background: C.bg, borderRadius: 14, padding: '10px', marginBottom: 10 }}>
          {calcMode ? (
            <>
              {/* Show running total if we have partial equation */}
              {equation.length > 0 && qtyInput && (
                <div style={{ color: C.green, fontSize: 11, marginBottom: 4, fontWeight: 700 }}>
                  = {calculateRunningTotal()}
                </div>
              )}
              <div style={{ color: C.dim, fontSize: 11, marginBottom: 4 }}>
                {getCalcDisplay()}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.purple }}>{qtyInput || "0"}</div>
              {/* Custom item name input in calc mode */}
              <input 
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Item name (optional)"
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '6px 10px',
                  background: C.surface,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                  fontSize: 12,
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </>
          ) : !cashMode ? (
            selectedProd ? (
              <>
                <div style={{ color: C.muted, fontSize: 11 }}>{selectedProd.name}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>{qtyInput}</div>
              </>
            ) : <div style={{ color: C.dim }}>Select product</div>
          ) : (
            <>
              <div style={{ color: C.muted }}>TOTAL ₱{cartTotal.toFixed(2)}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{cashInput || "0"}</div>
              {/* Change display in cash mode - BEFORE checkout */}
              {cashInput && changeVal >= 0 && (
                <div style={{ 
                  marginTop: 6, 
                  padding: '6px 10px', 
                  background: C.green + '20', 
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: C.muted, fontSize: 11 }}>CHANGE:</span>
                  <span style={{ color: C.green, fontWeight: 900, fontSize: 16 }}>₱{changeVal.toFixed(2)}</span>
                </div>
              )}
              {cashInput && changeVal < 0 && (
                <div style={{ 
                  marginTop: 6, 
                  padding: '6px 10px', 
                  background: C.red + '20', 
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: C.muted, fontSize: 11 }}>BALANCE:</span>
                  <span style={{ color: C.red, fontWeight: 900, fontSize: 16 }}>₱{Math.abs(changeVal).toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <NumPad onKey={numpadPress} variant={calcMode ? 'calc' : 'basic'} />

        <div style={{ marginTop: 10 }}>
          {calcMode ? (
            <Btn onClick={addCustomItem} disabled={!qtyInput || parseFloat(qtyInput) <= 0} bg={C.purple} fg={C.white} style={{ width: '100%' }}>
              Add to Bill: ₱{parseFloat(qtyInput || 0).toFixed(2)}
            </Btn>
          ) : !cashMode ? (
            <Btn onClick={confirmQty} disabled={!selectedProd} style={{ width: '100%' }}>
              Add Item →
            </Btn>
          ) : (
            <Btn onClick={() => checkout(custNo, cart, cashVal)} disabled={!cart.length || !cashInput || cashVal < cartTotal} bg={C.green} fg="#000" style={{ width: '100%' }}>
              Checkout ₱{cartTotal.toFixed(2)}
            </Btn>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        <SearchBar value={posQ} onChange={setPosQ} placeholder="Search product..." />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {filtPos.map(p => {
            const isOut = p.stock <= 0;
            return (
              <button key={p.id} onClick={() => selectProduct(p)} disabled={isOut}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: 10, textAlign: 'left'
                }}>
                <div style={{ fontWeight: 700, color: C.text }}>{p.name}</div>
                <div style={{ color: C.accent, fontWeight: 900 }}>{fmt(p.price)}</div>
                <div style={{ fontSize: 11, color: isOut ? C.red : C.muted }}>
                  {isOut ? "Out of stock" : `Stock: ${p.stock}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default POSScreen;
