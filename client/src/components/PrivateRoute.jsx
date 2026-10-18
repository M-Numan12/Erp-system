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

  // Authentication must be confirmed by /auth/me before rendering private pages.
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
