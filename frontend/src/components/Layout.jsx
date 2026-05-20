import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  MessageSquare, 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  User, 
  Inbox 
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(user.role === 'admin' ? '/admin/login' : '/author/login');
  };

  const isAuthor = user?.role === 'author';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <BookOpen size={24} className="primary-icon" style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(90deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BookLeaf
          </h2>
        </div>
        
        <nav className="sidebar-menu">
          {isAuthor ? (
            <>
              <NavLink to="/author/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                Dashboard
              </NavLink>
              <NavLink to="/author/books" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={18} />
                My Books
              </NavLink>
              <NavLink to="/author/tickets" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <MessageSquare size={18} />
                Support Tickets
              </NavLink>
              <NavLink to="/author/tickets/new" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <PlusCircle size={18} />
                New Ticket
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/admin/tickets" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Inbox size={18} />
                Ticket Queue
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isAuthor ? 'var(--primary-glow)' : 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isAuthor ? 'var(--primary)' : 'var(--resolved)'}`
            }}>
              <User size={16} style={{ color: isAuthor ? 'var(--primary)' : 'var(--resolved)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user?.role} Portal
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {isAuthor ? 'Author Dashboard' : 'Publisher Control Room'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className={`badge ${isAuthor ? 'badge-open' : 'badge-resolved'}`}>
              System: Stable
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
