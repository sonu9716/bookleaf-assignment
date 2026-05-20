import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Shield } from 'lucide-react';

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
      if (user.role === 'author') {
        navigate('/author/dashboard');
      } else {
        setError('Unauthorized role. Please use the Admin Portal for operations logins.');
        logout();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ borderTop: '4px solid var(--primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary-glow)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid var(--primary)'
          }}>
            <BookOpen size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h2>Author Portal</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            BookLeaf Publishing Support & Royalty Portal
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
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. anika.desai@email.com"
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
            style={{ width: '100%', padding: '0.85rem' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In as Author'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', fontSize: '0.825rem' }}>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
            Demo Accounts (Password: <code>bookleaf123</code>):
          </p>
          <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1rem', lineHeight: '1.5' }}>
            <li>Anika Desai: <code>anika.desai@email.com</code></li>
            <li>Vikram Joshi: <code>vikram.joshi@email.com</code></li>
            <li>Arjun Malhotra: <code>arjun.malhotra@email.com</code></li>
          </ul>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/admin/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <Shield size={14} />
              Switch to Operations Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
