// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
  Home, Plus, Pencil, Trash2, X, CheckCircle, Clock, Search,
  Calendar, User, Building, CircleDollarSign, Tag, Info
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import ActionMenu from '../../components/ActionMenu';
import { AuthContext } from "../../context/AuthContext";
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/rent");

const emptyForm = {
  property_name: "",
  landlord_name: "",
  amount: "",
  rent_date: new Date().toLocaleDateString('en-CA'),
  status: "Paid",
  notes: "",
  rent_type: "Paid",
};

export default function Rent({ type }) {
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
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [liveBalances, setLiveBalances] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRentForPay, setSelectedRentForPay] = useState(null);
  const [payForm, setPayForm] = useState({ source: 'Cash', bank: '' });
  
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedPropertyForLedger, setSelectedPropertyForLedger] = useState(null);

  const fetchRecords = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalRecs = Array.isArray(data) ? data : [];
      setRecords(finalRecs);
    } catch (err) {
      console.error("Failed to fetch rent records", err);
    }
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

  const fetchLiveBalances = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveBalances(data);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    if (!activeTab) return;
    fetchRecords(); 
    fetchBanks();
    fetchLiveBalances();
    const interval = setInterval(() => {
      fetchRecords();
      fetchLiveBalances();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (showPayModal && activeTab) {
      fetchLiveBalances();
    }
  }, [showPayModal, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amt = parseFloat(form.amount || 0);

      // Fetch live balances for payments (only check balance if it is a payment)
      if ((form.rent_type || 'Paid') !== 'Received') {
        const balRes = await fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
        });
        if (balRes.ok) {
          const balances = await balRes.json();
          const currentAvailable = balances['Cash'] || 0;
          
          if (amt > currentAvailable) {
            alert(`Insufficient Balance! You only have Rs. ${currentAvailable.toLocaleString()} in your Cash account. You cannot make a rent payment of Rs. ${amt.toLocaleString()}!`);
            setLoading(false);
            return;
          }
        }
      }

      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API}/${editId}` : API;
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...form, module_type: activeTab }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchRecords();
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/${id}`, { 
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    });
    fetchRecords();
  };

  const filtered = records.filter((r) => {
    const matchSearch = (r.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (r.landlord_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    const matchType = filterType === "All" || (r.rent_type || "Paid") === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.rent_date || a.created_at || 0);
      const dateB = new Date(b.rent_date || b.created_at || 0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      return (a.id || 0) - (b.id || 0);
    });
  }, [filtered]);

  const totalPaid = useMemo(() => {
    return filtered.filter(r => (r.rent_type || 'Paid') === 'Paid').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  }, [filtered]);

  const totalReceived = useMemo(() => {
    return filtered.filter(r => r.rent_type === 'Received').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  }, [filtered]);

  const settledCount = useMemo(() => {
    return filtered.filter(r => r.status === 'Paid').length;
  }, [filtered]);

  // If Admin and no counter selected, show selection screen
  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's rent & property records you want to manage</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">🏢</div>
            <h3>Wholesale</h3>
            <span>Main Warehouse Rent</span>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">🏠</div>
            <h3>Retail 1</h3>
            <span>Counter A Rent</span>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🏬</div>
            <h3>Retail 2</h3>
            <span>Counter B Rent</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          <div className="module-icon rent-icon" style={{background: '#fef2f2', color: '#ef4444'}}><Home size={28} /></div>
          <div>
            <h1>{activeTab} Rent Management</h1>
            <p>Track property lease and monthly rent schedules</p>
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
          <Plus size={18} /> Record Rent
        </button>
      </div>

      <div className="stats-grid-pos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div className="pos-stat-card">
          <div className="icon blue"><Building size={24} /></div>
          <div className="info">
            <span className="label">Total Properties</span>
            <span className="value">{new Set(filtered.map(r => r.property_name)).size} Units</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><CircleDollarSign size={24} /></div>
          <div className="info">
            <span className="label">Total Paid (Rs.)</span>
            <span className="value">Rs. {totalPaid.toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green" style={{ background: '#f0fdf4', color: '#16a34a' }}><CircleDollarSign size={24} /></div>
          <div className="info">
            <span className="label">Total Received (Rs.)</span>
            <span className="value" style={{ color: '#15803d' }}>Rs. {totalReceived.toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><CheckCircle size={24} /></div>
          <div className="info">
            <span className="label">Settled Entries</span>
            <span className="value">{settledCount} Settled</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search property, landlord or tenant..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-group" style={{ display: 'flex', gap: '10px' }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="tab-select">
            <option value="All">All Types</option>
            <option value="Paid">Paid (Expense)</option>
            <option value="Received">Received (Income)</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="tab-select">
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="module-table-container" style={{padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <DataTable value={sortedFiltered} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]} 
                   emptyMessage="No rent records found." className="p-datatable-sm" stripedRows responsiveLayout="scroll">
          <Column header="S.No." body={(rowData, options) => <span style={{fontWeight: 700, color: '#64748b'}}>{options.rowIndex + 1}</span>} style={{width: '70px', textAlign: 'center'}} />
          <Column header="Date" body={(r) => (
            <div style={{fontWeight: 700}}>{new Date(r.rent_date).toLocaleDateString()}</div>
          )} sortable field="rent_date" />
          
          <Column header="Type" body={(r) => (
            <span style={{
              fontSize:'0.75rem', 
              padding: '4px 10px', 
              borderRadius: '4px', 
              fontWeight: '700',
              background: r.rent_type === 'Received' ? '#dcfce7' : '#eff6ff',
              color: r.rent_type === 'Received' ? '#15803d' : '#1d4ed8'
            }}>
              {r.rent_type === 'Received' ? 'Received' : 'Paid'}
            </span>
          )} sortable field="rent_type" />
          
          <Column header="Property / Unit" body={(r) => (
            <span style={{fontWeight: 700, color: '#1e293b'}}>{r.property_name}</span>
          )} sortable field="property_name" />
          
          <Column header="Landlord / Tenant" body={(r) => (
            <div style={{display:'flex', alignItems:'center', gap:'6px', color: '#475569'}}><User size={14}/> {r.landlord_name || '—'}</div>
          )} sortable field="landlord_name" />
          
          <Column header="Rent Amount" body={(r) => (
            <span style={{fontWeight: 800, color: r.rent_type === 'Received' ? '#16a34a' : '#e11d48'}}>
              Rs. {parseFloat(r.amount).toLocaleString()}
            </span>
          )} sortable field="amount" />
          
          <Column header="Status" body={(r) => (
            <span className={`status-badge ${r.status.toLowerCase()}`} style={{padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700}}>
              {r.status}
            </span>
          )} sortable field="status" />
          
          <Column header="" body={(r) => {
            const isPending = r.status === 'Pending';
            const isReceived = r.rent_type === 'Received';
            const settleLabel = isReceived ? 'Receive Payment' : 'Pay Rent';
            const settleIcon = isReceived ? 'pi pi-wallet' : 'pi pi-credit-card';

            const extraItems = [
              { label: 'View Ledger', icon: 'pi pi-book', command: () => { setSelectedPropertyForLedger(r.property_name); setShowLedgerModal(true); } }
            ];

            if (isPending) {
              extraItems.unshift({
                label: settleLabel,
                icon: settleIcon,
                command: () => {
                  setSelectedRentForPay(r);
                  setPayForm({ source: 'Cash', bank: '' });
                  setShowPayModal(true);
                }
              });
            }

            return (
              <ActionMenu
                onEdit={user?.role === 'admin' ? () => { setForm(r); setEditId(r.id); setShowModal(true); } : null}
                onDelete={user?.role === 'admin' ? () => handleDelete(r.id) : null}
                extraItems={extraItems}
              />
            );
          }} style={{ textAlign: 'center', width: '60px' }} />
        </DataTable>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Rent Record" : (form.rent_type === 'Received' ? "Record Rent Receipt" : "Add Rent Payment")}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-label">Property Details</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Rent Type *</label>
                  <div className="input-wrapper">
                    <Tag size={18} />
                    <select value={form.rent_type || 'Paid'} onChange={(e) => setForm({...form, rent_type: e.target.value})}>
                      <option value="Paid">Rent Paid (Expense)</option>
                      <option value="Received">Rent Received (Income)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Property/Shop Name *</label>
                  <div className="input-wrapper">
                    <Building size={18} />
                    <input type="text" required value={form.property_name} placeholder="e.g. Warehouse A"
                      onChange={(e) => setForm({...form, property_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>{form.rent_type === 'Received' ? 'Tenant Name' : 'Landlord Name'}</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input type="text" value={form.landlord_name} placeholder={form.rent_type === 'Received' ? "Name of Tenant" : "Owner of property"}
                      onChange={(e) => setForm({...form, landlord_name: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="section-label">{form.rent_type === 'Received' ? 'Receipt Information' : 'Payment Information'}</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Rent Amount (Rs.) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" required value={form.amount} placeholder="0.00"
                      onChange={(e) => setForm({...form, amount: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>{form.rent_type === 'Received' ? 'Receipt Date' : 'Payment Date'}</label>
                  <div className="input-wrapper">
                    <Calendar size={18} />
                    <input type="date" value={form.rent_date}
                      onChange={(e) => setForm({...form, rent_date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>{form.rent_type === 'Received' ? 'Receipt Status' : 'Payment Status'}</label>
                  <div className="input-wrapper">
                    <Tag size={18} />
                    <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="section-label">Additional Notes</div>
              <div className="form-group full-width">
                <textarea rows="2" placeholder="Any specific details about this payment..." value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Processing..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showPayModal && selectedRentForPay && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{selectedRentForPay.rent_type === 'Received' ? 'Receive Rent Payment' : 'Pay Pending Rent'}</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}><X size={20} /></button>
            </div>
            
            <div style={{padding: '20px'}}>
              <div style={{background: selectedRentForPay.rent_type === 'Received' ? '#f0fdf4' : '#fff1f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', border: selectedRentForPay.rent_type === 'Received' ? '1px solid #bbf7d0' : '1px solid #fecdd3'}}>
                <span style={{fontWeight: 600, color: selectedRentForPay.rent_type === 'Received' ? '#15803d' : '#e11d48'}}>Amount:</span>
                <span style={{fontWeight: 700, color: selectedRentForPay.rent_type === 'Received' ? '#15803d' : '#e11d48'}}>Rs. {parseFloat(selectedRentForPay.amount).toLocaleString()}</span>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 600}}>Payment Source *</label>
                <select 
                  value={payForm.source}
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}}
                  onChange={(e) => setPayForm({...payForm, source: e.target.value, bank: e.target.value === 'Bank' ? (banks[0]?.bank_name || '') : ''})}
                >
                  <option value="Cash">Cash (Counter)</option>
                  {banks.some(b => {
                    const name = b.bank_name.toLowerCase().trim();
                    if (name === 'cash' || name === 'cash account') return false;
                    return (b.module_type || 'Wholesale') === activeTab;
                  }) && (
                    <option value="Bank">Bank Account</option>
                  )}
                </select>
              </div>

              {payForm.source === "Bank" && (
                <div className="form-group" style={{marginBottom: '15px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: 600}}>Select Bank Account *</label>
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
                <strong>Property:</strong> {selectedRentForPay.property_name}<br/>
                <strong>{selectedRentForPay.rent_type === 'Received' ? 'Tenant:' : 'Landlord:'}</strong> {selectedRentForPay.landlord_name || '—'}
              </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn-primary" style={{background: selectedRentForPay.rent_type === 'Received' ? '#10b981' : '#ef4444', borderColor: selectedRentForPay.rent_type === 'Received' ? '#10b981' : '#ef4444'}} disabled={loading} onClick={async () => {
                   setLoading(true);
                   try {
                     const method = payForm.source === 'Bank' ? payForm.bank : 'Cash';
                     
                     // If paying rent, verify balance
                     if (selectedRentForPay.rent_type !== 'Received') {
                       const balRes = await fetch(`${API_BASE_URL}/banks/balance/${method}?module_type=${activeTab}`, {
                         headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
                       });
                       const { balance } = await balRes.json();

                       if (balance < parseFloat(selectedRentForPay.amount)) {
                         alert(`Insufficient Balance in ${method}! Available: Rs. ${balance.toLocaleString()}`);
                         setLoading(false);
                         return;
                       }
                     }

                     const finalPaymentType = payForm.source === 'Bank' ? `Bank - ${payForm.bank}` : 'Cash';
                     const res = await fetch(`${API}/${selectedRentForPay.id}`, {
                       method: 'PUT',
                       headers: { 
                         "Content-Type": "application/json",
                         "Authorization": `Bearer ${localStorage.getItem('token')}`
                       },
                       body: JSON.stringify({ ...selectedRentForPay, status: 'Paid', payment_type: finalPaymentType }),
                     });

                     if (res.ok) {
                       setShowPayModal(false);
                       fetchRecords();
                       fetchLiveBalances();
                       alert("Rent entry settled successfully!");
                     }
                   } catch (err) { alert("Action failed"); }
                   setLoading(false);
                }}>
                  {loading ? "Processing..." : "Confirm Settlement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLedgerModal && selectedPropertyForLedger && (() => {
        const ledgerRecords = records.filter(r => r.property_name === selectedPropertyForLedger).sort((a, b) => new Date(a.rent_date) - new Date(b.rent_date));
        const totalPaidLedger = ledgerRecords.filter(r => (r.rent_type || 'Paid') === 'Paid' && r.status === 'Paid').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        const totalReceivedLedger = ledgerRecords.filter(r => r.rent_type === 'Received' && r.status === 'Paid').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        const pendingPaidLedger = ledgerRecords.filter(r => (r.rent_type || 'Paid') === 'Paid' && r.status === 'Pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        const pendingReceivedLedger = ledgerRecords.filter(r => r.rent_type === 'Received' && r.status === 'Pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

        return (
          <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '90%' }}>
              <div className="modal-header">
                <h3>Rent Ledger: {selectedPropertyForLedger}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={() => window.print()} style={{ background: '#475569', borderColor: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Print Ledger
                  </button>
                  <button className="modal-close" onClick={() => setShowLedgerModal(false)}><X size={20} /></button>
                </div>
              </div>
              
              <div style={{ padding: '20px' }}>
                {/* Visual Summary Counters inside Ledger */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>Total Rent Paid</div>
                    <div style={{ fontSize: '1.2rem', color: '#991b1b', fontWeight: 700 }}>Rs. {totalPaidLedger.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>Total Rent Received</div>
                    <div style={{ fontSize: '1.2rem', color: '#166534', fontWeight: 700 }}>Rs. {totalReceivedLedger.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>Pending Payable</div>
                    <div style={{ fontSize: '1.2rem', color: '#92400e', fontWeight: 700 }}>Rs. {pendingPaidLedger.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>Pending Receivable</div>
                    <div style={{ fontSize: '1.2rem', color: '#1e40af', fontWeight: 700 }}>Rs. {pendingReceivedLedger.toLocaleString()}</div>
                  </div>
                </div>

                {/* Ledger Timeline Table */}
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="module-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>S.No</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Landlord / Tenant</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRecords.length === 0 ? (
                        <tr><td colSpan="7" className="empty-msg">No transactions recorded for this property.</td></tr>
                      ) : (
                        ledgerRecords.map((r, i) => (
                          <tr key={r.id}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>{i + 1}</td>
                            <td>{new Date(r.rent_date).toLocaleDateString()}</td>
                            <td>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                background: r.rent_type === 'Received' ? '#dcfce7' : '#eff6ff',
                                color: r.rent_type === 'Received' ? '#15803d' : '#1d4ed8'
                              }}>
                                {r.rent_type === 'Received' ? 'Received' : 'Paid'}
                              </span>
                            </td>
                            <td className="bold">{r.landlord_name || '—'}</td>
                            <td style={{ fontWeight: 700, color: r.rent_type === 'Received' ? '#16a34a' : '#e11d48' }}>
                              Rs. {parseFloat(r.amount).toLocaleString()}
                            </td>
                            <td>
                              <span className={`status-badge ${r.status.toLowerCase()}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.notes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="form-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowLedgerModal(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
