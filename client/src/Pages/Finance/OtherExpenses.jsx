// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
  MoreHorizontal, Plus, Pencil, Trash2, X, Search,
  CircleDollarSign, Calendar, Tag, CreditCard, PieChart, Info
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import ActionMenu from '../../components/ActionMenu';
import { AuthContext } from "../../context/AuthContext";
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/other-expenses");

const CATEGORIES = [
  "Utilities", "Maintenance", "Office Supplies", "Marketing",
  "Legal", "Insurance", "Miscellaneous", "Other"
];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Online", "Credit Card"];

const emptyForm = {
  title: "",
  category: "Miscellaneous",
  amount: "",
  date: new Date().toLocaleDateString('en-CA'),
  payment_method: "Cash",
  notes: "",
};

export default function OtherExpenses({ type }) {
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
  const [filterCategory, setFilterCategory] = useState("All");
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
    } catch (err) {
      console.error("Failed to fetch other expenses", err);
    }
  };

  useEffect(() => { 
    if (!activeTab) return;
    fetchRecords(); 
    const interval = setInterval(fetchRecords, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

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
    const matchSearch = (r.title || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "All" || r.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0);
      const dateB = new Date(b.date || b.created_at || 0);
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
        <p>Choose which counter's miscellaneous expenses you want to manage</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">📊</div>
            <h3>Wholesale</h3>
            <span>Business Overheads</span>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">💸</div>
            <h3>Retail 1</h3>
            <span>Misc Expenses</span>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🏷️</div>
            <h3>Retail 2</h3>
            <span>Misc Expenses</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          <div className="module-icon otherexp-icon" style={{background: '#fef3c7', color: '#d97706'}}><MoreHorizontal size={28} /></div>
          <div>
            <h1>{activeTab} Misc Expenses</h1>
            <p>Track utilities, maintenance, and other secondary costs</p>
          </div>
        </div>

        {user?.role === 'admin' && !type && (
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

      <div className="stats-grid-pos">
        <div className="pos-stat-card">
          <div className="icon blue"><PieChart size={24} /></div>
          <div className="info">
            <span className="label">Monthly Spend</span>
            <span className="value">Rs. {records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon orange"><CircleDollarSign size={24} /></div>
          <div className="info">
            <span className="label">Total Vouchers</span>
            <span className="value">{records.length} Records</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><CreditCard size={24} /></div>
          <div className="info">
            <span className="label">Primary Method</span>
            <span className="value">Cash</span>
          </div>
        </div>
      </div>

      <div className="pos-table-actions">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search expense title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
           <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="tab-select">
             <option value="All">All Categories</option>
             {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>
      </div>

      <div className="module-table-container" style={{padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <DataTable value={sortedFiltered} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]} 
                   emptyMessage="No misc expenses found." className="p-datatable-sm" stripedRows responsiveLayout="scroll">
          <Column header="S.No." body={(rowData, options) => <span style={{fontWeight: 700, color: '#64748b'}}>{options.rowIndex + 1}</span>} style={{width: '70px', textAlign: 'center'}} />
          <Column header="Expense Date" body={(r) => (
            <div style={{fontWeight: 700}}>{new Date(r.date).toLocaleDateString()}</div>
          )} sortable field="date" />
          
          <Column header="Title / Description" body={(r) => (
            <span style={{fontWeight: 700, color: '#1e293b'}}>{r.title}</span>
          )} sortable field="title" />
          
          <Column header="Category" body={(r) => (
            <span className="type-tag house" style={{fontSize:'0.75rem', padding: '4px 12px', borderRadius: '20px'}}>{r.category}</span>
          )} sortable field="category" />
          
          <Column header="Amount" body={(r) => (
            <span style={{fontWeight: 800, color: '#e11d48'}}>Rs. {parseFloat(r.amount).toLocaleString()}</span>
          )} sortable field="amount" />
          
          <Column header="Method" body={(r) => (
            <div style={{display:'flex', alignItems:'center', gap:'6px', color: '#475569'}}><CreditCard size={14}/> {r.payment_method}</div>
          )} sortable field="payment_method" />
          
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
              <h3>{editId ? "Edit Misc Expense" : "Record New Expense"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-label">General Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Expense Title *</label>
                  <div className="input-wrapper">
                    <Info size={18} />
                    <input type="text" required value={form.title} placeholder="e.g. AC Maintenance"
                      onChange={(e) => setForm({...form, title: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <div className="input-wrapper">
                    <Tag size={18} />
                    <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Payment Date</label>
                  <div className="input-wrapper">
                    <Calendar size={18} />
                    <input type="date" value={form.date}
                      onChange={(e) => setForm({...form, date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <div className="input-wrapper">
                    <CreditCard size={18} />
                    <select value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value})}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="section-label">Financial Value</div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Amount (Rs.) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" required value={form.amount} placeholder="0.00"
                      onChange={(e) => setForm({...form, amount: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="section-label">Additional Notes</div>
              <div className="form-group full-width">
                <textarea rows="2" placeholder="Specific details about this expense..." value={form.notes}
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
