import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import "../../Styles/LoginPage.scss";
import { Building2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve(null);
      }
      
      const timer = setTimeout(() => {
        console.log("Geolocation permission prompt timed out. Continuing login...");
        resolve(null);
      }, 2000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timer);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          clearTimeout(timer);
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
      await login(email, password, rememberMe, false, coords);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-icon">
            <Building2 size={40} color="#2563eb" />
          </div>
          <h2>Data Waley Cement</h2>
          <p>Welcome back! Please enter your details.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
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
          <button type="submit" className="login-btn">Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
