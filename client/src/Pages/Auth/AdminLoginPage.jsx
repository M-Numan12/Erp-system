import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import "../../Styles/LoginPage.scss";
import { ShieldCheck } from 'lucide-react';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Call login with isAdminLogin = true
      await login(email, password, rememberMe, true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed. Please check admin credentials.');
    }
  };

  return (
    <div className="login-container admin-theme">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-icon admin-logo">
            <ShieldCheck size={40} color="#6366f1" />
          </div>
          <h2>Admin Portal</h2>
          <p>Secure administrative access. Enter credentials below.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@erp.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-options">
            <label className="remember-me">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              /> Remember me
            </label>
            <Link to="/forgot" className="forgot-link">Forgot Password?</Link>
          </div>
          <button type="submit" className="login-btn admin-btn">Access Dashboard</button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
