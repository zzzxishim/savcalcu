import React from 'react';
import { C } from '../utils/constants';
import Ic from './Icons';

// Button component
export const Btn = ({ children, onClick, bg = C.accent, fg = "#080e1c", style = {}, disabled = false, sm = false }) => (
  <button onClick={onClick} disabled={disabled} className="press"
    style={{
      background: disabled ? C.dim : bg,
      color: disabled ? C.muted : fg,
      border: 'none',
      borderRadius: 12,
      padding: sm ? "8px 14px" : "12px 20px",
      fontFamily: 'inherit',
      fontWeight: 800,
      fontSize: sm ? 12 : 14,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      ...style
    }}>
    {children}
  </button>
);

// SearchBar component
export const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
  <div style={{ position: 'relative', marginBottom: 10 }}>
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <Ic n="search" size={16} color={C.muted} />
    </span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%',
        background: C.card,
        border: `1.5px solid ${C.border}`,
        borderRadius: 12,
        padding: "10px 36px 10px 38px",
        color: C.text,
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        outline: 'none'
      }}
    />
    {value && (
      <button onClick={() => onChange("")} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <Ic n="close" size={14} color={C.muted} />
      </button>
    )}
  </div>
);

// Field component (input)
export const Field = ({ label, value, onChange, type = "text", placeholder = "", step }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8 }}>{label}</div>}
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} step={step}
      style={{
        width: '100%',
        background: C.surface,
        border: `1.5px solid ${C.border}`,
        borderRadius: 10,
        padding: "11px 14px",
        color: C.text,
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 700,
        outline: 'none'
      }}
    />
  </div>
);

// StatCard component
export const StatCard = ({ label, value, sub, color = C.accent, icon }) => (
  <div style={{ background: C.card, borderRadius: 16, padding: "14px 16px", border: `1px solid ${C.border}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{label}</div>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
    </div>
    <div style={{ color, fontWeight: 900, fontSize: 22, marginTop: 6, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>{sub}</div>}
  </div>
);

// Modal component
export const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
    <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.7)' }} className="fade-in" />
    <div className="slide-up" style={{
      background: C.card,
      borderRadius: "22px 22px 0 0",
      padding: "16px 18px 32px",
      border: `1px solid ${C.border}`,
      maxHeight: "85vh",
      overflowY: "auto"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 17 }}>{title}</div>
        <button onClick={onClose} style={{ background: C.surface, border: 'none', borderRadius: 8, padding: "6px 8px", cursor: 'pointer' }}>
          <Ic n="close" size={18} color={C.muted} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// Enhanced NumPad component with calculator functions
export const NumPad = ({ onKey, variant = 'basic' }) => {
  // Basic numpad (original)
  const basicKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", ".", "⌫"];
  
// Calculator-style numpad with operations
  const calcKeys = [
    { k: "7", s: 1 }, { k: "8", s: 1 }, { k: "9", s: 1 }, { k: "÷", s: 1, op: true },
    { k: "4", s: 1 }, { k: "5", s: 1 }, { k: "6", s: 1 }, { k: "×", s: 1, op: true },
    { k: "1", s: 1 }, { k: "2", s: 1 }, { k: "3", s: 1 }, { k: "-", s: 1, op: true },
    { k: "C", s: 1, clear: true }, { k: "0", s: 1 }, { k: ".", s: 1 }, { k: "+", s: 1, op: true },
    { k: "=", s: 1, equals: true },
  ];
  
  const keys = variant === 'calc' ? calcKeys : basicKeys;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: variant === 'calc' ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap: 6 }}>
{keys.map((keyObj, idx) => {
        const k = typeof keyObj === 'string' ? keyObj : keyObj.k;
        const isOp = typeof keyObj === 'object' && keyObj.op;
        const isClear = typeof keyObj === 'object' && keyObj.clear;
        const isEquals = typeof keyObj === 'object' && keyObj.equals;
        
        return (
          <button key={k + idx} onClick={() => onKey(k)} className="numkey"
            style={{
              height: 48,
              borderRadius: 12,
              fontFamily: 'inherit',
              fontWeight: 800,
              fontSize: variant === 'calc' ? (isOp || isEquals ? 20 : 18) : (k === "⌫" || k === "C" ? 18 : 22),
              cursor: 'pointer',
              background: isEquals ? C.green : isClear ? C.redSoft : isOp ? C.accent + '20' : C.surface,
              color: isEquals ? '#020f08' : isClear ? C.red : isOp ? C.accent : k === "⌫" ? C.accent : C.text,
              border: `1.5px solid ${isEquals ? C.green + "40" : isClear ? C.red + "40" : isOp ? C.accent + "40" : C.border}`,
              gridColumn: k === "⌫" ? "span 2" : (isEquals ? "span 2" : undefined),
            }}>
            {k}
          </button>
        );
      })}
    </div>
  );
};

// Simple NumPad for quantity input only
export const SimpleNumPad = ({ onKey }) => {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", ".", "⌫"];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
      {keys.map((k) => (
        <button key={k} onClick={() => onKey(k)} className="numkey"
          style={{
            height: 48,
            borderRadius: 12,
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: k === "⌫" || k === "C" ? 16 : 18,
            cursor: 'pointer',
            background: k === "C" ? C.redSoft : C.surface,
            color: k === "C" ? C.red : k === "⌫" ? C.accent : C.text,
            border: `1.5px solid ${k === "C" ? C.red + "40" : C.border}`,
            gridColumn: k === "⌫" ? "span 2" : undefined,
          }}>
          {k}
        </button>
      ))}
    </div>
  );
};

export default { Btn, SearchBar, Field, StatCard, Modal, NumPad };
