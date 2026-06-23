// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Wallet, ShoppingBag, Building2, Store, ChevronRight, ChevronLeft,
  Download, Receipt, Home, Users, MoreHorizontal, Package, Star,
  CreditCard, Banknote, AlertCircle, BarChart3, PieChart, Briefcase
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import "../Styles/ModulePages.scss";

const SUMMARY_API = (API_BASE_URL + "/profit/summary");
const DETAIL_API  = (API_BASE_URL + "/profit/detail");

const COUNTER_COLORS = {
  Wholesale: { bg: '#eff6ff', border: '#3b82f6', icon: '#3b82f6', label: 'Wholesale' },
  'Retail 1': { bg: '#fdf4ff', border: '#a855f7', icon: '#a855f7', label: 'Retail 1' },
  'Retail 2': { bg: '#fff7ed', border: '#f97316', icon: '#f97316', label: 'Retail 2' },
};

const fmt = (n) => `Rs. ${parseFloat(n || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const today = () => new Date().toLocaleDateString('en-CA');
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate()-6); return d.toLocaleDateString('en-CA'); };
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA'); };

export default function Profit() {
  const [summary, setSummary] = useState(() => {
    try {
      const cached = localStorage.getItem('profit_summary_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  });
  const [loading, setLoading] = useState(!summary);
  const [bgLoading, setBgLoading] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [quickFilter, setQuickFilter] = useState('today');
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate]     = useState(today());

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const buildQS = (from, to) => {
    const p = [];
    if (from) p.push(`from=${from}`);
    if (to)   p.push(`to=${to}`);
    return p.length ? '?' + p.join('&') : '';
  };

  const applyFilter = (preset) => {
    setQuickFilter(preset);
    let from = '', to = '';
    if (preset === 'today')  { from = today();     to = today(); }
    if (preset === 'week')   { from = weekAgo();   to = today(); }
    if (preset === 'month')  { from = monthStart();to = today(); }
    setFromDate(from); setToDate(to);
    loadSummary(from, to);
  };

  const loadSummary = (from = fromDate, to = toDate) => {
    if (summary) setBgLoading(true);
    else setLoading(true);

    fetch(SUMMARY_API + buildQS(from, to), { headers })
      .then(r => r.json())
      .then(d => { 
        setSummary(d); 
        setLoading(false);
        setBgLoading(false);
        if (from === today() && to === today()) {
          localStorage.setItem('profit_summary_cache', JSON.stringify(d));
        }
      })
      .catch(() => {
        setLoading(false);
        setBgLoading(false);
      });
  };

  useEffect(() => { loadSummary(today(), today()); }, []);

  const openDetail = async (counterName) => {
    setSelectedCounter(counterName);
    setDetailLoading(true);
    setDetail(null);
    setActiveTab('sales');
    try {
      const res = await fetch(`${DETAIL_API}/${encodeURIComponent(counterName)}${buildQS(fromDate, toDate)}`, { headers });
      const d = await res.json();
      setDetail(d);
    } catch (e) { console.error(e); }
    setDetailLoading(false);
  };

  const closeDetail = () => { setSelectedCounter(null); setDetail(null); };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b', fontWeight: 600 }}>Calculating Financials...</p>
    </div>
  );

  const totalSales       = Object.values(summary).reduce((s, c) => s + c.sales, 0);
  const totalSalesProfit = Object.values(summary).reduce((s, c) => s + (c.salesProfit || 0), 0);
  const totalExpenses    = Object.values(summary).reduce((s, c) => s + c.totalExpenses, 0);
  const netProfit        = totalSales - totalExpenses;

  const TABS = [
    { key: 'sales',     label: 'Sales',           icon: <ShoppingBag size={15}/> },
    { key: 'expenses',  label: 'Expenses',         icon: <Wallet size={15}/> },
    { key: 'supply',    label: 'Supplier Pay',     icon: <Briefcase size={15}/> },
    { key: 'rent',      label: 'Rent',             icon: <Home size={15}/> },
    { key: 'salary',    label: 'Salary',           icon: <Users size={15}/> },
    { key: 'other',     label: 'Other Exp.',       icon: <MoreHorizontal size={15}/> },
    { key: 'products',  label: 'Top Products',     icon: <Package size={15}/> },
    { key: 'invest',    label: 'Investments',      icon: <TrendingUp size={15}/> },
  ];

  return (
    <div className="profit-page">
      {/* ── Header ── */}
      <div className="module-header">
        <div className="module-title">
          <div className="module-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Master Profit &amp; Loss
              {bgLoading && (
                <div style={{ width: '16px', height: '16px', border: '2px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              )}
            </h1>
            <p>{bgLoading ? 'Syncing fresh data...' : 'Click any counter card for full breakdown'}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => window.print()}>
          <Download size={18} /> Export Report
        </button>
      </div>

      {/* ── Date Filter Bar ── */}
      <div className="profit-filter-bar">
        <span className="filter-label">📅 Period:</span>
        {[
          { key:'all',   label:'All Time' },
          { key:'today', label:'Today' },
          { key:'week',  label:'This Week' },
          { key:'month', label:'This Month' },
          { key:'custom',label:'Custom Range' },
        ].map(f => (
          <button key={f.key} onClick={() => applyFilter(f.key)}
            className={`filter-btn ${quickFilter === f.key ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}

        {quickFilter === 'custom' && (
          <div className="custom-date-row">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <span className="sep">→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            <button className="apply-btn" onClick={() => loadSummary(fromDate, toDate)}>Apply</button>
          </div>
        )}

        {(fromDate || toDate) && (
          <span className="active-range-badge">
            📅 {fromDate || '...'} → {toDate || '...'}
          </span>
        )}
      </div>

      {/* ── Top KPI Strip ── */}
      <div className="profit-kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div className="kpi-card">
          <div className="kpi-icon blue"><ShoppingBag size={26} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Gross Sales</div>
            <div className="kpi-value">{fmt(totalSales)}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><TrendingUp size={26} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Sales Margin Profit</div>
            <div className="kpi-value">{fmt(totalSalesProfit)}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><Wallet size={26} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Total Expenses</div>
            <div className="kpi-value">{fmt(totalExpenses)}</div>
          </div>
        </div>
        <div className={`kpi-card ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
          <div className={`kpi-icon ${netProfit >= 0 ? 'green' : 'orange'}`}>
            {netProfit >= 0 ? <TrendingUp size={26} /> : <TrendingDown size={26} />}
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Net Profit</div>
            <div className="kpi-value">{fmt(netProfit)}</div>
          </div>
        </div>
      </div>

      {/* ── Counter Cards ── */}
      <div className="counter-cards-grid">
        {Object.entries(summary).map(([name, stats]) => {
          const col = COUNTER_COLORS[name] || COUNTER_COLORS['Wholesale'];
          const margin = stats.sales > 0 ? ((stats.netProfit / stats.sales) * 100).toFixed(1) : '0.0';
          const cardClass = name === 'Wholesale' ? 'wholesale' : name === 'Retail 1' ? 'retail1' : 'retail2';
          return (
            <div key={name}
              className={`counter-card ${cardClass}`}
              onClick={() => openDetail(name)}
            >
              <div className="cc-header">
                <div className="cc-identity">
                  <div className="cc-icon" style={{ background: col.bg, color: col.icon }}>
                    {name === 'Wholesale' ? <Building2 size={22}/> : <Store size={22}/>}
                  </div>
                  <div>
                    <div className="cc-name">{name}</div>
                    <div className="cc-sub">Click for full detail</div>
                  </div>
                </div>
                <button className="cc-view-btn">View Detail <ChevronRight size={14}/></button>
              </div>

              <div className="cc-stats">
                {[
                  { label: 'Total Sales',  val: stats.sales,    cls: 'plus'  },
                  { label: 'Expenses',     val: stats.expenses, cls: 'minus' },
                  { label: 'Supply Pay',   val: stats.supply,   cls: 'minus' },
                  { label: 'Rent',         val: stats.rent,     cls: 'minus' },
                  { label: 'Salaries',     val: stats.salary,   cls: 'minus' },
                  { label: 'Other Costs',  val: stats.other,    cls: 'minus' },
                ].map(row => (
                  <div key={row.label} className="cc-stat-row">
                    <span className="cc-stat-label">{row.label}</span>
                    <span className={`cc-stat-val ${row.cls}`}>{row.cls === 'plus' ? '+' : '-'} {fmt(row.val)}</span>
                  </div>
                ))}
              </div>

              <div className={`cc-footer ${stats.netProfit >= 0 ? 'positive' : 'negative'}`}>
                <div className={`cc-profit-label ${stats.netProfit >= 0 ? 'positive' : 'negative'}`}>
                  {stats.netProfit >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>} Net Profit
                </div>
                <div className={`cc-profit-val ${stats.netProfit >= 0 ? 'positive' : 'negative'}`}>
                  {fmt(stats.netProfit)}
                </div>
              </div>

              <div className="cc-margin-bar">
                <div className="cc-margin-meta">
                  <span>Profit Margin</span><span>{margin}%</span>
                </div>
                <div className="cc-bar-track">
                  <div className="cc-bar-fill" style={{ width: `${Math.max(0, Math.min(100, parseFloat(margin)))}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog
        visible={!!selectedCounter}
        onHide={closeDetail}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: COUNTER_COLORS[selectedCounter]?.bg || '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COUNTER_COLORS[selectedCounter]?.icon || '#3b82f6' }}>
              {selectedCounter === 'Wholesale' ? <Building2 size={18}/> : <Store size={18}/>}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedCounter} — Full Breakdown</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>All transactions, expenses & inventory</div>
            </div>
          </div>
        }
        style={{ width: '90vw', maxWidth: '1100px' }}
        maximizable
        modal
        className="p-dialog-custom"
      >
        {detailLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#64748b' }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : detail ? (
          <div>
            {/* Summary chips */}
            {summary[selectedCounter] && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                {[
                  { label: 'Sales Paid', val: summary[selectedCounter].sales,        color: '#3b82f6' },
                  { label: 'Sales Profit', val: summary[selectedCounter].salesProfit, color: '#16a34a' },
                  { label: 'Expenses', val: summary[selectedCounter].totalExpenses, color: '#e11d48' },
                  { label: 'Net Profit',   val: summary[selectedCounter].netProfit,     color: summary[selectedCounter].netProfit >= 0 ? '#16a34a' : '#e11d48' },
                ].map(chip => (
                  <div key={chip.label} style={{ background: 'white', borderRadius: '10px', padding: '10px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{chip.label}</div>
                    <div style={{ fontWeight: 800, color: chip.color, fontSize: '1rem' }}>{fmt(chip.val)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab nav */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem', transition: 'all 0.2s',
                    background: activeTab === t.key ? '#3b82f6' : '#f1f5f9',
                    color:      activeTab === t.key ? 'white'   : '#475569' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'sales' && (
              <DataTable value={detail.sales} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No sales found.">
                <Column header="Date"     body={r => fmtDate(r.created_at)} sortable field="created_at" />
                <Column header="Customer / Details" body={r => (
                  <div>
                    <strong style={{fontSize: '0.9rem', color: '#1e293b'}}>{r.customer_name}</strong>
                    {r.items && (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px'}}>
                        {(typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || [])).map((item, idx) => (
                          <div key={idx} style={{fontSize: '0.75rem', color: '#475569', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-flex', gap: '8px', width: 'fit-content', alignItems: 'center'}}>
                            <span style={{fontWeight: 600}}>{item.name}</span>
                            <span style={{color: '#64748b'}}>{item.qty} x Rs.{item.rate}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )} sortable field="customer_name" />
                <Column header="Total"    body={r => <span style={{fontWeight:700,color:'#1e293b'}}>{fmt(r.net_amount)}</span>} sortable field="net_amount" />
                <Column header="Paid"     body={r => <span style={{color:'#16a34a',fontWeight:700}}>{fmt(r.paid_amount)}</span>} sortable field="paid_amount" />
                <Column header="Balance"  body={r => <span style={{color: parseFloat(r.balance_amount) > 0 ? '#e11d48' : '#16a34a', fontWeight:700}}>{fmt(r.balance_amount)}</span>} sortable field="balance_amount" />
                <Column header="Profit / Loss" body={r => {
                  const profit = parseFloat(r.sale_profit || 0);
                  const isProfit = profit >= 0;
                  return (
                    <span style={{
                      fontWeight: 800, 
                      color: isProfit ? '#16a34a' : '#e11d48',
                      background: isProfit ? '#f0fdf4' : '#fef2f2',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}`,
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isProfit ? '📈 +' : '📉 -'}{fmt(Math.abs(profit))}
                    </span>
                  );
                }} sortable field="sale_profit" />
                <Column header="Type"     body={r => <span className={`status-badge ${r.payment_type?.toLowerCase()}`} style={{padding:'3px 10px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:700}}>{r.payment_type}</span>} />
              </DataTable>
            )}

            {activeTab === 'expenses' && (
              <DataTable value={detail.expenses} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No expenses found.">
                <Column header="Date"        body={r => fmtDate(r.expense_date)} sortable field="expense_date" />
                <Column header="Description" field="description" sortable />
                <Column header="Type"        field="expense_type" />
                <Column header="Amount"      body={r => <span style={{fontWeight:700,color:'#e11d48'}}>{fmt(r.amount)}</span>} sortable field="amount" />
              </DataTable>
            )}

            {activeTab === 'supply' && (
              <DataTable value={detail.supply} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No supplier payments found.">
                <Column header="Date"      body={r => fmtDate(r.date)} sortable field="date" />
                <Column header="Supplier"  field="supplier_name" sortable />
                <Column header="Vehicle"   field="vehicle_number" />
                <Column header="Paid Amt"  body={r => <span style={{fontWeight:700,color:'#e11d48'}}>{fmt(r.paid_amount)}</span>} sortable field="paid_amount" />
              </DataTable>
            )}

            {activeTab === 'rent' && (
              <DataTable value={detail.rent} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No rent records found.">
                <Column header="Date"      body={r => fmtDate(r.rent_date)} sortable field="rent_date" />
                <Column header="Property"  field="property_name" sortable />
                <Column header="Landlord"  field="landlord_name" />
                <Column header="Amount"    body={r => <span style={{fontWeight:700,color:'#e11d48'}}>{fmt(r.amount)}</span>} sortable field="amount" />
                <Column header="Status"    body={r => <span className={`status-badge ${r.status?.toLowerCase()}`} style={{padding:'3px 10px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:700}}>{r.status}</span>} />
              </DataTable>
            )}

            {activeTab === 'salary' && (
              <DataTable value={detail.salary} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No salary records found.">
                <Column header="Date"        body={r => fmtDate(r.payment_date)} sortable field="payment_date" />
                <Column header="Employee"    field="employee_name" sortable />
                <Column header="Designation" field="designation" />
                <Column header="Salary"      body={r => <span style={{fontWeight:700,color:'#e11d48'}}>{fmt(r.amount)}</span>} sortable field="amount" />
                <Column header="Status"      body={r => <span className={`status-badge ${r.status?.toLowerCase()}`} style={{padding:'3px 10px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:700}}>{r.status}</span>} />
              </DataTable>
            )}

            {activeTab === 'other' && (
              <DataTable value={detail.other} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No other expenses found.">
                <Column header="Date"     body={r => fmtDate(r.date)} sortable field="date" />
                <Column header="Title"    field="title" sortable />
                <Column header="Category" field="category" />
                <Column header="Method"   field="payment_method" />
                <Column header="Amount"   body={r => <span style={{fontWeight:700,color:'#e11d48'}}>{fmt(r.amount)}</span>} sortable field="amount" />
              </DataTable>
            )}

            {activeTab === 'products' && (
              <DataTable value={detail.topProducts} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No product sales data.">
                <Column header="#" body={(_, { rowIndex }) => <span style={{fontWeight:800,color:'#64748b'}}>#{rowIndex+1}</span>} style={{width:'50px'}} />
                <Column header="Product"  field="product_name" sortable />
                <Column header="Qty Sold" body={r => <span style={{fontWeight:700,color:'#3b82f6'}}>{parseFloat(r.total_qty).toLocaleString()}</span>} sortable field="total_qty" />
                <Column header="Revenue"  body={r => <span style={{fontWeight:800,color:'#16a34a'}}>{fmt(r.total_revenue)}</span>} sortable field="total_revenue" />
              </DataTable>
            )}

            {activeTab === 'invest' && (
              <DataTable value={detail.investments} paginator rows={10} className="p-datatable-sm" stripedRows emptyMessage="No investment records found.">
                <Column header="Date"     body={r => fmtDate(r.date)} sortable field="date" />
                <Column header="Title"    field="title" sortable />
                <Column header="Investor" field="investor" />
                <Column header="Amount"   body={r => <span style={{fontWeight:700,color:'#7c3aed'}}>{fmt(r.amount)}</span>} sortable field="amount" />
              </DataTable>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
            <p>Could not load detail. Please try again.</p>
          </div>
        )}
      </Dialog>

      {/* ── Analytics Strip ── */}
      <div className="analytics-section">
        <div className="analytics-card">
          <div className="card-title"><PieChart size={18}/> Expense Distribution</div>
          <div className="distribution-list">
            {[
              { label: 'Operational', color: 'blue',   val: Object.values(summary).reduce((s, c) => s + c.expenses, 0) },
              { label: 'Rent & Salary', color: 'orange', val: Object.values(summary).reduce((s, c) => s + c.rent + c.salary, 0) },
              { label: 'Other',       color: 'red',    val: Object.values(summary).reduce((s, c) => s + c.other, 0) },
            ].map(d => (
              <div key={d.label} className="dist-item">
                <div className="info"><div className={`dot ${d.color}`}/> {d.label}</div>
                <div className="val">{fmt(d.val)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-title"><Briefcase size={18}/> Business Health</div>
          <div className="health-metrics">
            <div className="metric">
              <span className="label">Profit Margin</span>
              <span className="value">{(totalSales > 0 ? (netProfit / totalSales) * 100 : 0).toFixed(1)}%</span>
            </div>
            <div className="metric">
              <span className="label">Expense Ratio</span>
              <span className="value">{(totalSales > 0 ? (totalExpenses / totalSales) * 100 : 0).toFixed(1)}%</span>
            </div>
          </div>
          <p className="health-tip">
            {netProfit > 0 ? "✅ Your business is generating healthy positive cash flow." : "⚠️ Expenses are exceeding sales. Review operational costs."}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
