import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2,
  Store,
  Package, 
  Boxes, 
  Users as UsersIcon, 
  UserSquare2, 
  Truck, 
  Wallet, 
  Banknote, 
  LineChart,
  ShieldAlert,
  LogOut,
  Home,
  TrendingUp,
  MoreHorizontal,
  ShoppingCart,
  X
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import '../Styles/Sidebar.scss';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'wholesale', name: 'Wholesale Counter', path: '/wholesale', icon: <Building2 size={20} /> },
    { id: 'retail1', name: 'Retail 1 Counter', path: '/retail1', icon: <Store size={20} /> },
    { id: 'retail2', name: 'Retail 2 Counter', path: '/retail2', icon: <Store size={20} /> },
    { id: 'retail3', name: 'Retail 3 Counter', path: '/retail3', icon: <Store size={20} /> },
    { id: 'products', name: 'Product Catalog', path: '/products', icon: <Package size={20} /> },
    { id: 'stock', name: 'Stock Inventory', path: '/stock', icon: <Boxes size={20} /> },
    { id: 'billing', name: 'Billing POS', path: '/billing', icon: <ShoppingCart size={20} /> },
    { id: 'customers', name: 'Customers CRM', path: '/customers', icon: <UsersIcon size={20} /> },
    { id: 'suppliers', name: 'Suppliers/Factory', path: '/suppliers', icon: <UserSquare2 size={20} /> },
    { id: 'transport', name: 'Transport Logistics', path: '/transport', icon: <Truck size={20} /> },
    { id: 'expenses', name: 'Daily Expenses', path: '/expenses', icon: <Wallet size={20} /> },
    { id: 'salary', name: 'Employee Salary', path: '/salary', icon: <Banknote size={20} /> },
    { id: 'labours', name: 'Labour Tracking', path: '/labours', icon: <UsersIcon size={20} /> },
    { id: 'profit', name: 'Profit & Loss', path: '/profit', icon: <LineChart size={20} /> },
    { id: 'rent', name: 'Rent Tracking', path: '/rent', icon: <Home size={20} /> },
    { id: 'investment', name: 'Investments', path: '/investment', icon: <TrendingUp size={20} /> },
    { id: 'staff', name: 'Staff Ledger', path: '/staff', icon: <MoreHorizontal size={20} /> },
    { id: 'accounts', name: 'Bank Accounts', path: '/accounts', icon: <Wallet size={20} /> },
    { id: 'users', name: 'Admin Control', path: '/users', icon: <ShieldAlert size={20} /> }
  ];

  // Filter menu items based on Permissions
  const filteredMenuItems = menuItems.filter(item => {
    // Master Admin sees EVERYTHING
    if (user?.role === 'admin') return true;

    // Dashboard is always visible for everyone
    if (item.id === 'dashboard') return true;

    // For everyone else, strictly follow the permissions array
    return user?.permissions?.includes(item.id);
  });

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-header-row">
          <div className="brand-logo">
             <Building2 size={24} />
             <h2>Data Waley</h2>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="brand-sub">Cement ERP</p>
        
        {user && (
          <div className="user-badge">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role === 'admin' ? 'System Administrator' : `${user.module_type} Operator`}</span>
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {filteredMenuItems.map((item, idx) => (
          <NavLink 
            key={idx} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="nav-icon">{item.icon}</div>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={() => { logout(); onClose(); }}>
          <LogOut size={20} />
          <span>Exit System</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
