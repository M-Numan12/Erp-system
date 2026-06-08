// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Store, Package, Boxes, Receipt, Users as UsersIcon,
  Truck, Wallet, Banknote, LineChart, UserSquare2, Home,
  TrendingUp, MoreHorizontal, ArrowRight, AlertTriangle
} from "lucide-react";
import { AuthContext } from '../context/AuthContext';
import "../Styles/Dashboard.scss";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem("cache_dashboard_stats");
      return cached ? JSON.parse(cached) : { products: 0, lowStock: 0, customers: 0, monthlyExpenses: 0 };
    } catch {
      return { products: 0, lowStock: 0, customers: 0, monthlyExpenses: 0 };
    }
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const headers = { "Authorization": `Bearer ${localStorage.getItem('token')}` };

        const counterQuery = user?.role === 'admin' ? '' : `?type=${user?.module_type}`;

        // Concurrently fetch all major system data entities to perfectly fill caches globally for ultra-fast response times.
        const [prodRes, expRes, custRes, supRes, transRes] = await Promise.all([
          fetch(`${API_BASE_URL}/products${counterQuery}`, { headers }),
          fetch(`${API_BASE_URL}/expenses${counterQuery}`, { headers }),
          fetch(`${API_BASE_URL}/customers${counterQuery}`, { headers }),
          fetch(`${API_BASE_URL}/suppliers${counterQuery}`, { headers }),
          fetch(`${API_BASE_URL}/transport${counterQuery}`, { headers })
        ]);

        const [products, expenses, customers, suppliers, transport] = await Promise.all([
          prodRes.ok ? prodRes.json() : [],
          expRes.ok ? expRes.json() : [],
          custRes.ok ? custRes.json() : [],
          supRes.ok ? supRes.json() : [],
          transRes.ok ? transRes.json() : []
        ]);

        // Global pre-loading caching logic
        const modes = user?.role === 'admin' ? ['Wholesale', 'Retail 1', 'Retail 2'] : [user?.module_type || 'Wholesale'];
        
        modes.forEach(mode => {
          // If admin fetched all (no counter query), we filter by module_type. If operator fetched their specific, it's already filtered.
          const filterFn = (item) => user?.role === 'admin' ? ((item.module_type || item.sale_type || 'Wholesale') === mode) : true;
          
          const filteredProds = Array.isArray(products) ? products.filter(filterFn) : [];
          const filteredCusts = Array.isArray(customers) ? customers.filter(filterFn) : [];
          const filteredSups = Array.isArray(suppliers) ? suppliers.filter(filterFn) : [];
          const filteredTrans = Array.isArray(transport) ? transport.filter(filterFn) : [];
          
          localStorage.setItem(`cache_products_${mode}`, JSON.stringify(filteredProds));
          localStorage.setItem(`cache_customers_${mode}`, JSON.stringify(filteredCusts));
          localStorage.setItem(`cache_suppliers_records_${mode}`, JSON.stringify(filteredSups));
          // Support alternate naming convention in some files
          localStorage.setItem(`cache_suppliers_${mode}`, JSON.stringify(filteredSups)); 
          localStorage.setItem(`cache_transport_${mode}`, JSON.stringify(filteredTrans));
          localStorage.setItem(`cache_vehicles_${mode}`, JSON.stringify(filteredTrans));
        });

        // Extract standard stats for Dashboard view rendering
        if (Array.isArray(products) && Array.isArray(expenses) && Array.isArray(customers)) {
          const newStats = {
            products: products.length,
            lowStock: products.filter(p => parseFloat(p.stock_quantity || 0) <= parseFloat(p.minimum_stock || 0)).length,
            customers: customers.length,
            monthlyExpenses: Array.isArray(expenses) ? expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) : 0
          };
          setStats(newStats);
          localStorage.setItem("cache_dashboard_stats", JSON.stringify(newStats));
        }
      } catch (err) {
        console.error("Universal cache pre-fetching failed silently", err);
      }
    };
    fetchStats();
  }, [user]);

  const modules = [
    { id: "products", name: "Products", path: "/products", icon: <Package size={28} />, desc: "Manage Items", color: "#3b82f6" },
    { id: "stock", name: "Stock", path: "/stock", icon: <Boxes size={28} />, desc: "Inventory", color: "#10b981" },
    { id: "billing", name: "Billing", path: "/billing", icon: <Receipt size={28} />, desc: "Invoices", color: "#8b5cf6" },
    { id: "customers", name: "Customers", path: "/customers", icon: <UsersIcon size={28} />, desc: "CRM", color: "#f59e0b" },
    { id: "suppliers", name: "Suppliers", path: "/suppliers", icon: <UserSquare2 size={28} />, desc: "Vendors", color: "#ec4899" },
    { id: "transport", name: "Transport", path: "/transport", icon: <Truck size={28} />, desc: "Fleet", color: "#06b6d4" },
    { id: "expenses", name: "Expenses", path: "/expenses", icon: <Wallet size={28} />, desc: "Daily Costs", color: "#ef4444" },
    { id: "salary", name: "Salary", path: "/salary", icon: <Banknote size={28} />, desc: "Payroll", color: "#6366f1" },
    { id: "profit", name: "Profit", path: "/profit", icon: <LineChart size={28} />, desc: "Analytics", color: "#f97316" },
    { id: "rent", name: "Rent", path: "/rent", icon: <Home size={28} />, desc: "Property", color: "#7c3aed" },
    { id: "investment", name: "Investment", path: "/investment", icon: <TrendingUp size={28} />, desc: "Track ROI", color: "#0891b2" },
    { id: "other-expenses", name: "Other Expenses", path: "/other-expenses", icon: <MoreHorizontal size={28} />, desc: "Misc.", color: "#475569" }
  ];

  const hasPermission = (moduleId) => {
    if (user?.role === 'admin') return true;
    return user?.permissions?.includes(moduleId);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, <span className="user-name">{user?.name || 'User'}</span> 👋</h1>
          <p className="subtitle">Here's a quick overview of your building materials empire today.</p>
        </div>
        <div className="current-time" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          padding: '10px 18px',
          borderRadius: '12px',
          fontWeight: 800,
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <span style={{fontSize: '1.3rem', display: 'inline-block', animation: 'pulse 2s infinite'}}>⏰</span>
          <span style={{fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 800}}>
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Stats Grid - ONLY for Master Admin */}
      {user?.role === 'admin' && (
        <div className="stats-grid">
          <div className="stat-card premium-shadow">
            <div className="stat-icon blue"><Package size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Inventory</span>
              <span className="stat-value">{stats.products} Items</span>
            </div>
            <div className="stat-chart mini-line blue"></div>
          </div>
          <div className="stat-card premium-shadow">
            <div className="stat-icon orange"><AlertTriangle size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Low Stock</span>
              <span className="stat-value">{stats.lowStock} Alerts</span>
            </div>
            <div className="stat-chart mini-line orange"></div>
          </div>
          <div className="stat-card premium-shadow">
            <div className="stat-icon green"><UsersIcon size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Partners</span>
              <span className="stat-value">{stats.customers} Contacts</span>
            </div>
            <div className="stat-chart mini-line green"></div>
          </div>
          <div className="stat-card premium-shadow">
            <div className="stat-icon red"><Wallet size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Expense Flow</span>
              <span className="stat-value">Rs. {stats.monthlyExpenses.toLocaleString()}</span>
            </div>
            <div className="stat-chart mini-line red"></div>
          </div>
        </div>
      )}

      {/* Primary Actions */}
      <div className="primary-modules">
        {hasPermission('wholesale') && (
          <Link to="/wholesale" className="primary-card wholesale-card">
            <div className="card-content">
              <Building2 size={40} className="card-icon" />
              <div className="text-content">
                <h3>Wholesale</h3>
                <p>Bulk orders & Stock management</p>
              </div>
              <ArrowRight className="arrow" />
            </div>
          </Link>
        )}

        {hasPermission('retail1') && (
          <Link to="/retail1" className="primary-card retail-card retail1">
            <div className="card-content">
              <Store size={40} className="card-icon" />
              <div className="text-content">
                <h3>Retail 1</h3>
                <p>Quick POS Billing - Counter 1</p>
              </div>
              <ArrowRight className="arrow" />
            </div>
          </Link>
        )}

        {hasPermission('retail2') && (
          <Link to="/retail2" className="primary-card retail-card retail2">
            <div className="card-content">
              <Store size={40} className="card-icon" />
              <div className="text-content">
                <h3>Retail 2</h3>
                <p>Quick POS Billing - Counter 2</p>
              </div>
              <ArrowRight className="arrow" />
            </div>
          </Link>
        )}
      </div>

      {/* Module Navigation Grid */}
      <div className="module-navigation">
        <h3 className="section-title">Business Modules</h3>
        <div className="secondary-modules">
          {modules.filter(mod => hasPermission(mod.id)).map((mod, idx) => (
            <Link to={mod.path} key={idx} className="secondary-card">
              <div className="icon-wrapper" style={{ backgroundColor: `${mod.color}15`, color: mod.color }}>
                {mod.icon}
              </div>
              <div className="mod-info">
                <h4>{mod.name}</h4>
                <p>{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
