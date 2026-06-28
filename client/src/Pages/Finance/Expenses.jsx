// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
  Receipt, Plus, Pencil, Trash2, X, Search, 
  Home, Building2, Coffee, Zap, UserMinus, Wallet,
  Calendar, Tag, FileText, CircleDollarSign, ChevronLeft, Truck
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import ActionMenu from '../../components/ActionMenu';
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/expenses");

const emptyForm = {
  title: "",
  expense_type: "Office",
  category: "General",
  amount: "",
  expense_date: new Date().toLocaleDateString('en-CA'),
  notes: "",
  payment_source: "Cash",
  bank_name: ""
};

const CATEGORIES = {
  Office: ["Rent", "Electricity", "Staff Tea", "Stationery", "Internet", "Maintenance", "Other"],
  House: ["Grocery", "Personal Withdrawal", "Utility Bills", "Education", "Travel", "Other"]
};

export default function Expenses({ type }) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(() => {
    if (type) return type;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const u = payload.user || payload;
        let m = u.module_type;
        if (m === 'admin') m = null;
        if (!m && u.email) {
          const em = u.email.toLowerCase();
          if (em.includes('wholesale')) m = 'Wholesale';
          else if (em.includes('retail1') || em.includes('retailsaller1')) m = 'Retail 1';
          else if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) m = 'Retail 2';
        }
        return m || "Wholesale";
      }
    } catch (e) {}
    return "Wholesale";
  });
  const [records, setRecords] = useState([]);
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedExpForPay, setSelectedExpForPay] = useState(null);
  const [payForm, setPayForm] = useState({ source: 'Cash', bank: '' });
  const [liveBalances, setLiveBalances] = useState({});
  const [personalVehicles, setPersonalVehicles] = useState([]);
  const [dateFilter, setDateFilter] = useState("Today");

  useEffect(() => {
    if (showModal || showPayModal) {
      const fetchLiveBalances = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setLiveBalances(data);
            
            // Dynamic positive balance defaulting for Add modal
            if (showModal && !editId) {
              if ((data["Cash"] || 0) > 0) {
                setForm(prev => ({ ...prev, payment_source: "Cash", bank_name: "" }));
              } else {
                const positiveBanks = banks.filter(b => {
                  const name = b.bank_name.toLowerCase().trim();
                  if (name === 'cash' || name === 'cash account') return false;
                  const digits = b.account_number ? b.account_number.slice(-4) : '';
                  const key = `${b.bank_name} ${digits ? `(****${digits})` : ''}`;
                  return (data[key] || 0) > 0;
                });
                if (positiveBanks.length > 0) {
                  const b = positiveBanks[0];
                  const digits = b.account_number ? b.account_number.slice(-4) : '';
                  setForm(prev => ({ ...prev, payment_source: "Bank", bank_name: `${b.bank_name} ${digits ? `(****${digits})` : ''}` }));
                } else {
                  setForm(prev => ({ ...prev, payment_source: "Cash", bank_name: "" }));
                }
              }
            }
            
            // Dynamic positive balance defaulting for Pay Transport Fare modal
            if (showPayModal) {
              if ((data["Cash"] || 0) > 0) {
                setPayForm(prev => ({ ...prev, source: "Cash", bank: "" }));
              } else {
                const positiveBanks = banks.filter(b => {
                  const name = b.bank_name.toLowerCase().trim();
                  if (name === 'cash' || name === 'cash account') return false;
                  const digits = b.account_number ? b.account_number.slice(-4) : '';
                  const key = `${b.bank_name} ${digits ? `(****${digits})` : ''}`;
                  return (data[key] || 0) > 0;
                });
                if (positiveBanks.length > 0) {
                  const b = positiveBanks[0];
                  const digits = b.account_number ? b.account_number.slice(-4) : '';
                  setPayForm(prev => ({ ...prev, source: "Bank", bank: `${b.bank_name} ${digits ? `(****${digits})` : ''}` }));
                } else {
                  setPayForm(prev => ({ ...prev, source: "Cash", bank: "" }));
                }
              }
            }
          }
        } catch (e) { console.error(e); }
      };
      fetchLiveBalances();
    }
  }, [showModal, showPayModal]);

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    } else if (user?.module_type && user?.role !== 'admin') {
      setActiveTab(user.module_type);
    }
  }, [type, user?.module_type, user?.role]);

  const fetchRecords = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalRecs = Array.isArray(data) ? data : [];
      setRecords(finalRecs);
    } catch (err) { console.error(err); }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch((API_BASE_URL + '/banks'), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setBanks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchPersonalVehicles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/transport?ownership_type=Personal&type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setPersonalVehicles(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    if (!activeTab) return;
    fetchRecords();
    fetchBanks();
    fetchPersonalVehicles();
    const interval = setInterval(() => {
      fetchRecords();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API}/${editId}` : API;
      
      const finalPaymentType = form.payment_source === 'Bank' ? `Bank - ${form.bank_name}` : 'Cash';
      const targetAccountName = form.payment_source === 'Bank' ? form.bank_name : 'Cash';
      const amt = parseFloat(form.amount || 0);
      const currentAvailable = liveBalances[targetAccountName] || 0;
      
      if (amt > currentAvailable) {
        setLoading(false);
        return;
      }
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...form, payment_type: finalPaymentType, module_type: activeTab, vehicle_id: form.expense_type === "Personal Vehicle" ? form.vehicle_id : null }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchRecords();
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchRecords();
    } catch (err) { console.error(err); }
  };

const filtered = records.filter(r => {


    const matchType = filterType === "All" ? true 
      : filterType === "Pending Only" ? r.payment_type === 'Pending' 
      : r.expense_type === filterType;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
                        (r.category || "").toLowerCase().includes(search.toLowerCase());
    
    let matchDate = true;
    const todayStr = new Date().toLocaleDateString('en-CA');
    const recDateStr = r.expense_date ? new Date(r.expense_date).toLocaleDateString('en-CA') : '';
    
    if (dateFilter === "Today") {
      matchDate = recDateStr === todayStr;
    } else if (dateFilter === "Yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      matchDate = recDateStr === yesterdayStr;
    }
    
    return matchType && matchSearch && matchDate;
  });

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.expense_date || a.created_at || 0);
      const dateB = new Date(b.expense_date || b.created_at || 0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      return (a.id || 0) - (b.id || 0);
    });
  }, [filtered]);

  const targetAccountName = form.payment_source === 'Bank' ? form.bank_name : 'Cash';
  const availableBal = liveBalances[targetAccountName] || 0;
  const isInsufficient = form.payment_source === 'Bank' && parseFloat(form.amount || 0) > availableBal;
  const isCashInsufficient = form.payment_source !== 'Bank' && parseFloat(form.amount || 0) > availableBal;

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          <button className="btn-icon back-btn" onClick={() => window.history.back()} style={{marginRight: '15px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s'}}>
            <ChevronLeft size={20} />
          </button>
          <div className="module-icon expense-icon" style={{background: '#fef2f2', color: '#ef4444'}}><Receipt size={28} /></div>
          <div>
            <h1>{activeTab} Expenses</h1>
            <p>Track office overheads and personal expenditures</p>
          </div>
        </div>

        {user?.role === 'admin' && (!user?.module_type || user?.module_type === 'admin') && !type && (
          <div className="counter-switcher">
            <button className={activeTab === 'Wholesale' ? 'active' : ''} onClick={() => setActiveTab('Wholesale')}>Wholesale</button>
            <button className={activeTab === 'Retail 1' ? 'active' : ''} onClick={() => setActiveTab('Retail 1')}>Retail 1</button>
            <button className={activeTab === 'Retail 2' ? 'active' : ''} onClick={() => setActiveTab('Retail 2')}>Retail 2</button>
          </div>
        )}

        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}>
          <Plus size={18} /> Record Expense
        </button>
      </div>

      <div className="stats-grid-pos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="pos-stat-card">
          <div className="icon blue"><Building2 size={24} /></div>
          <div className="info">
            <span className="label">Office Total</span>
            <span className="value">Rs. {filtered.filter(r => r.expense_type === "Office" && r.payment_type !== 'Pending').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon orange"><Home size={24} /></div>
          <div className="info">
            <span className="label">House Total</span>
            <span className="value">Rs. {filtered.filter(r => r.expense_type === "House" && r.payment_type !== 'Pending').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon blue" style={{ background: '#ecfeff', color: '#0891b2' }}><Truck size={24} /></div>
          <div className="info">
            <span className="label">Personal Veh.</span>
            <span className="value">Rs. {filtered.filter(r => r.expense_type === "Personal Vehicle").reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon orange" style={{ background: '#fff7ed', color: '#c2410c' }}><Truck size={24} /></div>
          <div className="info">
            <span className="label">Supplier Veh.</span>
            <span className="value">Rs. {filtered.filter(r => r.expense_type === "Supplier Vehicle" && r.expense_type !== "Personal Vehicle" && !personalVehicles.some(v => `${v.vehicle_number} (${v.driver_name})` === r.category) && r.payment_type !== 'Pending').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red" style={{ background: '#fef2f2', color: '#ef4444' }}><CircleDollarSign size={24} /></div>
          <div className="info">
            <span className="label" style={{color: '#ef4444', fontWeight: 'bold'}}>PENDING TOTAL</span>
            <span className="value" style={{color: '#b91c1c', fontWeight: '900'}}>Rs. {filtered.filter(r => r.payment_type === 'Pending').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><Wallet size={24} /></div>
          <div className="info">
            <span className="label">Grand Paid Total</span>
            <span className="value">Rs. {filtered.filter(r => r.payment_type !== 'Pending').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '15px' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
            <Search size={18} />
            <input type="text" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          
          <div className="filter-group" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
             {["Today", "Yesterday", "All Time"].map(d => (
               <button 
                 type="button"
                 key={d} 
                 className={`tab-btn ${dateFilter === d ? 'active' : ''}`} 
                 onClick={() => setDateFilter(d)}
                 style={{
                   padding: '6px 16px',
                   borderRadius: '8px',
                   fontSize: '0.85rem',
                   fontWeight: 700,
                   background: dateFilter === d ? '#3b82f6' : 'transparent',
                   color: dateFilter === d ? 'white' : '#64748b',
                   border: 'none',
                   cursor: 'pointer',
                   transition: 'all 0.2s'
                 }}
               >
                 {d}
               </button>
             ))}
          </div>
        </div>
        
        <div className="filter-group">
           {["All", "Pending Only", "Supplier Vehicle", "Personal Vehicle", "Office", "House", "Galla Closeout", "Admin Payment"].map(t => (
             <button key={t} className={`tab-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>{t}</button>
           ))}
        </div>
      </div>

      <div className="module-table-container">
        <table className="module-table">
          <thead>
            <tr>
              <th style={{width: '60px', textAlign: 'center'}}>S.No.</th>
              <th>Date</th>
              <th>Type / Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th style={{textAlign: 'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.length === 0 ? (
              <tr><td colSpan="6" className="empty-msg">No expenses found for {activeTab}.</td></tr>
            ) : (
              sortedFiltered.map((r, index) => (
                <tr key={r.id}>
                  <td style={{textAlign: 'center', fontWeight: 'bold', color: '#64748b'}}>{index + 1}</td>
                  <td>{new Date(r.expense_date).toLocaleDateString()}</td>
                  <td>
                    <div className="prod-main-info">
                      <span className="type-tag" style={{
                        fontSize:'0.75rem', 
                        width:'fit-content',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        background: r.expense_type === 'Galla Closeout' ? '#fee2e2' : r.expense_type === 'Admin Payment' ? '#dcfce7' : r.expense_type === 'Office' ? '#eff6ff' : r.expense_type === 'House' ? '#fff7ed' : '#f1f5f9',
                        color: r.expense_type === 'Galla Closeout' ? '#ef4444' : r.expense_type === 'Admin Payment' ? '#15803d' : r.expense_type === 'Office' ? '#1d4ed8' : r.expense_type === 'House' ? '#c2410c' : '#475569'
                      }}>
                        {r.expense_type}
                      </span>
                      <span className="v-num">{r.category}</span>
                    </div>
                  </td>
                  <td className="bold">
                    {r.title}
                    <div style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 400}}>
                      Payment: {r.payment_type || 'Cash'}
                    </div>
                  </td>
                  <td className="bold text-red">Rs. {parseFloat(r.amount).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    <ActionMenu 
                      onEdit={user?.role === 'admin' ? () => { setForm(r); setEditId(r.id); setShowModal(true); } : null}
                      onDelete={user?.role === 'admin' ? () => handleDelete(r.id) : null}
                      extraItems={r.payment_type === 'Pending' ? [
                        { label: 'Payable', icon: 'pi pi-wallet', command: () => { setSelectedExpForPay(r); setShowPayModal(true); } }
                      ] : []}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Expense Entry" : "Record New Expense"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-label">Category & Date</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Expense Type</label>
                  <div className="input-wrapper">
                    <Tag size={18} />
                    <select value={form.expense_type} onChange={(e) => {
                      const nextType = e.target.value;
                      let nextCat = "General";
                      let nextVehId = null;
                      if (nextType === "Personal Vehicle") {
                        const firstVeh = personalVehicles[0];
                        nextCat = firstVeh ? `${firstVeh.vehicle_number} (${firstVeh.driver_name})` : "None";
                        nextVehId = firstVeh ? firstVeh.id : null;
                      } else {
                        nextCat = CATEGORIES[nextType] ? CATEGORIES[nextType][0] : "General";
                      }
                      setForm({...form, expense_type: nextType, category: nextCat, vehicle_id: nextVehId});
                    }}>
                      <option value="Office">Office Expense</option>
                      <option value="House">House Expense</option>
                      <option value="Personal Vehicle">Personal Vehicle</option>
                      <option value="Supplier Vehicle">Supplier Vehicle</option>
                      <option value="Supplier Vehicle">Supplier Vehicle</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <div className="input-wrapper">
                    <FileText size={18} />
                    <select value={form.category} onChange={(e) => {
                      const catVal = e.target.value;
                      if (form.expense_type === "Personal Vehicle") {
                        const matchedVeh = personalVehicles.find(v => `${v.vehicle_number} (${v.driver_name})` === catVal);
                        setForm({...form, category: catVal, vehicle_id: matchedVeh ? matchedVeh.id : null});
                      } else {
                        setForm({...form, category: catVal, vehicle_id: null});
                      }
                    }}>
                      {form.expense_type === "Personal Vehicle" ? (
                        personalVehicles.map(v => (
                          <option key={v.id} value={`${v.vehicle_number} (${v.driver_name})`}>
                            {v.vehicle_number} ({v.driver_name})
                          </option>
                        ))
                      ) : (
                        CATEGORIES[form.expense_type]?.map(c => <option key={c} value={c}>{c}</option>)
                      )}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Expense Date</label>
                  <div className="input-wrapper">
                    <Calendar size={18} />
                    <input type="date" value={form.expense_date} onChange={(e) => setForm({...form, expense_date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Amount (Rs.) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" required value={form.amount} placeholder="0.00" onChange={(e) => setForm({...form, amount: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="section-label">Payment Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Payment Source *</span>
                    {form.payment_source !== 'Bank' && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: (liveBalances['Cash'] || 0) < 0 ? '#ef4444' : '#16a34a' }}>
                        Cash Bal: Rs. {(liveBalances['Cash'] || 0).toLocaleString()}
                      </span>
                    )}
                  </label>
                  <div className="input-wrapper">
                    <Wallet size={18} />
                    <select 
                      value={form.payment_source || 'Cash'} 
                      onChange={(e) => setForm({...form, payment_source: e.target.value, bank_name: e.target.value === 'Bank' ? (banks[0]?.bank_name || '') : ''})}
                    >
                      <option value="Cash">Cash Payment</option>
                      {banks.some(b => {
                        const name = b.bank_name.toLowerCase().trim();
                        if (name === 'cash' || name === 'cash account') return false;
                        return (b.module_type || 'Wholesale') === activeTab;
                      }) && (
                        <option value="Bank">Bank Transfer</option>
                      )}
                    </select>
                  </div>
                </div>
                {form.payment_source === 'Bank' && (
                  <div className="form-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Select Bank *</span>
                      {form.bank_name && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: (liveBalances[form.bank_name] || 0) < 0 ? '#ef4444' : '#16a34a' }}>
                          Bal: Rs. {(liveBalances[form.bank_name] || 0).toLocaleString()}
                        </span>
                      )}
                    </label>
                    <div className="input-wrapper">
                      <Building2 size={18} />
                      <select 
                        value={form.bank_name} 
                        required
                        onChange={(e) => setForm({...form, bank_name: e.target.value})}
                      >
                        <option value="">Choose Bank...</option>
                        {banks.filter(b => {
                          const name = b.bank_name.toLowerCase().trim();
                          if (name === 'cash' || name === 'cash account') return false;
                          return (b.module_type || 'Wholesale') === activeTab;
                        }).map(b => {
                          const digits = b.account_number ? b.account_number.slice(-4) : '';
                          return <option key={b.id} value={`${b.bank_name} ${digits ? `(****${digits})` : ''}`}>{b.bank_name} {digits ? `(****${digits})` : ''}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              {isInsufficient && (
                <div style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  ⚠️ Insufficient Balance! Available: Rs. {availableBal.toLocaleString()}
                </div>
              )}
              {isCashInsufficient && (
                <div style={{ color: '#ca8a04', background: '#fef9c3', border: '1px solid #fef08a', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  ⚠️ Negative Cash Balance Warning! Available: Rs. {availableBal.toLocaleString()} (Saving is allowed)
                </div>
              )}

              <div className="section-label">Description & Notes</div>
              <div className="form-group full-width">
                <label>Expense Title *</label>
                <div className="input-wrapper">
                  <Receipt size={18} />
                  <input type="text" required value={form.title} placeholder="e.g. Electricity Bill July" onChange={(e) => setForm({...form, title: e.target.value})} />
                </div>
              </div>
              <div className="form-group full-width" style={{marginTop:'15px'}}>
                <textarea rows="2" placeholder="Add any specific details or notes..." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading || isInsufficient}>
                  {loading ? "Processing..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Pay Transport Fare</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}><X size={20} /></button>
            </div>
            
            <div style={{padding: '20px'}}>
              <div style={{background: '#fff1f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', border: '1px solid #fecdd3'}}>
                <span style={{fontWeight: 600, color: '#e11d48'}}>Amount Payable:</span>
                <span style={{fontWeight: 700, color: '#e11d48'}}>Rs. {parseFloat(selectedExpForPay?.amount).toLocaleString()}</span>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 600}}>Payment Source *</label>
                <select 
                  value={payForm.source}
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}}
                  onChange={(e) => setPayForm({...payForm, source: e.target.value, bank: e.target.value === 'Bank' ? (banks[0]?.bank_name || '') : ''})}
                >
                  <option value="Cash">Main Cash (Counter)</option>
                  {banks.some(b => {
                    const name = b.bank_name.toLowerCase().trim();
                    if (name === 'cash' || name === 'cash account') return false;
                    return (b.module_type || 'Wholesale') === activeTab;
                  }) && (
                    <option value="Bank">Bank / Online Account</option>
                  )}
                </select>
              </div>

              {payForm.source === "Bank" && (
                <div className="form-group" style={{marginBottom: '15px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: 600}}>Select Sending Bank *</label>
                  <select 
                    value={payForm.bank} 
                    onChange={(e) => setPayForm({...payForm, bank: e.target.value})} 
                    style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f0f9ff', borderColor: '#3b82f6'}}
                    required
                  >
                    <option value="">-- Choose Account --</option>
                    {banks.filter(b => {
                      const name = b.bank_name.toLowerCase().trim();
                      if (name === 'cash' || name === 'cash account') return false;
                      return (b.module_type || 'Wholesale') === activeTab;
                    }).map(b => {
                      const digits = b.account_number ? b.account_number.slice(-4) : '';
                      return <option key={b.id} value={`${b.bank_name} ${digits ? `(****${digits})` : ''}`}>{b.bank_name} - {b.account_number}</option>;
                    })}
                  </select>
                </div>
              )}
              
              <div style={{background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', color: '#64748b', border: '1px solid #e2e8f0'}}>
                <strong>Ref:</strong> {selectedExpForPay?.title}
              </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn-primary" style={{background: '#10b981', borderColor: '#10b981'}} disabled={loading} onClick={async () => {
                   setLoading(true);
                   try {
                     const method = payForm.source === 'Bank' ? payForm.bank : 'Cash';
                     // 1. Check Balance
                     const balRes = await fetch(`${API_BASE_URL}/banks/balance/${method}?module_type=${activeTab}`, {
                       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
                     });
                     const { balance } = await balRes.json();

                     if (balance < parseFloat(selectedExpForPay.amount)) {
                       alert(`Insufficient Balance in ${method}! Available: Rs. ${balance.toLocaleString()}`);
                       setLoading(false);
                       return;
                     }

                     // 2. Update Expense
                     const finalPaymentType = payForm.source === 'Bank' ? `Bank - ${payForm.bank}` : 'Cash';
                     const res = await fetch(`${API}/${selectedExpForPay.id}`, {
                       method: 'PUT',
                       headers: { 
                         "Content-Type": "application/json",
                         "Authorization": `Bearer ${localStorage.getItem('token')}`
                       },
                       body: JSON.stringify({ ...selectedExpForPay, payment_type: finalPaymentType }),
                     });

                     if (res.ok) {
                       setShowPayModal(false);
                       fetchRecords();
                       alert("Fare paid successfully!");
                     }
                   } catch (err) { alert("Payment failed"); }
                   setLoading(false);
                }}>
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
