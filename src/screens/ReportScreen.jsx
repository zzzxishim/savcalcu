import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { C, fmtK, PERIODS, CAT_ICON } from '../utils/constants';
import { filterByPeriod } from '../utils/helpers';
import { Btn, SearchBar, Field } from '../components/UI';
import Ic from '../components/Icons';

const ReportScreen = ({ sales, expenses }) => {
  const [period, setPeriod] = useState('today');
  const [customDate, setCustomDate] = useState('');

  const filtSales = useMemo(() => filterByPeriod(sales, period, customDate), [sales, period, customDate]);
  const filtExpRep = useMemo(() => filterByPeriod(expenses, period, customDate), [expenses, period, customDate]);

  const repSales = useMemo(() => filtSales.reduce((s, t) => s + t.total, 0), [filtSales]);
  const repExp = useMemo(() => filtExpRep.reduce((s, e) => s + e.amount, 0), [filtExpRep]);

  const exportExcel = () => {
    const label = period === 'custom' ? customDate : (PERIODS.find(p => p.id === period)?.label || period);
    const wb = XLSX.utils.book_new();

    // Summary sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['SavCalcu Report'],
      ['Period:', label],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['SUMMARY'],
      ['Total Sales', repSales],
      ['Total Expenses', repExp],
      ['Net Profit', repSales - repExp],
    ]), 'Summary');

    // Sales sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Customer #', 'Date', 'Time', 'Items', 'Total', 'Cash', 'Change'],
      ...filtSales.map(s => [
        s.id,
        s.date,
        s.time,
        s.items.map(i => `${i.name}×${i.qty}`).join(', '),
        s.total,
        s.cash,
        s.change,
      ]),
    ]), 'Sales');

    // Expenses sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Category', 'Description', 'Amount'],
      ...filtExpRep.map(e => [e.date, e.category, e.description, e.amount]),
    ]), 'Expenses');

    XLSX.writeFile(wb, `SavCalcu_${label}_${Date.now()}.xlsx`);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 85px' }} className="fade-in">
      {/* Period Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              background: period === p.id ? C.accent : C.card,
              color: period === p.id ? '#080e1c' : C.muted,
              fontFamily: 'inherit',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 5 }}>PICK A DATE</div>
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
            style={{
              width: '100%',
              background: C.card,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              padding: '11px 14px',
              color: C.text,
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 700,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[['SALES', repSales, C.green], ['EXPENSES', repExp, C.red], ['PROFIT', repSales - repExp, repSales - repExp >= 0 ? C.accent : C.red]].map(([l, v, c]) => (
          <div key={l} style={{ background: C.card, borderRadius: 14, padding: '12px 8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{l}</div>
            <div style={{ color: c, fontWeight: 900, fontSize: 15, marginTop: 5 }}>{fmtK(v)}</div>
          </div>
        ))}
      </div>

      {/* Export Button */}
      <Btn onClick={exportExcel} bg={C.green} fg="#020f08" style={{ width: '100%', marginBottom: 16 }}>
        <Ic n="download" size={16} color="#020f08" /> Export to Excel
      </Btn>

      {/* Sales Transactions */}
      <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Transactions ({filtSales.length})</div>
      {filtSales.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0' }}>
          <div style={{ fontSize: 40 }}>📭</div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>No records for this period</div>
        </div>
      ) : (
        filtSales.map(sale => (
          <div key={sale.id} style={{ background: C.card, borderRadius: 16, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>Customer #{sale.id}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sale.date} · {sale.time}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: C.accent, fontWeight: 900, fontSize: 17 }}>₱{sale.total.toFixed(2)}</div>
                <div style={{ color: C.dim, fontSize: 11 }}>{sale.items.reduce((s, i) => s + i.qty, 0)} items</div>
              </div>
            </div>
            <div style={{ background: C.surface, borderRadius: 12, overflow: 'hidden' }}>
              {sale.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < sale.items.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ color: C.text, fontSize: 13 }}>{item.name} <span style={{ color: C.muted }}>×{item.qty}</span></span>
                  <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>₱{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px 8px', borderTop: `1.5px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 11 }}>Cash · Change</span>
                <span style={{ color: C.muted, fontSize: 11 }}>₱{sale.cash.toFixed(2)} · ₱{sale.change.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Expenses */}
      {filtExpRep.length > 0 && (
        <>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, margin: '16px 0 10px' }}>Expenses ({filtExpRep.length})</div>
          {filtExpRep.map(e => (
            <div key={e.id} style={{
              background: C.card,
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 8,
              border: `1px solid ${C.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{CAT_ICON[e.category]} {e.description}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{e.category} · {e.date}</div>
              </div>
              <div style={{ color: C.red, fontWeight: 900 }}>₱{e.amount.toFixed(2)}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default ReportScreen;
