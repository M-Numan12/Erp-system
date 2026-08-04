import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import '../../Styles/LoginPage.scss';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [pollEmail, setPollEmail] = useState('');

  const { login, autoLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    let intervalId;
    if (isPendingApproval && pollEmail) {
      intervalId = setInterval(async () => {
        try {
          const res = await api.get(`/auth/check-device-status?email=${encodeURIComponent(pollEmail)}`);
          if (res.data && res.data.approved) {
            clearInterval(intervalId);
            autoLogin(res.data.token, res.data.user, rememberMe);
            navigate('/dashboard');
          }
        } catch (err) {
          console.error("Polling device status failed", err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPendingApproval, pollEmail, rememberMe, autoLogin, navigate]);

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const coords = await getCoordinates();
    try {
      // Call login with isAdminLogin = true and coords
      await login(email, password, rememberMe, true, coords);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.isPendingApproval) {
        setIsPendingApproval(true);
        setPollEmail(err.response.data.email);
        setError('');
      } else {
        setError(err.response?.data?.msg || 'Login failed. Please check admin credentials.');
      }
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

        {error && (
          <div className="error-message">
            {error}
            {(error.includes('admin portal') || error.includes('Regular users')) && (
              <div style={{ marginTop: '8px' }}>
                <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'underline' }}>
                  Go to Staff / Counter Login →
                </Link>
              </div>
            )}
          </div>
        )}

        {isPendingApproval ? (
          <div className="pending-approval-box" style={{ textAlign: 'center', padding: '10px 0' }}>
            <div className="spinner-container">
              <div className="premium-spinner" />
            </div>
            <h3 style={{ marginBottom: '10px', color: '#f8fafc' }}>Waiting for Admin Approval</h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '25px', lineHeight: '1.6' }}>
              Your device details have been submitted. Once the administrator approves this device, you will be signed in automatically.
            </p>
            <button 
              onClick={() => {
                setIsPendingApproval(false);
                setPollEmail('');
                setError('');
              }} 
              className="login-btn admin-btn" 
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
            >
              Go Back
            </button>
          </div>
        ) : (
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
              <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: showPassword ? '#818cf8' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    zIndex: 10
                  }}
                >
                  {showPassword ? <EyeOff size={20} color="#818cf8" /> : <Eye size={20} color="#94a3b8" />}
                </button>
              </div>
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
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;
