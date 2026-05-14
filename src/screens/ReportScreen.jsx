import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { C, fmtK, PERIODS, CAT_ICON } from '../utils/constants';
import { filterByPeriod } from '../utils/helpers';
import { Btn, Field, Modal } from '../components/UI';
import Ic from '../components/Icons';
import { backupAPI, salesAPI } from '../utils/api';

const ReportScreen = ({ sales, setSales, expenses, refreshData }) => {
  const [period, setPeriod] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [editSale, setEditSale] = useState(null);
  const backupFileRef = useRef(null);

  const filtSales = useMemo(() => filterByPeriod(sales, period, customDate), [sales, period, customDate]);
  const numberedSales = useMemo(
    () => filtSales.map((sale, index) => ({ ...sale, customerNo: index + 1 })),
    [filtSales]
  );
  const filtExpRep = useMemo(() => filterByPeriod(expenses, period, customDate), [expenses, period, customDate]);

  const repSales = useMemo(() => filtSales.reduce((s, t) => s + t.total, 0), [filtSales]);
  const repExp = useMemo(() => filtExpRep.reduce((s, e) => s + e.amount, 0), [filtExpRep]);

  const exportExcel = () => {
    const label = period === 'custom' ? customDate : (PERIODS.find(p => p.id === period)?.label || period);
    const wb = XLSX.utils.book_new();

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

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Customer #', 'Date', 'Time', 'Items', 'Total', 'Cash', 'Change'],
      ...numberedSales.map(s => [
        s.customerNo,
        s.date,
        s.time,
        s.items.map(i => `${i.name} x${i.qty}`).join(', '),
        s.total,
        s.cash,
        s.change,
      ]),
    ]), 'Sales');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Category', 'Description', 'Amount'],
      ...filtExpRep.map(e => [e.date, e.category, e.description, e.amount]),
    ]), 'Expenses');

    XLSX.writeFile(wb, `SavCalcu_${label}_${Date.now()}.xlsx`);
  };

  const exportBackup = async () => {
    try {
      const backup = await backupAPI.export();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `savcalcu-backup-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting backup:', err);
      alert('Backup export failed. Please check your connection.');
    }
  };

  const restoreBackup = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ok = confirm('Restore this backup? This will replace current products, sales, expenses, and settings.');
    if (!ok) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backup = JSON.parse(evt.target.result);
        await backupAPI.restore(backup);
        alert('Backup restored. The app will reload now.');
        window.location.reload();
      } catch (err) {
        console.error('Error restoring backup:', err);
        alert('Backup restore failed. Please make sure this is a valid SavCalcu backup file.');
      }
    };
    reader.readAsText(file);
  };

  const deleteSale = async (sale) => {
    const ok = confirm(`Delete Customer #${sale.customerNo}? Product stock will be restored.`);
    if (!ok) return;

    try {
      await salesAPI.delete(sale.id);
      setSales(prev => prev.filter(s => s.id !== sale.id));
      refreshData?.();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Transaction delete failed. Please check your connection.');
    }
  };

  const saveSaleEdit = async () => {
    const cash = parseFloat(editSale.cash) || 0;
    const updatedSale = {
      ...editSale,
      cash,
      change: parseFloat((cash - editSale.total).toFixed(2)),
    };

    try {
      await salesAPI.update(updatedSale.id, {
        cash: updatedSale.cash,
        change: updatedSale.change,
      });
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
      setEditSale(null);
    } catch (err) {
      console.error('Error editing transaction:', err);
      alert('Transaction edit failed. Please check your connection.');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 85px' }} className="fade-in">
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[['SALES', repSales, C.green], ['EXPENSES', repExp, C.red], ['PROFIT', repSales - repExp, repSales - repExp >= 0 ? C.accent : C.red]].map(([l, v, c]) => (
          <div key={l} style={{ background: C.card, borderRadius: 14, padding: '12px 8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{l}</div>
            <div style={{ color: c, fontWeight: 900, fontSize: 15, marginTop: 5 }}>{fmtK(v)}</div>
          </div>
        ))}
      </div>

      <Btn onClick={exportExcel} bg={C.green} fg="#020f08" style={{ width: '100%', marginBottom: 16 }}>
        <Ic n="download" size={16} color="#020f08" /> Export to Excel
      </Btn>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <Btn onClick={exportBackup} bg={C.blue} fg="#020e1c" sm>
          <Ic n="download" size={14} color="#020e1c" /> Backup
        </Btn>
        <Btn onClick={() => backupFileRef.current?.click()} bg={C.accent} fg="#080e1c" sm>
          <Ic n="upload" size={14} color="#080e1c" /> Restore
        </Btn>
        <input
          ref={backupFileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={restoreBackup}
        />
      </div>

      <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
        Transactions ({numberedSales.length})
      </div>
      {numberedSales.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0' }}>
          <div style={{ fontSize: 40 }}>No records</div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>No records for this period</div>
        </div>
      ) : (
        numberedSales.map(sale => (
          <div key={sale.id} style={{ background: C.card, borderRadius: 16, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>Customer #{sale.customerNo}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sale.date} - {sale.time}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: C.accent, fontWeight: 900, fontSize: 17 }}>PHP {sale.total.toFixed(2)}</div>
                <div style={{ color: C.dim, fontSize: 11 }}>{sale.items.reduce((s, i) => s + i.qty, 0)} items</div>
              </div>
            </div>
            <div style={{ background: C.surface, borderRadius: 12, overflow: 'hidden' }}>
              {sale.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < sale.items.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ color: C.text, fontSize: 13 }}>{item.name} <span style={{ color: C.muted }}>x{item.qty}</span></span>
                  <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>PHP {(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px 8px', borderTop: `1.5px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 11 }}>Cash - Change</span>
                <span style={{ color: C.muted, fontSize: 11 }}>PHP {sale.cash.toFixed(2)} - PHP {sale.change.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <Btn onClick={() => setEditSale({ ...sale, cash: String(sale.cash) })} bg={C.blueSoft} fg={C.blue} sm>
                <Ic n="edit" size={14} color={C.blue} /> Edit
              </Btn>
              <Btn onClick={() => deleteSale(sale)} bg={C.redSoft} fg={C.red} sm>
                <Ic n="trash" size={14} color={C.red} /> Delete
              </Btn>
            </div>
          </div>
        ))
      )}

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
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{e.category} - {e.date}</div>
              </div>
              <div style={{ color: C.red, fontWeight: 900 }}>PHP {e.amount.toFixed(2)}</div>
            </div>
          ))}
        </>
      )}

      {editSale && (
        <Modal title={`Edit Customer #${editSale.customerNo}`} onClose={() => setEditSale(null)}>
          <Field label="TOTAL" value={`PHP ${editSale.total.toFixed(2)}`} onChange={() => {}} />
          <Field
            label="CASH RECEIVED"
            type="number"
            step="0.01"
            value={editSale.cash}
            onChange={v => setEditSale(s => ({ ...s, cash: v }))}
          />
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
            Change: <strong style={{ color: C.green }}>PHP {((parseFloat(editSale.cash) || 0) - editSale.total).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setEditSale(null)} bg={C.dim} fg={C.text} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={saveSaleEdit} style={{ flex: 1 }}>
              <Ic n="check" size={15} color="#080e1c" /> Save
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReportScreen;
