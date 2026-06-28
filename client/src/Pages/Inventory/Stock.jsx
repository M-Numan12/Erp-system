// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext } from "react";
import {
  Boxes, Plus, Minus, Search, AlertTriangle, TrendingUp,
  Database, Info, X, ChevronRight, ChevronLeft, Hash, Truck, User,
  CircleDollarSign, ArrowUpCircle, ArrowDownCircle, Tag
} from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import ActionMenu from '../../components/ActionMenu';
import { AuthContext } from "../../context/AuthContext";
import "../../Styles/ModulePages.scss";

const API = (API_BASE_URL + "/products");

export default function Stock({ type }) {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPurchaseReturnModal, setShowPurchaseReturnModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    supplier_id: "", quantity: "", vehicle_number: "", vehicle_id: "",
    rate: "", paid_amount: "0", delivery_charges: "0", fare_status: "Pending",
    vehicle_type: "External"
  });
  const [purchaseReturnForm, setPurchaseReturnForm] = useState({
    supplier_id: "", quantity: "", vehicle_number: "", vehicle_id: "",
    rate: "", received_amount: "0", delivery_charges: "0", fare_status: "Pending",
    vehicle_type: "External"
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
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
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnBillNo, setReturnBillNo] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [billData, setBillData] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnVehicleId, setReturnVehicleId] = useState("");
  const [returnFare, setReturnFare] = useState("0");

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    } else if (user?.module_type && user?.role !== 'admin') {
      setActiveTab(user.module_type);
    }
  }, [type, user?.module_type, user?.email]);

  const CATEGORIES = [
    { name: "Cement", icon: "🧱" },
    { name: "Steel", icon: "🏗️" },
    { name: "Crush", icon: "🪨" },
    { name: "Bricks", icon: "🧱" },
    { name: "Sand", icon: "🏖️" },
    { name: "Tiles Bond", icon: "🔗" },
    { name: "Chips", icon: "⚪" },
    { name: "Other", icon: "📦" }
  ];

  const fetchData = async () => {
    if (!activeTab) return;
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem('token')}` };
      const [prodRes, supRes, vehRes] = await Promise.all([
        fetch(`${API}?type=${activeTab}`, { headers }),
        fetch(`${API_BASE_URL}/suppliers?type=${activeTab}`, { headers }),
        fetch(`${API_BASE_URL}/transport?type=${activeTab}`, { headers })
      ]);
      const prodData = await prodRes.json();
      const supData = await supRes.json();
      const vehData = await vehRes.json();

      const newProds = Array.isArray(prodData) ? prodData : [];
      const newSups = Array.isArray(supData) ? supData : [];
      const newVehs = Array.isArray(vehData) ? vehData : [];

      setProducts(newProds);
      setSuppliers(newSups);
      setVehicles(newVehs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTab) return;
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // If Admin and no counter selected, show selection screen
  if (user?.role === 'admin' && !activeTab && !type) {
    return (
      <div className="admin-selection-container">
        <h2>Select Counter</h2>
        <p>Choose which counter's stock inventory you want to view</p>
        <div className="selection-grid">
          <div className="selection-card wholesale" onClick={() => setActiveTab('Wholesale')}>
            <div className="icon-box">📦</div>
            <h3>Wholesale</h3>
            <span>Main Warehouse</span>
          </div>
          <div className="selection-card retail1" onClick={() => setActiveTab('Retail 1')}>
            <div className="icon-box">🗳️</div>
            <h3>Retail 1</h3>
            <span>Counter A</span>
          </div>
          <div className="selection-card retail2" onClick={() => setActiveTab('Retail 2')}>
            <div className="icon-box">🗃️</div>
            <h3>Retail 2</h3>
            <span>Counter B</span>
          </div>
        </div>
      </div>
    );
  }

  const updateStock = async (e, prod, adjustment) => {
    e.stopPropagation();
    const newQty = parseFloat(prod.stock_quantity || 0) + adjustment;
    if (newQty < 0) return;

    try {
      await fetch(`${API}/${prod.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...prod, stock_quantity: newQty })
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleReceiveStock = async (e) => {
    e.preventDefault();
    const totalCost = parseFloat(receiveForm.quantity || 0) * parseFloat(receiveForm.rate || 0);
    if (parseFloat(receiveForm.paid_amount || 0) > totalCost) {
      alert("Invalid Payment: Paid amount cannot exceed total purchase cost!");
      return;
    }

    const amt = parseFloat(receiveForm.paid_amount || 0);
    setLoading(true);
    if (amt > 0) {
      try {
        // Fetch live balances
        const balRes = await fetch(`${API_BASE_URL}/banks/balances?type=${activeTab}`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
        });
        if (balRes.ok) {
          const balances = await balRes.json();
          const currentAvailable = balances['Cash'] || 0;

          if (amt > currentAvailable) {
            alert(`Insufficient Balance! You only have Rs. ${currentAvailable.toLocaleString()} in your Cash account. You cannot make a payment of Rs. ${amt.toLocaleString()} for this stock!`);
            setLoading(false);
            return;
          }
        }
      } catch (err) { console.error("Balance fetch failed:", err); }
    }
    try {
      const res = await fetch(`${API_BASE_URL}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          supplier_id: receiveForm.supplier_id,
          product_id: selectedProduct.id,

          vehicle_type: receiveForm.vehicle_type,

          vehicle_number: receiveForm.vehicle_number,
          vehicle_id: receiveForm.vehicle_id,

          quantity: receiveForm.quantity,
          rate: receiveForm.rate,
          paid_amount: receiveForm.paid_amount,
          delivery_charges: receiveForm.delivery_charges,
          fare_status: receiveForm.fare_status,
          module_type: activeTab
        })
      });
      if (res.ok) {
        setShowReceiveModal(false);
        setReceiveForm({
          supplier_id: "", quantity: "", vehicle_number: "", vehicle_id: "",
          rate: "", paid_amount: "0", delivery_charges: "0", fare_status: "Pending",
          vehicle_type: "External"
        });
        fetchData();
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handlePurchaseReturn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          supplier_id: purchaseReturnForm.supplier_id,
          product_id: selectedProduct.id,

          vehicle_type: purchaseReturnForm.vehicle_type,

          vehicle_number: purchaseReturnForm.vehicle_number,
          vehicle_id: purchaseReturnForm.vehicle_id,

          quantity: purchaseReturnForm.quantity,
          rate: purchaseReturnForm.rate,
          received_amount: purchaseReturnForm.received_amount,
          delivery_charges: purchaseReturnForm.delivery_charges,
          fare_status: purchaseReturnForm.fare_status,
          module_type: activeTab
        })
      });
      if (res.ok) {
        setShowPurchaseReturnModal(false);
        setPurchaseReturnForm({
          supplier_id: "", quantity: "", vehicle_number: "", vehicle_id: "",
          rate: "", received_amount: "0", delivery_charges: "0", fare_status: "Pending",
          vehicle_type: "External"
        });
        fetchData();
        alert("Stock successfully returned to supplier!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to process return");
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleFetchBill = async (e) => {
    e?.preventDefault();
    if (!returnBillNo) return;
    setReturnLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/${returnBillNo}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBillData(data);
        setReturnItems((data.items || []).map(i => ({
          ...i,
          return_qty: i.qty,
          rate: i.rate
        })));
      } else {
        alert(data.error || "Bill not found");
      }
    } catch (err) { alert("Error fetching bill"); }
    setReturnLoading(false);
  };

  const handleSaleReturn = async (e) => {
    e.preventDefault();
    if (!billData || returnItems.length === 0) return;

    const finalItems = returnItems.filter(i => parseFloat(i.return_qty || 0) > 0);
    if (finalItems.length === 0) {
      alert("Please enter return quantity for at least one item");
      return;
    }

    setReturnLoading(true);
    try {
      const res = await fetch((API_BASE_URL + "/sales/return"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sale_id: returnBillNo,
          items_to_return: finalItems.map(i => ({
            product_id: i.product_id,
            name: i.product_name || i.name,
            qty: parseFloat(i.return_qty),
            rate: parseFloat(i.rate)
          })),
          vehicle_id: returnVehicleId,
          delivery_charges: returnFare,
          refund_amount: "0",
          refund_method: "Cash"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowReturnModal(false);
        setReturnBillNo("");
        setBillData(null);
        setReturnItems([]);
        setReturnVehicleId("");
        setReturnFare("0");
        fetchData();
        alert("Stock successfully returned and recorded!");
      } else {
        alert(data.error || "Failed to process return");
      }
    } catch (err) {
      alert("Error processing return");
    } finally {
      setReturnLoading(false);
    }
  };

  const filtered = products.filter((p) => {
    let matchCat = false;
    const catLower = (p.category || "").toLowerCase();
    const selCatLower = selectedCategory ? selectedCategory.toLowerCase() : "";

    if (!selectedCategory) {
      matchCat = true;
    } else if (selCatLower === "steel" && (catLower === "iron/steel" || catLower === "steel")) {
      matchCat = true;
    } else if (selCatLower === "crush" && (catLower === "crush/bajri" || catLower === "crush")) {
      matchCat = true;
    } else {
      matchCat = catLower === selCatLower;
    }

    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(search.toLowerCase());
    const matchStock = filterStock === "All" ||
      (filterStock === "Low" && parseFloat(p.stock_quantity || 0) <= parseFloat(p.minimum_stock || 0)) ||
      (filterStock === "Out" && parseFloat(p.stock_quantity || 0) <= 0);
    return matchCat && matchSearch && matchStock;
  });

  const lowStockCount = products.filter(p => parseFloat(p.stock_quantity || 0) <= parseFloat(p.minimum_stock || 0)).length;
  const outOfStockCount = products.filter(p => parseFloat(p.stock_quantity || 0) <= 0).length;
  const totalStockValue = products.reduce((sum, p) => sum + (parseFloat(p.price) * parseFloat(p.stock_quantity || 0)), 0);

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-title">
          <button className="btn-icon back-btn" onClick={() => selectedCategory ? setSelectedCategory(null) : window.history.back()} style={{ marginRight: '15px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }}>
            <ChevronLeft size={20} />
          </button>
          <div className="module-icon stock-icon"><Database size={28} /></div>
          <div>
            <h1>{selectedCategory ? `${selectedCategory} Stock` : 'Stock Management'}</h1>
            <p>{selectedCategory ? `Managing ${activeTab} inventory for ${selectedCategory}` : `Monitor and manage ${activeTab} inventory levels`}</p>
          </div>
        </div>

        {/* Counter Switcher for Admin */}
        {user?.role === 'admin' && (!user?.module_type || user?.module_type === 'admin') && !type && (
          <div className="counter-switcher">
            <button className={activeTab === 'Wholesale' ? 'active' : ''} onClick={() => setActiveTab('Wholesale')}>Wholesale</button>
            <button className={activeTab === 'Retail 1' ? 'active' : ''} onClick={() => setActiveTab('Retail 1')}>Retail 1</button>
            <button className={activeTab === 'Retail 2' ? 'active' : ''} onClick={() => setActiveTab('Retail 2')}>Retail 2</button>
          </div>
        )}

        <div className="module-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary"
            onClick={() => setShowReturnModal(true)}
            style={{ background: '#f43f5e', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <ArrowDownCircle size={20} />
            Sale Return (Bill)
          </button>
        </div>
      </div>

      <div className="stats-grid-pos">
        <div className="pos-stat-card">
          <div className="icon orange"><AlertTriangle size={24} /></div>
          <div className="info">
            <span className="label">Low Stock</span>
            <span className="value">{lowStockCount} Items</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon red"><X size={24} /></div>
          <div className="info">
            <span className="label">Out of Stock</span>
            <span className="value">{outOfStockCount} Items</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon blue"><Database size={24} /></div>
          <div className="info">
            <span className="label">Total Products</span>
            <span className="value">{products.length} Items</span>
          </div>
        </div>
        <div className="pos-stat-card">
          <div className="icon green"><TrendingUp size={24} /></div>
          <div className="info">
            <span className="label">Inventory Value</span>
            <span className="value">Rs. {totalStockValue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {!selectedCategory ? (
        <div className="category-grid" style={{ marginTop: '20px' }}>
          {CATEGORIES.map((cat) => {
            const isSteel = cat.name.toLowerCase() === "steel";
            const isCrush = cat.name.toLowerCase() === "crush";
            const count = products.filter(p => {
              const catLower = (p.category || "").toLowerCase();
              return isSteel ? (catLower === "iron/steel" || catLower === "steel") : isCrush ? (catLower === "crush/bajri" || catLower === "crush") : catLower === cat.name.toLowerCase();
            }).length;
            const catStock = products.filter(p => {
              const catLower = (p.category || "").toLowerCase();
              return isSteel ? (catLower === "iron/steel" || catLower === "steel") : isCrush ? (catLower === "crush/bajri" || catLower === "crush") : catLower === cat.name.toLowerCase();
            }).reduce((sum, p) => sum + parseFloat(p.stock_quantity || 0), 0);
            return (
              <div key={cat.name} className="category-card" onClick={() => setSelectedCategory(cat.name)}>
                <div className="category-emoji">{cat.icon}</div>
                <h3>{cat.name}</h3>
                <p>{count} Brands | {catStock} Total Units</p>
                <div className="category-footer">
                  <span>View Stock Details</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="pos-table-actions">
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder={`Search in ${selectedCategory}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
                <option value="All">All Stock Levels</option>
                <option value="Low">Low Stock Only</option>
                <option value="Out">Out of Stock Only</option>
              </select>
            </div>
          </div>

          <div className="module-table-container" style={{ padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <DataTable value={filtered} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              emptyMessage="No stock items found." className="p-datatable-sm" stripedRows responsiveLayout="scroll"
              onRowClick={(e) => { setSelectedProduct(e.data); setShowDetailModal(true); }} rowHover style={{ cursor: 'pointer' }}>
              <Column field="id" header="ID" body={(prod) => <span style={{ fontWeight: 600, color: '#64748b' }}>#{prod.id}</span>} sortable style={{ width: '80px' }} />

              <Column field="brand" header="Brand" body={(prod) => (
                <span style={{ fontWeight: 600, color: '#475569' }}>{prod.brand || 'N/A'}</span>
              )} sortable />

              <Column field="name" header="Product Name" body={(prod) => (
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{prod.name}</span>
              )} sortable />

              <Column header="Min Level" body={(prod) => (
                <span className="min-tag" style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {parseFloat(prod.minimum_stock || 0).toLocaleString()} {prod.unit}
                </span>
              )} field="minimum_stock" sortable />

              <Column header="Current Stock" body={(prod) => {
                const qty = parseFloat(prod.stock_quantity || 0);
                const min = parseFloat(prod.minimum_stock || 0);
                const isOut = qty <= 0;
                const isLow = qty <= min;
                return (
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: isOut ? '#e11d48' : isLow ? '#f59e0b' : '#16a34a' }}>
                    {qty.toLocaleString()} {prod.unit}
                  </span>
                );
              }} sortable field="stock_quantity" />

              <Column header="Status" body={(prod) => {
                const qty = parseFloat(prod.stock_quantity || 0);
                const min = parseFloat(prod.minimum_stock || 0);
                const isOut = qty <= 0;
                const isLow = qty <= min;
                return (
                  <span className={`status-badge ${isOut ? 'cancelled' : isLow ? 'pending' : 'paid'}`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                  </span>
                );
              }} />

              <Column header="" body={(prod) => (
                <ActionMenu
                  extraItems={[
                    {
                      label: 'Receive Stock',
                      icon: 'pi pi-truck',
                      command: () => {
                        setSelectedProduct(prod);
                        setReceiveForm({ ...receiveForm, rate: prod.cost_price || "" });
                        setShowReceiveModal(true);
                      }
                    },
                    {
                      label: 'Return Stock',
                      icon: 'pi pi-replay',
                      command: () => {
                        setSelectedProduct(prod);
                        setPurchaseReturnForm({ ...purchaseReturnForm, rate: prod.cost_price || "" });
                        setShowPurchaseReturnModal(true);
                      }
                    }
                  ]}
                />
              )} style={{ textAlign: 'center', width: '60px' }} />
            </DataTable>
          </div>
        </>
      )}

      {/* Stock Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal stock-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-info">
                <Database size={24} color="#3b82f6" />
                <h3>Stock Information</h3>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}><X size={20} /></button>
            </div>

            <div className="detail-body">
              <div className="detail-main-header">
                <h2>{selectedProduct.name}</h2>
                <span className="category-tag">{selectedProduct.category}</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <Tag size={18} />
                  <div>
                    <span className="label">Brand / Company</span>
                    <span className="value">{selectedProduct.brand || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <Hash size={18} />
                  <div>
                    <span className="label">Stock Level</span>
                    <span className={`value bold ${parseFloat(selectedProduct.stock_quantity) <= parseFloat(selectedProduct.minimum_stock) ? 'text-orange' : 'text-green'}`}>
                      {selectedProduct.stock_quantity} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <CircleDollarSign size={18} />
                  <div>
                    <span className="label">Retail Price</span>
                    <span className="value">Rs. {parseFloat(selectedProduct.price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <Info size={18} />
                  <div>
                    <span className="label">Min. Alert Level</span>
                    <span className="value">{selectedProduct.minimum_stock} {selectedProduct.unit}</span>
                  </div>
                </div>
              </div>

              {selectedProduct.description && (
                <div className="detail-section">
                  <h4>Product Notes</h4>
                  <p>{selectedProduct.description}</p>
                </div>
              )}

              <div className="detail-actions">
                <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
                <div className="quick-add">
                  <span>Adjust Stock:</span>
                  <button onClick={(e) => updateStock(e, selectedProduct, -5)} className="btn-quick-adjust red">-5</button>
                  <button onClick={(e) => updateStock(e, selectedProduct, 5)} className="btn-quick-adjust green">+5</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal (Purchase Entry) */}
      {showReceiveModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowReceiveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Receive Stock / Purchase Entry</h3>
              <button className="modal-close" onClick={() => setShowReceiveModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleReceiveStock} className="custom-form">
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Supplier / Vendor *</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <select required value={receiveForm.supplier_id} onChange={(e) => setReceiveForm({ ...receiveForm, supplier_id: e.target.value })}>
                      <option value="">Select a Supplier</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name} {sup.company ? `(${sup.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity Received *</label>
                  <div className="input-wrapper">
                    <Database size={18} />
                    <input type="number" required value={receiveForm.quantity} placeholder={`e.g. 100 ${selectedProduct.unit}`}
                      onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Vehicle *
                    <div className="type-toggle" style={{ display: 'flex', fontSize: '0.7rem', gap: '4px', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                      <button type="button" onClick={() => setReceiveForm({ ...receiveForm, vehicle_type: 'External', vehicle_id: '', vehicle_number: '' })}
                        style={{ border: 'none', cursor: 'pointer', background: receiveForm.vehicle_type === 'External' ? 'white' : 'transparent', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: receiveForm.vehicle_type === 'External' ? '600' : '400', boxShadow: receiveForm.vehicle_type === 'External' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Supplier</button>
                      <button type="button" onClick={() => setReceiveForm({ ...receiveForm, vehicle_type: 'Personal', vehicle_id: '', vehicle_number: '' })}
                        style={{ border: 'none', cursor: 'pointer', background: receiveForm.vehicle_type === 'Personal' ? 'white' : 'transparent', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: receiveForm.vehicle_type === 'Personal' ? '600' : '400', boxShadow: receiveForm.vehicle_type === 'Personal' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Personal</button>
                    </div>
                  </label>
                  <div className="input-wrapper">
                    <Truck size={18} />
                    {receiveForm.vehicle_type === 'Personal' ? (
                      <select required value={receiveForm.vehicle_id}
                        onChange={(e) => {
                          const vId = e.target.value;
                          const vObj = vehicles.find(v => v && String(v.id) === String(vId));
                          setReceiveForm({ ...receiveForm, vehicle_id: vId, vehicle_number: vObj ? vObj.vehicle_number : '' });
                        }}>
                        <option value="">Select Transport Vehicle</option>
                        {vehicles.filter(v => v && !v.is_deleted && (v.ownership_type || 'Personal').toString().toLowerCase().trim() === 'personal').map(v => (
                          <option key={v.id} value={v.id}>{v.vehicle_number} ({v.driver_name})</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" required value={receiveForm.vehicle_number} placeholder="e.g. LET-123"
                        onChange={(e) => setReceiveForm({ ...receiveForm, vehicle_number: e.target.value, vehicle_id: "" })} />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Fare (Delivery Charges) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" required value={receiveForm.delivery_charges} placeholder="0.00"
                      onChange={(e) => setReceiveForm({ ...receiveForm, delivery_charges: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Fare Status</label>
                  <div className="input-wrapper">
                    <Tag size={18} />
                    <select value={receiveForm.fare_status} onChange={(e) => setReceiveForm({ ...receiveForm, fare_status: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid (Cash)</option>
                      <option value="Free">Free</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Cost Rate (per unit) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" step="0.01" required value={receiveForm.rate} placeholder="0.00"
                      onChange={(e) => setReceiveForm({ ...receiveForm, rate: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Total Bill Amount</label>
                  <div className="input-wrapper" style={{ background: '#f8fafc' }}>
                    <CircleDollarSign size={18} color="#64748b" />
                    <input type="text" disabled value={`Rs. ${((parseFloat(receiveForm.quantity) || 0) * (parseFloat(receiveForm.rate) || 0)).toLocaleString()}`} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount Paid Now</label>
                  <div className="input-wrapper">
                    <TrendingUp size={18} />
                    <input type="number" step="0.01" required value={receiveForm.paid_amount} placeholder="0.00"
                      onChange={(e) => setReceiveForm({ ...receiveForm, paid_amount: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Balance to Pay</label>
                  <div className="input-wrapper" style={{ background: '#fff1f2' }}>
                    <AlertTriangle size={18} color="#e11d48" />
                    <input type="text" disabled value={`Rs. ${(((parseFloat(receiveForm.quantity) || 0) * (parseFloat(receiveForm.rate) || 0)) - (parseFloat(receiveForm.paid_amount) || 0)).toLocaleString()}`} style={{ color: '#e11d48', fontWeight: 'bold' }} />
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReceiveModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Processing..." : "Complete Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Return Modal */}
      {showPurchaseReturnModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowPurchaseReturnModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Return Stock to Supplier</h3>
              <button className="modal-close" onClick={() => setShowPurchaseReturnModal(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '12px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Available Stock</span>
                <strong style={{ fontSize: '1.15rem', color: '#1e3a8a' }}>{selectedProduct.stock_quantity || 0} {selectedProduct.unit}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Purchase Cost Rate</span>
                <strong style={{ fontSize: '1.15rem', color: '#1e3a8a' }}>Rs. {parseFloat(selectedProduct.cost_price || 0).toLocaleString()}</strong>
              </div>
            </div>
            <form onSubmit={handlePurchaseReturn} className="custom-form">
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Supplier / Vendor *</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <select required value={purchaseReturnForm.supplier_id} onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, supplier_id: e.target.value })}>
                      <option value="">Select a Supplier</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name} {sup.company ? `(${sup.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity to Return *</label>
                  <div className="input-wrapper">
                    <Database size={18} />
                    <input type="number" required value={purchaseReturnForm.quantity} placeholder={`e.g. 100 ${selectedProduct.unit}`}
                      onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, quantity: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Return Vehicle *
                    <div className="type-toggle" style={{ display: 'flex', fontSize: '0.7rem', gap: '4px', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                      <button type="button" onClick={() => setPurchaseReturnForm({ ...purchaseReturnForm, vehicle_type: 'External', vehicle_id: '', vehicle_number: '' })}
                        style={{ border: 'none', cursor: 'pointer', background: purchaseReturnForm.vehicle_type === 'External' ? 'white' : 'transparent', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: purchaseReturnForm.vehicle_type === 'External' ? '600' : '400', boxShadow: purchaseReturnForm.vehicle_type === 'External' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Supplier</button>
                      <button type="button" onClick={() => setPurchaseReturnForm({ ...purchaseReturnForm, vehicle_type: 'Personal', vehicle_id: '', vehicle_number: '' })}
                        style={{ border: 'none', cursor: 'pointer', background: purchaseReturnForm.vehicle_type === 'Personal' ? 'white' : 'transparent', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: purchaseReturnForm.vehicle_type === 'Personal' ? '600' : '400', boxShadow: purchaseReturnForm.vehicle_type === 'Personal' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Personal</button>
                    </div>
                  </label>
                  <div className="input-wrapper">
                    <Truck size={18} />
                    {purchaseReturnForm.vehicle_type === 'Personal' ? (
                      <select required value={purchaseReturnForm.vehicle_id}
                        onChange={(e) => {
                          const vId = e.target.value;
                          const vObj = vehicles.find(v => v && String(v.id) === String(vId));
                          setPurchaseReturnForm({ ...purchaseReturnForm, vehicle_id: vId, vehicle_number: vObj ? vObj.vehicle_number : '' });
                        }}>
                        <option value="">Select Transport Vehicle</option>
                        {vehicles.filter(v => v && !v.is_deleted && (v.ownership_type || 'Personal').toString().toLowerCase().trim() === 'personal').map(v => (
                          <option key={v.id} value={v.id}>{v.vehicle_number} ({v.driver_name})</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" required value={purchaseReturnForm.vehicle_number} placeholder="e.g. LET-123"
                        onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, vehicle_number: e.target.value, vehicle_id: "" })} />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Fare (Karywa) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" required value={purchaseReturnForm.delivery_charges} placeholder="0.00"
                      onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, delivery_charges: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Fare Status</label>
                  <div className="input-wrapper">
                    <Tag size={18} />
                    <select value={purchaseReturnForm.fare_status} onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, fare_status: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid (Cash)</option>
                      <option value="Free">Free</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Return Rate (per unit) *</label>
                  <div className="input-wrapper">
                    <CircleDollarSign size={18} />
                    <input type="number" step="0.01" required value={purchaseReturnForm.rate} placeholder="0.00"
                      onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, rate: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Total Return Value</label>
                  <div className="input-wrapper" style={{ background: '#f8fafc' }}>
                    <CircleDollarSign size={18} color="#64748b" />
                    <input type="text" disabled value={`Rs. ${((parseFloat(purchaseReturnForm.quantity) || 0) * (parseFloat(purchaseReturnForm.rate) || 0)).toLocaleString()}`} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Cash Received (Optional)</label>
                  <div className="input-wrapper">
                    <TrendingUp size={18} />
                    <input type="number" step="0.01" value={purchaseReturnForm.received_amount} placeholder="0.00"
                      onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, received_amount: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Supplier Balance Deduction</label>
                  <div className="input-wrapper" style={{ background: '#ecfdf5' }}>
                    <ArrowDownCircle size={18} color="#059669" />
                    <input type="text" disabled value={`Rs. ${(((parseFloat(purchaseReturnForm.quantity) || 0) * (parseFloat(purchaseReturnForm.rate) || 0)) - (parseFloat(purchaseReturnForm.received_amount) || 0)).toLocaleString()}`} style={{ color: '#059669', fontWeight: 'bold' }} />
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowPurchaseReturnModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Processing..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sale Return Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => { setShowReturnModal(false); setBillData(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: billData ? '700px' : '400px' }}>
            <div className="modal-header">
              <div className="header-info">
                <ArrowDownCircle size={24} color="#f43f5e" />
                <h3>Process Sale Return</h3>
              </div>
              <button className="modal-close" onClick={() => { setShowReturnModal(false); setBillData(null); }}><X size={20} /></button>
            </div>

            {!billData ? (
              <form onSubmit={handleFetchBill} className="custom-form p-fluid" style={{ padding: '20px' }}>
                <div className="field mb-4">
                  <label className="block mb-2 font-bold" style={{ color: '#475569' }}>Enter Bill Number (Sale ID) *</label>
                  <div className="p-inputgroup" style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                    <span className="p-inputgroup-addon" style={{ background: '#f1f5f9', padding: '10px', display: 'flex', alignItems: 'center' }}><Hash size={18} /></span>
                    <input
                      type="number"
                      required
                      value={returnBillNo}
                      placeholder="e.g. 105"
                      style={{ flex: 1, padding: '10px', border: 'none', outline: 'none' }}
                      onChange={e => setReturnBillNo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-content-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ background: '#3b82f6' }} disabled={returnLoading}>
                    {returnLoading ? "Searching..." : "Find Bill"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaleReturn} className="custom-form" style={{ padding: '20px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>CUSTOMER</div>
                    <div style={{ fontWeight: 800, color: '#1e3a8a' }}>{billData.customer_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>TOTAL BILLED</div>
                    <div style={{ fontWeight: 800, color: '#1e3a8a' }}>Rs. {parseFloat(billData.net_amount || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Sold Qty</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Return Qty</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Return Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{item.product_name || item.name}</td>
                          <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>{item.qty}</td>
                          <td style={{ padding: '10px' }}>
                            <input type="number" step="0.01" max={item.qty} min="0"
                              value={item.return_qty}
                              onChange={(e) => {
                                const next = [...returnItems];
                                next[idx].return_qty = e.target.value;
                                setReturnItems(next);
                              }}
                              style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input type="number" step="0.01" min="0"
                              value={item.rate}
                              onChange={(e) => {
                                const next = [...returnItems];
                                next[idx].rate = e.target.value;
                                setReturnItems(next);
                              }}
                              style={{ width: '100px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, marginBottom: '5px', display: 'block' }}>Return Vehicle (Optional)</label>
                    <select
                      value={returnVehicleId}
                      onChange={(e) => setReturnVehicleId(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">-- No Vehicle --</option>
                      {vehicles.filter(v => v && !v.is_deleted).map(v => (
                        <option key={v.id} value={v.id}>{v.vehicle_number} ({v.driver_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, marginBottom: '5px', display: 'block' }}>Return Delivery Fare (Karya)</label>
                    <input type="number" step="0.01"
                      value={returnFare}
                      onChange={(e) => setReturnFare(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-content-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="btn-secondary" onClick={() => setBillData(null)}>Back</button>
                  <button type="submit" className="btn-primary" style={{ background: '#f43f5e' }} disabled={returnLoading}>
                    {returnLoading ? "Processing..." : "Confirm Return"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
