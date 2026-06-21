import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

const sanitizeUser = (userData) => {
  if (!userData) return userData;
  if (!userData.module_type) {
    const em = (userData.email || '').toLowerCase();
    if (em.includes('wholesale')) userData.module_type = 'Wholesale';
    else if (em.includes('retail1') || em.includes('retailsaller1')) userData.module_type = 'Retail 1';
    else if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) userData.module_type = 'Retail 2';
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

  const login = async (email, password, rememberMe) => {
    const res = await api.post('/auth/login', { email, password });
    if (rememberMe) {
      localStorage.setItem('token', res.data.token);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', res.data.token);
      localStorage.removeItem('token');
    }
    setUser(sanitizeUser(res.data.user));
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    sessionStorage.setItem('token', res.data.token);
    localStorage.removeItem('token');
    setUser(sanitizeUser(res.data.user));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
