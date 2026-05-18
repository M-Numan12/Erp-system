// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
  Users, Plus, Pencil, Trash2, X, Search, 
  CreditCard, Calendar, UserCheck, Banknote, Briefcase, Tag, Info, CircleDollarSign, Printer, ArrowRight
} from "lucide-react";
import ActionMenu from '../components/ActionMenu';
import { AuthContext } from "../context/AuthContext";
import "../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/salary");

const emptyForm = {
  employee_name: "",
  designation: "",
  cnic: "",
  salary_amount: "",
  joining_date: new Date().toLocaleDateString('en-CA'),
  status: "Active",
  notes: ""
};

export default function Salary({ type }) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(type || (user?.role === 'admin' ? "" : user?.module_type || "Wholesale"));

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    } else if (user?.module_type && user?.role !== 'admin') {
      setActiveTab(user.module_type);
    }
  }, [type, user?.module_type, user?.email]);

  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Payment related states
  const [banks, setBanks] = useState([]);
  const [liveBalances, setLiveBalances] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    staff_id: "",
    employee_name: "",
    amount: "",
    transaction_type: "Salary", // Salary, Advance Given, Advance Returned
    advance_return_type: "Direct Cash", // "Direct Cash" or "Salary Deduction"
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    deduction_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    payment_date: new Date().toLocaleDateString('en-CA'),
    payment_type: "Cash",
    notes: ""
  });
  const [activeDeductions, setActiveDeductions] = useState([]);
  
  // Receipt Modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const fetchInitialData = async () => {
    if (!activeTab) return;
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem('token')}` };
      const [banksRes, balRes] = await Promise.all([
        fetch(`${API_BASE_URL}/banks`, { headers }),
        fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, { headers })
      ]);
      if (banksRes.ok) {
        const d = await banksRes.json();
        setBanks(Array.isArray(d) ? d : []);
      }
      if (balRes.ok) {
        setLiveBalances(await balRes.json());
      }
    } catch (err) { console.error(err); }
  };

  const fetchRecords = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalRecs = Array.isArray(data) ? data : [];
      setRecords(finalRecs);
      localStorage.setItem(`cache_salary_${activeTab}`, JSON.stringify(finalRecs));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    if (!activeTab) return;
    try {
      const cached = localStorage.getItem(`cache_salary_${activeTab}`);
      if (cached) setRecords(JSON.parse(cached));
    } catch (e) { console.error(e); }
    fetchRecords(); 
    fetchInitialData();
  }, [activeTab]);

  // Refetch balances whenever modal pops up
  useEffect(() => {
    if (showPayModal) {
      fetchInitialData();
    }
  }, [showPayModal]);

  // Automatically fetch pending scheduled deductions for selected month to calculate net salary dynamically
  useEffect(() => {
    const fetchDeductions = async () => {
      if (payForm.transaction_type === 'Salary' && payForm.staff_id && payForm.month) {
        try {
          const res = await fetch(`${API}/deductions/pending/${payForm.staff_id}?month=${payForm.month}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setActiveDeductions(data);
            
            // Recalculate recommended net salary
            const staff = records.find(r => String(r.id) === String(payForm.staff_id));
            const baseSalary = parseFloat(staff?.amount || 0);
            const totalScheduledCuts = data.reduce((sum, d) => sum + parseFloat(d.amount), 0);
            const calculatedNet = Math.max(0, baseSalary - totalScheduledCuts);
            
            setPayForm(prev => ({ ...prev, amount: calculatedNet.toString() }));
          }
        } catch (err) { console.error(err); }
      } else {
        setActiveDeductions([]);
      }
    };
    fetchDeductions();
  }, [payForm.staff_id, payForm.month, payForm.transaction_type, records]);

  const getSelectedMethodBalance = () => {
    const method = payForm.payment_type;
    if (method === 'Cash') return liveBalances['Cash'] || 0;
    const cleanBank = method.replace('Bank - ', '');
    return liveBalances[cleanBank] || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API}/${editId}` : API;
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...form, amount: form.salary_amount, module_type: activeTab }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchRecords();
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSalaryPayment = async (e) => {
    e.preventDefault();
    if (!payForm.staff_id || !payForm.amount) return alert("Please fill the form completely");
    
    const balance = getSelectedMethodBalance();
    const amount = parseFloat(payForm.amount);
    
    // 💎 1. SCHEDULER FLOW: Handle salary deduction commitment without affecting actual cash now
    if (payForm.transaction_type === 'Advance Returned' && payForm.advance_return_type === 'Salary Deduction') {
        setLoading(true);
        try {
          const res = await fetch(`${API}/deductions`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
              staff_id: payForm.staff_id, 
              amount: amount, 
              target_month: payForm.deduction_month, 
              notes: payForm.notes || 'Advance deduction' 
            }),
          });
          const responseData = await res.json();
          if (res.ok && responseData.success) {
            alert(`✅ Advance deduction of Rs. ${amount.toLocaleString()} successfully scheduled for the ${payForm.deduction_month} salary payment cycle!`);
            setShowPayModal(false);
            fetchRecords();
          } else {
            alert("Failed to register deduction.");
          }
        } catch (err) { console.error(err); }
        setLoading(false);
        return;
    }

    // 💎 2. DIRECT CASH FLOW: Execute payment immediately
    if (payForm.transaction_type !== 'Advance Returned') {
        if (amount > balance) {
            alert("Insufficient balance in selected account!");
            return;
        }
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/pay`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...payForm, module_type: activeTab }),
      });
      
      const responseData = await res.json();
      if (res.ok && responseData.success) {
        setShowPayModal(false);
        
        // Set receipt data to show printed bill
        setReceiptData(responseData.record);
        setShowReceipt(true);

        fetchRecords();
        fetchInitialData();
      } else {
        alert("Payment failed. Try again later.");
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openEdit = (rec) => {
    setForm({
      ...rec,
      salary_amount: rec.amount || "",
      joining_date: rec.joining_date ? rec.joining_date.split('T')[0] : new Date().toLocaleDateString('en-CA'),
    });
    setEditId(rec.id);
    setShowModal(true);
  };

  const openLedger = async (staff) => {
    setSelectedStaff(staff);
    setShowLedgerModal(true);
    setLoading(true);
    try {
      const res = await fetch(`${API}/ledger/${staff.employee_name}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLedgerData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const applyLedgerFilter = (filterKey) => {
    setLedgerFilter(filterKey);
    const today = new Date();
    if (filterKey === 'all') {
      setLedgerFrom(""); setLedgerTo("");
    } else if (filterKey === 'today') {
      const t = today.toLocaleDateString('en-CA');
      setLedgerFrom(t); setLedgerTo(t);
    } else if (filterKey === 'yesterday') {
      const y = new Date(); y.setDate(today.getDate() - 1);
      const yt = y.toLocaleDateString('en-CA');
      setLedgerFrom(yt); setLedgerTo(yt);
    } else if (filterKey === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
      setLedgerFrom(weekAgo.toLocaleDateString('en-CA'));
      setLedgerTo(today.toLocaleDateString('en-CA'));
    } else if (filterKey === 'month') {
      setLedgerFrom(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
      setLedgerTo(today.toLocaleDateString('en-CA'));
    }
  };

  const filteredLedgerData = useMemo(() => {
    let arr = Array.isArray(ledgerData) ? ledgerData : [];
    const sorted = [...arr].sort((a, b) => new Date(a.payment_date || a.created_at || 0) - new Date(b.created_at || b.created_at || 0));
    if (ledgerFilter === 'all') return sorted;
    if (ledgerFilter === 'custom' && (!ledgerFrom || !ledgerTo)) return sorted;
    return sorted.filter(row => {
      if(!row.payment_date) return false;
      const rowDateStr = new Date(row.payment_date).toLocaleDateString('en-CA');
      return rowDateStr >= ledgerFrom && rowDateStr <= ledgerTo;
    });
  }, [ledgerData, ledgerFilter, ledgerFrom, ledgerTo]);

  const openPaymentModal = (staff = null, type = "Salary") => {
    setPayForm({
        staff_id: staff ? staff.id : "",
        employee_name: staff ? staff.employee_name : "",
        amount: staff ? (type === 'Salary' ? staff.amount : "") : "",
        transaction_type: type,
        advance_return_type: "Direct Cash",
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        deduction_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        payment_date: new Date().toLocaleDateString('en-CA'),
        payment_type: "Cash",
        notes: ""
    });
    setShowPayModal(true);
  };

  const onPayFormStaffSelect = (e) => {
    const selectedId = e.target.value;
    const selectedStaffObj = records.find(r => String(r.id) === String(selectedId));
    if (selectedStaffObj) {
        setPayForm({
            ...payForm,
            staff_id: selectedStaffObj.id,
            employee_name: selectedStaffObj.employee_name,
            amount: payForm.transaction_type === 'Salary' ? selectedStaffObj.amount : ""
        });
    } else {
        setPayForm({ ...payForm, staff_id: "", employee_name: "", amount: "" });
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this employee profile?")) return;
    await fetch(`${API}/${id}`, { 
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    });
    fetchRecords();
  };

  const filtered = records.filter(r => 
    (r.employee_name || "").toLowerCase().includes(search.toLowerCase()) || 
    (r.cnic || "").includes(search)
  );

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.joining_date || a.created_at || 0);
      const dateB = new Date(b.joining_date || b.created_at || 0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      return (a.id || 0) - (b.id || 0);
    });
  }, [filtered]);

  // Print bill helper
  const printReceipt = () => {
    window.print();
  };

  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's staff & payroll records you want to manage</p>
        <div className="selection-grid">
          {['Wholesale', 'Retail 1', 'Retail 2'].map(tab => (
            <div key={tab} className="selection-card" onClick={() => setActiveTab(tab)}>
                <div className="icon-box">{tab === 'Wholesale' ? '👷' : '👨‍💼'}</div>
                <h3>{tab}</h3>
                <span>Management Hub</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="module-header no-print">
        <div className="module-title">
          <div className="module-icon salary-icon" style={{background: '#eff6ff', color: '#3b82f6'}}><Users size={28} /></div>
          <div>
            <h1>{activeTab} Payroll Center</h1>
            <p>Manage employee directory, disburse monthly salaries, track advances</p>
          </div>
        </div>

        <div style={{display:'flex', gap: '12px', alignItems:'center'}}>
            {user?.role === 'admin' && !user?.module_type && !type && (
            <div className="counter-switcher">
                {['Wholesale', 'Retail 1', 'Retail 2'].map(tab => (
                    <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
                ))}
            </div>
            )}
            <button className="btn-primary" style={{background: '#10b981', borderColor:'#10b981'}} onClick={() => openPaymentModal(null, "Salary")}>
                <Banknote size={18} /> Pay Monthly Salary
            </button>
            <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}>
                <Plus size={18} /> Add Staff
            </button>
        </div>
      </div>

      <div className="stats-grid-pos no-print">
        <div className="pos-stat-card">
          <div className="icon blue"><Briefcase size={24} /></div>
          <div className="info">
            <span className="label">Total Staff</span>
            <span className="value">{records.length} Employees</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><Banknote size={24} /></div>
          <div className="info">
            <span className="label">Aggregated Payroll Liability</span>
            <span className="value">Rs. {records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><CreditCard size={24} /></div>
          <div className="info">
            <span className="label">Active Staff Advances</span>
            <span className="value">Rs. {records.reduce((sum, r) => sum + parseFloat(r.advance_salary || 0), 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions no-print">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="module-table-container no-print">
        <table className="module-table">
          <thead>
            <tr>
              <th style={{width: '60px', textAlign: 'center'}}>S.No.</th>
              <th>Employee Info</th>
              <th>Role / Designation</th>
              <th>CNIC</th>
              <th>Monthly Salary</th>
              <th>Unpaid Advance</th>
              <th style={{textAlign: 'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.length === 0 ? (
              <tr><td colSpan="7" className="empty-msg">No registered employees found.</td></tr>
            ) : (
              sortedFiltered.map((r, index) => (
                <tr key={r.id}>
                  <td style={{textAlign: 'center', fontWeight: 'bold', color: '#64748b'}}>{index + 1}</td>
                  <td>
                    <div className="prod-main-info">
                      <span className="name">{r.employee_name}</span>
                      <span className="v-num"><Calendar size={12}/> Joined: {r.joining_date ? new Date(r.joining_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td><div className="type-tag office" style={{fontSize:'0.75rem', width:'fit-content'}}>{r.designation || 'Staff'}</div></td>
                  <td>{r.cnic || 'N/A'}</td>
                  <td className="bold">Rs. {parseFloat(r.amount || 0).toLocaleString()}</td>
                  <td style={{color: parseFloat(r.advance_salary) > 0 ? '#ef4444' : '#64748b', fontWeight: 600}}>
                      Rs. {parseFloat(r.advance_salary || 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <ActionMenu
                      onEdit={null}
                      onDelete={null}
                      extraItems={[
                        { label: 'Give Advance (Employee ko Dena)', icon: 'pi pi-arrow-right', command: () => openPaymentModal(r, 'Advance Given') },
                        { label: 'Advance Return (Wapas Lena / Deduct)', icon: 'pi pi-arrow-left', command: () => openPaymentModal(r, 'Advance Returned') },
                        { label: 'View Payment Ledger', icon: 'pi pi-book', command: () => openLedger(r) }
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Staff Detail/Register Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h3>{editId ? "Update Employee Info" : "Add New Staff"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="custom-form">
                <div className="form-group" style={{marginBottom:'12px'}}>
                    <label>Employee Full Name *</label>
                    <div className="input-wrapper">
                        <UserCheck size={18} />
                        <input type="text" required value={form.employee_name} placeholder="Enter name" onChange={(e) => setForm({...form, employee_name: e.target.value})} />
                    </div>
                </div>
                <div className="form-group" style={{marginBottom:'12px'}}>
                    <label>Role / Designation</label>
                    <div className="input-wrapper">
                        <Briefcase size={18} />
                        <input type="text" value={form.designation} placeholder="e.g. Driver, Sales" onChange={(e) => setForm({...form, designation: e.target.value})} />
                    </div>
                </div>
                <div className="form-group" style={{marginBottom:'12px'}}>
                    <label>CNIC Number</label>
                    <div className="input-wrapper">
                        <Tag size={18} />
                        <input type="text" placeholder="xxxxx-xxxxxxx-x" value={form.cnic} onChange={(e) => setForm({...form, cnic: e.target.value})} />
                    </div>
                </div>
                <div className="form-group" style={{marginBottom:'12px'}}>
                    <label>Monthly Salary Amount (Rs.) *</label>
                    <div className="input-wrapper">
                        <CircleDollarSign size={18} />
                        <input type="number" required value={form.salary_amount} placeholder="0" onChange={(e) => setForm({...form, salary_amount: e.target.value})} />
                    </div>
                </div>
                <div className="form-group" style={{marginBottom:'15px'}}>
                    <label>Joining Date</label>
                    <input type="date" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}} value={form.joining_date} onChange={(e) => setForm({...form, joining_date: e.target.value})} />
                </div>
                
                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Employee"}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Salary & Advance Payment */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '480px'}}>
            <div className="modal-header">
              <h3>
                  {payForm.transaction_type === 'Salary' ? '💸 Disburse Monthly Salary' : 
                   payForm.transaction_type === 'Advance Given' ? '📤 Give Advance to Employee (Dena)' : 
                   '📥 Return / Deduct Advance (Wapas Lena)'}
              </h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSalaryPayment} className="custom-form">
                
                {/* Select Employee Field - MUST BE READ-ONLY TEXT IF ROW SELECTED */}
                <div className="form-group" style={{marginBottom:'15px'}}>
                    <label>Employee Name</label>
                    {payForm.staff_id && records.some(r => String(r.id) === String(payForm.staff_id)) ? (
                        <div style={{width:'100%', padding:'12px 15px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'#f1f5f9', color:'#475569', fontWeight:700, fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'8px'}}>
                             <UserCheck size={16}/> {payForm.employee_name}
                        </div>
                    ) : (
                        <select 
                            style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1'}}
                            required value={payForm.staff_id} onChange={onPayFormStaffSelect}
                        >
                            <option value="">-- Choose Staff Member --</option>
                            {records.map(r => <option key={r.id} value={r.id}>{r.employee_name} ({r.designation})</option>)}
                        </select>
                    )}
                </div>

                {/* Live outstanding information block */}
                {payForm.staff_id && (
                   <div style={{background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px', fontSize: '0.85rem'}}>
                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                           <span style={{color:'#64748b'}}>Standard Monthly Salary:</span>
                           <strong style={{color:'#0f172a'}}>Rs. {parseFloat(records.find(r => String(r.id) === String(payForm.staff_id))?.amount || 0).toLocaleString()}</strong>
                       </div>
                       <div style={{display:'flex', justifyContent:'space-between'}}>
                           <span style={{color:'#ef4444'}}>Current Active Advance Balance:</span>
                           <strong style={{color:'#b91c1c', fontWeight:700}}>Rs. {parseFloat(records.find(r => String(r.id) === String(payForm.staff_id))?.advance_salary || 0).toLocaleString()}</strong>
                       </div>
                   </div>
                )}

                {/* TRANSACTION CONDITIONAL FIELD BUNDLES */}

                {/* CASE A: Disbursing Monthly Salary */}
                {payForm.transaction_type === 'Salary' && (
                    <>
                        <div className="form-group" style={{marginBottom:'15px'}}>
                            <label>Select Target Month *</label>
                            <select style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} 
                                value={payForm.month} onChange={(e) => setPayForm({...payForm, month: e.target.value})}>
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() - i);
                                    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                                    return <option key={label} value={label}>{label}</option>;
                                })}
                            </select>
                        </div>

                        {/* 🛡️ HIGH VISIBILITY DEDUCTION ENGINE BOX */}
                        {activeDeductions.length > 0 && (
                            <div style={{background: '#fffbeb', border:'1.5px dashed #f59e0b', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontSize:'0.88rem'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'6px', color:'#d97706', fontWeight:700, marginBottom:'8px'}}>
                                    <Info size={16}/> PRE-SCHEDULED ADVANCE DEDUCTION DETECTED!
                                </div>
                                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', color:'#4b5563'}}>
                                        <span>Base Pay rate:</span><span>Rs. {parseFloat(records.find(r => String(r.id) === String(payForm.staff_id))?.amount || 0).toLocaleString()}</span>
                                    </div>
                                    {activeDeductions.map((dec, di) => (
                                        <div key={di} style={{display:'flex', justifyContent:'space-between', color:'#dc2626', fontWeight:600}}>
                                            <span>(-) Deducted Advance Cut ({dec.notes || 'Adjust'}):</span>
                                            <span>Rs. {parseFloat(dec.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div style={{borderTop:'1px solid #fcd34d', marginTop:'5px', paddingTop:'5px', display:'flex', justifyContent:'space-between', fontWeight:800, color:'#166534', fontSize:'1rem'}}>
                                        <span>Net Cash Payable:</span>
                                        <span>Rs. {Math.max(0, parseFloat(records.find(r => String(r.id) === String(payForm.staff_id))?.amount || 0) - activeDeductions.reduce((sum, d) => sum + parseFloat(d.amount), 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* CASE B: Receiving Advance (Offers direct return vs schedule deduction) */}
                {payForm.transaction_type === 'Advance Returned' && (
                    <>
                        <div className="form-group" style={{marginBottom:'15px'}}>
                            <label>Receive Mode Type *</label>
                            <select 
                                style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #3b82f6', background:'#eff6ff', fontWeight:700, color:'#1d4ed8'}}
                                value={payForm.advance_return_type}
                                onChange={(e) => setPayForm({...payForm, advance_return_type: e.target.value})}
                            >
                                <option value="Direct Cash">📥 Direct Cash / Bank Return</option>
                                <option value="Salary Deduction">📅 Deduct from Future Monthly Salary</option>
                            </select>
                        </div>

                        {payForm.advance_return_type === 'Salary Deduction' && (
                            <div className="form-group" style={{marginBottom:'15px'}}>
                                <label>Target Monthly Salary to Deduct *</label>
                                <select 
                                    style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'#fafafa'}} 
                                    value={payForm.deduction_month} 
                                    onChange={(e) => setPayForm({...payForm, deduction_month: e.target.value})}
                                >
                                    {Array.from({ length: 6 }).map((_, i) => {
                                        const d = new Date();
                                        d.setMonth(d.getMonth() + i); // Allow scheduling current and future months
                                        const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                                        return <option key={label} value={label}>{label}</option>;
                                    })}
                                </select>
                                <p style={{fontSize:'0.75rem', color:'#64748b', marginTop:'4px'}}>✨ When paying salary for {payForm.deduction_month}, this amount will automatically be cut.</p>
                            </div>
                        )}
                    </>
                )}

                {/* Cash/Bank Source selector (HIDDEN ONLY IF scheduling a future deduction) */}
                {!(payForm.transaction_type === 'Advance Returned' && payForm.advance_return_type === 'Salary Deduction') && (
                    <div className="form-group" style={{marginBottom:'15px'}}>
                        <label>{payForm.transaction_type === 'Advance Returned' ? 'Destination Account (Receive to)' : 'Source Account (Pay from)'}</label>
                        <select 
                            style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1'}}
                            required value={payForm.payment_type} onChange={(e) => setPayForm({...payForm, payment_type: e.target.value})}
                        >
                            <option value="Cash">Cash Account</option>
                            {banks.map(b => {
                                const digits = b.account_number ? b.account_number.slice(-4) : '';
                                return <option key={b.id} value={`Bank - ${b.bank_name} ${digits ? `(****${digits})` : ''}`}>{b.bank_name} ({b.account_title})</option>;
                            })}
                        </select>
                        <div style={{fontSize:'0.8rem', color: '#15803d', marginTop:'4px', fontWeight:600}}>
                            Current Available Balance: Rs. {getSelectedMethodBalance().toLocaleString()}
                        </div>
                    </div>
                )}

                {/* Amount input */}
                <div className="form-group" style={{marginBottom:'15px'}}>
                    <label>
                        {payForm.transaction_type === 'Salary' ? 'Payout Amount (Rs.) *' : 
                         payForm.transaction_type === 'Advance Given' ? 'Advance Amount to Send (Rs.) *' : 
                         'Advance Amount (Rs.) *'}
                    </label>
                    <div className="input-wrapper">
                        <Banknote size={18} />
                        <input 
                            type="number" 
                            required 
                            value={payForm.amount} 
                            placeholder="Enter amount in Rs." 
                            onChange={(e) => setPayForm({...payForm, amount: e.target.value})} 
                        />
                    </div>
                </div>

                {/* Description Notes */}
                <div className="form-group" style={{marginBottom:'20px'}}>
                    <label>Short Description / Memo</label>
                    <input 
                        type="text" 
                        placeholder="Enter any comments or tracking details..." 
                        style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} 
                        value={payForm.notes} 
                        onChange={(e) => setPayForm({...payForm, notes: e.target.value})} 
                    />
                </div>

                <div className="form-actions" style={{marginTop:'25px'}}>
                    <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)} style={{padding:'12px'}}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading} style={{
                        background: payForm.transaction_type === 'Advance Given' ? '#ef4444' : '#10b981', 
                        borderColor: payForm.transaction_type === 'Advance Given' ? '#ef4444' : '#10b981',
                        padding:'12px'
                    }}>
                        {loading ? "Processing..." : 
                         payForm.transaction_type === 'Advance Given' ? 'Confirm Send Advance' :
                         payForm.transaction_type === 'Advance Returned' && payForm.advance_return_type === 'Salary Deduction' ? 'Schedule Salary Cut' :
                         'Confirm Transaction'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}


      {/* Ledger Modal */}
      {showLedgerModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%' }}>
            <div className="modal-header no-print">
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}><Users size={24} color="#3b82f6" /><h3>{selectedStaff.employee_name} Payment Log</h3></div>
              <div style={{display:'flex', gap:'10px'}}>
                <button className="btn-secondary" onClick={() => window.print()} style={{padding: '6px 12px', display:'flex', alignItems:'center', gap:'6px'}}>
                  <Printer size={16} /> Print Ledger
                </button>
                <button className="modal-close" onClick={() => setShowLedgerModal(false)}><X size={20} /></button>
              </div>
            </div>

            {/* Print Only Ledger Report */}
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
                <p style={{margin: '10px 0 5px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '5px'}}>Employee Salary Ledger Report</p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '14px'}}>
                  <span><strong>Employee:</strong> {selectedStaff.employee_name}</span>
                  <span><strong>Base Salary:</strong> Rs. {parseFloat(selectedStaff.amount).toLocaleString()}</span>
                  <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', width: '50px'}}>S.No.</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Type</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Method</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Month</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgerData.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#64748b'}}>{index + 1}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{new Date(row.payment_date).toLocaleDateString()}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{row.transaction_type}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{row.payment_type}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{row.month || '-'}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Rs. {parseFloat(row.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end'}}>
                <div style={{width: '300px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <strong>Total Given/Paid:</strong>
                    <span>Rs. {filteredLedgerData.filter(r => r.transaction_type==='Salary' || r.transaction_type==='Advance Given').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <strong>Total Returned/Deducted:</strong>
                    <span>Rs. {filteredLedgerData.filter(r => r.transaction_type==='Advance Returned').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '8px'}}>
                    <strong>Outstanding Advance:</strong>
                    <strong>Rs. {parseFloat(selectedStaff.advance_salary || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-body no-print" style={{padding: '20px'}}>
                <div className="stats-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                        <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Total Base Salary</div>
                        <div style={{ fontSize: '1.25rem', color: '#14532d', fontWeight: 700 }}>Rs. {parseFloat(selectedStaff.amount).toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                        <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Outstanding Advance</div>
                        <div style={{ fontSize: '1.25rem', color: '#7f1d1d', fontWeight: 700 }}>Rs. {parseFloat(selectedStaff.advance_salary || 0).toLocaleString()}</div>
                    </div>
                </div>

                {/* Date Filter Bar */}
                <div className="profit-filter-bar no-print" style={{marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <span className="filter-label" style={{fontWeight: 600, color: '#64748b'}}>📅 Period:</span>
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
                        padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem',
                        background: ledgerFilter === f.key ? '#3b82f6' : 'white',
                        color: ledgerFilter === f.key ? 'white' : '#64748b', cursor: 'pointer'
                      }}>
                      {f.label}
                    </button>
                  ))}
                  {ledgerFilter === 'custom' && (
                    <div className="custom-date-row" style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
                      <input type="date" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} style={{padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1'}} />
                      <span className="sep">→</span>
                      <input type="date" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} style={{padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1'}} />
                    </div>
                  )}
                </div>

                <div className="module-table-container" style={{maxHeight: '350px', overflowY: 'auto'}}>
                    <table className="module-table">
                    <thead>
                        <tr>
                        <th style={{width: '60px', textAlign: 'center'}}>S.No.</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Month</th>
                        <th style={{textAlign:'right'}}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLedgerData.length === 0 ? (<tr><td colSpan="6" className="empty-msg">No payment logs found for this period.</td></tr>) : (
                        filteredLedgerData.map((row, index) => (
                            <tr key={row.id}>
                            <td style={{textAlign: 'center', fontWeight: 'bold', color: '#64748b'}}>{index + 1}</td>
                            <td>{new Date(row.payment_date).toLocaleDateString()}</td>
                            <td style={{fontWeight:600}}>{row.transaction_type}</td>
                            <td>{row.payment_type}</td>
                            <td>{row.month || '-'}</td>
                            <td style={{textAlign:'right', fontWeight: 700, color: row.transaction_type==='Advance Returned'?'#10b981':'#ef4444'}}>Rs. {parseFloat(row.amount).toLocaleString()}</td>
                            </tr>
                        ))
                        )}
                    </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal System-wide styled bill */}
      {showReceipt && receiptData && (
          <div className="modal-overlay receipt-preview-overlay" style={{zIndex: 1000}} onClick={() => setShowReceipt(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px', borderRadius: '0', padding:'0', border:'none'}}>
                  <div className="modal-header no-print" style={{padding:'15px', borderBottom:'1px solid #eee'}}>
                      <h3>📋 System Voucher</h3>
                      <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={printReceipt} style={{background:'#10b981', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:'5px'}}><Printer size={16}/> Print Bill</button>
                        <button className="modal-close" onClick={() => setShowReceipt(false)}><X size={20} /></button>
                      </div>
                  </div>
                  
                  {/* Bill Content for printer */}
                  <div className="print-bill-box" style={{background:'white', padding:'25px', width:'100%', color:'black', fontFamily: 'monospace', minHeight:'400px'}}>
                        <div style={{textAlign:'center', borderBottom:'2px dashed #333', paddingBottom:'15px', marginBottom:'20px'}}>
                            {activeTab === 'Retail 2' ? (
                              <>
                                <h2 style={{margin: '0', fontSize: '1.4rem', fontWeight: 'bold'}}>DATA WALEY</h2>
                                <h3 style={{fontSize: '14px', fontWeight: 'normal', margin: '2px 0 8px 0'}}>RETAIL 2</h3>
                                <div style={{fontSize: '11px', margin: '5px 0'}}>
                                  <p style={{margin: '2px 0'}}>Waqar Butt: 0311-4105840</p>
                                  <p style={{margin: '2px 0'}}>Mhd Aiss: 0335-1430216</p>
                                  <p style={{margin: '2px 0'}}>Saifullah: 0333-4714628</p>
                                </div>
                                <p style={{fontSize: '10px', margin: '5px 0'}}>
                                  Ada Treadywali Stop Main Jaranwala Road,<br/>
                                  District Sheikupura.
                                </p>
                              </>
                            ) : (
                              <>
                                <h2 style={{margin: '0', fontSize: '1.4rem', fontWeight: 'bold'}}>DATA WALEY</h2>
                                <h3 style={{fontSize: '14px', fontWeight: 'normal', margin: '2px 0 8px 0'}}>CEMENT DEALER</h3>
                                <div style={{fontSize: '11px', margin: '5px 0'}}>
                                  <p style={{margin: '2px 0'}}>Tariq Mehmood: 0300-4269347</p>
                                  <p style={{margin: '2px 0'}}>Mian Shehroz: 0335-4294300</p>
                                  <p style={{margin: '2px 0'}}>Ziaullah: 0322-4295106</p>
                                </div>
                                <p style={{fontSize: '10px', margin: '5px 0'}}>
                                  12-KM Main Lahore Sheikhupura Road,<br/>
                                  Ada Kot Abdul Malik.
                                </p>
                              </>
                            )}
                            <h3 style={{marginTop:'15px', background:'#333', color:'#fff', padding:'4px 0', fontSize:'0.9rem'}}>CASH / VOUCHER RECEIPT</h3>
                        </div>
                        
                        <div style={{fontSize:'0.9rem', marginBottom:'20px', display:'flex', flexDirection:'column', gap:'6px'}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Receipt #:</span><strong>SAL-{receiptData.id}</strong></div>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Dated:</span><strong>{new Date(receiptData.payment_date).toLocaleDateString()}</strong></div>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Method:</span><strong>{receiptData.payment_type}</strong></div>
                        </div>

                        <div style={{borderTop:'1px solid #333', borderBottom:'1px solid #333', padding:'12px 0', marginBottom:'20px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                <span>Paid To:</span><strong>{receiptData.employee_name}</strong>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                <span>Reason:</span><strong>{receiptData.transaction_type}</strong>
                            </div>
                            {receiptData.month && (
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <span>Period:</span><strong>{receiptData.month}</strong>
                                </div>
                            )}
                        </div>

                        <div style={{textAlign:'right', padding:'10px 0', borderBottom:'2px dashed #333', marginBottom:'40px'}}>
                            <span style={{fontSize:'1.1rem'}}>TOTAL AMOUNT</span>
                            <h1 style={{margin:'5px 0 0 0', fontSize:'2rem', fontWeight:'bold'}}>Rs. {parseFloat(receiptData.amount).toLocaleString()}</h1>
                        </div>

                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem'}}>
                            <div style={{width:'45%', borderTop:'1px solid #000', textAlign:'center', paddingTop:'5px'}}>Recipient Sign</div>
                            <div style={{width:'45%', borderTop:'1px solid #000', textAlign:'center', paddingTop:'5px'}}>Authorised Sign</div>
                        </div>

                        <div style={{marginTop:'30px', textAlign:'center', fontSize:'0.75rem', fontStyle:'italic', color:'#666'}}>
                            Auto-generated electronically at {new Date().toLocaleString()}
                        </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
