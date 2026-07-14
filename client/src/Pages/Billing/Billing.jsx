import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import WholesaleBilling from './WholesaleBilling';
import Retail1Billing from './Retail1Billing';
import Retail2Billing from './Retail2Billing';

export default function Billing({ type }) {
  const { user } = useContext(AuthContext);

  const getModuleType = () => {
    if (type) return type;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const u = payload.user || payload;
        if (u.role === 'admin') return "Wholesale";
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
    
    return user?.module_type || 'Wholesale';
  };

  const moduleType = getModuleType();

  if (moduleType === 'Retail 1') {
    return <Retail1Billing type={moduleType} />;
  }
  if (moduleType === 'Retail 2') {
    return <Retail2Billing type={moduleType} />;
  }
  return <WholesaleBilling type={moduleType} />;
}
