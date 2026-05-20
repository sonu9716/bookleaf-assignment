import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, BookOpen } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin/tickets');
      } else {
        setError('Unauthorized access. This portal is restricted to internal BookLeaf publishing operations staff.');
        logout();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 90%), var(--bg-app)' }}>
      <div className="glass-panel auth-card" style={{ borderTop: '4px solid #8b5cf6' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid #8b5cf6'
          }}>
            <Shield size={24} style={{ color: '#8b5cf6' }} />
          </div>
          <h2>Admin Portal</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            BookLeaf Internal Operations Dashboard
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--critical)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Admin Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya.sharma@bookleaf.in"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', background: '#8b5cf6', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.2)' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In as Operations'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', fontSize: '0.825rem' }}>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
            Operations Demo Logins (Password: <code>bookleaf123</code>):
          </p>
          <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1rem', lineHeight: '1.5' }}>
            <li>Priya Sharma: <code>priya.sharma@bookleaf.in</code></li>
            <li>Rahul Mehta: <code>rahul.mehta@bookleaf.in</code></li>
          </ul>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/author/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <BookOpen size={14} />
              Switch to Author Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
