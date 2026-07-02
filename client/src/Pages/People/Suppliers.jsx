// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

/* eslint-disable */
import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
  Truck, Plus, X, Search, Phone, Mail, 
  MapPin, Building, CreditCard, Banknote, ClipboardList, Package, FileText
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import ActionMenu from '../../components/ActionMenu';
import { AuthContext } from "../../context/AuthContext";
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/suppliers");

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  company: "",
  address: "",
  balance: "0",
};

export default function Suppliers({ type }) {
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
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", notes: "Payment via Cash/Bank" });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [paymentSource, setPaymentSource] = useState("Cash");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState("all");
   const [ledgerData, setLedgerData] = useState([]);
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState(0);
  const [adjForm, setAdjForm] = useState({ type: "Debit", amount: "", notes: "" });

  const sortedLedgerData = useMemo(() => {
    const sorted = [...ledgerData].sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));
    if (ledgerFilter === 'all') return sorted;
    
    return sorted.filter(row => {
      const rowDate = new Date(row.purchase_date);
      const rowDateStr = rowDate.toLocaleDateString('en-CA');
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      
      if (ledgerFilter === 'custom' && ledgerFrom && ledgerTo) {
        return rowDateStr >= ledgerFrom && rowDateStr <= ledgerTo;
      }
      if (ledgerFilter === 'today') {
        return rowDateStr === todayStr;
      }
      if (ledgerFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        const weekAgoStr = weekAgo.toLocaleDateString('en-CA');
        return rowDateStr >= weekAgoStr && rowDateStr <= todayStr;
      }
      if (ledgerFilter === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStartStr = monthStart.toLocaleDateString('en-CA');
        return rowDateStr >= monthStartStr && rowDateStr <= todayStr;
      }
      return true;
    });
  }, [ledgerData, ledgerFilter, ledgerFrom, ledgerTo]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveBalances, setLiveBalances] = useState({});

  useEffect(() => {
    if (showPaymentModal) {
      const fetchLiveBalances = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setLiveBalances(data);
            
            // Default selection based on positive available balance
            if ((data["Cash"] || 0) > 0) {
              setPaymentSource("Cash");
              setSelectedBank("");
            } else {
              const positiveBanks = bankAccounts.filter(b => {
                const name = b.bank_name.toLowerCase().trim();
                if (name === 'cash' || name === 'cash account') return false;
                const digits = b.account_number ? b.account_number.slice(-4) : '';
                const key = `${b.bank_name} ${digits ? `(****${digits})` : ''}`;
                return (data[key] || 0) > 0;
              });
              if (positiveBanks.length > 0) {
                const b = positiveBanks[0];
                const digits = b.account_number ? b.account_number.slice(-4) : '';
                setPaymentSource("Bank");
                setSelectedBank(`${b.bank_name} ${digits ? `(****${digits})` : ''}`);
              } else {
                setPaymentSource("Cash");
                setSelectedBank("");
              }
            }
          }
        } catch (e) { console.error(e); }
      };
      fetchLiveBalances();
    }
  }, [showPaymentModal]);

  const fetchRecords = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalRecs = Array.isArray(data) ? data : [];
      setRecords(finalRecs);
      return finalRecs;
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
      return [];
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch((API_BASE_URL + '/banks'), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalBanks = Array.isArray(data) ? data : [];
      setBankAccounts(finalBanks);
    } catch (err) {
      console.error("Failed to fetch banks", err);
    }
  };

  useEffect(() => { 
    if (!activeTab) return;
    fetchRecords(); 
    fetchBanks();
    const interval = setInterval(() => {
      fetchRecords();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // If Admin and no counter selected, show selection screen
  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's supplier directory you want to manage</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">🚛</div>
            <h3>Wholesale</h3>
            <span>Main Warehouse</span>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">🏭</div>
            <h3>Retail 1</h3>
            <span>Counter A</span>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🏗️</div>
            <h3>Retail 2</h3>
            <span>Counter B</span>
          </div>
        </div>
      </div>
    );
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (rec) => {
    setForm({
      name: rec.name,
      phone: rec.phone || "",
      email: rec.email || "",
      company: rec.company || "",
      address: rec.address || "",
      balance: rec.balance,
    });
    setEditId(rec.id);
    setShowModal(true);
  };

  const openLedger = async (supplier, filter = "all") => {
    setSelectedSupplier(supplier);
    setLedgerFilter(filter);
    setShowLedgerModal(true);
    setLoading(true);
    try {
      // Fetch WHOLE history for cumulative running balance accuracy
      const url = `${API_BASE_URL}/purchases/supplier/${supplier.id}?type=${activeTab}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const rawRows = Array.isArray(data) ? data : [];
      
      // Sort oldest to newest for accounting math
      const sorted = [...rawRows].sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));
      
      // Back-calculate opening balance from current ending balance
      // Initial = Current - Total Historical Net Transaction Impact
      const historicalImpact = sorted.reduce((sum, r) => sum + parseFloat(r.total_amount || 0) - parseFloat(r.paid_amount || 0), 0);
      const initialBal = parseFloat(supplier.balance || 0) - historicalImpact;
      setLedgerOpeningBalance(initialBal);
      
      // Add running_balance inline
      let cur = initialBal;
      const enriched = sorted.map(r => {
        cur += parseFloat(r.total_amount || 0) - parseFloat(r.paid_amount || 0);
        return { ...r, running_balance: cur };
      });
      
      setLedgerData(enriched);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    }
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

  const handlePostAdjustment = async (e) => {
    e.preventDefault();
    if (!adjForm.amount || parseFloat(adjForm.amount) <= 0) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/adjustment`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          supplier_id: selectedSupplier.id,
          amount: adjForm.amount,
          notes: adjForm.notes,
          type: adjForm.type,
          module_type: activeTab
        })
      });
      if (res.ok) {
        setAdjForm({ type: "Debit", amount: "", notes: "" });
        const updatedRecords = await fetchRecords();
        const updatedSup = (updatedRecords || []).find(s => s.id === selectedSupplier.id);
        if (updatedSup) setSelectedSupplier(updatedSup);
        // Refetch ledger using existing state values
        openLedger(updatedSup || selectedSupplier, ledgerFilter);
      }
    } catch (err) { console.error("Adjustment post failed", err); }
    setLoading(false);
  };

  const openPayment = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentForm({ amount: "", notes: "Payment Sent" });
    setSelectedBank("");
    setPaymentSource("Cash");
    fetchBanks(); // Refresh banks list when modal opens
    setShowPaymentModal(true);
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    const currentBalance = parseFloat(selectedSupplier.balance || 0);
    const amt = parseFloat(paymentForm.amount || 0);

    setLoading(true);
    
    let finalPaymentType = selectedBank ? `Bank - ${selectedBank}` : 'Cash';
    const targetAccountName = selectedBank || 'Cash';
    const currentAvailable = liveBalances[targetAccountName] || 0;

    if (amt > currentAvailable) {
      setLoading(false);
      return;
    }

    try {
      // 3. Save the payment
      const res = await fetch(`${API_BASE_URL}/purchases/payment`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          supplier_id: selectedSupplier.id,
          paid_amount: paymentForm.amount,
          notes: paymentForm.notes,
          payment_type: finalPaymentType,
          module_type: activeTab
        })
      });
      if (res.ok) {
        setShowPaymentModal(false);
        fetchRecords();
      }
    } catch (err) {
      console.error("Failed to make payment", err);
    }
    setLoading(false);
  };

  const handleEntryUpdate = async (purchaseId, newQty, newRate) => {
    try {
      const res = await fetch((API_BASE_URL + "/purchases/update-ledger-entry"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          purchase_id: purchaseId, 
          new_qty: newQty, 
          new_rate: newRate 
        }),
      });
      if (res.ok) {
        const updatedRecords = await fetchRecords(); // Refresh main balances
        // Find updated supplier and refresh selected state
        const updatedSup = (updatedRecords || []).find(s => s.id === selectedSupplier.id);
        if (updatedSup) setSelectedSupplier(updatedSup);
        
        openLedger(updatedSup || selectedSupplier, ledgerFrom, ledgerTo, ledgerFilter); // Refresh ledger
      }
    } catch (err) {
      console.error("Failed to update entry", err);
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
      console.error("Failed to save supplier", err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/${id}`, { 
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    });
    fetchRecords();
  };

  const filtered = records.filter((r) => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalReceivable = filtered.filter(r => parseFloat(r.balance) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.balance)), 0);
  const totalPayable = filtered.filter(r => parseFloat(r.balance) > 0).reduce((sum, r) => sum + parseFloat(r.balance), 0);

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          <div className="module-icon investment-icon" style={{background: '#fff7ed', color: '#f59e0b'}}><Package size={28} /></div>
          <div>
            <h1>{activeTab} Suppliers</h1>
            <p>Manage vendors, factory contacts and purchase ledgers</p>
          </div>
        </div>

        {user?.role === 'admin' && (!user?.module_type || user?.module_type === 'admin') && !type && (
          <div className="counter-switcher">
            <button className={activeTab === 'Wholesale' ? 'active' : ''} onClick={() => setActiveTab('Wholesale')}>Wholesale</button>
            <button className={activeTab === 'Retail 1' ? 'active' : ''} onClick={() => setActiveTab('Retail 1')}>Retail 1</button>
            <button className={activeTab === 'Retail 2' ? 'active' : ''} onClick={() => setActiveTab('Retail 2')}>Retail 2</button>
          </div>
        )}

        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> Add New Supplier
        </button>
      </div>

      <div className="stats-grid-pos">
        <div className="pos-stat-card">
          <div className="icon orange"><Building size={24} /></div>
          <div className="info">
            <span className="label">Total Vendors</span>
            <span className="value">{filtered.length} Companies</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><CreditCard size={24} /></div>
          <div className="info">
            <span className="label">Pending Payments</span>
            <span className="value">Rs. {totalPayable.toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><Banknote size={24} /></div>
          <div className="info">
            <span className="label">Advance Paid</span>
            <span className="value">Rs. {totalReceivable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search by name or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="module-table-container" style={{padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <DataTable value={filtered} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]} 
                   emptyMessage="No suppliers found." className="p-datatable-sm" stripedRows responsiveLayout="scroll">
          <Column field="id" header="ID" body={(rec) => <span style={{fontWeight: 600, color: '#64748b'}}>#{rec.id}</span>} sortable style={{ width: '80px' }} />
          
          <Column field="name" header="Supplier Name" body={(rec) => (
            <span style={{fontWeight: 700, fontSize: '1rem', color: '#1e293b'}}>{rec.name}</span>
          )} sortable />

          <Column field="company" header="Company / Brand" body={(rec) => (
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              <Building size={16} color="#64748b"/>
              <span style={{fontWeight: 600, color: '#475569'}}>{rec.company || "N/A"}</span>
            </div>
          )} sortable />
          
          <Column header="Contact Details" body={(rec) => (
            <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.85rem', fontWeight:'600', color: '#334155'}}><Phone size={12}/> {rec.phone || "—"}</div>
              <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.8rem', color:'#64748b'}}><Mail size={12}/> {rec.email || "—"}</div>
            </div>
          )} />
          
          <Column header="Location" body={(rec) => (
            <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.85rem', color: '#475569'}}><MapPin size={12}/> {rec.address || "—"}</div>
          )} />
          
          <Column field="balance" header="Ledger Balance" body={(rec) => (
            <span style={{fontWeight: 800, fontSize: '1rem', color: parseFloat(rec.balance) > 0 ? '#e11d48' : parseFloat(rec.balance) < 0 ? '#16a34a' : '#64748b'}}>
              Rs. {Math.abs(parseFloat(rec.balance)).toLocaleString()}
              <small style={{display:'block', fontSize:'0.75rem', fontWeight:'normal'}}>
                {parseFloat(rec.balance) > 0 ? 'Payable' : parseFloat(rec.balance) < 0 ? 'Advance' : 'Clear'}
              </small>
            </span>
          )} sortable />
          
          <Column header="" body={(rec) => (
            <ActionMenu 
              onEdit={() => openEdit(rec)} 
              onDelete={() => handleDelete(rec.id)}
              extraItems={[
                { label: 'View Ledger', icon: 'pi pi-book', command: () => openLedger(rec) },
                { label: 'Make Payment', icon: 'pi pi-money-bill', command: () => openPayment(rec) }
              ]}
            />
          )} style={{ textAlign: 'center', width: '80px' }} />
        </DataTable>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Supplier Record" : "Add New Factory/Vendor"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-label">Company Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Company Name *</label>
                  <div className="input-wrapper">
                    <Building size={18} />
                    <input type="text" required value={form.company} placeholder="e.g. Lucky Cement"
                      onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <div className="input-wrapper">
                    <ClipboardList size={18} />
                    <input type="text" value={form.name} placeholder="e.g. Mr. Khan"
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
                  <label>Factory Address</label>
                  <div className="input-wrapper">
                    <MapPin size={18} />
                    <input type="text" value={form.address} placeholder="City, Factory Area"
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="section-label">Financial Balance</div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Initial Balance (Rs.)</label>
                  <div className="input-wrapper">
                    <Banknote size={18} />
                    <input type="number" value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })} 
                      placeholder="Positive: Payable to vendor | Negative: Advance paid" />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editId ? "Update Record" : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger Modal */}
      {showLedgerModal && selectedSupplier && (() => {
        // Calculate the beginning balance before the currently visible list of transactions
        const firstVisibleRow = sortedLedgerData[0];
        const periodOpeningBal = firstVisibleRow 
          ? (parseFloat(firstVisibleRow.running_balance || 0) - (parseFloat(firstVisibleRow.total_amount || 0) - parseFloat(firstVisibleRow.paid_amount || 0))) 
          : ledgerOpeningBalance;

        // Construct visual rows array passed to DataTable
        const datatableRows = [
          {
            id: 'opening',
            isOpening: true,
            purchase_date: null,
            product_name: null,
            vehicle_number: null,
            quantity: null,
            rate: null,
            paid_amount: 0,
            total_amount: 0,
            running_balance: periodOpeningBal
          },
          ...sortedLedgerData
        ];

        return (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1280px', width: '96%' }}>
            <div className="modal-header no-print">
              <div className="header-info" style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <FileText size={24} color="#3b82f6" />
                <h3>Supplier Ledger: {selectedSupplier.company || selectedSupplier.name}</h3>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <button className="btn-secondary" onClick={() => window.print()} style={{padding: '6px 12px', display:'flex', alignItems:'center', gap:'6px'}}>
                  <ClipboardList size={16} /> Print Ledger
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
                <p style={{margin: '10px 0 5px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '5px'}}>Supplier Ledger Statement</p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '14px'}}>
                  <span><strong>Supplier:</strong> {selectedSupplier.name} ({selectedSupplier.company})</span>
                  <span><strong>Period:</strong> {ledgerFilter === 'all' ? 'All Time' : `${ledgerFrom || ''} to ${ledgerTo || ''}`}</span>
                  <span><strong>Print Date:</strong> {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', width: '50px'}}>S.No</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Product / Memo</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Vehicle</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Qty</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Debit</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Credit</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{background: '#f8fafc', fontStyle: 'italic'}}>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>—</td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>Opening</td>
                    <td colSpan="5" style={{border: '1px solid #cbd5e1', padding: '8px'}}>Opening Balance Brought Forward</td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold'}}>
                      Rs. {Math.abs(periodOpeningBal).toLocaleString()} {periodOpeningBal > 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                  
                  {sortedLedgerData.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{index + 1}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{new Date(row.purchase_date).toLocaleDateString()}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>
                        {row.product_name ? `${row.brand || ''} ${row.product_name}` : (row.vehicle_number || row.payment_type || 'Manual Entry')}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{row.product_name ? (row.vehicle_number || '—') : 'N/A'}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>
                        {row.product_name ? `${row.quantity} ${row.unit}` : '—'}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'green'}}>
                        {parseFloat(row.paid_amount) > 0 ? parseFloat(row.paid_amount).toLocaleString() : '—'}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'red'}}>
                        {parseFloat(row.total_amount) > 0 ? parseFloat(row.total_amount).toLocaleString() : '—'}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold'}}>
                        Rs. {Math.abs(parseFloat(row.running_balance || 0)).toLocaleString()} {parseFloat(row.running_balance || 0) > 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background: '#f8fafc', fontWeight: 'bold'}}>
                    <td colSpan="5" style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Final Outstanding Balance:</td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'green'}}>
                      Rs. {sortedLedgerData.reduce((sum,r)=>sum+parseFloat(r.paid_amount||0),0).toLocaleString()}
                    </td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'red'}}>
                      Rs. {sortedLedgerData.reduce((sum,r)=>sum+parseFloat(r.total_amount||0),0).toLocaleString()}
                    </td>
                    <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: parseFloat(selectedSupplier.balance) > 0 ? 'red' : 'green'}}>
                      Rs. {Math.abs(parseFloat(selectedSupplier.balance)).toLocaleString()} ({parseFloat(selectedSupplier.balance) > 0 ? 'Payable' : 'Advance'})
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div style={{marginTop: '40px', display: 'flex', justifyContent: 'space-between'}}>
                <div style={{borderTop: '1px solid #000', width: '200px', textAlign: 'center', paddingTop: '5px'}}>Supplier Signature</div>
                <div style={{borderTop: '1px solid #000', width: '200px', textAlign: 'center', paddingTop: '5px'}}>Authorized Official</div>
              </div>
            </div>

            <div className="detail-body no-print" style={{padding: '20px'}}>
              {/* Date Filter Bar */}
              <div className="profit-filter-bar" style={{marginBottom: '16px', padding: '10px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                <span className="filter-label" style={{fontWeight: 600, color: '#64748b'}}>📅 Period:</span>
                {[
                  { key:'all',   label:'All History' },
                  { key:'today', label:'Today' },
                  { key:'yesterday', label:'Yesterday' },
                  { key:'week',  label:'Last 7 Days' },
                  { key:'month', label:'This Month' },
                  { key:'custom',label:'Custom Range' },
                ].map(f => (
                  <button key={f.key} onClick={() => applyLedgerFilter(f.key)}
                    className={`filter-btn ${ledgerFilter === f.key ? 'active' : ''}`}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.85rem',
                      background: ledgerFilter === f.key ? '#3b82f6' : 'white',
                      color: ledgerFilter === f.key ? 'white' : '#64748b',
                      cursor: 'pointer'
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

              <div className="stats-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="stat-item" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Transactions</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{sortedLedgerData.length} records</div>
                </div>
                <div className="stat-item" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Net Value In Period</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
                    Rs. {sortedLedgerData.reduce((sum, item) => sum + (parseFloat(item.total_amount||0) - parseFloat(item.paid_amount||0)), 0).toLocaleString()}
                  </div>
                </div>
                <div className="stat-item" style={{ background: parseFloat(selectedSupplier.balance) > 0 ? '#fff1f2' : '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Live Ledger Balance</div>
                  <div style={{ fontSize: '1.25rem', color: parseFloat(selectedSupplier.balance) > 0 ? '#e11d48' : '#16a34a', fontWeight: 700 }}>
                    Rs. {Math.abs(parseFloat(selectedSupplier.balance)).toLocaleString()} 
                    <span style={{fontSize:'0.8rem', marginLeft:'8px'}}>({parseFloat(selectedSupplier.balance) > 0 ? 'Payable' : 'Advance'})</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Loading ledger data...</div>
              ) : (
                <div style={{background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden'}}>
                  <DataTable 
                    value={datatableRows} 
                    dataKey="id"
                    scrollable 
                    scrollHeight="380px" 
                    className="p-datatable-sm card-table"
                    stripedRows 
                    responsiveLayout="scroll"
                    rowHover
                    style={{fontSize: '0.9rem'}}
                    tableStyle={{ width: '100%' }}
                    emptyMessage="No records found in this period."
                  >
                    <Column 
                      header="S.No" 
                      body={(row, options) => row.isOpening ? '—' : options.rowIndex} 
                      style={{ width: '45px', textAlign: 'center' }} 
                    />
                    <Column 
                      header="Date" 
                      body={row => {
                        if (row.isOpening) return <span style={{fontStyle:'italic', color:'#64748b'}}>Opening</span>;
                        return (
                          <div>
                            <div style={{fontWeight:500}}>{new Date(row.purchase_date).toLocaleDateString()}</div>
                            <small style={{color:'#94a3b8'}}>{new Date(row.purchase_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
                          </div>
                        );
                      }} 
                      style={{ width: '95px' }} 
                    />
                    <Column 
                      header="Product / Memo" 
                      body={row => {
                        if (row.isOpening) return <span style={{fontStyle:'italic', color:'#64748b', fontWeight:500}}>Opening balance brought forward</span>;
                        if (row.product_name) return <strong style={{color:'#1e293b'}}>{row.brand || ''} {row.product_name}</strong>;
                        return <strong style={{color:'#0284c7', fontSize:'0.85rem', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.2'}}><ClipboardList size={13} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/>{row.vehicle_number || row.payment_type || 'Manual Adjustment'}</strong>;
                      }} 
                      style={{ width: '220px' }}
                    />
                    <Column 
                      header="Vehicle" 
                      body={row => {
                        if (row.isOpening) return null;
                        if (row.product_name) return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.85rem', color:'#475569'}}><Truck size={12}/>{row.vehicle_number || '—'}</span>;
                        return <span style={{color:'#cbd5e1'}}>N/A</span>;
                      }} 
                      style={{ width: '80px' }}
                    />
                    <Column 
                      header="Gatepass" 
                      body={row => {
                        if (row.isOpening) return null;
                        return <span style={{fontWeight: 500, color: '#334155'}}>{row.gatepass || '—'}</span>;
                      }} 
                      style={{ width: '80px' }}
                    />
                    <Column 
                      header="Qty" 
                      body={row => {
                        if (row.isOpening) return null;
                        if (row.product_name && parseFloat(row.total_amount) > 0) {
                          return (
                            <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                              {user?.role === 'admin' ? (
                                <input 
                                  key={`qty-${row.id}`}
                                  type="number" 
                                  defaultValue={row.quantity} 
                                  style={{width: '50px', padding: '2px 4px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px'}}
                                  onBlur={(e) => { if (e.target.value !== String(row.quantity)) handleEntryUpdate(row.id, e.target.value, row.rate); }}
                                  onClick={(e)=>e.stopPropagation()}
                                />
                              ) : <span>{row.quantity}</span>}
                              <small style={{color: '#64748b'}}>{row.unit}</small>
                            </div>
                          );
                        }
                        return <span style={{color: '#cbd5e1'}}>—</span>;
                      }} 
                      style={{ width: '60px' }}
                    />
                    <Column 
                      header="Rate" 
                      body={row => {
                        if (row.isOpening) return null;
                        if (row.product_name && parseFloat(row.total_amount) > 0) {
                          return user?.role === 'admin' ? (
                            <input 
                              key={`rate-${row.id}`}
                              type="number" 
                              defaultValue={row.rate} 
                              style={{width: '60px', padding: '2px 4px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px'}}
                              onBlur={(e) => { if (e.target.value !== String(row.rate)) handleEntryUpdate(row.id, row.quantity, e.target.value); }}
                              onClick={(e)=>e.stopPropagation()}
                            />
                          ) : <span>Rs. {row.rate}</span>;
                        }
                        return <span style={{color: '#cbd5e1'}}>—</span>;
                      }}
                      footer="Period Totals:"
                      footerStyle={{ textAlign: 'right', fontWeight: 'bold', color: '#475569' }}
                      style={{ width: '75px' }}
                    />
                    <Column 
                      header="Debit (-)" 
                      body={row => (!row.isOpening && parseFloat(row.paid_amount) > 0) ? <span style={{fontWeight: '600', color: '#16a34a'}}>Rs. {parseFloat(row.paid_amount).toLocaleString()}</span> : <span style={{color:'#cbd5e1'}}>—</span>}
                      footer={`Rs. ${sortedLedgerData.reduce((sum, r) => sum + parseFloat(r.paid_amount || 0), 0).toLocaleString()}`}
                      footerStyle={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}
                      style={{ textAlign: 'right', width: '110px' }}
                    />
                    <Column 
                      header="Credit (+)" 
                      body={row => (!row.isOpening && parseFloat(row.total_amount) > 0) ? <span style={{fontWeight: '600', color: '#ef4444'}}>Rs. {parseFloat(row.total_amount).toLocaleString()}</span> : <span style={{color:'#cbd5e1'}}>—</span>}
                      footer={`Rs. ${sortedLedgerData.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0).toLocaleString()}`}
                      footerStyle={{ textAlign: 'right', fontWeight: '700', color: '#ef4444' }}
                      style={{ textAlign: 'right', width: '110px' }}
                    />
                    <Column 
                      header="Balance" 
                      body={row => {
                        const b = parseFloat(row.running_balance || 0);
                        return (
                          <span style={{fontWeight: '800', color: b > 0 ? '#e11d48' : '#16a34a'}}>
                            Rs. {Math.abs(b).toLocaleString()}
                            <small style={{marginLeft: '4px', fontWeight: 'normal', fontSize: '0.65rem'}}>{b > 0 ? 'Dr' : 'Cr'}</small>
                          </span>
                        );
                      }}
                      footer={
                        <div>
                          <div style={{fontWeight:'800', fontSize:'0.95rem', color: parseFloat(selectedSupplier.balance) > 0 ? '#e11d48' : '#16a34a'}}>
                            Rs. {Math.abs(parseFloat(selectedSupplier.balance)).toLocaleString()}
                          </div>
                          <small style={{fontSize:'0.6rem', fontWeight:'normal', color:'#64748b'}}>Live Balance</small>
                        </div>
                      }
                      footerStyle={{ textAlign: 'right' }}
                      style={{ textAlign: 'right', width: '120px' }}
                    />
                  </DataTable>
                </div>
              )}

              {/* Bottom Manual Ledger Adjustment Panel */}
              <div className="ledger-adjustment-panel" style={{marginTop: '18px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                <h4 style={{margin: '0 0 12px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem'}}>
                  <Plus size={16} color="#3b82f6" /> Add Manual Ledger Entry (Adjustment)
                </h4>
                <form onSubmit={handlePostAdjustment} style={{display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                  <div className="form-group" style={{flex: '1', minWidth: '140px', margin: 0}}>
                    <label style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', display: 'block', color: '#64748b'}}>Adjustment Type</label>
                    <select 
                      value={adjForm.type} 
                      onChange={e => setAdjForm({...adjForm, type: e.target.value})}
                      style={{width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem'}}
                    >
                      <option value="Debit">Debit (- Decreases Balance)</option>
                      <option value="Credit">Credit (+ Increases Balance)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: '2', minWidth: '200px', margin: 0}}>
                    <label style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', display: 'block', color: '#64748b'}}>Memo / Description</label>
                    <input 
                      type="text" 
                      value={adjForm.notes} 
                      onChange={e => setAdjForm({...adjForm, notes: e.target.value})} 
                      placeholder="e.g. Claim adjustment, discount, manual discount" 
                      required
                      style={{width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem'}}
                    />
                  </div>
                  <div className="form-group" style={{flex: '1', minWidth: '150px', margin: 0}}>
                    <label style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', display: 'block', color: '#64748b'}}>Adjustment Amount (Rs.)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required 
                      value={adjForm.amount} 
                      onChange={e => setAdjForm({...adjForm, amount: e.target.value})} 
                      placeholder="0.00" 
                      style={{width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem'}}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{height: '36px', background: '#2563eb', padding: '0 20px', fontSize: '0.85rem', border: 'none'}} disabled={loading}>
                    {loading ? "Posting..." : "Save Entry"}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="modal-footer no-print" style={{padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn-secondary" onClick={() => setShowLedgerModal(false)}>Close Ledger</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Make Payment Modal */}
      {showPaymentModal && selectedSupplier && (() => {
        const supplierTargetAccount = paymentSource === "Bank" ? selectedBank : "Cash";
        const supplierAvailableBal = liveBalances[supplierTargetAccount] || 0;
        const isSupplierInsufficient = parseFloat(paymentForm.amount || 0) > supplierAvailableBal;
        return (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>Make Payment to {selectedSupplier.company || selectedSupplier.name}</h3>
                <button className="modal-close" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleMakePayment} className="custom-form">
              <div style={{background: '#fff1f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between'}}>
                <span style={{fontWeight: 600, color: '#e11d48'}}>Current Balance:</span>
                <span style={{fontWeight: 700, color: '#e11d48'}}>Rs. {parseFloat(selectedSupplier.balance).toLocaleString()}</span>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Amount Paid (Rs.) *</label>
                <div className="input-wrapper">
                  <Banknote size={18} />
                  <input type="number" step="0.01" required value={paymentForm.amount} placeholder="e.g. 50000"
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Payment Source *</label>
                <select 
                  value={paymentSource}
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}}
                  onChange={(e) => {
                    setPaymentSource(e.target.value);
                    if (e.target.value === "Cash") setSelectedBank("");
                  }}
                >
                  <option value="Cash">Main Cash (Counter)</option>
                  {bankAccounts.some(b => {
                    const name = b.bank_name.toLowerCase().trim();
                    if (name === 'cash' || name === 'cash account') return false;
                    return (b.module_type || 'Wholesale') === activeTab;
                  }) && (
                    <option value="Bank">Bank / Online Account</option>
                  )}
                </select>
              </div>

              {/* Show Bank Dropdown ONLY if source is Bank */}
              {paymentSource === "Bank" && (
                <div className="form-group" style={{marginBottom: '15px'}}>
                  <label>Select Sending Bank *</label>
                  <select 
                    value={selectedBank} 
                    onChange={(e) => setSelectedBank(e.target.value)} 
                    style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f0f9ff', borderColor: '#3b82f6'}}
                    required
                  >
                    <option value="">-- Choose Account --</option>
                    {bankAccounts.filter(b => {
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
              
              {isSupplierInsufficient && (
                <div style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  ⚠️ Insufficient Balance! Available: Rs. {supplierAvailableBal.toLocaleString()}
                </div>
              )}
              
              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Payment Notes / Reference</label>
                <div className="input-wrapper">
                  <ClipboardList size={18} />
                  <input type="text" value={paymentForm.notes} placeholder="e.g. Paid via Check #123" required
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                </div>
              </div>

              <div className="form-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{background: '#10b981', borderColor: '#10b981'}} disabled={loading || isSupplierInsufficient}>
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
