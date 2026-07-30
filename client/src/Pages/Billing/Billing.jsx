import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import WholesaleBilling from './WholesaleBilling';
import Retail1Billing from './Retail1Billing';
import Retail2Billing from './Retail2Billing';
import Retail3Billing from './Retail3Billing';

export default function Billing({ type }) {
  const { user } = useContext(AuthContext);
  
  // Admin switcher state
  const [adminActiveTab, setAdminActiveTab] = useState("Wholesale");

  const getModuleType = () => {
    if (type) return type;
    
    // If logged-in user is admin and no type prop is passed, let admin switch tabs
    if (user?.role === 'admin') {
      return adminActiveTab;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const u = payload.user || payload;
        if (u.role === 'admin') return adminActiveTab;
        return u.module_type || "Wholesale";
      }
    } catch (e) {}
    
    return user?.module_type || 'Wholesale';
  };

  const moduleType = getModuleType();
  const showAdminSwitcher = !type && user?.role === 'admin';

  const renderContent = () => {
    if (moduleType === 'Retail 1') {
      return <Retail1Billing type={moduleType} />;
    }
    if (moduleType === 'Retail 2') {
      return <Retail2Billing type={moduleType} />;
    }
    if (moduleType === 'Retail 3') {
      return <Retail3Billing type={moduleType} />;
    }
    return <WholesaleBilling type={moduleType} />;
  };

  if (showAdminSwitcher) {
    return (
      <div className="admin-billing-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '15px 15px 5px 15px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div className="counter-switcher">
            {["Wholesale", "Retail 1", "Retail 2"].map((tab) => (
              <button
                key={tab}
                className={adminActiveTab === tab ? 'active' : ''}
                onClick={() => setAdminActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  return renderContent();
}
