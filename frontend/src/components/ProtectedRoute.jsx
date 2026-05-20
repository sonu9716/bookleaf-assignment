import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#080f0d',
        color: '#f3f4f6',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #1f3630',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <h3>Verifying authentication...</h3>
        </div>
      </div>
    );
  }

  if (!user) {
    // If not logged in, redirect based on which portal they are trying to access
    const isAdminPath = window.location.pathname.startsWith('/admin');
    return <Navigate to={isAdminPath ? '/admin/login' : '/author/login'} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // If authenticated but role mismatch, redirect to correct portal homepage
    return <Navigate to={user.role === 'admin' ? '/admin/tickets' : '/author/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
