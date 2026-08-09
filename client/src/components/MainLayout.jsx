import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import "../Styles/MainLayout.scss";

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="main-layout">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="mobile-brand">Data Waley Cement</span>
      </div>

      {/* Backdrop Overlay for Mobile Drawer */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="content-area">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
