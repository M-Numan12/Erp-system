// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import {
  Users as UsersIcon, Plus, Pencil, Trash2, X, Search, Phone, Mail,
  MapPin, ChevronLeft, CreditCard, Banknote, UserPlus, Info, FileText, Printer,
  MessageCircle, ClipboardList
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import ActionMenu from '../../components/ActionMenu';
import { AuthContext } from "../../context/AuthContext";
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/customers");

const formatItemName = (brand, name) => {
  const b = (brand || '').trim();
  const n = (name || '').trim();
  if (!b || b === 'undefined') return n;
  if (!n) return b;
  
  const bLower = b.toLowerCase();
  const nLower = n.toLowerCase();
  
  if (nLower.includes(bLower)) {
    return n;
  }
  if (bLower.includes(nLower)) {
    return b;
  }
  
  return `${b} ${n}`;
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  balance: "0",
};

export default function Customers({ type }) {
  const { user } = useContext(AuthContext);
  const ledgerReportRef = useRef(null);

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
  const [loading, setLoading] = useState(false);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const liveBalance = useMemo(() => {
    const bal = parseFloat(selectedCustomer?.balance);
    return isNaN(bal) ? 0 : bal;
  }, [selectedCustomer?.balance]);

  const sortedLedgerData = useMemo(() => {
    // 1. Sort chronologically ascending (oldest first)
    const sortedAsc = [...ledgerData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // 2. Backtrack starting balance: Current Balance - Total Period Movements
    const historySum = sortedAsc.reduce((sum, r) => sum + ((parseFloat(r.net_amount) || 0) - (parseFloat(r.paid_amount) || 0)), 0);

    // The starting point before all available history
    const absoluteBaseOpeningBal = liveBalance - historySum;

    // 3. Generate running balance per row
    let running = absoluteBaseOpeningBal;
    const enriched = sortedAsc.map(row => {
      const debit = parseFloat(row.net_amount) || 0;
      const credit = parseFloat(row.paid_amount) || 0;
      running += (debit - credit);
      return { ...row, running_balance: running };
    });

    if (ledgerFilter === 'all') return enriched;

    return enriched.filter(row => {
      if (!row.created_at) return false;
      const rowDate = new Date(row.created_at);
      const rowDateStr = rowDate.toLocaleDateString('en-CA');
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');

      if (ledgerFilter === 'custom' && ledgerFrom && ledgerTo) {
        return rowDateStr >= ledgerFrom && rowDateStr <= ledgerTo;
      }
      if (ledgerFilter === 'today') {
        return rowDateStr === todayStr;
      }
      if (ledgerFilter === 'yesterday') {
        const yest = new Date(); yest.setDate(today.getDate() - 1);
        return rowDateStr === yest.toLocaleDateString('en-CA');
      }
      if (ledgerFilter === 'week') {
        const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
        return rowDateStr >= weekAgo.toLocaleDateString('en-CA') && rowDateStr <= todayStr;
      }
      if (ledgerFilter === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return rowDateStr >= monthStart.toLocaleDateString('en-CA') && rowDateStr <= todayStr;
      }
      return true;
    });
  }, [ledgerData, liveBalance, ledgerFilter, ledgerFrom, ledgerTo]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  // Loading state for undo payment action (admin only)
  const [undoLoading, setUndoLoading] = useState(false);
  const [adjForm, setAdjForm] = useState({ type: "Debit", amount: "", notes: "" });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPdfUrl, setWhatsAppPdfUrl] = useState("");
  const [whatsAppPdfBase64, setWhatsAppPdfBase64] = useState("");

  const dataURItoBlob = (dataURI) => {
    try {
      const byteString = atob(dataURI.split(',')[1]);
      const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    } catch (e) {
      console.error("Failed to convert dataURI to Blob", e);
      return null;
    }
  };

  const closeWhatsAppModal = () => {
    if (whatsAppPdfUrl) {
      try { URL.revokeObjectURL(whatsAppPdfUrl); } catch (e) {}
    }
    setWhatsAppPdfUrl("");
    setWhatsAppPdfBase64("");
    setShowWhatsAppModal(false);
  };

  const handleConfirmWhatsAppSend = async () => {
    let phone = (selectedCustomer.phone || '').trim().replace(/[^0-9]/g, '');
    if (phone.startsWith('00')) {
      phone = phone.substring(2);
    }
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1);
    }
    if (phone.length === 10 && phone.startsWith('3')) {
      phone = '92' + phone;
    }
    if (phone.startsWith('920')) {
      phone = '92' + phone.substring(3);
    }
    if (phone.startsWith('923') && phone.length > 12) {
      phone = phone.substring(0, 12);
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/send-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: phone,
          document: whatsAppPdfBase64,
          filename: `Ledger_${selectedCustomer.name.replace(/\s+/g, '_')}.pdf`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Ledger PDF sent successfully via WhatsApp!");
        closeWhatsAppModal();
      } else {
        alert(`Failed to send WhatsApp PDF: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Send WhatsApp error:", err);
      alert("Error sending Ledger PDF.");
    } finally {
      setLoading(false);
    }
  };


  // Receipt Generator 
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

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
    if (!activeTab) return;
    fetchRecords();
    const interval = setInterval(fetchRecords, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // If Admin and no counter selected, show selection screen
  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's customer directory you want to manage</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">🏢</div>
            <h3>Wholesale</h3>
            <span>Main Warehouse</span>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">🏪</div>
            <h3>Retail 1</h3>
            <span>Counter A</span>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🏬</div>
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
      address: rec.address || "",
      balance: rec.balance,
    });
    setEditId(rec.id);
    setShowModal(true);
  };

  const openLedger = async (customer, filter = "all") => {
    setSelectedCustomer(customer);
    setLedgerFilter(filter);
    setLedgerFrom("");
    setLedgerTo("");
    setShowLedgerModal(true);
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/sales/ledger/${customer.id}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLedgerData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
      setLedgerData([]);
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
      const yest = new Date(); yest.setDate(today.getDate() - 1);
      const yt = yest.toLocaleDateString('en-CA');
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

  const openPayment = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount("");
    setPaymentRef("");
    setPaymentType("Cash");
    setSelectedBank("");
    setShowPaymentModal(true);
  };

  // Unified undo payment function
  const handleUndoPayment = async (paymentId) => {
    if (!paymentId) return;
    if (!window.confirm('Are you sure you want to undo this payment? This will revert the customer balance.')) return;
    setUndoLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/payment/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ payment_id: paymentId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Payment undone successfully');
        fetchRecords();
        if (selectedCustomer) openLedger(selectedCustomer);
      } else {
        alert(data.error || 'Undo payment failed');
      }
    } catch (err) {
      console.error('Undo payment error:', err);
      alert('An error occurred while undoing payment');
    } finally {
      setUndoLoading(false);
    }
  };

  const handlePostAdjustment = async (e) => {
    e.preventDefault();
    if (!adjForm.amount || parseFloat(adjForm.amount) <= 0) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/adjustment`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          amount: adjForm.amount,
          notes: adjForm.notes,
          type: adjForm.type,
          module_type: activeTab
        })
      });
      if (res.ok) {
        setAdjForm({ type: "Debit", amount: "", notes: "" });
        const updatedRecords = await fetchRecords();
        const updatedCust = (updatedRecords || []).find(c => c.id === selectedCustomer.id);
        if (updatedCust) setSelectedCustomer(updatedCust);
        // Refetch ledger using existing state values
        openLedger(updatedCust || selectedCustomer, ledgerFilter);
      }
    } catch (err) { console.error("Adjustment post failed", err); }
    setLoading(false);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) return alert("Enter a valid amount");

    // Remove the restriction - allow any payment amount
    // The excess will automatically become advance (negative balance)

    let finalPaymentType = paymentType;
    if (paymentType === 'Bank') {
      if (!selectedBank) return alert("Select a bank account");
      finalPaymentType = `Bank - ${selectedBank}`;
    }

    setLoading(true);
    try {
      const res = await fetch((API_BASE_URL + "/sales/payment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          amount: parseFloat(paymentAmount),
          payment_reference: paymentRef,
          payment_type: finalPaymentType,
          module_type: activeTab
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setShowPaymentModal(false);
        const previousBal = liveBalance;
        const amt = parseFloat(paymentAmount);
        const remBal = previousBal - amt;

        setReceiptData({
          id: resData.recordId || "N/A",
          customer_name: selectedCustomer.name,
          customer_phone: selectedCustomer.phone || "",
          customer_address: selectedCustomer.address || "",
          amount: amt,
          payment_type: finalPaymentType,
          payment_date: new Date().toISOString(),
          previousBalance: previousBal,
          newBalance: remBal,
          isAdvance: remBal < 0
        });
        setShowReceipt(true);
        fetchRecords();
        if (showLedgerModal) {
          openLedger(selectedCustomer); // refresh ledger
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

  const handleItemUpdate = async (saleId, itemId, newQty, newRate) => {
    try {
      const res = await fetch((API_BASE_URL + "/sales/update-item"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sale_id: saleId,
          item_id: itemId,
          new_qty: newQty,
          new_rate: newRate
        }),
      });
      if (res.ok) {
        const updatedRecords = await fetchRecords(); // Make sure fetchRecords returns data or wait for state update
        // Find updated customer and refresh selected state
        const updatedCust = (updatedRecords || []).find(c => c.id === selectedCustomer.id);
        if (updatedCust) setSelectedCustomer(updatedCust);

        openLedger(updatedCust || selectedCustomer, ledgerFilter); // Refresh ledger
      }
    } catch (err) {
      console.error("Failed to update item", err);
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
      console.error("Failed to save customer", err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    });
    fetchRecords();
  };

  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || "").includes(search)
  );

  const totalReceivable = filtered.filter(r => parseFloat(r.balance) > 0).reduce((sum, r) => sum + parseFloat(r.balance), 0);
  const totalPayable = filtered.filter(r => parseFloat(r.balance) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.balance)), 0);

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          <button className="btn-icon back-btn" onClick={() => window.history.back()} style={{ marginRight: '15px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }}>
            <ChevronLeft size={20} />
          </button>
          <div className="module-icon investment-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><UsersIcon size={28} /></div>
          <div>
            <h1>{activeTab} CRM</h1>
            <p>Manage customer directory and ledger balances</p>
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
          <Plus size={18} /> Add New Customer
        </button>
      </div>

      <div className="stats-grid-pos">
        <div className="pos-stat-card">
          <div className="icon blue"><UsersIcon size={24} /></div>
          <div className="info">
            <span className="label">Total Customers</span>
            <span className="value">{filtered.length} Users</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><CreditCard size={24} /></div>
          <div className="info">
            <span className="label">Receivables</span>
            <span className="value">Rs. {totalReceivable.toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><Banknote size={24} /></div>
          <div className="info">
            <span className="label">Payables</span>
            <span className="value">Rs. {totalPayable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="module-table-container" style={{ padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <DataTable value={filtered} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
          emptyMessage="No customers found." className="p-datatable-sm" stripedRows>
          <Column field="id" header="ID" body={(rec) => <span style={{ fontWeight: 600, color: '#64748b' }}>#{rec.id}</span>} sortable style={{ width: '80px' }} />

          <Column field="name" header="Customer Name" body={(rec) => (
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{rec.name}</span>
          )} sortable />

          <Column header="Contact Details" body={(rec) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}><Phone size={12} /> {rec.phone || "—"}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}><Mail size={12} /> {rec.email || "—"}</div>
            </div>
          )} />

          <Column header="Location" body={(rec) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569' }}><MapPin size={12} /> {rec.address || "—"}</div>
          )} />

          <Column field="balance" header="Ledger Balance" body={(rec) => (
            <span style={{ fontWeight: 800, fontSize: '1rem', color: parseFloat(rec.balance) > 0 ? '#16a34a' : parseFloat(rec.balance) < 0 ? '#e11d48' : '#64748b' }}>
              Rs. {parseFloat(rec.balance).toLocaleString()}
            </span>
          )} sortable />

          <Column header="" body={(rec) => (
            <ActionMenu
              onEdit={() => openEdit(rec)}
              onDelete={() => handleDelete(rec.id)}
              extraItems={[
                { label: 'View Ledger', icon: 'pi pi-book', command: () => openLedger(rec) },
                { label: 'Receive Payment', icon: 'pi pi-money-bill', command: () => openPayment(rec) }
              ]}
            />
          )} style={{ textAlign: 'center', width: '80px' }} />
        </DataTable>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Customer Profile" : "Create New Customer"}</h3>
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
                    <input type="text" value={form.phone} placeholder="e.g. 300-1234567"
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.startsWith('0')) {
                          val = val.substring(1);
                        }
                        setForm({ ...form, phone: val });
                      }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} />
                    <input type="email" value={form.email} placeholder="e.g. ali@example.com"
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
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

              <div className="section-label">Financial Ledger</div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Opening Balance (Rs.)</label>
                  <div className="input-wrapper">
                    <Banknote size={18} />
                    <input type="number" value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      placeholder="Positive: Receivable | Negative: Payable" />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editId ? "Update Profile" : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedCustomer && (() => {
        // Compute filtered range opening balance
        const firstVisibleRow = sortedLedgerData[0];
        const periodOpeningBal = firstVisibleRow
          ? (parseFloat(firstVisibleRow.running_balance || 0) - (parseFloat(firstVisibleRow.net_amount || 0) - parseFloat(firstVisibleRow.paid_amount || 0)))
          : liveBalance;

        const sendToWhatsApp = async () => {
          let phone = (selectedCustomer.phone || '').trim().replace(/[^\d+]/g, '');
          if (!phone) {
            alert("Customer has no phone number entered!");
            return;
          }

          if (!window.html2pdf) {
            alert("PDF generation library is loading, please try again in a second.");
            return;
          }

          // Select the print-only ledger element
          const element = ledgerReportRef.current;
          if (!element) {
            alert("Ledger report content not found in page!");
            return;
          }

          setLoading(true);
          // Clone the element and prepare it for PDF rendering
          const clone = element.cloneNode(true);
          clone.classList.remove('print-only');
          clone.style.position = 'fixed';
          clone.style.left = '0';
          clone.style.top = '0';
          clone.style.zIndex = '1';
          clone.style.background = 'white';
          clone.style.color = 'black';
          clone.style.width = '1000px'; // Fit table nicely on A4 page
          document.body.appendChild(clone);

          const opt = {
            margin: [10, 10, 10, 10],
            filename: `ledger_${selectedCustomer.name}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          try {
            // Generate PDF as base64 string from the clone
            const pdfBase64 = await window.html2pdf().from(clone).set(opt).outputPdf('datauristring');

            // Clean up the clone from the DOM
            document.body.removeChild(clone);

            // Store PDF base64 and create blob URL for iframe preview
            setWhatsAppPdfBase64(pdfBase64);
            const blob = dataURItoBlob(pdfBase64);
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              setWhatsAppPdfUrl(blobUrl);
            } else {
              setWhatsAppPdfUrl(pdfBase64);
            }
            setShowWhatsAppModal(true);
          } catch (err) {
            console.error("PDF generation/send error:", err);
            // Clean up the clone in case of error
            if (document.body.contains(clone)) {
              document.body.removeChild(clone);
            }
            alert("Error generating Ledger PDF.");
          } finally {
            setLoading(false);
          }
        };

        // Construct rows for PrimeReact DataTable
        const datatableRows = [
          {
            id: 'opening',
            isOpening: true,
            created_at: null,
            items: [],
            vehicle_number: null,
            paid_amount: 0,
            total_amount: 0,
            running_balance: periodOpeningBal
          },
          ...sortedLedgerData
        ];

        return (
          <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1150px', width: '98%' }}>
              <div className="modal-header no-print">
                <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <UsersIcon size={24} color="#3b82f6" />
                  <h3>Customer Ledger: {selectedCustomer.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={sendToWhatsApp} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', color: 'white', border: 'none' }}>
                    <MessageCircle size={16} /> Send to WhatsApp
                  </button>
                  <button className="btn-secondary" onClick={() => window.print()} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} /> Print Ledger
                  </button>
                  <button className="modal-close" onClick={() => setShowLedgerModal(false)}><X size={20} /></button>
                </div>
              </div>

              {/* Print Only Ledger Report */}
              <div ref={ledgerReportRef} className="ledger-report print-only" style={{ padding: '20px', color: 'black' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                  {activeTab === 'Retail 2' ? (
                    <>
                      <h2 style={{ margin: 0 }}>DATA WALEY</h2>
                      <h3 style={{ fontSize: '15px', fontWeight: 'normal', margin: '2px 0 8px 0' }}>RETAIL 2</h3>
                      <div style={{ fontSize: '12px', margin: '5px 0' }}>
                        <p style={{ margin: '2px 0' }}>Waqar Butt: 0311-4105840</p>
                        <p style={{ margin: '2px 0' }}>Mhd Aiss: 0335-1430216</p>
                        <p style={{ margin: '2px 0' }}>Saifullah: 0333-4714628</p>
                      </div>
                      <p style={{ fontSize: '11px', margin: '5px 0' }}>
                        Ada Treadywali Stop Main Jaranwala Road,<br />
                        District Sheikupura.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 style={{ margin: 0 }}>DATA WALEY</h2>
                      <h3 style={{ fontSize: '15px', fontWeight: 'normal', margin: '2px 0 8px 0' }}>CEMENT DEALER</h3>
                      <div style={{ fontSize: '12px', margin: '5px 0' }}>
                        <p style={{ margin: '2px 0' }}>Tariq Mehmood: 0300-4269347</p>
                        <p style={{ margin: '2px 0' }}>Mian Shehroz: 0335-4294300</p>
                        <p style={{ margin: '2px 0' }}>Ziaullah: 0322-4295106</p>
                      </div>
                      <p style={{ fontSize: '11px', margin: '5px 0' }}>
                        12-KM Main Lahore Sheikhupura Road,<br />
                        Ada Kot Abdul Malik.
                      </p>
                    </>
                  )}
                  <p style={{ margin: '10px 0 5px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '5px' }}>Customer Financial Ledger Report</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '14px' }}>
                    <span><strong>Customer:</strong> {selectedCustomer.name}</span>
                    <span><strong>Period:</strong> {ledgerFilter === 'all' ? 'All Time' : `${ledgerFrom} to ${ledgerTo}`}</span>
                    <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', width: '50px' }}>S.No.</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Date</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Ref/Bill</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Product / Details</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Vehicle</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Debit (+)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Credit (-)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#f8fafc', fontStyle: 'italic' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>—</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>Opening</td>
                      <td colSpan="5" style={{ border: '1px solid #cbd5e1', padding: '8px' }}>Opening Balance Brought Forward</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                        Rs. {Math.abs(periodOpeningBal).toLocaleString()} {periodOpeningBal > 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>

                    {sortedLedgerData.map((row, index) => {
                      let items = [];
                      try { items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []); } catch (e) { }
                      const isReturn = parseFloat(row.net_amount) < 0;
                      const debitVal = !isReturn && parseFloat(row.net_amount) > 0 ? parseFloat(row.net_amount) : 0;
                      const creditVal = isReturn ? Math.abs(parseFloat(row.net_amount)) : (parseFloat(row.paid_amount) > 0 ? parseFloat(row.paid_amount) : 0);
                      return (
                        <tr key={row.id} style={isReturn ? { background: '#f0fdf4' } : {}}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{new Date(row.created_at).toLocaleDateString()}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>#SAL-{row.id}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                            {isReturn
                              ? (() => {
                                  let details = '↩ Stock Return';
                                  if (items.length > 0) details += ': ' + items.map(i => `${formatItemName(i.brand, i.name)} (${Math.abs(i.qty)} x Rs. ${i.rate})`).join(', ');
                                  if (Math.abs(parseFloat(row.paid_amount) || 0) > 0) details += ` | Cash Refund: Rs. ${Math.abs(parseFloat(row.paid_amount)).toLocaleString()} (${row.payment_type || 'Cash'})`;
                                  return details;
                                })()
                              : items.length > 0
                                ? (() => {
                                    let details = items.map(i => `${formatItemName(i.brand, i.name)} (${i.qty} x Rs. ${i.rate})`).join(', ');
                                    if (parseFloat(row.delivery_charges || 0) > 0) details += ` + Delivery (Rs. ${parseFloat(row.delivery_charges).toLocaleString()})`;
                                    if (parseFloat(row.discount || 0) > 0) details += ` - Discount (Rs. ${parseFloat(row.discount).toLocaleString()})`;
                                    return details;
                                  })()
                                : row.payment_type && (row.payment_type.includes('Adjustment') || row.payment_type.includes('Manual Adjustment'))
                                  ? row.payment_type
                                  : `Payment Received (${row.payment_type || 'Cash'})`
                            }
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                            {row.vehicle_number && row.vehicle_number2
                              ? `${row.vehicle_number} / ${row.vehicle_number2}`
                              : (row.vehicle_number || '—')
                            }
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'red' }}>
                            {debitVal > 0 ? debitVal.toLocaleString() : '—'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'green' }}>
                            {creditVal > 0 ? creditVal.toLocaleString() : '—'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                            Rs. {Math.abs(parseFloat(row.running_balance || 0)).toLocaleString()} {parseFloat(row.running_balance || 0) > 0 ? 'Dr' : 'Cr'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                   <tfoot>
                     <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                       <td colSpan="5" style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Period Totals:</td>
                       <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'red' }}>
                         Rs. {sortedLedgerData.reduce((sum, r) => sum + (parseFloat(r.net_amount) > 0 ? parseFloat(r.net_amount) : 0), 0).toLocaleString()}
                       </td>
                       <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: 'green' }}>
                         Rs. {sortedLedgerData.reduce((sum, r) => {
                           const net = parseFloat(r.net_amount) || 0;
                           const paid = parseFloat(r.paid_amount) || 0;
                           return sum + (net < 0 ? Math.abs(net) : (paid > 0 ? paid : 0));
                         }, 0).toLocaleString()}
                       </td>
                       <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: liveBalance > 0 ? 'red' : 'green' }}>
                         Rs. {Math.abs(liveBalance).toLocaleString()} ({liveBalance > 0 ? 'Receivable' : 'Advance'})
                       </td>
                     </tr>
                   </tfoot>
                </table>
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ borderTop: '1px solid #000', width: '200px', textAlign: 'center', paddingTop: '5px' }}>Customer Signature</div>
                  <div style={{ borderTop: '1px solid #000', width: '200px', textAlign: 'center', paddingTop: '5px' }}>Authorized Signature</div>
                </div>
              </div>

              <div className="detail-body no-print" style={{ padding: '24px' }}>
                {/* Date Filter Bar */}
                <div className="profit-filter-bar" style={{ marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="filter-label" style={{ fontWeight: 600, color: '#64748b' }}>📅 Period:</span>
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'week', label: '7 Days' },
                    { key: 'month', label: 'Month' },
                    { key: 'custom', label: 'Custom' },
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
                    <div className="custom-date-row" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <input type="date" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      <span className="sep">→</span>
                      <input type="date" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      <button className="btn-primary" onClick={() => setLedgerFilter('custom')} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>Apply</button>
                    </div>
                  )}
                </div>

                <div className="stats-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div className="stat-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Records</div>
                    <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{sortedLedgerData.length} items</div>
                  </div>
                  <div className="stat-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Billed Value</div>
                    <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Rs. {sortedLedgerData.reduce((sum, item) => sum + parseFloat(item.total_amount), 0).toLocaleString()}</div>
                  </div>
                  <div className="stat-item" style={{ background: liveBalance > 0 ? '#fff1f2' : '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Live Balance</div>
                    <div style={{ fontSize: '1.25rem', color: liveBalance > 0 ? '#e11d48' : '#16a34a', fontWeight: 700 }}>
                      Rs. {Math.abs(liveBalance).toLocaleString()}
                      <span style={{ fontSize: '0.8rem', marginLeft: '8px' }}>({liveBalance > 0 ? 'Receivable' : 'Advance'})</span>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading ledger data...</div>
                ) : (
                  <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <DataTable
                      value={datatableRows}
                      scrollable
                      scrollHeight="380px"
                      className="p-datatable-sm card-table"
                      stripedRows
                      responsiveLayout="scroll"
                      rowHover
                      style={{ fontSize: '0.9rem' }}
                      emptyMessage="No records found in this period."
                    >
                      <Column
                        header="S.No"
                        body={(row, options) => row.isOpening ? '—' : options.rowIndex}
                        style={{ width: '50px', textAlign: 'center' }}
                      />
                      <Column
                        header="Date / Ref"
                        body={row => {
                          if (row.isOpening) return <span style={{ fontStyle: 'italic', color: '#64748b' }}>Opening</span>;
                          return (
                            <div>
                              <div style={{ fontWeight: 500 }}>{new Date(row.created_at).toLocaleDateString()}</div>
                              <small style={{ color: '#94a3b8', display: 'block' }}>{new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                              <span style={{ fontWeight: 600, color: '#0284c7', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>#SAL-{row.id}</span>
                            </div>
                          );
                        }}
                        style={{ width: '110px' }}
                      />
                      <Column
                        header="Product Name / Description"
                        body={row => {
                          if (row.isOpening) return <span style={{ fontStyle: 'italic', color: '#64748b', fontWeight: 500 }}>Opening balance brought forward</span>;
                          let items = [];
                          try { items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []); } catch (e) { }
                          if (items.length > 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      fontWeight: 600,
                                      color: '#1e293b',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={formatItemName(item.brand, item.name)}
                                  >
                                    {formatItemName(item.brand, item.name)}
                                  </div>
                                ))}
                                {parseFloat(row.delivery_charges || 0) > 0 && (
                                  <div style={{ fontWeight: 700, color: '#3b82f6', height: '24px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>Delivery</div>
                                )}
                                {parseFloat(row.discount || 0) > 0 && (
                                  <div style={{ fontWeight: 700, color: '#ef4444', height: '24px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>Discount</div>
                                )}
                              </div>
                            );
                          }
                          const isReturn = parseFloat(row.net_amount) < 0;
                          if (isReturn) {
                            return <strong style={{ color: '#d97706', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>↩ Stock Return{Math.abs(parseFloat(row.paid_amount) || 0) > 0 ? ` | Cash Refund (${row.payment_type || 'Cash'})` : ''}</strong>;
                          }
                          const isAdjustment = row.payment_type && (row.payment_type.includes('Adjustment') || row.payment_type.includes('Manual Adjustment'));
                          if (isAdjustment) {
                            return <strong style={{ color: '#0284c7', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><ClipboardList size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{row.payment_type}</strong>;
                          }
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#10b981', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                <CreditCard size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                Payment Received ({row.payment_type || 'Cash'})
                              </strong>
                              {user?.role === 'admin' && parseFloat(row.net_amount) === 0 && parseFloat(row.paid_amount) > 0 && (
                                <button className="btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem', height: '20px', lineHeight: '1' }} onClick={() => handleUndoPayment(row.id)} disabled={undoLoading}>
                                  Undo
                                </button>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Column
                        header="Vehicle"
                        body={row => {
                          if (row.isOpening) return null;
                          const vNum1 = row.vehicle_number;
                          const vNum2 = row.vehicle_number2;
                          if (vNum1 && vNum2) {
                            return <span style={{ fontWeight: 500, color: '#475569' }}>{vNum1} / {vNum2}</span>;
                          }
                          if (vNum1) {
                            return <span style={{ fontWeight: 500, color: '#475569' }}>{vNum1}</span>;
                          }
                          return <span style={{ color: '#cbd5e1' }}>—</span>;
                        }}
                        style={{ width: '100px' }}
                      />
                      <Column
                        header="Qty"
                        body={row => {
                          if (row.isOpening) return null;
                          let items = [];
                          try { items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []); } catch (e) { }
                          if (items.length > 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {items.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
                                    {user?.role === 'admin' ? (
                                      <input
                                        type="number"
                                        defaultValue={item.qty}
                                        style={{ width: '45px', padding: '2px 4px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        onBlur={(e) => { if (e.target.value !== String(item.qty)) handleItemUpdate(row.id, item.id, e.target.value, item.rate); }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : <span>{item.qty}</span>}
                                  </div>
                                ))}
                                {parseFloat(row.delivery_charges || 0) > 0 && (
                                  <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b' }}>—</span>
                                  </div>
                                )}
                                {parseFloat(row.discount || 0) > 0 && (
                                  <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b' }}>—</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return <span style={{ color: '#cbd5e1' }}>—</span>;
                        }}
                        style={{ width: '70px' }}
                      />
                      <Column
                        header="Rate"
                        body={row => {
                          if (row.isOpening) return null;
                          let items = [];
                          try { items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []); } catch (e) { }
                          if (items.length > 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {items.map((item, idx) => (
                                  <div key={idx} style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                                    {user?.role === 'admin' ? (
                                      <input
                                        type="number"
                                        defaultValue={item.rate}
                                        style={{ width: '55px', padding: '2px 4px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        onBlur={(e) => { if (e.target.value !== String(item.rate)) handleItemUpdate(row.id, item.id, item.qty, e.target.value); }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : <span style={{ fontSize: '0.85rem' }}>Rs.{item.rate}</span>}
                                  </div>
                                ))}
                                {parseFloat(row.delivery_charges || 0) > 0 && (
                                  <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rs. {parseFloat(row.delivery_charges).toLocaleString()}</span>
                                  </div>
                                )}
                                {parseFloat(row.discount || 0) > 0 && (
                                  <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>-Rs. {parseFloat(row.discount).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return <span style={{ color: '#cbd5e1' }}>—</span>;
                        }}
                        footer="Period Totals:"
                        footerStyle={{ textAlign: 'right', fontWeight: 'bold', color: '#475569' }}
                        style={{ width: '75px' }}
                      />
                      <Column
                        header="Debit (+)"
                        body={row => {
                          if (row.isOpening) return <span style={{ color: '#cbd5e1' }}>—</span>;
                          const net = parseFloat(row.net_amount) || 0;
                          return net > 0 ? <span style={{ fontWeight: '600', color: '#ef4444' }}>Rs. {net.toLocaleString()}</span> : <span style={{ color: '#cbd5e1' }}>—</span>;
                        }}
                        footer={`Rs. ${sortedLedgerData.reduce((sum, r) => sum + (parseFloat(r.net_amount) > 0 ? parseFloat(r.net_amount) : 0), 0).toLocaleString()}`}
                        footerStyle={{ textAlign: 'right', fontWeight: '700', color: '#ef4444' }}
                        style={{ textAlign: 'right', width: '100px' }}
                      />
                      <Column
                        header="Credit (-)"
                        body={row => {
                          if (row.isOpening) return <span style={{ color: '#cbd5e1' }}>—</span>;
                          const net = parseFloat(row.net_amount) || 0;
                          const paid = parseFloat(row.paid_amount) || 0;
                          // For returns: net_amount is negative → show absolute as credit
                          const creditVal = net < 0 ? Math.abs(net) : (paid > 0 ? paid : 0);
                          return creditVal > 0
                            ? <span style={{ fontWeight: '600', color: '#16a34a' }}>Rs. {creditVal.toLocaleString()}</span>
                            : <span style={{ color: '#cbd5e1' }}>—</span>;
                        }}
                        footer={`Rs. ${sortedLedgerData.reduce((sum, r) => {
                          const net = parseFloat(r.net_amount) || 0;
                          const paid = parseFloat(r.paid_amount) || 0;
                          return sum + (net < 0 ? Math.abs(net) : (paid > 0 ? paid : 0));
                        }, 0).toLocaleString()}`}
                        footerStyle={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}
                        style={{ textAlign: 'right', width: '100px' }}
                      />
                      <Column
                        header="Balance"
                        body={row => {
                          const b = parseFloat(row.running_balance || 0);
                          return (
                            <span style={{ fontWeight: '800', color: b > 0 ? '#e11d48' : '#16a34a' }}>
                              Rs. {Math.abs(b).toLocaleString()}
                              <small style={{ marginLeft: '4px', fontWeight: 'normal', fontSize: '0.65rem' }}>{b > 0 ? 'Dr' : 'Cr'}</small>
                            </span>
                          );
                        }}
                        footer={
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: liveBalance > 0 ? '#e11d48' : '#16a34a' }}>
                              Rs. {Math.abs(liveBalance).toLocaleString()}
                            </div>
                            <small style={{ fontSize: '0.6rem', fontWeight: 'normal', color: '#64748b' }}>Live Balance</small>
                          </div>
                        }
                        footerStyle={{ textAlign: 'right' }}
                        style={{ textAlign: 'right', width: '130px' }}
                      />
                    </DataTable>
                  </div>
                )}

                {/* Bottom Manual Ledger Adjustment Panel (Admin only) */}
                {user?.role === 'admin' && (
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
                          <option value="Debit">Debit (+ Increases Balance)</option>
                          <option value="Credit">Credit (- Decreases Balance)</option>
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
                )}
              </div>

              <div className="modal-footer no-print" style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowLedgerModal(false)}>Close Ledger</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Receive Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Receive Payment</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePayment} className="custom-form">
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Customer</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{selectedCustomer.name}</div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current Balance:</span>
                  <span style={{ fontWeight: 700, color: liveBalance > 0 ? '#e11d48' : liveBalance < 0 ? '#3b82f6' : '#64748b' }}>
                    Rs. {Math.abs(liveBalance).toLocaleString()}
                    {liveBalance > 0 ? ' (Receivable)' : liveBalance < 0 ? ' (Advance)' : ' (Settled)'}
                  </span>
                </div>
                {liveBalance < 0 && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#3b82f6', background: '#eff6ff', padding: '6px', borderRadius: '4px' }}>
                    ⚡ Customer has advance balance of Rs. {Math.abs(liveBalance).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Payment Amount *</label>
                <div className="input-wrapper">
                  <Banknote size={18} />
                  <input type="number" required min="1" value={paymentAmount} placeholder="e.g. 5000"
                    onChange={(e) => setPaymentAmount(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Payment Method *</label>
                <select value={paymentType} onChange={(e) => {
                  setPaymentType(e.target.value);
                  if (e.target.value !== 'Bank') setSelectedBank("");
                }}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="Cash">Cash Account</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {paymentType === 'Bank' && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>Select Receiving Bank *</label>
                  <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#f0f9ff', outline: 'none' }}
                    required
                  >
                    <option value="">-- Select Admin Bank --</option>
                    {bankAccounts.filter(b => {
                      const name = b.bank_name.toLowerCase().trim();
                      return name !== 'cash' && name !== 'cash account' && (b.module_type || 'Wholesale') === activeTab;
                    }).map(b => {
                      const digits = b.account_number ? b.account_number.slice(-4) : '';
                      return <option key={b.id} value={`${b.bank_name} ${digits ? `(****${digits})` : ''}`}>{b.bank_name} {digits ? `(****${digits})` : ''}</option>;
                    })}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Reference / Note (Optional)</label>
                <div className="input-wrapper">
                  <FileText size={18} />
                  <input type="text" value={paymentRef} placeholder="e.g. Sent via Easypaisa"
                    onChange={(e) => setPaymentRef(e.target.value)} />
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Receipt Modal - with advance breakdown */}
      {showReceipt && receiptData && (
        <div className="modal-overlay receipt-preview-overlay" style={{ zIndex: 1000 }} onClick={() => setShowReceipt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', borderRadius: '12px', padding: '20px', border: 'none', background: '#ffffff' }}>
            <div className="modal-header no-print" style={{ padding: '0 0 15px 0', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
              <h3>📋 Payment Voucher</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => window.print()} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}><Printer size={16} /> Print Bill</button>
                <button className="modal-close" onClick={() => setShowReceipt(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
            </div>

            <div className="print-bill-box" style={{ background: 'white', padding: '0', width: '100%', color: 'black', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center' }}>
                <h2>DATA WALEY</h2>
                {activeTab === 'Retail 2' ? (
                  <>
                    <h3 style={{ fontSize: '14px', fontWeight: 'normal', margin: '2px 0 8px 0' }}>RETAIL 2</h3>
                    <div style={{ fontSize: '11px', margin: '5px 0' }}>
                      <p style={{ margin: '2px 0' }}>Waqar Butt: 0311-4105840</p>
                      <p style={{ margin: '2px 0' }}>Mhd Aiss: 0335-1430216</p>
                      <p style={{ margin: '2px 0' }}>Saifullah: 0333-4714628</p>
                    </div>
                    <p style={{ fontSize: '10px', margin: '5px 0' }}>
                      Ada Treadywali Stop Main Jaranwala Road,<br />
                      District Sheikupura.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '14px', fontWeight: 'normal', margin: '2px 0 8px 0' }}>CEMENT DEALER</h3>
                    <div style={{ fontSize: '11px', margin: '5px 0' }}>
                      <p style={{ margin: '2px 0' }}>Tariq Mehmood: 0300-4269347</p>
                      <p style={{ margin: '2px 0' }}>Mian Shehroz: 0335-4294300</p>
                      <p style={{ margin: '2px 0' }}>Ziaullah: 0322-4295106</p>
                    </div>
                    <p style={{ fontSize: '10px', margin: '5px 0' }}>
                      12-KM Main Lahore Sheikhupura Road,<br />
                      Ada Kot Abdul Malik.
                    </p>
                  </>
                )}
              </div>

              <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>
              <h3 style={{ textAlign: 'center', fontSize: '15px', margin: '8px 0', fontWeight: '900' }}>RECEIPT VOUCHER</h3>

              <div style={{ margin: '10px 0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Receipt No</span> <span>: PYM-{receiptData.id}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Date</span> <span>: {new Date(receiptData.payment_date).toLocaleDateString()} {new Date(receiptData.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Name</span> <span>: {receiptData.customer_name}</span></div>
                {receiptData.customer_phone && <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Phone</span> <span>: {receiptData.customer_phone}</span></div>}
                {receiptData.customer_address && <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Address</span> <span>: {receiptData.customer_address}</span></div>}
                <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Payment Type</span> <span>: {receiptData.payment_type}</span></div>
              </div>

              <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', margin: '5px 0' }}>
                <span>PAID NOW</span>
                <span>Rs. {receiptData.amount.toLocaleString()}/-</span>
              </div>

              <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '5px 0' }}>
                <span>PREVIOUS BALANCE</span>
                <span>Rs. {receiptData.previousBalance.toLocaleString()}/-</span>
              </div>

              {/* Advance breakdown - Change #4 */}
              {receiptData.isAdvance && receiptData.previousBalance > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '5px 0', color: '#16a34a' }}>
                    <span>PAID AGAINST BILL</span>
                    <span>Rs. {receiptData.previousBalance.toLocaleString()}/-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '5px 0', color: '#3b82f6' }}>
                    <span>ADVANCE PAYMENT</span>
                    <span>Rs. {(receiptData.amount - receiptData.previousBalance).toLocaleString()}/-</span>
                  </div>
                </>
              )}

              {receiptData.isAdvance && receiptData.previousBalance <= 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '5px 0', color: '#3b82f6' }}>
                  <span>ADVANCE PAYMENT</span>
                  <span>Rs. {receiptData.amount.toLocaleString()}/-</span>
                </div>
              )}

              <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', margin: '5px 0' }}>
                <span>{receiptData.newBalance < 0 ? 'ADVANCE BALANCE' : 'REMAINING BALANCE'}</span>
                <span style={{ color: receiptData.newBalance < 0 ? '#3b82f6' : '#ef4444' }}>
                  Rs. {Math.abs(receiptData.newBalance).toLocaleString()}/- {receiptData.newBalance < 0 ? '(Advance)' : '(Due)'}
                </span>
              </div>

              <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>

              <h3 style={{ textAlign: 'center', fontSize: '15px', margin: '8px 0', fontWeight: '900', color: receiptData.newBalance > 0 ? '#ef4444' : receiptData.newBalance < 0 ? '#16a34a' : '#64748b' }}>
                {receiptData.newBalance > 0 ? 'PENDING' : receiptData.newBalance < 0 ? 'ADVANCE RECEIVED' : 'CLEAR'}
              </h3>

              <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>

              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px' }}>
                <p style={{ margin: '2px 0' }}>For Any Query:</p>
                <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{activeTab === 'Retail 2' ? '0311-4105840' : '0322-4295106'}</p>
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
                <p style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', marginTop: '5px' }}>Thank you for coming</p>
                <p style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>have a good day sir</p>
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showWhatsAppModal && (
        <div className="modal-overlay" onClick={closeWhatsAppModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px', width: '95%', borderRadius: '16px' }}>
            <div className="modal-header">
              <h3>WhatsApp Document Preview</h3>
              <button className="modal-close" onClick={closeWhatsAppModal}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px', background: '#f8fafc' }}>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#475569' }}>
                Review the PDF generated below. Click <strong>Send Ledger</strong> to forward it to the customer's WhatsApp number (<strong>{selectedCustomer?.phone}</strong>).
              </p>
              {whatsAppPdfUrl ? (
                <iframe 
                  src={whatsAppPdfUrl} 
                  title="PDF Preview" 
                  width="100%" 
                  height="550px" 
                  style={{ border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating preview...</div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" type="button" onClick={closeWhatsAppModal}>Cancel</button>
              <button className="btn-primary" type="button" onClick={handleConfirmWhatsAppSend} style={{ background: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
                {loading ? "Sending..." : "Send Ledger to WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}