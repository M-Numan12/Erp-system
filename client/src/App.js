import React from "react";
import "./Styles/global.scss";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import MainLayout from "./components/MainLayout";
import LoginPage from "./Pages/LoginPage.jsx";
import ForgotPassword from "./Pages/ForgotPassword.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import Products from "./Pages/Products.jsx";
import Stock from "./Pages/Stock.jsx";
import Billing from "./Pages/Billing.jsx";
import Customers from "./Pages/Customers.jsx";
import Suppliers from "./Pages/Suppliers.jsx";
import Transport from "./Pages/Transport.jsx";
import Expenses from "./Pages/Expenses.jsx";
import Salary from "./Pages/Salary.jsx";
import Profit from "./Pages/Profit.jsx";
import UsersManager from "./Pages/UsersManager.jsx";
import Wholesale from "./Pages/Wholesale.jsx";
import Retail1 from "./Pages/Retail1.jsx";
import Retail2 from "./Pages/Retail2.jsx";
import Rent from "./Pages/Rent.jsx";
import Investment from "./Pages/Investment.jsx";
import Staff from "./Pages/Staff.jsx";
import Accounts from "./Pages/Accounts.jsx";
import Labours from "./Pages/Labours.jsx";


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'white', color: 'red' }}>
          <h1>React Crashed</h1>
          <pre>{this.state.error.toString()}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}





function App() {
  React.useEffect(() => {
    const handleGlobalFocus = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        const val = e.target.value;
        if (val === '0' || parseFloat(val) === 0) {
          e.target.value = '';
          // Dispatch native input event to update React state
          const event = new Event('input', { bubbles: true });
          e.target.dispatchEvent(event);
        } else if (typeof e.target.select === 'function') {
          e.target.select();
        }
      }
    };

    const handleGlobalInput = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        const val = e.target.value;
        // Strip any leading zeroes followed by other digits (e.g. "04455" becomes "4455")
        if (/^0+\d+/.test(val)) {
          e.target.value = val.replace(/^0+/, '');
          const event = new Event('input', { bubbles: true });
          e.target.dispatchEvent(event);
        }
      }
    };


    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter' && e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (e.target.type === 'submit' || e.target.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), .p-inputtext:not([disabled])'));
        const index = inputs.indexOf(e.target);
        if (index > -1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      }
    };

    document.addEventListener('focusin', handleGlobalFocus);
    document.addEventListener('click', handleGlobalFocus);
    document.addEventListener('input', handleGlobalInput);
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('focusin', handleGlobalFocus);
      document.removeEventListener('click', handleGlobalFocus);
      document.removeEventListener('input', handleGlobalInput);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);


  return (
    <ErrorBoundary>

      <AuthProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          
          {/* Protected Routes inside MainLayout */}
          <Route path="/dashboard" element={<PrivateRoute><MainLayout><Dashboard /></MainLayout></PrivateRoute>} />
          <Route path="/wholesale" element={<PrivateRoute><MainLayout><Wholesale /></MainLayout></PrivateRoute>} />
          <Route path="/retail1" element={<PrivateRoute><MainLayout><Retail1 /></MainLayout></PrivateRoute>} />
          <Route path="/retail2" element={<PrivateRoute><MainLayout><Retail2 /></MainLayout></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><MainLayout><Products /></MainLayout></PrivateRoute>} />
          <Route path="/stock" element={<PrivateRoute><MainLayout><Stock /></MainLayout></PrivateRoute>} />
          <Route path="/billing" element={<PrivateRoute><MainLayout><Billing /></MainLayout></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><MainLayout><Customers /></MainLayout></PrivateRoute>} />
          <Route path="/suppliers" element={<PrivateRoute><MainLayout><Suppliers /></MainLayout></PrivateRoute>} />
          <Route path="/transport" element={<PrivateRoute><MainLayout><Transport /></MainLayout></PrivateRoute>} />
          <Route path="/expenses" element={<PrivateRoute><MainLayout><Expenses /></MainLayout></PrivateRoute>} />
          <Route path="/salary" element={<PrivateRoute><MainLayout><Salary /></MainLayout></PrivateRoute>} />
          <Route path="/profit" element={<PrivateRoute><MainLayout><Profit /></MainLayout></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><MainLayout><UsersManager /></MainLayout></PrivateRoute>} />
          <Route path="/rent" element={<PrivateRoute><MainLayout><Rent /></MainLayout></PrivateRoute>} />
          <Route path="/investment" element={<PrivateRoute><MainLayout><Investment /></MainLayout></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute><MainLayout><Staff /></MainLayout></PrivateRoute>} />
          <Route path="/accounts" element={<PrivateRoute><MainLayout><Accounts /></MainLayout></PrivateRoute>} />
          <Route path="/labours" element={<PrivateRoute><MainLayout><Labours /></MainLayout></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
