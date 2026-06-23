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
import "../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/rent");

const emptyForm = {
  property_name: "",
  landlord_name: "",
  amount: "",
  rent_date: new Date().toLocaleDateString('en-CA'),
  status: "Paid",
  notes: "",
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
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`${API}?type=${activeTab}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalRecs = Array.isArray(data) ? data : [];
      setRecords(finalRecs);
      localStorage.setItem(`cache_rent_${activeTab}`, JSON.stringify(finalRecs));
    } catch (err) {
      console.error("Failed to fetch rent records", err);
    }
  };

  useEffect(() => { 
    if (!activeTab) return;
    try {
      const cached = localStorage.getItem(`cache_rent_${activeTab}`);
      if (cached) setRecords(JSON.parse(cached));
    } catch (e) { console.error(e); }
    fetchRecords(); 
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amt = parseFloat(form.amount || 0);

      // Fetch live balances
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
    return matchSearch && matchStatus;
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

        {user?.role === 'admin' && !user?.module_type && !type && (
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

      <div className="stats-grid-pos">
        <div className="pos-stat-card">
          <div className="icon blue"><Building size={24} /></div>
          <div className="info">
            <span className="label">Total Properties</span>
            <span className="value">{new Set(records.map(r => r.property_name)).size} Units</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><CircleDollarSign size={24} /></div>
          <div className="info">
            <span className="label">Total Paid (Rs.)</span>
            <span className="value">Rs. {records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><CheckCircle size={24} /></div>
          <div className="info">
            <span className="label">Settled Bills</span>
            <span className="value">{records.filter(r => r.status === 'Paid').length} Paid</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search property or landlord..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
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
          <Column header="Payment Date" body={(r) => (
            <div style={{fontWeight: 700}}>{new Date(r.rent_date).toLocaleDateString()}</div>
          )} sortable field="rent_date" />
          
          <Column header="Property / Unit" body={(r) => (
            <span style={{fontWeight: 700, color: '#1e293b'}}>{r.property_name}</span>
          )} sortable field="property_name" />
          
          <Column header="Landlord" body={(r) => (
            <div style={{display:'flex', alignItems:'center', gap:'6px', color: '#475569'}}><User size={14}/> {r.landlord_name || '—'}</div>
          )} sortable field="landlord_name" />
          
          <Column header="Rent Amount" body={(r) => (
            <span style={{fontWeight: 800, color: '#e11d48'}}>Rs. {parseFloat(r.amount).toLocaleString()}</span>
          )} sortable field="amount" />
          
          <Column header="Status" body={(r) => (
            <span className={`status-badge ${r.status.toLowerCase()}`} style={{padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700}}>
              {r.status}
            </span>
          )} sortable field="status" />
          
          <Column header="" body={(r) => (
            <ActionMenu
              onEdit={user?.role === 'admin' ? () => { setForm(r); setEditId(r.id); setShowModal(true); } : null}
              onDelete={user?.role === 'admin' ? () => handleDelete(r.id) : null}
            />
          )} style={{ textAlign: 'center', width: '60px' }} />
        </DataTable>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Rent Record" : "Add Rent Payment"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-label">Property Details</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Property/Shop Name *</label>
                  <div className="input-wrapper">
                    <Building size={18} />
                    <input type="text" required value={form.property_name} placeholder="e.g. Warehouse A"
                      onChange={(e) => setForm({...form, property_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Landlord Name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input type="text" value={form.landlord_name} placeholder="Owner of property"
                      onChange={(e) => setForm({...form, landlord_name: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="section-label">Payment Information</div>
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
                  <label>Payment Date</label>
                  <div className="input-wrapper">
                    <Calendar size={18} />
                    <input type="date" value={form.rent_date}
                      onChange={(e) => setForm({...form, rent_date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
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
    </div>
  );
}
