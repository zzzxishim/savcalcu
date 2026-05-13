import React, { useMemo, useState } from 'react';
import { C, fmtK, EXP_CATS, CAT_COLOR, CAT_ICON } from '../utils/constants';
import { isSameDay } from '../utils/helpers';
import { Btn, SearchBar, Field, Modal, StatCard } from '../components/UI';
import Ic from '../components/Icons';
import { expensesAPI } from '../utils/api';

const ExpensesScreen = ({ expenses, setExpenses }) => {
  const [expQ, setExpQ] = useState('');
  const [showAddExp, setShowAddExp] = useState(false);
  const [newExp, setNewExp] = useState({ category: 'Restocking', description: '', amount: '' });

  const todExp = useMemo(() => 
    expenses
      .filter(e => isSameDay(new Date(e.dateISO), new Date()))
      .reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const filtExp = useMemo(() => 
    expenses.filter(e => 
      e.description.toLowerCase().includes(expQ.toLowerCase()) || 
      e.category.toLowerCase().includes(expQ.toLowerCase())
    ), 
    [expenses, expQ]
  );

  const saveExp = async () => {
    if (!newExp.description || !newExp.amount) return;
    const now = new Date();

    const expense = {
      category: newExp.category,
      description: newExp.description,
      amount: parseFloat(newExp.amount) || 0,
      dateISO: now.toISOString(),
      date: now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    try {
      const savedExpense = await expensesAPI.create(expense);
      setExpenses(prev => [{ ...expense, id: savedExpense.id }, ...prev]);
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Expense save failed. Please check your connection.');
      return;
    }

    setNewExp({ category: 'Restocking', description: '', amount: '' });
    setShowAddExp(false);
  };

  const deleteExpense = async (id) => {
    try {
      await expensesAPI.delete(id);
      setExpenses(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Expense delete failed. Please check your connection.');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 85px' }} className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <StatCard label="TODAY'S EXPENSES" value={fmtK(todExp)} color={C.red} icon="💸" />
        <StatCard label="TOTAL RECORDS" value={expenses.length} color={C.blue} icon="📝" />
      </div>

      <Btn onClick={() => setShowAddExp(true)} style={{ width: '100%', marginBottom: 12 }}>
        <Ic n="plus" size={16} color="#080e1c" /> Log Expense
      </Btn>

      <SearchBar value={expQ} onChange={setExpQ} placeholder="Search expenses..." />

      {filtExp.map(e => (
        <div key={e.id} style={{
          background: C.card,
          borderRadius: 16,
          padding: '12px 14px',
          marginBottom: 10,
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: C.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0
          }}>
            {CAT_ICON[e.category] || '📦'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: C.text,
              fontWeight: 700,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {e.description}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <span style={{
                background: C.surface,
                color: CAT_COLOR[e.category] || C.muted,
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 9px',
                borderRadius: 20,
                border: `1px solid ${(CAT_COLOR[e.category] || C.muted) + '40'}`
              }}>
                {e.category}
              </span>
              <span style={{ color: C.muted, fontSize: 11 }}>{e.date}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ color: C.red, fontWeight: 900, fontSize: 16 }}>₱{e.amount.toFixed(2)}</div>
            <button onClick={() => deleteExpense(e.id)} style={{
              background: C.redSoft, border: 'none', borderRadius: 7, padding: '4px 7px', cursor: 'pointer'
            }}>
              <Ic n="trash" size={12} color={C.red} />
            </button>
          </div>
        </div>
      ))}

      {filtExp.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0' }}>
          <div style={{ fontSize: 40 }}>📭</div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>No expenses yet</div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExp && (
        <Modal title="💸 Log Expense" onClose={() => setShowAddExp(false)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>CATEGORY</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EXP_CATS.map(cat => (
                <button key={cat} onClick={() => setNewExp(e => ({ ...e, category: cat }))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${newExp.category === cat ? CAT_COLOR[cat] : C.border}`,
                    background: newExp.category === cat ? CAT_COLOR[cat] + '20' : C.surface,
                    color: newExp.category === cat ? CAT_COLOR[cat] : C.muted,
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}>
                  {CAT_ICON[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          <Field label="DESCRIPTION" value={newExp.description} onChange={v => setNewExp(e => ({ ...e, description: v }))} placeholder="e.g. Rice sack 50kg" />
          <Field label="AMOUNT (₱)" type="number" step="0.01" value={newExp.amount} onChange={v => setNewExp(e => ({ ...e, amount: v }))} placeholder="0.00" />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn onClick={() => setShowAddExp(false)} bg={C.dim} fg={C.text} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={saveExp} disabled={!newExp.description || !newExp.amount} style={{ flex: 1 }}>
              <Ic n="check" size={15} color="#080e1c" /> Save
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExpensesScreen;
