import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getDeviceId } from '../services/deviceIdentity';

export const AuthContext = createContext();

const sanitizeUser = (userData) => {
  if (!userData) return userData;
  if (!userData.module_type) {
    const em = (userData.email || '').toLowerCase();
    if (em.includes('wholesale')) userData.module_type = 'Wholesale';
    else if (em.includes('retail1') || em.includes('retailsaller1')) userData.module_type = 'Retail 1';
    else if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) userData.module_type = 'Retail 2';
    else if (em.includes('retail3') || em.includes('retailseller3')) userData.module_type = 'Retail 3';
  }
  return userData;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(sanitizeUser(res.data));
      } catch (err) {
        console.error('Failed to load user', err);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Device revocation is enforced by the API on every request; periodically
  // revalidate so an already-open dashboard signs out without a page reload.
  useEffect(() => {
    if (!user) return undefined;
    const checkSession = async () => {
      try {
        await api.get('/auth/me');
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          setUser(null);
        }
      }
    };
    const timer = setInterval(checkSession, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const login = async (email, password, rememberMe, isAdminLogin = false, coords = null) => {
    const res = await api.post('/auth/login', { email, password, isAdminLogin, coords, deviceId: getDeviceId() });
    localStorage.setItem('token', res.data.token);
    sessionStorage.setItem('token', res.data.token);
    setUser(sanitizeUser(res.data.user));
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    sessionStorage.setItem('token', res.data.token);
    setUser(sanitizeUser(res.data.user));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  const autoLogin = (token, user, rememberMe) => {
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
    setUser(sanitizeUser(user));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, autoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
