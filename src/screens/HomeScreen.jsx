import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { C, fmt, fmtK, LOW } from '../utils/constants';
import { isSameDay, startOfMonth } from '../utils/helpers';
import { StatCard } from '../components/UI';
import Ic from '../components/Icons';

const HomeScreen = ({ sales, expenses, products }) => {
  const dash = useMemo(() => {
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);

    const todS = sales.filter((s) => isSameDay(new Date(s.dateISO), now));
    const todRev = todS.reduce((s, t) => s + t.total, 0);

    const yestRev = sales
      .filter((s) => isSameDay(new Date(s.dateISO), yest))
      .reduce((s, t) => s + t.total, 0);

    const todExp = expenses
      .filter((e) => isSameDay(new Date(e.dateISO), now))
      .reduce((s, e) => s + e.amount, 0);

    const monRev = sales
      .filter((s) => new Date(s.dateISO) >= startOfMonth(now))
      .reduce((s, t) => s + t.total, 0);

    const monExp = expenses
      .filter((e) => new Date(e.dateISO) >= startOfMonth(now))
      .reduce((s, e) => s + e.amount, 0);

    const chart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chart.push({
        day: d.toLocaleDateString('en-PH', { weekday: 'short' }),
        sales: parseFloat(
          sales
            .filter((s) => isSameDay(new Date(s.dateISO), d))
            .reduce((s, t) => s + t.total, 0)
            .toFixed(2)
        ),
      });
    }

    const qty = {};
    sales.forEach((t) => t.items.forEach((i) => {
      qty[i.name] = (qty[i.name] || 0) + i.qty;
    }));

    const best = Object.entries(qty)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxQ = best[0]?.[1] || 1;
    const pct = yestRev > 0 ? ((todRev - yestRev) / yestRev * 100).toFixed(0) : null;

    return {
      todRev,
      yestRev,
      todExp,
      monRev,
      monExp,
      chart,
      best,
      maxQ,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= LOW),
      outStock: products.filter((p) => p.stock <= 0),
      pct,
    };
  }, [sales, expenses, products]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 90px' }} className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Welcome back 👋</div>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 24, marginTop: 2 }}>Dashboard</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <StatCard
          label="TODAY'S SALES"
          value={fmtK(dash.todRev)}
          color={C.accent}
          icon="💰"
          sub={dash.pct !== null ? `${Number(dash.pct) > 0 ? "▲" : "▼"} ${Math.abs(dash.pct)}% vs yesterday` : "First day!"}
        />
        <StatCard
          label="TODAY'S EXPENSES"
          value={fmtK(dash.todExp)}
          color={C.red}
          icon="💸"
          sub={`Profit: ${fmtK(dash.todRev - dash.todExp)}`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatCard label="MONTH REVENUE" value={fmtK(dash.monRev)} color={C.green} icon="📈" />
        <StatCard label="MONTH PROFIT" value={fmtK(dash.monRev - dash.monExp)} color={C.purple} icon="✨" />
      </div>

      <div style={{ background: C.card, borderRadius: 18, padding: '16px 14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic n="trend" size={16} color={C.accent} /> Sales — Last 7 Days
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={dash.chart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke={C.dim}
              tick={{ fill: C.muted, fontSize: 11, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.text,
                fontFamily: 'inherit',
                fontSize: 12,
              }}
              formatter={(v) => [`₱${v}`, "Sales"]}
              labelStyle={{ color: C.muted }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke={C.accent}
              strokeWidth={2.5}
              fill="url(#sg)"
              dot={{ fill: C.accent, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: C.accent }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: C.card, borderRadius: 18, padding: '16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🏆 Best Sellers</div>
        {dash.best.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '10px 0' }}>No sales yet</div>
        ) : (
          dash.best.map(([name, q], i) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{i + 1}. {name}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>{q} sold</span>
              </div>
              <div style={{ background: C.surface, borderRadius: 8, height: 7, overflow: 'hidden' }}>
                <div
                  style={{
                    background: [C.accent, C.green, C.blue, C.purple, C.red][i],
                    height: '100%',
                    width: `${(q / dash.maxQ) * 100}%`,
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {(dash.lowStock.length > 0 || dash.outStock.length > 0) && (
        <div style={{ background: C.card, borderRadius: 18, padding: '16px', border: `1px solid ${C.accent}35` }}>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Ic n="warn" size={16} color={C.accent} /> Stock Alerts
          </div>
          {dash.outStock.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span style={{ color: C.text, fontSize: 13 }}>{p.name}</span>
              <span style={{ color: C.red, fontSize: 12, fontWeight: 800 }}>OUT OF STOCK</span>
            </div>
          ))}
          {dash.lowStock.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span style={{ color: C.text, fontSize: 13 }}>{p.name}</span>
              <span style={{ color: C.accent, fontSize: 12, fontWeight: 700 }}>{p.stock} left ⚠️</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
