import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <h2>Loading ERP System...</h2>
      </div>
    );
  }

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  return (user || token) ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
