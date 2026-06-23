import React, { useState } from 'react';
import { 
  ShoppingCart, Package, Boxes, History, 
  Users as UsersIcon, UserSquare2, TrendingUp, Wallet
} from 'lucide-react';
import Billing from './Billing';
import Products from '../Inventory/Products';
import Stock from '../Inventory/Stock';
import Customers from '../People/Customers';
import Suppliers from '../People/Suppliers';
import Expenses from '../Finance/Expenses';
import "../Styles/ModulePages.scss";

export default function CounterHub({ type = "Wholesale" }) {
  const [activeTab, setActiveTab] = useState('POS');

  const renderContent = () => {
    switch(activeTab) {
      case 'POS': return <Billing type={type} />;
      case 'Products': return <Products type={type} />;
      case 'Stock': return <Stock type={type} />;
      case 'Customers': return <Customers type={type} />;
      case 'Suppliers': return <Suppliers type={type} />;
      case 'Expenses': return <Expenses type={type} />;
      default: return <Billing type={type} />;
    }
  };

  return (
    <div className="counter-hub-page">
      <div className="hub-top-nav no-print">
        <div className="hub-info">
           <div className={`hub-badge ${type.toLowerCase().replace(' ', '')}`}>
             {type === 'Wholesale' ? <TrendingUp size={18}/> : <ShoppingCart size={18}/>}
             <span>{type} Hub</span>
           </div>
        </div>
        <div className="hub-tabs">
          <button className={activeTab === 'POS' ? 'active' : ''} onClick={() => setActiveTab('POS')}><ShoppingCart size={16}/> POS & History</button>
          <button className={activeTab === 'Products' ? 'active' : ''} onClick={() => setActiveTab('Products')}><Package size={16}/> Products</button>
          <button className={activeTab === 'Stock' ? 'active' : ''} onClick={() => setActiveTab('Stock')}><Boxes size={16}/> Stock</button>
          <button className={activeTab === 'Customers' ? 'active' : ''} onClick={() => setActiveTab('Customers')}><UsersIcon size={16}/> Customers</button>
          <button className={activeTab === 'Suppliers' ? 'active' : ''} onClick={() => setActiveTab('Suppliers')}><UserSquare2 size={16}/> Suppliers</button>
          <button className={activeTab === 'Expenses' ? 'active' : ''} onClick={() => setActiveTab('Expenses')}><Wallet size={16}/> Expenses</button>
        </div>
      </div>

      <div className="hub-content">
        {renderContent()}
      </div>
    </div>
  );
}
