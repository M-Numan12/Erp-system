// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { Users, FolderGit2, Contact, Coins, Plus, Search, Edit, Trash2, X, Phone, Hash, CreditCard, ChevronLeft, ArrowUpCircle, ArrowDownCircle, ClipboardList, Printer } from "lucide-react";
import ActionMenu from '../components/ActionMenu';
import { AuthContext } from "../context/AuthContext";
import "../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/labours");

const emptyForm = { name: "", group_name: "", contact: "", rate_per_day: "", cnic: "" };

export default function Labours({ type }) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(type || (user?.role === 'admin' ? "" : user?.module_type || "Wholesale"));
  const [labours, setLabours] = useState([]);
  const [workHistory, setWorkHistory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null); // Which group card is clicked
  const [loading, setLoading] = useState(false);
  const [liveBalances, setLiveBalances] = useState({});
  const [banks, setBanks] = useState([]);

  // Payment disburse modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", notes: "", payment_type: "Cash" });

  // Log manual work modal
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [workForm, setWorkForm] = useState({ description: "", amount: "" });

  // Custom group input state
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [customGroup, setCustomGroup] = useState("");

  // Global payment modal states
  const [showGlobalPayModal, setShowGlobalPayModal] = useState(false);
  const [globalPayForm, setGlobalPayForm] = useState({ group_name: "", bill_id: "", amount: "", notes: "", payment_type: "Cash" });

  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    } else if (user?.module_type && user?.role !== 'admin') {
      setActiveTab(user.module_type);
    }
  }, [type, user?.module_type, user?.email]);

  const handleGlobalPayWages = async (e) => {
    e.preventDefault();
    const amt = parseFloat(globalPayForm.amount || 0);
    const getSelectedGlobalPaymentBalance = () => {
      if (globalPayForm.payment_type === 'Cash') return liveBalances['Cash'] || 0;
      const cleanBank = globalPayForm.payment_type.replace('Bank - ', '');
      return liveBalances[cleanBank] || 0;
    };
    const availableBalance = getSelectedGlobalPaymentBalance();

    if (amt > availableBalance) {
      alert("Insufficient Balance in selected account!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          group_name: globalPayForm.group_name,
          bill_id: globalPayForm.bill_id,
          amount: amt,
          notes: globalPayForm.notes || `Paid wages to ${globalPayForm.group_name} (Bill #${globalPayForm.bill_id || 'N/A'})`,
          payment_type: globalPayForm.payment_type,
          module_type: type || activeTab
        })
      });

      if (res.ok) {
        setShowGlobalPayModal(false);
        setGlobalPayForm({ group_name: "", bill_id: "", amount: "", notes: "", payment_type: "Cash" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBillIdChange = (val) => {
    const foundEntry = workHistory.find(h => h.bill_id && String(h.bill_id) === String(val));
    setGlobalPayForm(prev => ({
      ...prev,
      bill_id: val,
      group_name: foundEntry ? foundEntry.group_name : ""
    }));
  };

  const fetchData = async () => {
    if (!activeTab) return;
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem('token')}` };
      const [labRes, workRes, balRes, banksRes] = await Promise.all([
        fetch(`${API}?type=${activeTab}`, { headers }),
        fetch(`${API}/work-history?type=${activeTab}`, { headers }),
        fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, { headers }),
        fetch((API_BASE_URL + "/banks"), { headers })
      ]);
      const labData = await labRes.json();
      const workData = await workRes.json();
      const balData = await balRes.json();
      const banksData = await banksRes.json();

      const finalLabours = Array.isArray(labData) ? labData : [];
      const finalWork = Array.isArray(workData) ? workData : [];

      setLabours(finalLabours);
      setWorkHistory(finalWork);
      setLiveBalances(balData || {});
      const finalBanks = Array.isArray(banksData) ? banksData : [];
      setBanks(finalBanks);

      // Default payForm.payment_type & globalPayForm.payment_type based on loaded balances
      const balances = balData || {};
      let firstOption = "Cash";
      if ((balances["Cash"] || 0) > 0) {
        firstOption = "Cash";
      } else {
        const positiveBanks = finalBanks.filter(b => {
          const name = b.bank_name.toLowerCase().trim();
          if (name === 'cash' || name === 'cash account') return false;
          const digits = b.account_number ? b.account_number.slice(-4) : '';
          const key = `${b.bank_name} ${digits ? `(****${digits})` : ''}`;
          return (balances[key] || 0) > 0;
        });
        if (positiveBanks.length > 0) {
          const b = positiveBanks[0];
          const digits = b.account_number ? b.account_number.slice(-4) : '';
          firstOption = `Bank - ${b.bank_name} ${digits ? `(****${digits})` : ''}`;
        }
      }
      setPayForm(prev => ({ ...prev, payment_type: firstOption }));
      setGlobalPayForm(prev => ({ ...prev, payment_type: firstOption }));

      localStorage.setItem(`cache_labours_${activeTab}`, JSON.stringify(finalLabours));
      localStorage.setItem(`cache_workhistory_${activeTab}`, JSON.stringify(finalWork));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTab) return;
    try {
      const cachedLabours = localStorage.getItem(`cache_labours_${activeTab}`);
      const cachedWork = localStorage.getItem(`cache_workhistory_${activeTab}`);
      if (cachedLabours) setLabours(JSON.parse(cachedLabours));
      if (cachedWork) setWorkHistory(JSON.parse(cachedWork));
    } catch (e) { console.error(e); }
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API}/${editId}` : API;
      
      const finalGroup = isNewGroup ? customGroup : form.group_name;
      if (!finalGroup) {
        alert("Please enter or select a group name!");
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...form, group_name: finalGroup, module_type: type || activeTab })
      });

      if (res.ok) {
        setShowModal(false);
        setForm(emptyForm);
        setCustomGroup("");
        setIsNewGroup(false);
        setEditId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this labour?")) return;
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (labour) => {
    setForm(labour);
    setEditId(labour.id);
    setIsNewGroup(false);
    setShowModal(true);
  };

  const handlePayWages = async (e) => {
    e.preventDefault();
    const amt = parseFloat(payForm.amount || 0);
    const getSelectedPaymentBalance = () => {
      if (payForm.payment_type === 'Cash') return liveBalances['Cash'] || 0;
      const cleanBank = payForm.payment_type.replace('Bank - ', '');
      return liveBalances[cleanBank] || 0;
    };
    const availableBalance = getSelectedPaymentBalance();

    if (amt > availableBalance) {
      return; // Blocked dynamically by UI inline warning
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          group_name: selectedGroup,
          amount: amt,
          notes: payForm.notes,
          payment_type: payForm.payment_type,
          module_type: type || activeTab
        })
      });

      if (res.ok) {
        setShowPayModal(false);
        setPayForm({ amount: "", notes: "", payment_type: "Cash" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWork = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/work-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          group_name: selectedGroup,
          description: workForm.description,
          amount: workForm.amount,
          module_type: type || activeTab
        })
      });

      if (res.ok) {
        setShowWorkModal(false);
        setWorkForm({ description: "", amount: "" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique groups list
  const existingGroups = [...new Set(labours.map(l => l.group_name))];

  // Group Calculations
  const groupsStats = existingGroups.map(group => {
    const workers = labours.filter(l => l.group_name === group);
    const history = workHistory.filter(h => h.group_name === group);
    
    // Unpaid wages total (earned through loading/unloading work minus paid amount)
    const earned = history.filter(h => h.status === 'Unpaid').reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);
    const paid = history.filter(h => h.status === 'Paid').reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);
    const balance = earned - paid;

    return {
      name: group,
      workersCount: workers.length,
      balance,
      history
    };
  });

  const applyLedgerFilter = (filterKey) => {
    setLedgerFilter(filterKey);
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    if (filterKey === 'all') {
      setLedgerFrom(""); setLedgerTo("");
    } else if (filterKey === 'today') {
      const t = today.toLocaleDateString('en-CA');
      setLedgerFrom(t); setLedgerTo(t);
    } else if (filterKey === 'yesterday') {
      const y = new Date(today); y.setDate(today.getDate() - 1);
      const yt = y.toLocaleDateString('en-CA');
      setLedgerFrom(yt); setLedgerTo(yt);
    } else if (filterKey === 'week') {
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
      setLedgerFrom(weekAgo.toLocaleDateString('en-CA'));
      setLedgerTo(today.toLocaleDateString('en-CA'));
    } else if (filterKey === 'month') {
      setLedgerFrom(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
      setLedgerTo(today.toLocaleDateString('en-CA'));
    }
  };

  const selectedGroupDetails = groupsStats.find(g => g.name === selectedGroup);
  const selectedGroupLabours = labours.filter(l => l.group_name === selectedGroup);

  const filteredGroupHistory = useMemo(() => {
    if (!selectedGroupDetails) return [];
    let arr = selectedGroupDetails.history || [];
    if (ledgerFilter === 'all') return arr;
    if (ledgerFilter === 'custom' && (!ledgerFrom || !ledgerTo)) return arr;
    return arr.filter(row => {
      if(!row.created_at) return false;
      const rowDateStr = new Date(row.created_at).toLocaleDateString('en-CA');
      return rowDateStr >= ledgerFrom && rowDateStr <= ledgerTo;
    });
  }, [selectedGroupDetails, ledgerFilter, ledgerFrom, ledgerTo]);

  // Stats Calculations
  const totalLabours = labours.length;
  const totalOutstandingWages = groupsStats.reduce((sum, g) => sum + (g.balance > 0 ? g.balance : 0), 0);
  const getSelectedPaymentBalance = () => {
    if (payForm.payment_type === 'Cash') return liveBalances['Cash'] || 0;
    const cleanBank = payForm.payment_type.replace('Bank - ', '');
    return liveBalances[cleanBank] || 0;
  };
  const cashAvailable = getSelectedPaymentBalance();
  const isWagePayInsufficient = parseFloat(payForm.amount || 0) > cashAvailable;

  const getSelectedGlobalPaymentBalance = () => {
    if (globalPayForm.payment_type === 'Cash') return liveBalances['Cash'] || 0;
    const cleanBank = globalPayForm.payment_type.replace('Bank - ', '');
    return liveBalances[cleanBank] || 0;
  };
  const globalCashAvailable = getSelectedGlobalPaymentBalance();
  const isGlobalWagePayInsufficient = parseFloat(globalPayForm.amount || 0) > globalCashAvailable;

  // If Admin and no counter selected, show selection screen
  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's labour management you want to view</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">🧱</div>
            <h3>Wholesale</h3>
            <span>Main Warehouse</span>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">🏗️</div>
            <h3>Retail 1</h3>
            <span>Counter A</span>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🔲</div>
            <h3>Retail 2</h3>
            <span>Counter B</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          {selectedGroup && (
            <button className="btn-icon back-btn" onClick={() => setSelectedGroup(null)} style={{marginRight: '15px', background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="module-icon expense-icon" style={{background: '#e0f2fe', color: '#0284c7'}}><Users size={28} /></div>
          <div>
            <h1>{selectedGroup ? `Group: ${selectedGroup}` : 'Labour Tracking & Groups'}</h1>
            <p>{selectedGroup ? `Managing operations and wage ledger for ${selectedGroup}` : 'Organize labor, record group loading/unloading work, and pay wages'}</p>
          </div>
        </div>

        {user?.role === 'admin' && !user?.module_type && !type && (
          <div className="counter-switcher">
            <button className={activeTab === 'Wholesale' ? 'active' : ''} onClick={() => setActiveTab('Wholesale')}>Wholesale</button>
            <button className={activeTab === 'Retail 1' ? 'active' : ''} onClick={() => setActiveTab('Retail 1')}>Retail 1</button>
            <button className={activeTab === 'Retail 2' ? 'active' : ''} onClick={() => setActiveTab('Retail 2')}>Retail 2</button>
          </div>
        )}

        <div style={{display: 'flex', gap: '10px'}}>
          {!selectedGroup && (
            <button className="btn-primary" style={{background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '6px'}} onClick={() => { setGlobalPayForm({ group_name: "", bill_id: "", amount: "", notes: "", payment_type: "Cash" }); setShowGlobalPayModal(true); }}>
              <Coins size={18} /> Send Labour Payment
            </button>
          )}
          <button className="btn-primary" style={{display: 'flex', alignItems: 'center', gap: '6px'}} onClick={() => { setForm(emptyForm); setEditId(null); setIsNewGroup(false); setShowModal(true); }}>
            <Plus size={18} /> Add New Labour
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="stats-grid-pos">
        <div className="pos-stat-card">
          <div className="icon blue"><Users size={24} /></div>
          <div className="info">
            <span className="label">Total Labours</span>
            <span className="value">{totalLabours} Workers</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon orange"><FolderGit2 size={24} /></div>
          <div className="info">
            <span className="label">Active Groups</span>
            <span className="value">{groupsStats.length} Teams</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><Coins size={24} /></div>
          <div className="info">
            <span className="label">Outstanding Payable</span>
            <span className="value">Rs. {totalOutstandingWages.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {!selectedGroup ? (
        // 1. Group Cards Grid View
        <div>
          <h2 style={{fontSize: '1.4rem', color: '#1e293b', marginBottom: '15px', fontWeight: 700}}>Labour Groups & Teams</h2>
          <div className="selection-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', display: 'grid'}}>
            {groupsStats.length === 0 ? (
              <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', color: '#64748b'}}>
                No labor groups found. Click "Add New Labour" and create a group to start!
              </div>
            ) : (
              groupsStats.map(g => (
                <div key={g.name} className="selection-card" onClick={() => setSelectedGroup(g.name)} style={{padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{background: '#f0f9ff', padding: '10px', borderRadius: '8px', color: '#0369a1', display: 'flex', alignItems: 'center'}}><Users size={24} /></div>
                    <span style={{background: g.balance > 0 ? '#fef2f2' : '#f0fdf4', color: g.balance > 0 ? '#ef4444' : '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600}}>
                      {g.balance > 0 ? `Payable: Rs. ${g.balance.toLocaleString()}` : 'Cleared'}
                    </span>
                  </div>
                  <div>
                    <h3 style={{fontSize: '1.25rem', color: '#1e293b', fontWeight: 700, margin: 0}}>{g.name}</h3>
                    <p style={{color: '#64748b', fontSize: '0.9rem', margin: '5px 0 0 0'}}>{g.workersCount} Workers registered</p>
                  </div>
                  <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b'}}>
                    <span>Outstanding Wages:</span>
                    <strong style={{color: g.balance > 0 ? '#ef4444' : '#10b981'}}>Rs. {g.balance.toLocaleString()}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // 2. Group Detail Screen
        <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
          {/* Action buttons inside detail */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', gap: '15px'}}>
            <div>
              <h2 style={{margin: 0, fontSize: '1.35rem', color: '#1e293b', fontWeight: 700}}>{selectedGroup} Overview</h2>
              <p style={{margin: '5px 0 0 0', color: '#ef4444', fontWeight: 600}}>Outstanding Payable: Rs. {(selectedGroupDetails?.balance || 0).toLocaleString()}</p>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
              <button className="btn-primary" onClick={() => setShowWorkModal(true)} style={{background: '#0f766e', borderColor: '#0f766e', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <ClipboardList size={18} /> Record Work Entry
              </button>
              {(selectedGroupDetails?.balance || 0) > 0 && (
                <button className="btn-primary" onClick={() => setShowPayModal(true)} style={{background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Coins size={18} /> Pay Wages
                </button>
              )}
            </div>
          </div>

          {/* Group Labours List */}
          <div style={{background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1'}}>
            <h3 style={{fontSize: '1.15rem', color: '#1e293b', fontWeight: 700, marginBottom: '15px'}}>Registered Labours in {selectedGroup}</h3>
            <table className="module-table">
              <thead>
                <tr>
                  <th>Labour Name</th>
                  <th>CNIC Number</th>
                  <th>Contact Number</th>
                  <th style={{textAlign: 'center'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedGroupLabours.length === 0 ? (
                  <tr><td colSpan="4" className="empty-msg">No labors found inside this group.</td></tr>
                ) : (
                  selectedGroupLabours.map(l => (
                    <tr key={l.id}>
                      <td style={{fontWeight: 600, color: '#1e293b'}}>{l.name}</td>
                      <td>{l.cnic || "N/A"}</td>
                      <td>{l.contact || "N/A"}</td>
                      <td style={{textAlign: 'center'}}>
                        <ActionMenu 
                          onEdit={() => handleEdit(l)} 
                          onDelete={() => handleDelete(l.id)} 
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

           {/* Group Wage & Work History Ledger */}
          <div style={{background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px', flexWrap:'wrap', gap:'15px'}}>
               <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                 <h3 style={{fontSize: '1.15rem', color: '#1e293b', fontWeight: 700, margin: 0}}>{selectedGroup} Activity Ledger</h3>
                 <button className="btn-secondary no-print" onClick={() => window.print()} style={{padding: '6px 12px', display:'flex', alignItems:'center', gap:'6px'}}>
                   <Printer size={16} /> Print Ledger
                 </button>
               </div>
               
               {/* Date Filter Bar */}
               <div className="profit-filter-bar no-print" style={{padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                  <span className="filter-label" style={{fontWeight: 600, color: '#64748b', fontSize: '0.9rem'}}>📅 Period:</span>
                  {[
                    { key:'all',   label:'All Time' },
                    { key:'today', label:'Today' },
                    { key:'yesterday', label:'Yesterday' },
                    { key:'week',  label:'7 Days' },
                    { key:'month', label:'Month' },
                    { key:'custom',label:'Custom' },
                  ].map(f => (
                    <button key={f.key} onClick={() => applyLedgerFilter(f.key)}
                      className={`filter-btn ${ledgerFilter === f.key ? 'active' : ''}`}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem',
                        background: ledgerFilter === f.key ? '#3b82f6' : 'white',
                        color: ledgerFilter === f.key ? 'white' : '#64748b', cursor: 'pointer'
                      }}>
                      {f.label}
                    </button>
                  ))}
                  {ledgerFilter === 'custom' && (
                    <div className="custom-date-row" style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                      <input type="date" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} style={{padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem'}} />
                      <span className="sep">→</span>
                      <input type="date" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} style={{padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem'}} />
                    </div>
                  )}
               </div>
            </div>

            {/* Print Only Header */}
            <div className="ledger-report print-only" style={{padding: '20px', color: 'black'}}>
              <div style={{textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px'}}>
                {activeTab === 'Retail 2' ? (
                  <>
                    <h2 style={{margin: 0}}>DATA WALEY</h2>
                    <h3 style={{fontSize: '15px', fontWeight: 'normal', margin: '2px 0 8px 0'}}>RETAIL 2</h3>
                    <div style={{fontSize: '12px', margin: '5px 0'}}>
                      <p style={{margin: '2px 0'}}>Waqar Butt: 0311-4105840</p>
                      <p style={{margin: '2px 0'}}>Mhd Aiss: 0335-1430216</p>
                      <p style={{margin: '2px 0'}}>Saifullah: 0333-4714628</p>
                    </div>
                    <p style={{fontSize: '11px', margin: '5px 0'}}>
                      Ada Treadywali Stop Main Jaranwala Road,<br/>
                      District Sheikupura.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 style={{margin: 0}}>DATA WALEY</h2>
                    <h3 style={{fontSize: '15px', fontWeight: 'normal', margin: '2px 0 8px 0'}}>CEMENT DEALER</h3>
                    <div style={{fontSize: '12px', margin: '5px 0'}}>
                      <p style={{margin: '2px 0'}}>Tariq Mehmood: 0300-4269347</p>
                      <p style={{margin: '2px 0'}}>Mian Shehroz: 0335-4294300</p>
                      <p style={{margin: '2px 0'}}>Ziaullah: 0322-4295106</p>
                    </div>
                    <p style={{fontSize: '11px', margin: '5px 0'}}>
                      12-KM Main Lahore Sheikhupura Road,<br/>
                      Ada Kot Abdul Malik.
                    </p>
                  </>
                )}
                <p style={{margin: '10px 0 5px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '5px'}}>Labour Group Ledger Report</p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '14px'}}>
                  <span><strong>Labour Group:</strong> {selectedGroup}</span>
                  <span><strong>Workers:</strong> {selectedGroupDetails?.workersCount || 0}</span>
                  <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Description</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Work Status</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Amount Earned (+)</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Amount Paid (-)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupHistory.length === 0 ? (
                    <tr><td colSpan="5" style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center'}}>No work entries or wage dispatches logged for this period.</td></tr>
                  ) : (
                    filteredGroupHistory.map(h => (
                      <tr key={h.id}>
                        <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{new Date(h.created_at).toLocaleDateString()}</td>
                        <td style={{border: '1px solid #cbd5e1', padding: '8px', fontWeight: 600}}>{h.description}</td>
                        <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{h.status}</td>
                        <td style={{border: '1px solid #cbd5e1', padding: '8px', color: '#c5221f', fontWeight: 700}}>{h.status === 'Unpaid' ? `Rs. ${parseFloat(h.amount).toLocaleString()}` : '—'}</td>
                        <td style={{border: '1px solid #cbd5e1', padding: '8px', color: '#137333', fontWeight: 700}}>{h.status === 'Paid' ? `Rs. ${parseFloat(h.amount).toLocaleString()}` : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end'}}>
                <div style={{width: '300px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <strong>Total Earned:</strong>
                    <span>Rs. {filteredGroupHistory.filter(h => h.status === 'Unpaid').reduce((sum, h) => sum + parseFloat(h.amount || 0), 0).toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <strong>Total Paid:</strong>
                    <span>Rs. {filteredGroupHistory.filter(h => h.status === 'Paid').reduce((sum, h) => sum + parseFloat(h.amount || 0), 0).toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '8px'}}>
                    <strong>Period Balance:</strong>
                    <strong>Rs. {(filteredGroupHistory.filter(h => h.status === 'Unpaid').reduce((sum, h) => sum + parseFloat(h.amount || 0), 0) - filteredGroupHistory.filter(h => h.status === 'Paid').reduce((sum, h) => sum + parseFloat(h.amount || 0), 0)).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Work Status</th>
                  <th>Amount Earned (+)</th>
                  <th>Amount Paid (-)</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroupHistory.length === 0 ? (
                  <tr><td colSpan="5" className="empty-msg">No work entries or wage dispatches logged for this period.</td></tr>
                ) : (
                  filteredGroupHistory.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.created_at).toLocaleDateString()}</td>
                      <td style={{fontWeight: 600}}>{h.description}</td>
                      <td>
                        <span style={{background: h.status === 'Paid' ? '#e6f4ea' : '#fce8e6', color: h.status === 'Paid' ? '#137333' : '#c5221f', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600}}>
                          {h.status}
                        </span>
                      </td>
                      <td style={{color: '#c5221f', fontWeight: 700}}>{h.status === 'Unpaid' ? `Rs. ${parseFloat(h.amount).toLocaleString()}` : '—'}</td>
                      <td style={{color: '#137333', fontWeight: 700}}>{h.status === 'Paid' ? `Rs. ${parseFloat(h.amount).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Labour */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>{editId ? "Edit Labour Info" : "Register New Labour"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="custom-form">
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Labour Full Name *</label>
                <div className="input-wrapper">
                  <Contact size={18} />
                  <input type="text" required placeholder="e.g. Muhammad Ali" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Labour CNIC Number *</label>
                <div className="input-wrapper">
                  <CreditCard size={18} />
                  <input type="text" required placeholder="e.g. 35202-1234567-1" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Contact Number (Optional)</label>
                <div className="input-wrapper">
                  <Phone size={18} />
                  <input type="text" placeholder="e.g. 03001234567" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                </div>
              </div>



              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Labour Group / Team *</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {!isNewGroup ? (
                    <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                      <select 
                        value={form.group_name} 
                        onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                        style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}}
                        required={!isNewGroup}
                      >
                        <option value="">-- Select Existing Group --</option>
                        {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsNewGroup(true)} style={{background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontWeight: 600, color: '#0284c7'}}>New</button>
                    </div>
                  ) : (
                    <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                      <input 
                        type="text" 
                        placeholder="Type New Group Name..." 
                        value={customGroup} 
                        onChange={(e) => setCustomGroup(e.target.value)} 
                        style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}}
                        required={isNewGroup}
                      />
                      <button type="button" onClick={() => setIsNewGroup(false)} style={{background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontWeight: 600, color: '#ef4444'}}>List</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{background: '#0284c7', borderColor: '#0284c7'}} disabled={loading}>
                  {loading ? "Processing..." : "Save Labour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pay Wages */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Pay Wages to {selectedGroup}</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handlePayWages} className="custom-form">
               <div className="form-group" style={{marginBottom: '15px'}}>
                 <label>Payment Method / Account *</label>
                 <div className="input-wrapper">
                   <CreditCard size={18} />
                   <select 
                     value={payForm.payment_type} 
                     onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value })}
                     style={{width: '100%', padding: '12px 10px', borderRadius: '8px', border: 'none', outline: 'none', background: 'transparent'}}
                     required
                   >
                     <option value="Cash">Cash Account (Main Counter)</option>
                     {banks.filter(b => {
                       const name = b.bank_name.toLowerCase().trim();
                       if (name === 'cash' || name === 'cash account') return false;
                       return (b.module_type || 'Wholesale') === activeTab;
                     }).map(b => {
                       const digits = b.account_number ? b.account_number.slice(-4) : '';
                       return <option key={b.id} value={`Bank - ${b.bank_name} ${digits ? `(****${digits})` : ''}`}>{b.bank_name} - {b.account_title}</option>;
                     })}
                   </select>
                 </div>
               </div>

               <div style={{background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between'}}>
                 <span style={{fontWeight: 600, color: '#15803d'}}>Available Balance:</span>
                 <span style={{fontWeight: 700, color: '#15803d'}}>Rs. {cashAvailable.toLocaleString()}</span>
               </div>

               <div className="form-group" style={{marginBottom: '15px'}}>
                 <label>Amount Disbursed (Rs.) *</label>
                 <div className="input-wrapper">
                   <Coins size={18} />
                   <input type="number" required placeholder="0.00" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                 </div>
               </div>

               {isWagePayInsufficient && (
                 <div style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                   ⚠️ Insufficient Balance! Available: Rs. {cashAvailable.toLocaleString()}
                 </div>
               )}

               <div className="form-group" style={{marginBottom: '20px'}}>
                 <label>Notes / References *</label>
                 <div className="input-wrapper">
                   <ArrowUpCircle size={18} />
                   <input type="text" required placeholder="e.g. Wages Paid" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                 </div>
               </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{background: '#10b981', borderColor: '#10b981'}} disabled={loading || isWagePayInsufficient}>
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Work Entry */}
      {showWorkModal && (
        <div className="modal-overlay" onClick={() => setShowWorkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Log Work Entry for {selectedGroup}</h3>
              <button className="modal-close" onClick={() => setShowWorkModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleLogWork} className="custom-form">
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Work Description *</label>
                <div className="input-wrapper">
                  <ClipboardList size={18} />
                  <input type="text" required placeholder="e.g. Loaded 200 bags of cement for Block A" value={workForm.description} onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Wages Earned for this Work (Rs.) *</label>
                <div className="input-wrapper">
                  <Hash size={18} />
                  <input type="number" required placeholder="e.g. 3500" value={workForm.amount} onChange={(e) => setWorkForm({ ...workForm, amount: e.target.value })} />
                </div>
              </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowWorkModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{background: '#0f766e', borderColor: '#0f766e'}} disabled={loading}>
                  {loading ? "Processing..." : "Save Work Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Send Labour Payment (Global) */}
      {showGlobalPayModal && (
        <div className="modal-overlay" onClick={() => setShowGlobalPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Send Labour Payment</h3>
              <button className="modal-close" onClick={() => setShowGlobalPayModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGlobalPayWages} className="custom-form">
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Bill / Invoice Number *</label>
                <div className="input-wrapper">
                  <Hash size={18} />
                  <input type="text" required placeholder="e.g. 10452" value={globalPayForm.bill_id} onChange={(e) => handleBillIdChange(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Select Labour Group *</label>
                <div className="input-wrapper">
                  <Users size={18} />
                  <select 
                    value={globalPayForm.group_name} 
                    onChange={(e) => setGlobalPayForm({ ...globalPayForm, group_name: e.target.value })}
                    style={{width: '100%', padding: '12px 10px', borderRadius: '8px', border: 'none', outline: 'none', background: 'transparent'}}
                    required
                  >
                    <option value="">{globalPayForm.group_name ? `Auto-selected: ${globalPayForm.group_name}` : "-- Choose Team / Group --"}</option>
                    {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Payment Method / Account *</label>
                <div className="input-wrapper">
                  <CreditCard size={18} />
                  <select 
                    value={globalPayForm.payment_type} 
                    onChange={(e) => setGlobalPayForm({ ...globalPayForm, payment_type: e.target.value })}
                    style={{width: '100%', padding: '12px 10px', borderRadius: '8px', border: 'none', outline: 'none', background: 'transparent'}}
                    required
                  >
                    <option value="Cash">Cash Account (Main Counter)</option>
                    {banks.filter(b => {
                      const name = b.bank_name.toLowerCase().trim();
                      if (name === 'cash' || name === 'cash account') return false;
                      return (b.module_type || 'Wholesale') === activeTab;
                    }).map(b => {
                      const digits = b.account_number ? b.account_number.slice(-4) : '';
                      return <option key={b.id} value={`Bank - ${b.bank_name} ${digits ? `(****${digits})` : ''}`}>{b.bank_name} - {b.account_title}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div style={{background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between'}}>
                <span style={{fontWeight: 600, color: '#15803d'}}>Available Balance:</span>
                <span style={{fontWeight: 700, color: '#15803d'}}>Rs. {globalCashAvailable.toLocaleString()}</span>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Amount Paid (Rs.) *</label>
                <div className="input-wrapper">
                  <Coins size={18} />
                  <input type="number" required placeholder="0.00" value={globalPayForm.amount} onChange={(e) => setGlobalPayForm({ ...globalPayForm, amount: e.target.value })} />
                </div>
              </div>

              {isGlobalWagePayInsufficient && (
                <div style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  ⚠️ Insufficient Balance! Available: Rs. {globalCashAvailable.toLocaleString()}
                </div>
              )}

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Notes / References *</label>
                <div className="input-wrapper">
                  <ArrowUpCircle size={18} />
                  <input type="text" required placeholder="e.g. Paid Loading Charges" value={globalPayForm.notes} onChange={(e) => setGlobalPayForm({ ...globalPayForm, notes: e.target.value })} />
                </div>
              </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowGlobalPayModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{background: '#10b981', borderColor: '#10b981'}} disabled={loading || isGlobalWagePayInsufficient}>
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
