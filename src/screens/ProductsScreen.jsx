import React, { useMemo, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { C, fmt, LOW, EXP_CATS } from '../utils/constants';
import { Btn, SearchBar, Field, Modal } from '../components/UI';
import Ic from '../components/Icons';

const ProductsScreen = ({ products, setProducts }) => {
  const [prodQ, setProdQ] = useState('');
  const [editProd, setEditProd] = useState(null);
  const [showAddProd, setShowAddProd] = useState(false);
  const [restockP, setRestockP] = useState(null);
  const [newProd, setNewProd] = useState({ name: '', unit: '', price: '', stock: '' });
  const fileRef = useRef();

  const filtProd = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(prodQ.toLowerCase())), 
    [products, prodQ]
  );

  const handleExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const imp = rows.slice(1).filter(r => r[0]).map((r, i) => ({
          id: Date.now() + i,
          name: String(r[0] || ''),
          unit: String(r[1] || ''),
          price: parseFloat(r[2]) || 0,
          stock: parseFloat(r[3]) || 0,
        }));
        if (imp.length) setProducts(imp);
      } catch (err) {
        console.error('Error importing Excel:', err);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const saveEdit = () => {
    setProducts(prev => prev.map(p => 
      p.id === editProd.id ? { ...editProd, price: parseFloat(editProd.price) || 0, stock: parseFloat(editProd.stock) || 0 } : p
    ));
    setEditProd(null);
  };

  const saveNewProd = () => {
    if (!newProd.name) return;
    setProducts(prev => [...prev, {
      id: Date.now(),
      name: newProd.name,
      unit: newProd.unit,
      price: parseFloat(newProd.price) || 0,
      stock: parseFloat(newProd.stock) || 0,
    }]);
    setNewProd({ name: '', unit: '', price: '', stock: '' });
    setShowAddProd(false);
  };

  const saveRestock = () => {
    const q = parseFloat(restockP.add) || 0;
    setProducts(prev => prev.map(p => 
      p.id === restockP.id ? { ...p, stock: parseFloat((p.stock + q).toFixed(2)) } : p
    ));
    setRestockP(null);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 85px' }} className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Btn onClick={() => fileRef.current.click()} bg={C.blue} fg="#020e1c" style={{ flex: 1 }} sm>
          <Ic n="upload" size={14} color="#020e1c" /> Import Excel
        </Btn>
        <Btn onClick={() => setShowAddProd(true)} style={{ flex: 1 }} sm>
          <Ic n="plus" size={14} color="#080e1c" /> Add Product
        </Btn>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcel} />
      </div>

      <div style={{ background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 12, border: `1px solid ${C.border}` }}>
        <span style={{ color: C.muted, fontSize: 11 }}>Excel: <span style={{ color: C.text, fontWeight: 700 }}>A: Name · B: Unit · C: Price · D: Stock</span></span>
      </div>

      <SearchBar value={prodQ} onChange={setProdQ} placeholder="Search products..." />

      {filtProd.map(p => {
        const isOut = p.stock <= 0;
        const isLow = p.stock <= LOW && p.stock > 0;
        return (
          <div key={p.id} style={{
            background: C.card,
            borderRadius: 16,
            padding: '13px 14px',
            marginBottom: 10,
            border: `1.5px solid ${isOut ? C.red + '50' : isLow ? C.accent + '45' : C.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>{p.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p.unit}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 7, alignItems: 'center' }}>
                  <span style={{ color: C.accent, fontWeight: 900, fontSize: 18 }}>{fmt(p.price)}</span>
                  <span style={{ color: isOut ? C.red : isLow ? C.accent : C.muted, fontSize: 12, fontWeight: 700 }}>
                    {isOut ? '❌ Out of stock' : isLow ? `⚠️ ${p.stock} left` : `Stock: ${p.stock}`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                <button onClick={() => setRestockP({ ...p, add: '' })} style={{
                  background: C.greenSoft, border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer'
                }}>
                  <Ic n="restock" size={15} color={C.green} />
                </button>
                <button onClick={() => setEditProd({ ...p })} style={{
                  background: C.blueSoft, border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer'
                }}>
                  <Ic n="edit" size={15} color={C.blue} />
                </button>
                <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))} style={{
                  background: C.redSoft, border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer'
                }}>
                  <Ic n="trash" size={15} color={C.red} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {filtProd.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0' }}>
          <Ic n="box" size={36} color={C.dim} />
          <div style={{ marginTop: 10, fontWeight: 700 }}>No products found</div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProd && (
        <Modal title="✏️ Edit Product" onClose={() => setEditProd(null)}>
          <Field label="PRODUCT NAME" value={editProd.name} onChange={v => setEditProd(p => ({ ...p, name: v }))} />
          <Field label="UNIT" value={editProd.unit} onChange={v => setEditProd(p => ({ ...p, unit: v }))} placeholder="e.g. per can" />
          <Field label="PRICE (₱)" type="number" step="0.01" value={editProd.price} onChange={v => setEditProd(p => ({ ...p, price: v }))} />
          <Field label="STOCK" type="number" step="0.01" value={editProd.stock} onChange={v => setEditProd(p => ({ ...p, stock: v }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn onClick={() => setEditProd(null)} bg={C.dim} fg={C.text} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={saveEdit} style={{ flex: 1 }}><Ic n="check" size={15} color="#080e1c" /> Save</Btn>
          </div>
        </Modal>
      )}

      {/* Add Product Modal */}
      {showAddProd && (
        <Modal title="➕ New Product" onClose={() => setShowAddProd(false)}>
          <Field label="PRODUCT NAME" value={newProd.name} onChange={v => setNewProd(p => ({ ...p, name: v }))} placeholder="e.g. Bear Brand" />
          <Field label="UNIT" value={newProd.unit} onChange={v => setNewProd(p => ({ ...p, unit: v }))} placeholder="e.g. per can" />
          <Field label="PRICE (₱)" type="number" step="0.01" value={newProd.price} onChange={v => setNewProd(p => ({ ...p, price: v }))} />
          <Field label="STOCK" type="number" step="0.01" value={newProd.stock} onChange={v => setNewProd(p => ({ ...p, stock: v }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn onClick={() => setShowAddProd(false)} bg={C.dim} fg={C.text} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={saveNewProd} disabled={!newProd.name} style={{ flex: 1 }}>
              <Ic n="plus" size={15} color="#080e1c" /> Add
            </Btn>
          </div>
        </Modal>
      )}

      {/* Restock Modal */}
      {restockP && (
        <Modal title="📦 Restock" onClose={() => setRestockP(null)}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{restockP.name}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Current: <strong style={{ color: C.accent }}>{restockP.stock}</strong></div>
          <Field label="ADD QUANTITY" type="number" step="0.01" value={restockP.add} onChange={v => setRestockP(p => ({ ...p, add: v }))} placeholder="e.g. 50" />
          {restockP.add && (
            <div style={{ color: C.green, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              New stock: {parseFloat((restockP.stock + (parseFloat(restockP.add) || 0)).toFixed(2))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setRestockP(null)} bg={C.dim} fg={C.text} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={saveRestock} bg={C.green} fg="#020f08" style={{ flex: 1 }}>✓ Restock</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductsScreen;
