// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
  ShoppingCart, Search, Trash2, User, Plus, Minus, 
  Printer, CreditCard, Banknote, Truck, Tag, X, CheckCircle, Pencil,
  History, ArrowLeft, ChevronLeft, FileText, Download, Filter, Package, Phone, MapPin,
  ArrowDownCircle, Hash, Users
} from "lucide-react";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { AutoComplete } from 'primereact/autocomplete';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import ActionMenu from '../components/ActionMenu';
import { AuthContext } from "../context/AuthContext";
import "../Styles/ModulePages.scss";

const PRODUCTS_API = (API_BASE_URL + "/products");
const CUSTOMERS_API = (API_BASE_URL + "/customers");
const SALES_API = (API_BASE_URL + "/sales");
const TRANSPORT_API = (API_BASE_URL + "/transport");

const CATEGORIES = ["All", "Cement", "Steel", "Crush", "Bricks", "Sand", "Tiles Bond", "Chips", "Other"];

export default function Billing({ type }) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(type || (user?.role === 'admin' ? "" : user?.module_type || "Wholesale"));

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    } else if (user?.module_type && user.role !== 'admin') {
      setActiveTab(user.module_type);
    }
  }, [type, user?.module_type, user?.role]);
  const [view, setView] = useState("POS");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState("");
  const [delivery, setDelivery] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

  const [paymentType, setPaymentType] = useState("Cash");
  const [selectedBank, setSelectedBank] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnBillNo, setReturnBillNo] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnStep, setReturnStep] = useState(1);
  const [returnSaleDetails, setReturnSaleDetails] = useState(null);
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState([]);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState("Cash");
  const [showReturnSlip, setShowReturnSlip] = useState(false);
  const [lastReturnSlipData, setLastReturnSlipData] = useState(null);
  const [returnVehicleType, setReturnVehicleType] = useState("Rent");
  const [returnVehicleId, setReturnVehicleId] = useState("");
  const [returnDeliveryCharges, setReturnDeliveryCharges] = useState(0);
  const [bankDigits, setBankDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [transportType, setTransportType] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [viewSale, setViewSale] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const calculatedLedgerData = useMemo(() => {
    let currentBal = 0;
    const sortedAsc = [...ledgerData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const withRunning = sortedAsc.map(row => {
      const debit = parseFloat(row.net_amount || 0);
      const credit = parseFloat(row.paid_amount || 0);
      currentBal += (debit - credit);
      return { ...row, running_balance: currentBal };
    });
    return withRunning;
  }, [ledgerData]);
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [selectedCustForLedger, setSelectedCustForLedger] = useState(null);
  const [heldBills, setHeldBills] = useState(() => JSON.parse(localStorage.getItem('heldBills') || '[]'));
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [salesDateFilter, setSalesDateFilter] = useState("Today");
  const [selectedSales, setSelectedSales] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const triggerConfirm = (message, onConfirm) => {
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  const filteredSales = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    return sales.filter(s => {
      const saleDateStr = s.created_at ? new Date(s.created_at).toLocaleDateString('en-CA') : '';
      if (salesDateFilter === "Today") {
        return saleDateStr === todayStr;
      }
      if (salesDateFilter === "Yesterday") {
        return saleDateStr === yesterdayStr;
      }
      return true; // "All Time"
    });
  }, [sales, salesDateFilter]);

  useEffect(() => {
    localStorage.setItem('heldBills', JSON.stringify(heldBills));
  }, [heldBills]);
  
  // Labour tracking states
  const [labourGroups, setLabourGroups] = useState([]);
  const [selectedLabourGroup, setSelectedLabourGroup] = useState("");
  const [labourWages, setLabourWages] = useState("");

  const fetchData = async () => {
    const headers = { "Authorization": `Bearer ${localStorage.getItem('token')}` };
    const [prodRes, salesRes, vehiclesRes, banksRes, custsRes, labRes] = await Promise.all([
      fetch(`${PRODUCTS_API}?type=${activeTab}`, { headers }),
      fetch(`${SALES_API}?type=${activeTab}`, { headers }),
      fetch(`${TRANSPORT_API}?type=${activeTab}`, { headers }),
      fetch(`${API_BASE_URL}/banks`, { headers }),
      fetch(`${CUSTOMERS_API}?type=${activeTab}`, { headers }),
      fetch(`${API_BASE_URL}/labours`, { headers })
    ]);
    const prods = await prodRes.json();
    const sls = await salesRes.json();
    const vehs = await vehiclesRes.json();
    const banks = await banksRes.json();
    const custs = await custsRes.json();
    const labours = await labRes.json();

    setProducts(Array.isArray(prods) ? prods : []);
    setSales(Array.isArray(sls) ? sls : []);
    setVehicles(Array.isArray(vehs) ? vehs : []);
    setBankAccounts(Array.isArray(banks) ? banks.filter(b => b.module_type !== 'Admin Recipient' && (b.module_type || 'Wholesale') === activeTab) : []);
    setCustomers(Array.isArray(custs) ? custs : []);
    if (Array.isArray(labours)) {
      setLabourGroups([...new Set(labours.map(l => l.group_name))]);
    }
    // PERSIST CACHE SILENTLY FOR NEXT VISIT
    try {
      localStorage.setItem(`cache_products_${activeTab}`, JSON.stringify(prods));
      localStorage.setItem(`cache_customers_${activeTab}`, JSON.stringify(custs));
      localStorage.setItem(`cache_vehicles_${activeTab}`, JSON.stringify(vehs));
      localStorage.setItem(`cache_sales_${activeTab}`, JSON.stringify(sls));
      localStorage.setItem(`cache_banks_list`, JSON.stringify(banks));
    } catch (e) { }

  };

  useEffect(() => {
    // PRE-LOAD CACHE INSTANTLY FOR ZERO SECOND DELAY
    try {
      const cachedProds = localStorage.getItem(`cache_products_${activeTab}`);
      const cachedCusts = localStorage.getItem(`cache_customers_${activeTab}`);
      const cachedVehs = localStorage.getItem(`cache_vehicles_${activeTab}`);
      const cachedSales = localStorage.getItem(`cache_sales_${activeTab}`);
      const cachedBanks = localStorage.getItem(`cache_banks_list`);
      
      if (cachedProds) setProducts(JSON.parse(cachedProds));
      if (cachedCusts) setCustomers(JSON.parse(cachedCusts));
      if (cachedVehs) setVehicles(JSON.parse(cachedVehs));
      if (cachedSales) setSales(JSON.parse(cachedSales));
      if (cachedBanks) setBankAccounts(JSON.parse(cachedBanks).filter(b => b.module_type !== 'Admin Recipient' && (b.module_type || 'Wholesale') === activeTab));
    } catch (e) { console.error('Cache read fail', e); }

    fetchData(); 
  }, [activeTab]);

  const handleCustomerChange = (val) => {
    setCustomerName(val);
    const existing = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (existing) {
      setCustomerPhone(existing.phone || '');
      setCustomerAddress(existing.address || '');
      setSelectedCustomer(existing);
    } else {
      setSelectedCustomer(null);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price } : item
      ));
    } else {
      setCart([...cart, { 
        id: product.id, 
        name: product.name, 
        price: parseFloat(product.price), 
        qty: 1, 
        subtotal: parseFloat(product.price) 
      }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const currentQty = parseFloat(item.qty) || 0;
        const newQty = Math.max(1, currentQty + delta);
        return { ...item, qty: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  const setQtyDirect = (id, value) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const parsed = parseFloat(value);
        const finalVal = isNaN(parsed) ? '' : Math.max(0, parsed);
        const subtotalQty = finalVal === '' ? 0 : finalVal;
        return { ...item, qty: finalVal, subtotal: subtotalQty * item.price };
      }
      return item;
    }));
  };

  const updatePrice = (id, newPrice) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const p = parseFloat(newPrice) || 0;
        return { ...item, price: p, subtotal: item.qty * p };
      }
      return item;
    }));
  };

  const holdBill = () => {
    if (cart.length === 0) return alert("Cannot hold an empty cart!");
    const billToHold = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      cart,
      customerName,
      customerPhone,
      customerAddress,
      discount,
      delivery,
      paidAmount,
      paymentType,
      selectedBank,
      transportType,
      selectedVehicleId,
      selectedCustomer
    };
    setHeldBills([...heldBills, billToHold]);
    // Clear current state
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDiscount(0);
    setDelivery(0);
    setPaidAmount(0);
    setTransportType('');
    setSelectedVehicleId('');
    setSelectedCustomer(null);
    alert("Current bill is now on hold. You can start a new one!");
  };

  const resumeBill = (held) => {
    setCart(held.cart);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone);
    setCustomerAddress(held.customerAddress);
    setDiscount(held.discount);
    setDelivery(held.delivery);
    setPaidAmount(held.paidAmount);
    setPaymentType(held.paymentType);
    setSelectedBank(held.selectedBank);
    setTransportType(held.transportType);
    setSelectedVehicleId(held.selectedVehicleId);
    setSelectedCustomer(held.selectedCustomer);
    
    setHeldBills(heldBills.filter(b => b.id !== held.id));
    setShowHoldModal(false);
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const netTotal = subtotal - parseFloat(discount || 0) + parseFloat(delivery || 0);
  const balance = netTotal - parseFloat(paidAmount || 0);

  const fetchSaleForReturn = async () => {
    if (!returnBillNo) return;
    setReturnLoading(true);
    try {
      const res = await fetch(`${SALES_API}/${returnBillNo}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReturnSaleDetails(data);
        setSelectedItemsToReturn(data.items.map(i => ({ ...i, return_qty: i.qty })));
        setReturnStep(2);
      } else {
        alert(data.error || "Sale not found");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching sale details");
    } finally {
      setReturnLoading(false);
    }
  };

  const handleSaleReturn = async (e) => {
    e.preventDefault();
    if (!returnBillNo) return;
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
          items_to_return: selectedItemsToReturn
            .filter(i => i.selected)
            .map(i => ({ ...i, qty: i.return_qty })),
          refund_amount: refundAmount,
          refund_method: refundMethod,
          vehicle_id: returnVehicleId,
          vehicle_type: returnVehicleType,
          delivery_charges: returnDeliveryCharges
        })
      });
      const data = await res.json();
      if (res.ok) {
        const activeVeh = vehicles.find(v => v && String(v.id) === String(returnVehicleId));
        setLastReturnSlipData({
          sale_id: returnBillNo,
          customer_name: returnSaleDetails?.customer_name || "N/A",
          items_to_return: selectedItemsToReturn.filter(i => i.selected),
          refund_amount: refundAmount,
          refund_method: refundMethod,
          vehicle_number: activeVeh ? activeVeh.vehicle_number : "",
          delivery_charges: returnDeliveryCharges,
          date: new Date().toLocaleString()
        });
        setShowReturnModal(false);
        setShowReturnSlip(true);
        setReturnBillNo("");
        setReturnVehicleId("");
        setReturnDeliveryCharges(0);
        fetchData();
        alert("Stock successfully returned to inventory!");
      } else {
        alert(data.error || "Failed to process return");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing return");
    } finally {
      setReturnLoading(false);
    }
  };

  const handleCheckout = async () => {
            if (cart.length === 0) return alert("Cart is empty!");
    
    // Master Inventory Lockdown Check
    let exceedsLimit = false;
    let brokenItemName = "";
    cart.forEach(item => {
      const p = products.find(x => String(x.id) === String(item.id));
      const stock = p ? parseFloat(p.stock_quantity || 0) : 0;
      if (parseFloat(item.qty || 0) > stock) {
        exceedsLimit = true;
        brokenItemName = item.name;
      }
    });

    if (exceedsLimit) {
      alert(`ERROR: Cannot complete sale. ${brokenItemName} quantity exceeds available stock limit! Please fix the cart first.`);
      return;
    }
    
    if (parseFloat(paidAmount || 0) > netTotal) {
      alert("Invalid Payment: Paid amount cannot be more than the total bill amount!");
      return;
    }

    let finalPaymentType = paymentType;
    if (paymentType === 'Bank') {
      if (!selectedBank) return alert('Please select a Bank');
      finalPaymentType = `Bank - ${selectedBank}`;
    }

    setLoading(true);
    try {
      const saleData = {
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone,
        customer_address: customerAddress,
        vehicle_type: transportType,
        vehicle_id: selectedVehicleId,
        total_amount: subtotal,
        discount: parseFloat(discount || 0),
        delivery_charges: parseFloat(delivery || 0),
        net_amount: netTotal,
        paid_amount: parseFloat(paidAmount || 0),
        balance_amount: balance,
        payment_type: finalPaymentType,
        sale_type: activeTab,
        items: cart,
        labour_group: selectedLabourGroup
      };

      const url = editId ? `${SALES_API}/${editId}` : SALES_API;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(saleData),
      });

      if (res.ok) {
        const result = await res.json();
        setLastSaleId(result.saleId);

        // Record Labour Loading Work Entry if selected
        if (selectedLabourGroup) {
          try {
            await fetch((API_BASE_URL + "/labours/work-history"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                group_name: selectedLabourGroup,
                bill_id: result.saleId,
                description: `Loading cement for Bill #${result.saleId} (${customerName || "Walk-in"})`,
                amount: 0
              })
            });
          } catch (e) { console.error("Labour logging failed:", e); }
        }
        
        const prevBal = selectedCustomer ? parseFloat(selectedCustomer.balance) : 0;
        const finalBal = prevBal + balance;
        
        const vhObj = vehicles.find(v => v && String(v.id) === String(saleData.vehicle_id));
        
        setReceiptData({
          saleId: result.saleId,
          date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
          customerName: saleData.customer_name,
          customerPhone: saleData.customer_phone || '',
          customerAddress: saleData.customer_address || '',
          vehicleType: saleData.vehicle_type || '',
          vehicleId: vhObj ? vhObj.vehicle_number : (saleData.vehicle_id || ''),
          selectedLabourGroup: selectedLabourGroup,
          items: [...cart],
          subtotal: subtotal,
          discount: parseFloat(discount || 0),
          delivery: parseFloat(delivery || 0),
          totalAmount: netTotal,
          paidAmount: saleData.paid_amount,
          previousBalance: prevBal,
          newBalance: finalBal,
          paymentMethod: finalPaymentType,
          bankAccount: paymentType === 'Bank' ? selectedBank : null,
          saleType: activeTab,
        });
        setShowSuccess(true);
        setCart([]);
        setEditId(null);
        setDiscount(0);
        setDelivery(0);
        setPaidAmount(0);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setTransportType('');
        setSelectedVehicleId('');
        setSelectedBank('');
        setBankDigits('');
        setSelectedLabourGroup('');
        setLabourWages('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const openLedger = async (customer, from = "", to = "", filter = "all") => {
    if (!customer?.id) return alert("This customer record does not have a valid ID for ledger.");
    setSelectedCustForLedger(customer);
    setLedgerFrom(from);
    setLedgerTo(to);
    setLedgerFilter(filter);
    setShowLedgerModal(true);
    setLoading(true);
    try {
      let url = `${SALES_API}/ledger/${customer.id}`;
      if (from && to) url += `?from=${from}&to=${to}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    }
    setLoading(false);
  };

  const applyLedgerFilter = (filterKey) => {
    let from = "", to = "";
    const today = new Date();
    
    if (filterKey === 'today') {
      from = today.toLocaleDateString('en-CA');
      to = from;
    } else if (filterKey === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      from = weekAgo.toLocaleDateString('en-CA');
      to = today.toLocaleDateString('en-CA');
    } else if (filterKey === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
      to = today.toLocaleDateString('en-CA');
    }

    if (filterKey === 'custom') {
      setLedgerFilter('custom');
      return;
    }

    openLedger(selectedCustForLedger, from, to, filterKey);
  };

  const filteredProducts = products.filter(p => {
    let matchesCategory = false;
    if (selectedCategory === "All") {
      matchesCategory = true;
    } else if (selectedCategory === "Steel" && (p.category === "Iron/Steel" || p.category === "Steel")) {
      matchesCategory = true;
    } else if (selectedCategory === "Crush" && (p.category === "Crush/Bajri" || p.category === "Crush")) {
      matchesCategory = true;
    } else {
      matchesCategory = p.category === selectedCategory;
    }
    return matchesCategory && 
      (p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand || "").toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="module-page billing-page">
      <div className="module-header no-print">
        <div className="module-title">
          <button className="btn-icon back-btn" onClick={() => window.history.back()} style={{marginRight: '15px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s'}}>
            <ChevronLeft size={20} />
          </button>
          <div className="module-icon billing-icon"><ShoppingCart size={28} /></div>
          <div>
            <h1>{activeTab} POS System</h1>
            <p>Generate invoices and manage counter sales</p>
          </div>
        </div>

        {user?.role === 'admin' && !user?.module_type && !type && (
          <div className="counter-switcher">
            <button className={activeTab === 'Wholesale' ? 'active' : ''} onClick={() => setActiveTab('Wholesale')}>Wholesale</button>
            <button className={activeTab === 'Retail 1' ? 'active' : ''} onClick={() => setActiveTab('Retail 1')}>Retail 1</button>
            <button className={activeTab === 'Retail 2' ? 'active' : ''} onClick={() => setActiveTab('Retail 2')}>Retail 2</button>
          </div>
        )}

        <div className="module-nav" style={{ display: 'flex', gap: '12px' }}>
          <button className={view === 'POS' ? 'active' : ''} onClick={() => setView('POS')}>
            {editId ? <><Pencil size={18}/> Editing Sale #{editId}</> : <><Plus size={18}/> New Sale</>}
          </button>
          <button className={view === 'History' ? 'active' : ''} onClick={() => setView('History')}><History size={18}/> Sales History</button>
          <button className="btn-secondary" 
            onClick={() => setShowReturnModal(true)}
            style={{background: '#fff1f2', color: '#e11d48', borderColor: '#fecdd3'}}>
            <ArrowDownCircle size={18}/> Return Sale
          </button>
          {heldBills.length > 0 && (
            <button className="btn-secondary" onClick={() => setShowHoldModal(true)} style={{background: '#fff7ed', color: '#c2410c', borderColor: '#fdba74'}}>
              <History size={18}/> Held Bills ({heldBills.length})
            </button>
          )}
          {editId && (
            <button className="btn-secondary" onClick={() => {
              setEditId(null);
              setCart([]);
              setCustomerName('');
              setCustomerPhone('');
              setCustomerAddress('');
              setDiscount(0);
              setDelivery(0);
              setPaidAmount(0);
            }}><X size={18}/> Cancel Edit</button>
          )}
        </div>
      </div>

      {view === 'POS' ? (
        <div className="pos-container no-print">
          <div className="pos-main">
            <div className="category-tabs">
              {CATEGORIES.map(cat => (
                <button key={cat} className={selectedCategory === cat ? 'active' : ''} onClick={() => setSelectedCategory(cat)}>{cat}</button>
              ))}
            </div>

            <div className="pos-search">
              <Search size={20} />
              <InputText placeholder="Search by name or vehicle number..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-inputtext-sm w-full" />
            </div>

            <div className="pos-grid">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="pos-card" onClick={() => addToCart(prod)}>
                  <div className="card-top">
                    <span className="brand">{prod.brand || 'N/A'}</span>
                    <span className="stock">{prod.stock_quantity} {prod.unit}</span>
                  </div>
                  <h4>{prod.name}</h4>
                  <div className="card-bottom">
                    <span className="price">Rs. {prod.price}</span>
                    <div className="add-btn"><Plus size={18}/></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pos-sidebar">
            <div className="sidebar-header">
              <div className="title"><ShoppingCart size={20}/> <h3>Cart Items</h3></div>
              <span className="badge p-badge p-badge-info">{cart.length}</span>
            </div>

            {/* Fixed Customer & Transport Details Area */}
            <div className="sidebar-customer-transport p-fluid">
              <div className="input-box">
                <label><User size={14}/> Customer Details</label>
                <div className="flex flex-column gap-2 mb-2">
                  <div className="p-inputgroup">
                    <span className="p-inputgroup-addon"><User size={16} /></span>
                    <InputText placeholder="Customer Name" value={customerName} onChange={(e) => handleCustomerChange(e.target.value)} list="customers-list" />
                    <datalist id="customers-list">
                      {customers.map(c => <option key={c.id} value={c.name}>{c.phone}</option>)}
                    </datalist>
                  </div>
                  <div className="p-inputgroup">
                    <span className="p-inputgroup-addon"><Phone size={16} /></span>
                    <InputText placeholder="Phone Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                  <div className="p-inputgroup">
                    <span className="p-inputgroup-addon"><MapPin size={16} /></span>
                    <InputText placeholder="Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                  </div>
                </div>
                {selectedCustomer && (
                  <div className="p-message p-message-info p-2 mt-1" style={{fontSize: '0.75rem'}}>
                    Previous Balance: Rs. {parseFloat(selectedCustomer.balance).toLocaleString()} {parseFloat(selectedCustomer.balance) > 0 ? '(Pending)' : '(Clear)'}
                  </div>
                )}
              </div>

              <div className="input-box mt-1">
                <label><Truck size={14}/> Transport Vehicle</label>
                <div className="flex gap-2">
                  <Dropdown value={transportType} options={[
                    {label: 'No Transport', value: ''},
                    {label: 'Personal', value: 'Personal'},
                    {label: 'Rent', value: 'Rent'}
                  ]} onChange={(e) => { setTransportType(e.value); setSelectedVehicleId(''); }} placeholder="Transport Type" className="flex-1" />
                  
                  {transportType && (
                    <Dropdown value={selectedVehicleId} options={vehicles.filter(v => v && !v.is_deleted && (v.ownership_type || '').toString().toLowerCase().trim() === transportType.toLowerCase().trim()).map(v => ({
                      label: `${v.vehicle_number} (${v.driver_name})`,
                      value: v.id
                    }))} onChange={(e) => setSelectedVehicleId(e.value)} placeholder="Select Vehicle" className="flex-1" />
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Cart Area with Dynamic Scaling based on cart.length! */}
            <div className="sidebar-cart-scrollable">
              <div className="cart-list">
                {cart.map(item => {
                  const pInfo = products.find(p => String(p.id) === String(item.id));
                  const maxStock = pInfo ? parseFloat(pInfo.stock_quantity || 0) : 0;
                  const isOver = parseFloat(item.qty || 0) > maxStock;


                  let compactClass = "";
                  if (cart.length >= 5) compactClass = "ultra-compact";
                  else if (cart.length >= 3) compactClass = "compact-card";
                  
                  const qtyStr = String(item.qty);
                  let qtyFontSize = "0.85rem";
                  if (qtyStr.length > 8) qtyFontSize = "0.55rem";
                  else if (qtyStr.length > 5) qtyFontSize = "0.7rem";

                  const priceStr = String(item.price);
                  let priceFontSize = "0.85rem";
                  if (priceStr.length > 8) priceFontSize = "0.55rem";
                  else if (priceStr.length > 5) priceFontSize = "0.7rem";

                  const subtotalStr = `Rs. ${(item.price * item.qty).toLocaleString()}`;
                  let subtotalFontSize = "0.85rem";
                  if (subtotalStr.length > 15) subtotalFontSize = "0.55rem";
                  else if (subtotalStr.length > 10) subtotalFontSize = "0.7rem";

                  return (
                    <div key={item.id} className={`cart-item ${compactClass} ${isOver ? 'over-stock-row' : ''}`} style={isOver ? {borderColor: '#fecaca', background: '#fffafb', boxShadow: '0 0 0 1px #ef4444 inset'} : {}}>
                      <div className="item-top">
                        <span className="name" style={{color: isOver ? "#dc2626" : "inherit", fontWeight: isOver ? "700" : "inherit"}}>{item.name} {isOver && <span style={{background: "#fee2e2", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px", fontSize: "0.6rem", marginLeft: "6px"}}>Out of Stock</span>}</span>
                        <button className="cart-delete-btn" onClick={() => removeFromCart(item.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-bottom">
                        <div className="p-inputgroup" style={{flex: '1', minWidth: '85px', maxWidth: '130px'}}>
                          <span className="p-inputgroup-addon" style={{fontWeight: '800', color: '#3b82f6', background: '#eff6ff', fontSize: '0.75rem', padding: '0 4px'}}>Rs</span>
                          <InputText type="text" inputMode="numeric" pattern="[0-9]*"
                                    value={item.price} 
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      updatePrice(item.id, val ? parseInt(val) : 0);
                                    }} 
                                    className="p-inputtext-sm font-bold text-center" style={{width: '100%', fontSize: priceFontSize}} />
                        </div>
                        <div className="qty-ctrl">
                           <button className="cart-qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                           <InputText type="text" inputMode="numeric" pattern="[0-9]*"
                                     value={item.qty} 
                                     onChange={(e) => {
                                       const val = e.target.value.replace(/\D/g, "");
                                       setQtyDirect(item.id, val ? parseInt(val) : 0);
                                     }} 
                                     className="p-inputtext-sm text-center font-bold" 
                                     style={{width: `${Math.max(30, (qtyStr.length * 7) + 15)}px`, border: 'none', background: 'transparent', padding: '0', fontSize: qtyFontSize, transition: 'width 0.2s'}} />
                           <button className="cart-qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                         </div>
                        <div className="item-subtotal" style={{fontSize: subtotalFontSize}}>{subtotalStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fixed Footer with Checkout Calculations */}
            <div className="sidebar-footer">
              <div className="calc-grid">
                <div className="calc-row">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="calc-row">
                  <span>Discount</span>
                  <div className="p-inputgroup p-inputgroup-sm" style={{width: String(discount || '').length > 5 ? '140px' : '110px', transition: 'width 0.2s'}}>
                    <span className="p-inputgroup-addon font-bold" style={{color: '#ef4444', fontSize: '0.75rem', padding: '0 4px'}}>Rs</span>
                    <InputText type="text" inputMode="numeric" pattern="[0-9]*"
                              value={discount} 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setDiscount(val ? parseInt(val) : 0);
                              }} 
                              className="font-bold text-center" 
                              style={{fontSize: String(discount || '').length > 8 ? '0.65rem' : String(discount || '').length > 5 ? '0.75rem' : '0.85rem', transition: 'font-size 0.2s'}} />
                  </div>
                </div>
                <div className="calc-row">
                  <span>Delivery</span>
                  <div className="p-inputgroup p-inputgroup-sm" style={{width: String(delivery || '').length > 5 ? '140px' : '110px', transition: 'width 0.2s'}}>
                    <span className="p-inputgroup-addon font-bold" style={{color: '#3b82f6', fontSize: '0.75rem', padding: '0 4px'}}>Rs</span>
                    <InputText type="text" inputMode="numeric" pattern="[0-9]*"
                              value={delivery} 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setDelivery(val ? parseInt(val) : 0);
                              }} 
                              className="font-bold text-center" 
                              style={{fontSize: String(delivery || '').length > 8 ? '0.65rem' : String(delivery || '').length > 5 ? '0.75rem' : '0.85rem', transition: 'font-size 0.2s'}} />
                  </div>
                </div>
                <div className="grand-total">
                  <span>Total</span>
                  <span style={{fontSize: `Rs. ${netTotal.toLocaleString()}`.length > 15 ? '0.95rem' : `Rs. ${netTotal.toLocaleString()}`.length > 10 ? '1.15rem' : '1.4rem', transition: 'font-size 0.2s'}}>{`Rs. ${netTotal.toLocaleString()}`}</span>
                </div>
                <div className="flex flex-column gap-2 mt-2">
                  <div className="flex gap-2">
                    <div className="flex flex-1 gap-1">
                      <InputText type="number" min="0" placeholder="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} 
                                className="flex-1 font-bold" style={{fontSize: String(paidAmount || '').length > 8 ? '0.75rem' : String(paidAmount || '').length > 5 ? '0.85rem' : '1rem', transition: 'font-size 0.2s'}} />
                      <Button icon="pi pi-pause" onClick={holdBill} tooltip="Hold Bill" className="hold-bill-btn" />
                    </div>
                    <Dropdown value={paymentType} options={[
                      {label: 'Cash', value: 'Cash'},
                      {label: 'Bank', value: 'Bank'},
                      {label: 'Credit', value: 'Credit'}
                    ]} onChange={(e) => setPaymentType(e.value)} className="flex-1" />
                  </div>
                  {paymentType === 'Bank' && (
                    <Dropdown value={selectedBank} options={bankAccounts.filter(b => {
                      const name = b.bank_name.toLowerCase().trim();
                      return name !== 'cash' && name !== 'cash account';
                    }).map(b => {
                      const digits = b.account_number ? b.account_number.slice(-4) : '';
                      return {
                        label: `${b.bank_name} ${b.account_title ? `- ${b.account_title}` : ''} ${digits ? `(****${digits})` : ''}`,
                        value: `${b.bank_name} ${digits ? `(****${digits})` : ''}`
                      };
                    })} onChange={(e) => setSelectedBank(e.value)} placeholder="Select Receiving Bank" />
                  )}
                </div>
              </div>
              
              {/* Assign Labour Loading Group */}
              <div className="input-box mt-2" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', paddingBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Users size={14} /> Assign Labour Loading Group
                </label>
                <div className="flex gap-2">
                  <Dropdown 
                    value={selectedLabourGroup} 
                    options={labourGroups.map(g => ({ label: g, value: g }))} 
                    onChange={(e) => setSelectedLabourGroup(e.value)} 
                    placeholder="Select Group" 
                    className="w-full" 
                  />
                </div>
              </div>

              <Button label={loading ? "Processing..." : "Complete Sale"} icon="pi pi-check" onClick={handleCheckout} 
                      disabled={loading || cart.length === 0 || cart.some(item => { const p = products.find(x => String(x.id) === String(item.id)); return parseFloat(item.qty || 0) > parseFloat(p ? p.stock_quantity : 0); })} className="w-full mt-3 p-button-lg shadow-2" />
            </div>
          </div>
        </div>
      ) : (
        <div className="history-container" style={{padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }} className="no-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Sales Log</h2>
              {user?.role === 'admin' && selectedSales.length > 0 && (
                <button 
                  type="button"
                  onClick={() => {
                    triggerConfirm(
                      `Are you sure you want to delete ${selectedSales.length} selected sales? Stock and balance will be reverted.`,
                      async () => {
                        for (const s of selectedSales) {
                          await fetch(`${SALES_API}/${s.id}`, { 
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                          });
                        }
                        setSelectedSales([]);
                        fetchData();
                      }
                    );
                  }}
                  style={{
                    background: '#fef2f2',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    padding: '6px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={16} /> Delete Selected ({selectedSales.length})
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
               {["Today", "Yesterday", "All Time"].map(d => (
                 <button 
                   type="button"
                   key={d} 
                   className={`tab-btn ${salesDateFilter === d ? 'active' : ''}`} 
                   onClick={() => setSalesDateFilter(d)}
                   style={{
                     padding: '6px 16px',
                     borderRadius: '8px',
                     fontSize: '0.85rem',
                     fontWeight: 700,
                     background: salesDateFilter === d ? '#3b82f6' : 'transparent',
                     color: salesDateFilter === d ? 'white' : '#64748b',
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

          {/* ── Sales History Total Summary Strip ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }} className="no-print">
            <div style={{ background: 'white', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Sales Value</div>
              <div style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 800 }}>Rs. {filteredSales.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0).toLocaleString()}</div>
            </div>
            <div style={{ background: 'white', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Paid/Collected</div>
              <div style={{ fontSize: '1.25rem', color: '#16a34a', fontWeight: 800 }}>Rs. {filteredSales.reduce((sum, s) => sum + parseFloat(s.paid_amount || 0), 0).toLocaleString()}</div>
            </div>
            <div style={{ background: 'white', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Remaining Balance</div>
              <div style={{ fontSize: '1.25rem', color: '#ef4444', fontWeight: 800 }}>Rs. {filteredSales.reduce((sum, s) => sum + parseFloat(s.balance_amount || 0), 0).toLocaleString()}</div>
            </div>
          </div>

          <DataTable value={filteredSales} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} className="p-datatable-sm" stripedRows responsiveLayout="scroll"
                     selection={selectedSales} onSelectionChange={(e) => setSelectedSales(e.value)}>
            {user?.role === 'admin' && (
              <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
            )}
            <Column header="Date" body={(s) => new Date(s.created_at).toLocaleDateString()} sortable field="created_at" />
            <Column header="Bill No" body={(s) => `#SAL-${s.id}`} sortable field="id" />
            <Column header="Customer" field="customer_name" sortable />
            <Column header="Phone" body={(s) => s.customer_phone || "—"} />
            <Column header="Items Sold" body={(s) => {
              const items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
              const formattedList = items.map(i => {
                const qtyVal = parseFloat(i.qty || 0);
                const brandStr = i.brand && i.brand !== 'undefined' ? `${i.brand} ` : '';
                const nameStr = i.name || i.product_name || '';
                return `${qtyVal} x ${brandStr}${nameStr}`;
              }).join(", ");
              return (
                <div style={{fontSize: '0.85rem', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={formattedList}>
                  {items.length > 0 ? formattedList : "—"}
                </div>
              );
            }} />
            <Column header="Address" body={(s) => s.customer_address || "—"} />
            <Column header="Total" body={(s) => <span className="font-bold">Rs.{s.net_amount.toLocaleString()}</span>} sortable field="net_amount" />
            <Column header="Paid" body={(s) => <span className="text-green-600 font-bold">Rs.{s.paid_amount.toLocaleString()}</span>} sortable field="paid_amount" />
            <Column header="Balance" body={(s) => <span className="text-red-600 font-bold">Rs.{s.balance_amount.toLocaleString()}</span>} sortable field="balance_amount" />
            <Column header="Type" body={(s) => <span className={`status-badge ${s.payment_type.toLowerCase()}`} style={{padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700}}>{s.payment_type}</span>} sortable field="payment_type" />
            <Column header="Status" body={(s) => (
              <span className={`status-badge ${s.status === 'Returned' ? 'cancelled' : 'paid'}`} style={{padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700}}>
                {s.status || 'Completed'}
              </span>
            )} sortable field="status" />
            <Column header="" body={(s) => (
              <ActionMenu 
                onEdit={user?.role === 'admin' ? () => {
                  const items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
                  setCart(items.map(i => ({
                    id: i.id || i.product_id,
                    name: i.name || i.product_name,
                    price: parseFloat(i.price || i.rate),
                    qty: parseFloat(i.qty),
                    subtotal: parseFloat(i.subtotal)
                  })));
                  setCustomerName(s.customer_name || '');
                  setCustomerPhone(s.customer_phone || '');
                  setCustomerAddress(s.customer_address || '');
                  setDiscount(s.discount);
                  setDelivery(s.delivery_charges);
                  setPaidAmount(s.paid_amount);
                  setPaymentType(s.payment_type.includes('Bank') ? 'Bank' : s.payment_type);
                  if (s.payment_type.includes('Bank')) {
                    setSelectedBank(s.payment_type.replace('Bank - ', ''));
                  }
                  const matchedVeh = vehicles.find(v => v && String(v.id) === String(s.vehicle_id));
                  setTransportType(matchedVeh ? matchedVeh.ownership_type : '');
                  setSelectedVehicleId(s.vehicle_id || '');
                  setEditId(s.id);
                  setView('POS');
                } : null}
                onDelete={user?.role === 'admin' ? () => {
                  triggerConfirm(
                    'Are you sure you want to delete this sale? Stock and balance will be reverted.',
                    async () => {
                      await fetch(`${SALES_API}/${s.id}`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                      });
                      fetchData();
                    }
                  );
                } : null}
                extraItems={[
                  { 
                    label: 'Print Receipt', 
                    icon: 'pi pi-print', 
                    command: () => {
                      const vhObj = vehicles.find(v => v && String(v.id) === String(s.vehicle_id));
                      setReceiptData({
                        saleId: s.id,
                        date: new Date(s.created_at).toLocaleString(),
                        customerName: s.customer_name || 'Walking Customer',
                        customerPhone: s.customer_phone || '',
                        customerAddress: s.customer_address || '',
                        vehicleType: s.vehicle_type || '',
                        vehicleId: vhObj ? vhObj.vehicle_number : (s.vehicle_id || ''),
                        items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []),
                        subtotal: s.total_amount,
                        discount: s.discount,
                        delivery: s.delivery_charges,
                        totalAmount: s.net_amount,
                        paidAmount: s.paid_amount,
                        previousBalance: 0,
                        newBalance: s.balance_amount,
                        paymentMethod: s.payment_type,
                        bankAccount: s.payment_type.includes('Bank') ? s.payment_type.replace('Bank - ', '') : null,
                        saleType: s.sale_type,
                        selectedLabourGroup: s.labour_group,
                      });
                      setTimeout(() => window.print(), 500);
                    } 
                  },
                  {
                    label: 'View Ledger',
                    icon: 'pi pi-book',
                    command: () => {
                      const cust = customers.find(c => c.id === s.customer_id);
                      if (cust) {
                        openLedger(cust);
                      } else {
                        // Fallback if customer object not found in current list
                        openLedger({ id: s.customer_id, name: s.customer_name });
                      }
                    }
                  }
                ]}
              />
            )} style={{ textAlign: 'center', width: '60px' }} />
          </DataTable>
        </div>
      )}

      {showSuccess && (
        <div className="modal-overlay no-print">
          <div className="modal success-modal">
            <CheckCircle size={60} color="#10b981" />
            <h2>Sale Completed!</h2>
            <p>Invoice #SAL-{lastSaleId} has been generated.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSuccess(false)}>Close</button>
              <button className="btn-primary" onClick={() => { window.print(); }}>Print Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Section */}
      {receiptData && (
        <div className="thermal-receipt print-only">
          <div className="receipt-header">
            <h2>DATA WALEY</h2>
            {receiptData.saleType === 'Retail 2' ? (
              <>
                <h2 style={{ fontSize: '15px', fontWeight: 'normal', margin: '2px 0 8px 0' }}>RETAIL 2</h2>
                <div className="contact-info">
                  <p>Waqar Butt: 0311-4105840</p>
                  <p>Mhd Aiss: 0335-1430216</p>
                  <p>Saifullah: 0333-4714628</p>
                </div>
                <p className="address">
                  Ada Treadywali Stop Main Jaranwala Road,<br/>
                  District Sheikupura.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '15px', fontWeight: 'normal', margin: '2px 0 8px 0' }}>CEMENT DEALER</h2>
                <div className="contact-info">
                  <p>Tariq Mehmood: 0300-4269347</p>
                  <p>Mian Shehroz: 0335-4294300</p>
                  <p>Ziaullah: 0322-4295106</p>
                </div>
                <p className="address">
                  12-KM Main Lahore Sheikhupura Road,<br/>
                  Ada Kot Abdul Malik.
                </p>
              </>
            )}
          </div>
          
          <div className="dashed-line"></div>
          <h3 className="bill-title">BILL</h3>
          
          <div className="bill-info">
            <div className="info-row"><span>Bill No</span> <span>: {receiptData.saleId}</span></div>
            <div className="info-row"><span>Date</span> <span>: {receiptData.date}</span></div>
            <div className="info-row"><span>Name</span> <span>: {receiptData.customerName}</span></div>
            {receiptData.customerPhone && <div className="info-row"><span>Phone</span> <span>: {receiptData.customerPhone}</span></div>}
            {receiptData.customerAddress && <div className="info-row"><span>Address</span> <span>: {receiptData.customerAddress}</span></div>}
            {receiptData.vehicleType && <div className="info-row"><span>Vehicle Type</span> <span>: {receiptData.vehicleType}</span></div>}
            {receiptData.vehicleId && <div className="info-row"><span>Vehicle No</span> <span>: {receiptData.vehicleId}</span></div>}
            <div className="info-row"><span>Labour Group</span> <span>: {receiptData.selectedLabourGroup || "No"}</span></div>
            {receiptData.paymentMethod && <div className="info-row"><span>Payment Type</span> <span>: {receiptData.paymentMethod}</span></div>}
          </div>
          
          <div className="dashed-line"></div>
          
          <table className="items-table">
            <thead>
              <tr>
                <th className="desc">DESCRIPTION</th>
                <th className="qty">QTY</th>
                <th className="rate">RATE</th>
                <th className="amt">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="4" className="dashed-cell"></td></tr>
              {receiptData.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="desc">{item.name}</td>
                  <td className="qty">{item.qty}</td>
                  <td className="rate">{item.price}</td>
                  <td className="amt">{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="dashed-line mt-10"></div>
          {receiptData.subtotal > 0 && (
            <div className="total-row" style={{fontSize: '11px'}}>
              <span>SUBTOTAL</span>
              <span>Rs. {receiptData.subtotal.toLocaleString()}/-</span>
            </div>
          )}
          {receiptData.discount > 0 && (
            <div className="total-row" style={{fontSize: '11px'}}>
              <span>DISCOUNT</span>
              <span>Rs. {receiptData.discount.toLocaleString()}/-</span>
            </div>
          )}
          {receiptData.delivery > 0 && (
            <div className="total-row" style={{fontSize: '11px'}}>
              <span>DELIVERY</span>
              <span>Rs. {receiptData.delivery.toLocaleString()}/-</span>
            </div>
          )}
          <div className="total-row">
            <span>BILL AMOUNT</span>
            <span>Rs. {receiptData.totalAmount.toLocaleString()}/-</span>
          </div>
          <div className="total-row" style={{fontSize: '12px'}}>
            <span>PAID NOW</span>
            <span>Rs. {receiptData.paidAmount.toLocaleString()}/-</span>
          </div>
          <div className="dashed-line"></div>
          
          <div className="total-row" style={{fontSize: '12px'}}>
            <span>PREVIOUS BAL</span>
            <span>{receiptData.previousBalance}/-</span>
          </div>
          <div className="total-row" style={{fontSize: '14px', fontWeight: 'bold'}}>
            <span>TOTAL BALANCE</span>
            <span>{receiptData.newBalance}/-</span>
          </div>
          <div className="dashed-line"></div>
          
          <h3 className="paid-status" style={{fontSize: '16px'}}>
            {receiptData.newBalance > 0 ? 'PENDING' : 'CLEAR'}
          </h3>
          <div className="dashed-line"></div>
          
          <div className="receipt-footer">
            <p>For Any Query:</p>
            <p>{receiptData.saleType === 'Retail 2' ? '0311-4105840' : '0322-4295106'}</p>
            <div className="dashed-line mt-10"></div>
            <p className="terms" style={{fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginTop: '5px'}}>Thank you for coming</p>
            <p className="terms" style={{fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase'}}>have a good day sir</p>
            <div className="dashed-line"></div>
          </div>
        </div>
      )}
      {/* Customer Ledger Modal */}
      {showLedgerModal && selectedCustForLedger && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header no-print">
              <div className="header-info" style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <FileText size={24} color="#3b82f6" />
                <h3>Customer Ledger: {selectedCustForLedger.name}</h3>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <button className="btn-secondary" onClick={() => window.print()} style={{padding: '6px 12px', display:'flex', alignItems:'center', gap:'6px'}}>
                  <Printer size={16} /> Print Report
                </button>
                <button className="modal-close" onClick={() => setShowLedgerModal(false)}><X size={20} /></button>
              </div>
            </div>

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
                <p style={{margin: '10px 0 5px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '5px'}}>Customer Sales Ledger Report</p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '14px'}}>
                  <span><strong>Customer:</strong> {selectedCustForLedger.name}</span>
                  <span><strong>Period:</strong> {ledgerFilter === 'all' ? 'All Time' : `${ledgerFrom} to ${ledgerTo}`}</span>
                  <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', width: '50px'}}>S.No.</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left'}}>Bill No / Items</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Debit (+)</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Credit (-)</th>
                    <th style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedLedgerData.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{index + 1}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>{new Date(row.created_at).toLocaleDateString()}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px'}}>
                        {parseFloat(row.net_amount) > 0 ? (
                          (() => {
                            let items = [];
                            try {
                              items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
                            } catch (e) { items = []; }
                            return `#SAL-${row.id} - ` + items.map(i => `${i.name} (${i.qty} x Rs.${i.rate})`).join(', ');
                          })()
                        ) : `#PAY-${row.id} - Payment Received (${row.payment_type || 'Cash'})`}
                      </td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>{parseFloat(row.net_amount).toLocaleString()}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>{parseFloat(row.paid_amount).toLocaleString()}</td>
                      <td style={{border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right'}}>{parseFloat(row.running_balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="detail-body no-print" style={{padding: '24px'}}>
              <div className="profit-filter-bar" style={{marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px'}}>
                <span className="filter-label" style={{marginRight: '12px', fontWeight: 600, color: '#64748b'}}>📅 Period:</span>
                {[
                  { key:'all',   label:'All Time' },
                  { key:'today', label:'Today' },
                  { key:'week',  label:'7 Days' },
                  { key:'month', label:'Month' },
                  { key:'custom',label:'Custom Range' },
                ].map(f => (
                  <button key={f.key} onClick={() => applyLedgerFilter(f.key)}
                    className={`filter-btn ${ledgerFilter === f.key ? 'active' : ''}`}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      marginRight: '8px',
                      fontSize: '0.85rem',
                      background: ledgerFilter === f.key ? '#3b82f6' : 'white',
                      color: ledgerFilter === f.key ? 'white' : '#64748b',
                      cursor: 'pointer'
                    }}>
                    {f.label}
                  </button>
                ))}

                {ledgerFilter === 'custom' && (
                  <div className="custom-date-row" style={{display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '12px'}}>
                    <input type="date" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} style={{padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1'}} />
                    <span className="sep">→</span>
                    <input type="date" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} style={{padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1'}} />
                    <button className="btn-primary" onClick={() => openLedger(selectedCustForLedger, ledgerFrom, ledgerTo, 'custom')} style={{padding: '2px 10px', fontSize: '0.8rem'}}>Apply Range</button>
                  </div>
                )}
              </div>

              <div className="stats-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Invoices</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{ledgerData.length}</div>
                </div>
                <div className="stat-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Value</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Rs. {ledgerData.reduce((sum, item) => sum + parseFloat(item.net_amount), 0).toLocaleString()}</div>
                </div>
                <div className="stat-item" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Collected</div>
                  <div style={{ fontSize: '1.25rem', color: '#16a34a', fontWeight: 700 }}>Rs. {ledgerData.reduce((sum, item) => sum + parseFloat(item.paid_amount), 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="module-table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table className="module-table">
                  <thead>
                    <tr>
                      <th style={{width: '50px'}}>S.No.</th>
                      <th>Date</th>
                      <th>Bill Details</th>
                      <th>Debit (+)</th>
                      <th>Credit (-)</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedLedgerData.length === 0 ? (
                      <tr><td colSpan="6" className="empty-msg">No sales history found for this customer.</td></tr>
                    ) : (
                      calculatedLedgerData.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{fontWeight: '700', color: '#64748b'}}>{index + 1}</td>
                          <td>{new Date(row.created_at).toLocaleDateString()}</td>
                          <td>
                            {parseFloat(row.net_amount) > 0 ? (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                  <strong>Invoice #SAL-{row.id}</strong>
                                  {row.status === 'Returned' && <span style={{fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 800}}>RETURNED</span>}
                                  {row.status === 'Partially Returned' && <span style={{fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800}}>PARTIAL</span>}
                                </div>
                                {(() => {
                                  let items = [];
                                  try {
                                    items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
                                  } catch (e) { items = []; }
                                  
                                  return (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                      {items.map((item, idx) => (
                                          <div key={idx} style={{display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0'}}>
                                            <span style={{fontSize: '0.8rem', fontWeight: 600, flex: 1}}>{item.name}</span>
                                            <span style={{fontSize: '0.8rem', color: '#64748b'}}>{item.qty} x Rs.{item.rate}</span>
                                            <span style={{fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', minWidth: '60px', textAlign: 'right'}}>
                                              Rs. {(parseFloat(item.qty) * parseFloat(item.rate)).toLocaleString()}
                                            </span>
                                          </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div>
                                <strong>Payment Received</strong>
                                <br/><small style={{color:'#64748b'}}>{row.payment_type || 'Cash'}</small>
                              </div>
                            )}
                          </td>
                          <td className="bold">Rs. {parseFloat(row.net_amount).toLocaleString()}</td>
                          <td className="text-green">Rs. {parseFloat(row.paid_amount).toLocaleString()}</td>
                          <td className="bold">Rs. {parseFloat(row.running_balance).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="modal-footer no-print" style={{padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn-secondary" onClick={() => setShowLedgerModal(false)}>Close Ledger</button>
            </div>
          </div>
        </div>
      )}
      {/* Held Bills Modal */}
      <Dialog 
        header="Held Bills (Drafts)" 
        visible={showHoldModal} 
        onHide={() => setShowHoldModal(false)}
        style={{width: '600px'}}
        className="p-dialog-custom"
      >
        <div className="held-bills-list">
          {heldBills.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
              <History size={48} style={{opacity: 0.3, marginBottom: '16px'}} />
              <p>No bills are currently on hold.</p>
            </div>
          ) : (
            heldBills.map(held => (
              <div key={held.id} style={{
                background: 'white', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{fontWeight: 800, fontSize: '1rem', color: '#1e293b'}}>{held.customerName || "Walk-in Customer"}</div>
                  <div style={{fontSize: '0.85rem', color: '#64748b', marginTop: '4px'}}>
                    {held.cart.length} Items • Total: Rs. {held.cart.reduce((sum, i) => sum + i.subtotal, 0).toLocaleString()}
                  </div>
                  <div style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px'}}>Held at: {held.time}</div>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <Button 
                    label="Resume" 
                    icon="pi pi-play" 
                    onClick={() => resumeBill(held)} 
                    className="p-button-primary p-button-sm" 
                  />
                  <Button 
                    icon="pi pi-trash" 
                    onClick={() => setHeldBills(heldBills.filter(b => b.id !== held.id))} 
                    className="p-button-danger p-button-text p-button-sm" 
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>

      {/* Sale Return Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <div className="header-info">
                <ArrowDownCircle size={24} color="#e11d48" />
                <h3>{returnStep === 1 ? 'Fetch Bill for Return' : 'Select Items to Return'}</h3>
              </div>
              <button className="modal-close" onClick={() => { setShowReturnModal(false); setReturnStep(1); }}><X size={20} /></button>
            </div>
            
            <div style={{padding: '20px'}}>
              {returnStep === 1 ? (
                <div className="custom-form p-fluid">
                  <div className="field mb-4">
                    <label className="block mb-2 font-bold" style={{color: '#475569'}}>Bill Number (Sale ID) *</label>
                    <div className="p-inputgroup">
                      <span className="p-inputgroup-addon"><Hash size={18} /></span>
                      <InputText 
                        type="number" 
                        required 
                        value={returnBillNo} 
                        placeholder="Enter Bill Number e.g. 101"
                        onChange={e => setReturnBillNo(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-content-end gap-2">
                    <Button type="button" label="Cancel" onClick={() => setShowReturnModal(false)} className="p-button-text" />
                    <Button type="button" label={returnLoading ? "Fetching..." : "Fetch Bill"} icon="pi pi-search" onClick={fetchSaleForReturn} disabled={returnLoading} className="p-button-danger" />
                  </div>
                </div>
              ) : (
                <div className="return-items-selection">
                  <div className="bill-summary mb-3 p-3" style={{background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <p><strong>Customer:</strong> {returnSaleDetails.customer_name}</p>
                    <p><strong>Total Bill:</strong> Rs. {returnSaleDetails.net_amount.toLocaleString()}</p>
                  </div>
                  
                  <div className="items-table mb-4" style={{maxHeight: '300px', overflowY: 'auto'}}>
                    <table className="w-full" style={{borderCollapse: 'collapse'}}>
                      <thead style={{background: '#f1f5f9', position: 'sticky', top: 0}}>
                        <tr>
                          <th className="p-2 text-left" style={{width: '40px'}}></th>
                          <th className="p-2 text-left">Item Name</th>
                          <th className="p-2 text-right">Sold</th>
                          <th className="p-2 text-right">Return Qty</th>
                          <th className="p-2 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItemsToReturn.map((item, idx) => (
                          <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                            <td className="p-2">
                              <input 
                                type="checkbox" 
                                checked={item.selected} 
                                onChange={e => {
                                  const updated = [...selectedItemsToReturn];
                                  updated[idx].selected = e.target.checked;
                                  setSelectedItemsToReturn(updated);
                                }}
                              />
                            </td>
                            <td className="p-2" style={{fontSize: '0.9rem'}}>{item.product_name}</td>
                            <td className="p-2 text-right" style={{color: '#64748b'}}>{item.qty}</td>
                            <td className="p-2 text-right">
                              <input 
                                type="number" 
                                min="1" 
                                max={item.qty}
                                value={item.return_qty}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  if (val > item.qty) return alert(`Cannot return more than sold (${item.qty})`);
                                  const updated = [...selectedItemsToReturn];
                                  updated[idx].return_qty = val;
                                  setSelectedItemsToReturn(updated);
                                }}
                                style={{width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right'}}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.rate}
                                onChange={e => {
                                  const updated = [...selectedItemsToReturn];
                                  updated[idx].rate = parseFloat(e.target.value) || 0;
                                  setSelectedItemsToReturn(updated);
                                }}
                                style={{width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right'}}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vehicle Return Log */}
                  <div className="vehicle-summary mb-3 p-2" style={{background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
                    <div className="flex justify-content-between align-items-center mb-2">
                      <label className="font-bold text-xs">Return Vehicle</label>
                      <div className="flex gap-1" style={{background: '#dbeafe', padding: '2px', borderRadius: '4px'}}>
                        <button type="button" onClick={() => { setReturnVehicleType('Rent'); setReturnVehicleId(''); }} className={`p-1 px-2 border-round text-xs border-none cursor-pointer ${returnVehicleType === 'Rent' ? 'bg-white shadow-1 font-bold text-blue-700' : 'bg-transparent text-blue-500'}`}>Rent</button>
                        <button type="button" onClick={() => { setReturnVehicleType('Personal'); setReturnVehicleId(''); }} className={`p-1 px-2 border-round text-xs border-none cursor-pointer ${returnVehicleType === 'Personal' ? 'bg-white shadow-1 font-bold text-blue-700' : 'bg-transparent text-blue-500'}`}>Personal</button>
                      </div>
                    </div>
                    <div className="grid">
                      <div className="col-7">
                        <Dropdown 
                          value={returnVehicleId} 
                          options={vehicles.filter(v => v && !v.is_deleted && (v.ownership_type || '').toString().toLowerCase().trim() === returnVehicleType.toLowerCase().trim()).map(v => ({
                            label: `${v.vehicle_number} (${v.driver_name})`,
                            value: v.id
                          }))}
                          onChange={e => setReturnVehicleId(e.value)}
                          className="p-inputtext-sm w-full"
                          placeholder="Optional Vehicle"
                          showClear
                          appendTo="self"
                        />
                      </div>
                      <div className="col-5">
                        <InputText 
                          type="number" 
                          value={returnDeliveryCharges} 
                          onChange={e => setReturnDeliveryCharges(parseFloat(e.target.value) || 0)}
                          className="p-inputtext-sm w-full"
                          placeholder="Karya"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Refund Details */}
                  <div className="refund-summary mb-4 p-3" style={{background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3'}}>
                    <div className="flex justify-content-between mb-2">
                      <span className="font-bold">Total Return Value:</span>
                      <span className="font-bold text-red-600">
                        Rs. {selectedItemsToReturn.filter(i => i.selected).reduce((sum, i) => sum + (i.return_qty * i.rate), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid">
                      <div className="col-6">
                        <label className="block mb-1 text-xs font-bold">Refund Amount</label>
                        <InputText 
                          type="number" 
                          value={refundAmount} 
                          onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                          className="p-inputtext-sm w-full"
                          placeholder="Cash back amount"
                        />
                      </div>
                      <div className="col-6">
                        <label className="block mb-1 text-xs font-bold">Refund Via</label>
                        <Dropdown 
                          value={refundMethod} 
                          options={['Cash', ...bankAccounts.filter(b => b.bank_name.toLowerCase() !== 'cash').map(b => b.bank_name)]} 
                          onChange={e => setRefundMethod(e.value)}
                          className="p-inputtext-sm w-full"
                          appendTo="self"
                        />
                      </div>
                    </div>
                    <p style={{fontSize: '0.7rem', color: '#b91c1c', marginTop: '8px'}}>
                      Note: Refund amount will be deducted from {refundMethod} in Accounts.
                    </p>
                  </div>

                  <div className="flex justify-content-between align-items-center">
                    <Button type="button" label="Back" onClick={() => setReturnStep(1)} className="p-button-text" />
                    <Button 
                      type="button" 
                      label={returnLoading ? "Processing..." : "Confirm & Process Return"} 
                      icon="pi pi-check" 
                      onClick={handleSaleReturn} 
                      disabled={returnLoading || !selectedItemsToReturn.some(i => i.selected)} 
                      className="p-button-danger shadow-2" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Return Slip Modal */}
      <Dialog 
        header="Return Receipt / Slip" 
        visible={showReturnSlip} 
        onHide={() => setShowReturnSlip(false)}
        style={{width: '400px'}}
        className="p-dialog-custom"
        footer={(
          <div className="flex justify-content-end gap-2 no-print">
            <Button label="Print Slip" icon="pi pi-print" onClick={() => window.print()} className="p-button-primary" />
            <Button label="Close" onClick={() => setShowReturnSlip(false)} className="p-button-text" />
          </div>
        )}
      >
        {lastReturnSlipData && (
          <div id="return-slip-print" className="p-3" style={{fontFamily: 'monospace', color: '#000'}}>
            <div style={{textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px'}}>
              <h2 style={{margin: 0}}>DATA WALEY CEMENT</h2>
              <p style={{margin: '2px 0', fontSize: '0.8rem'}}>SALE RETURN RECEIPT</p>
              <p style={{margin: '2px 0', fontSize: '0.7rem'}}>{lastReturnSlipData.date}</p>
            </div>
            
            <div style={{fontSize: '0.8rem', marginBottom: '10px'}}>
              <p><strong>Original Bill:</strong> #SAL-{lastReturnSlipData.sale_id}</p>
              <p><strong>Customer:</strong> {lastReturnSlipData.customer_name}</p>
              {lastReturnSlipData.vehicle_number && <p><strong>Vehicle No:</strong> {lastReturnSlipData.vehicle_number}</p>}
              {lastReturnSlipData.delivery_charges > 0 && <p><strong>Return Karya:</strong> Rs.{lastReturnSlipData.delivery_charges.toLocaleString()}</p>}
            </div>

            <table style={{width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '10px'}}>
              <thead>
                <tr style={{borderBottom: '1px solid #000'}}>
                  <th style={{textAlign: 'left'}}>Item</th>
                  <th style={{textAlign: 'right'}}>Qty</th>
                  <th style={{textAlign: 'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lastReturnSlipData.items_to_return.map((item, i) => (
                  <tr key={i}>
                    <td>{item.product_name}</td>
                    <td style={{textAlign: 'right'}}>{item.return_qty}</td>
                    <td style={{textAlign: 'right'}}>Rs.{(item.return_qty * item.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '0.9rem'}}>
              <div className="flex justify-content-between mb-1">
                <span>Returned Value:</span>
                <span>Rs. {lastReturnSlipData.items_to_return.reduce((sum, i) => sum + (i.return_qty * i.rate), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-content-between mb-1" style={{fontWeight: 800}}>
                <span>Refund Given ({lastReturnSlipData.refund_method}):</span>
                <span>Rs. {lastReturnSlipData.refund_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-content-between" style={{fontSize: '0.75rem', marginTop: '5px'}}>
                <span>Balance Adjusted:</span>
                <span>Rs. {(lastReturnSlipData.items_to_return.reduce((sum, i) => sum + (i.return_qty * i.rate), 0) - lastReturnSlipData.refund_amount).toLocaleString()}</span>
              </div>
            </div>

            <div style={{marginTop: '30px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '0.7rem'}}>
              <p>Thank you for your business!</p>
              <p>Software by Antigravity AI</p>
            </div>
          </div>
        )}
      </Dialog>

      {showConfirmModal && (
        <div className="modal-overlay no-print" style={{zIndex: 9999}}>
          <div className="modal" style={{maxWidth: '450px', borderRadius: '16px', padding: '24px', textAlign: 'center'}}>
            <div style={{color: '#ef4444', marginBottom: '15px'}}>
              <Trash2 size={48} style={{margin: '0 auto'}} />
            </div>
            <h3 style={{margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b'}}>Confirm Deletion</h3>
            <p style={{margin: '0 0 24px 0', fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5'}}>{confirmMessage}</p>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
              <button type="button" className="btn-secondary" onClick={() => setShowConfirmModal(false)} style={{padding: '10px 24px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700}}>
                Cancel
              </button>
              <button type="button" className="btn-primary" 
                      onClick={() => {
                        if (confirmAction) confirmAction();
                        setShowConfirmModal(false);
                      }} 
                      style={{background: '#ef4444', borderColor: '#ef4444', padding: '10px 24px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700}}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
