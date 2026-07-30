// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext } from "react";
import { 
  Users as UsersIcon, Plus, Pencil, Trash2, X, Search, Phone, Mail, 
  MapPin, ChevronLeft, CreditCard, Banknote, UserPlus, Info, FileText, Printer, MoreHorizontal
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import ActionMenu from '../../components/ActionMenu';
import { AuthContext } from "../../context/AuthContext";
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/staff");

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  opening_balance: "0",
};

export default function Staff({ type }) {
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState(() => {
    if (type) return type;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const u = payload.user || payload;
        if (u.role === 'admin') return "";
        let m = u.module_type;
        if (!m && u.email) {
          const em = u.email.toLowerCase();
          if (em.includes('wholesale')) m = 'Wholesale';
          else if (em.includes('retail1') || em.includes('retailsaller1')) m = 'Retail 1';
          else if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) m = 'Retail 2';
          else if (em.includes('retail3') || em.includes('retailseller3')) m = 'Retail 3';
        }
        return m || "Wholesale";
      }
    } catch (e) {}
    return "Wholesale";
  });

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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [undoLoading, setUndoLoading] = useState(false);
  
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [transactionType, setTransactionType] = useState("advance");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");

  const fetchRecords = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalRecs = Array.isArray(data) ? data : [];
      setRecords(finalRecs);
      
      const banksRes = await fetch(`${API_BASE_URL}/banks`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const banksData = await banksRes.json();
      const finalBanks = Array.isArray(banksData) ? banksData : [];
      setBankAccounts(finalBanks);
      return finalRecs;
    } catch (err) {
      console.error("Failed to fetch data", err);
      return [];
    }
  };

  useEffect(() => { 
    fetchRecords(); 
    const interval = setInterval(fetchRecords, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's staff directory you want to manage</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">🏢</div>
            <h3>Wholesale</h3>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">🏪</div>
            <h3>Retail 1</h3>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🏬</div>
            <h3>Retail 2</h3>
          </div>
          {/* <div className="selection-card retail3" onClick={() => setActiveTab('Retail 3')}>
            <div className="icon-box">🏬</div>
            <h3>Retail 3</h3>
          </div> */}
        </div>
      </div>
    );
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (rec) => {
    setForm({
      name: rec.name,
      phone: rec.phone || "",
      address: rec.address || "",
      opening_balance: rec.opening_balance,
    });
    setEditId(rec.id);
    setShowModal(true);
  };

  const openLedger = async (staff) => {
    setSelectedStaff(staff);
    setShowLedgerModal(true);
    setLoading(true);
    try {
      let url = `${API}/${staff.id}/ledger`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLedgerData(data.ledger || []);
      if(data.staff) setSelectedStaff(data.staff);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    }
    setLoading(false);
  };

  const handleUndoTransaction = async (ledgerId) => {
    if (!ledgerId) return;
    if (!window.confirm('Are you sure you want to undo this transaction? This will revert the staff balance.')) return;
    setUndoLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/staff/ledger/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ledger_id: ledgerId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Transaction undone successfully');
        fetchRecords();
        if (selectedStaff) openLedger(selectedStaff);
      } else {
        alert(data.error || 'Undo failed');
      }
    } catch (err) {
      console.error('Undo error:', err);
      alert('An error occurred while undoing transaction');
    } finally {
      setUndoLoading(false);
    }
  };

  const openPayment = (staff) => {
    setSelectedStaff(staff);
    setPaymentAmount("");
    setPaymentDesc("");
    setPaymentType("Cash");
    setSelectedBank("");
    setTransactionType("advance");
    setShowPaymentModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) return alert("Enter a valid amount");

    let finalPaymentType = paymentType;
    if (paymentType === 'Bank') {
      if (!selectedBank) return alert("Select a bank account");
      finalPaymentType = `Bank - ${selectedBank}`;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/${selectedStaff.id}/ledger`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          amount: parseFloat(paymentAmount), 
          description: paymentDesc,
          payment_method: finalPaymentType,
          type: transactionType
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        setShowPaymentModal(false);
        fetchRecords();
        if (showLedgerModal) {
          openLedger(selectedStaff);
        }
      } else {
        alert(resData.error || resData.message || "Payment failed!");
      }
    } catch (err) {
      console.error("Payment failed", err);
      alert("Network error. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API}/${editId}` : API;
      await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...form, module_type: activeTab }),
      });
      setShowModal(false);
      fetchRecords();
    } catch (err) {
      console.error("Failed to save staff", err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this staff member?')) {
      await fetch(`${API}/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRecords();
    }
  };

  const filtered = records.filter((r) => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.phone || "").includes(search)
  );

  const totalAdvance = filtered.filter(r => parseFloat(r.current_balance) > 0).reduce((sum, r) => sum + parseFloat(r.current_balance), 0);
  const totalPayable = filtered.filter(r => parseFloat(r.current_balance) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.current_balance)), 0);

  return (
    <div className="module-page">
      <div className="module-header no-print">
        <div className="module-title">
          <button className="btn-icon back-btn" onClick={() => window.history.back()} style={{marginRight: '15px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s'}}>
            <ChevronLeft size={20} />
          </button>
          <div className="module-icon investment-icon" style={{background: '#eff6ff', color: '#3b82f6'}}><MoreHorizontal size={28} /></div>
          <div>
            <h1>{activeTab} Staff Ledger</h1>
            <p>Manage staff directory, advances, and ledger balances</p>
          </div>
        </div>

        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> Add New Staff
        </button>
      </div>

      <div className="stats-grid-pos no-print">
        <div className="pos-stat-card">
          <div className="icon blue"><UsersIcon size={24} /></div>
          <div className="info">
            <span className="label">Total Staff</span>
            <span className="value">{filtered.length} Users</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><CreditCard size={24} /></div>
          <div className="info">
            <span className="label">Total Advances Given</span>
            <span className="value">Rs. {totalAdvance.toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><Banknote size={24} /></div>
          <div className="info">
            <span className="label">Payables (Salary/Returns Owed)</span>
            <span className="value">Rs. {totalPayable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions no-print">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="module-table-container no-print" style={{padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <DataTable value={filtered} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]} 
                   emptyMessage="No staff found." className="p-datatable-sm" stripedRows>
          <Column field="id" header="ID" body={(rec) => <span style={{fontWeight: 600, color: '#64748b'}}>#{rec.id}</span>} sortable style={{ width: '80px' }} />
          
          <Column field="name" header="Staff Name" body={(rec) => (
            <span style={{fontWeight: 700, fontSize: '1rem', color: '#1e293b'}}>{rec.name}</span>
          )} sortable />
          
          <Column header="Contact" body={(rec) => (
            <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.85rem', fontWeight:'600', color: '#334155'}}><Phone size={12}/> {rec.phone || "—"}</div>
            </div>
          )} />
          
          <Column field="current_balance" header="Ledger Balance" body={(rec) => (
            <span style={{fontWeight: 800, fontSize: '1rem', color: parseFloat(rec.current_balance) > 0 ? '#16a34a' : parseFloat(rec.current_balance) < 0 ? '#e11d48' : '#64748b'}}>
              Rs. {Math.abs(parseFloat(rec.current_balance)).toLocaleString()} {parseFloat(rec.current_balance) > 0 ? '(Advance)' : parseFloat(rec.current_balance) < 0 ? '(Payable)' : ''}
            </span>
          )} sortable />
          
          <Column header="" body={(rec) => (
            <ActionMenu 
              onEdit={() => openEdit(rec)} 
              onDelete={() => handleDelete(rec.id)}
              extraItems={[
                { label: 'View Ledger', icon: 'pi pi-book', command: () => openLedger(rec) },
                { label: 'Give Advance / Receive Return', icon: 'pi pi-money-bill', command: () => openPayment(rec) }
              ]}
            />
          )} style={{ textAlign: 'center', width: '80px' }} />
        </DataTable>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Staff Profile" : "Create New Staff"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-label">Identity & Contact</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <div className="input-wrapper">
                    <UsersIcon size={18} />
                    <input type="text" required value={form.name} placeholder="e.g. Ali Ahmed"
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <Phone size={18} />
                    <input type="text" value={form.phone} placeholder="e.g. 0300-1234567"
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Home/Office Address</label>
                  <div className="input-wrapper">
                    <MapPin size={18} />
                    <input type="text" value={form.address} placeholder="City, Area, Street"
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
              </div>

              {!editId && (
                <>
                  <div className="section-label">Financial Ledger</div>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Opening Balance (Rs.)</label>
                      <div className="input-wrapper">
                        <Banknote size={18} />
                        <input type="number" value={form.opening_balance}
                          onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} 
                          placeholder="Positive: Advance Given | Negative: Payable to Staff" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editId ? "Update Profile" : "Register Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLedgerModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%' }}>
            <div className="modal-header no-print">
              <div className="header-info" style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <UsersIcon size={24} color="#3b82f6" />
                <h3>Staff Ledger: {selectedStaff.name}</h3>
              </div>
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
                <p style={{margin: '10px 0 5px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '5px'}}>Staff Ledger Statement</p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '14px'}}>
                  <span><strong>Staff Name:</strong> {selectedStaff.name}</span>
                  <span><strong>Phone:</strong> {selectedStaff.phone || '—'}</span>
                  <span><strong>Print Date:</strong> {new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', width: '50px'}}>S.No</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Description</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Payment Method</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Advance (+)</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Return (-)</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{background: '#f8fafc', fontStyle: 'italic'}}>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>—</td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>Opening</td>
                    <td colSpan="2" style={{border: '1px solid #cbd5e1', padding: '8px'}}>Opening Balance Brought Forward</td>
                    <td colSpan="2" style={{border: '1px solid #cbd5e1', padding: '8px'}}>—</td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold'}}>
                      Rs. {Math.abs(parseFloat(selectedStaff.opening_balance)).toLocaleString()} {parseFloat(selectedStaff.opening_balance) > 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                  
                  {ledgerData.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{index + 1}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{row.description}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{row.payment_method}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'green'}}>
                        {parseFloat(row.debit) > 0 ? parseFloat(row.debit).toLocaleString() : '—'}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'red'}}>
                        {parseFloat(row.credit) > 0 ? parseFloat(row.credit).toLocaleString() : '—'}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold'}}>
                        Rs. {Math.abs(parseFloat(row.balance || 0)).toLocaleString()} {parseFloat(row.balance || 0) > 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background: '#f8fafc', fontWeight: 'bold'}}>
                    <td colSpan="4" style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Final Outstanding Balance:</td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'green'}}>
                      Rs. {ledgerData.reduce((sum,r)=>sum+parseFloat(r.debit||0),0).toLocaleString()}
                    </td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'red'}}>
                      Rs. {ledgerData.reduce((sum,r)=>sum+parseFloat(r.credit||0),0).toLocaleString()}
                    </td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: parseFloat(selectedStaff.current_balance) > 0 ? 'green' : 'red'}}>
                      Rs. {Math.abs(parseFloat(selectedStaff.current_balance)).toLocaleString()} ({parseFloat(selectedStaff.current_balance) > 0 ? 'Advance' : 'Payable'})
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div style={{marginTop: '40px', display: 'flex', justifyContent: 'space-between'}}>
                <div style={{borderTop: '1px solid #000', width: '200px', textAlign: 'center', paddingTop: '5px'}}>Staff Signature</div>
                <div style={{borderTop: '1px solid #000', width: '200px', textAlign: 'center', paddingTop: '5px'}}>Authorized Official</div>
              </div>
            </div>

            <div className="detail-body no-print" style={{padding: '24px'}}>
              <div className="stats-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Records</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{ledgerData.length} items</div>
                </div>
                <div className="stat-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Opening Balance</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Rs. {parseFloat(selectedStaff.opening_balance).toLocaleString()}</div>
                </div>
                <div className="stat-item" style={{ background: parseFloat(selectedStaff.current_balance) > 0 ? '#f0fdf4' : '#fff1f2', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Live Balance</div>
                  <div style={{ fontSize: '1.25rem', color: parseFloat(selectedStaff.current_balance) > 0 ? '#16a34a' : '#e11d48', fontWeight: 700 }}>
                    Rs. {Math.abs(parseFloat(selectedStaff.current_balance)).toLocaleString()} 
                    <span style={{fontSize:'0.8rem', marginLeft:'8px'}}>({parseFloat(selectedStaff.current_balance) > 0 ? 'Advance' : 'Payable'})</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Loading ledger data...</div>
              ) : (
                <div style={{background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden'}}>
                  <DataTable 
                    value={ledgerData} 
                    scrollable 
                    scrollHeight="380px" 
                    className="p-datatable-sm card-table"
                    stripedRows 
                  >
                    <Column field="id" header="Ref ID" body={(rec) => `#${rec.id}`} />
                    <Column field="date" header="Date" body={(rec) => new Date(rec.date).toLocaleDateString('en-GB')} />
                    <Column field="description" header="Description" />
                    <Column field="payment_method" header="Payment Method" />
                    <Column field="debit" header="Advance (+)" body={(rec) => (
                      <span style={{color: '#16a34a', fontWeight: 'bold'}}>{parseFloat(rec.debit) > 0 ? `Rs. ${parseFloat(rec.debit).toLocaleString()}` : '—'}</span>
                    )} />
                    <Column field="credit" header="Return (-)" body={(rec) => (
                      <span style={{color: '#e11d48', fontWeight: 'bold'}}>{parseFloat(rec.credit) > 0 ? `Rs. ${parseFloat(rec.credit).toLocaleString()}` : '—'}</span>
                    )} />
                    <Column field="balance" header="Running Balance" body={(rec) => (
                      <span style={{fontWeight: 'bold', color: '#1e293b'}}>Rs. {Math.abs(parseFloat(rec.balance)).toLocaleString()} {parseFloat(rec.balance) > 0 ? 'Dr' : 'Cr'}</span>
                    )} />
                    {user?.role === 'admin' && (
                      <Column 
                        header="Actions" 
                        body={(rec) => (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '2px 6px', fontSize: '0.7rem', height: '20px', lineHeight: '1' }} 
                            onClick={() => handleUndoTransaction(rec.id)}
                            disabled={undoLoading}
                          >
                            Undo
                          </button>
                        )} 
                        style={{ width: '80px', textAlign: 'center' }}
                      />
                    )}
                  </DataTable>
                </div>
              )}
            </div>

            <div className="modal-footer no-print" style={{padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn-secondary" onClick={() => setShowLedgerModal(false)}>Close Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Advance / Return for {selectedStaff.name}</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="form-group full-width" style={{marginBottom: '15px'}}>
                <label>Transaction Type</label>
                <div style={{display: 'flex', gap: '15px', marginTop: '8px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                    <input type="radio" name="transactionType" value="advance" checked={transactionType === 'advance'} onChange={(e) => setTransactionType(e.target.value)} />
                    Give Advance
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                    <input type="radio" name="transactionType" value="return" checked={transactionType === 'return'} onChange={(e) => setTransactionType(e.target.value)} />
                    Receive Return
                  </label>
                </div>
              </div>

              <div className="form-group full-width" style={{marginBottom: '15px'}}>
                <label>Amount</label>
                <input type="number" required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
              </div>
              
              <div className="form-group full-width" style={{marginBottom: '15px'}}>
                <label>Description / Reason</label>
                <input type="text" required value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} placeholder="e.g. Salary Advance for June" />
              </div>

              <div className="form-group full-width" style={{marginBottom: '15px'}}>
                <label>Payment Method</label>
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  <option value="Cash">Cash Account</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>

              {paymentType === 'Bank' && (
                <div className="form-group full-width" style={{marginBottom: '15px'}}>
                  <label>Select Bank Account</label>
                  <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} required>
                    <option value="">-- Choose Bank --</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.bank_name}>{b.bank_name} ({b.account_number})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Processing..." : "Submit Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
