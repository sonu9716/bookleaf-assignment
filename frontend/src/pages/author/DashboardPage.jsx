import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  BookOpen, 
  IndianRupee, 
  TrendingUp, 
  AlertCircle, 
  MessageSquare, 
  ArrowRight 
} from 'lucide-react';

const DashboardPage = () => {
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [booksData, ticketsData] = await Promise.all([
          api.get('/authors/me/books'),
          api.get('/authors/me/tickets'),
        ]);
        setBooks(booksData);
        setTickets(ticketsData);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
        setError('Could not retrieve dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading your dashboard metrics...</div>;
  }

  // Aggregated Stats
  const totalBooks = books.length;
  const totalRoyaltyEarned = books.reduce((acc, book) => acc + book.totalRoyaltyEarned, 0);
  const royaltyPaid = books.reduce((acc, book) => acc + book.royaltyPaid, 0);
  const royaltyPending = books.reduce((acc, book) => acc + book.royaltyPending, 0);
  
  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress');

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Here is a real-time summary of your publishing performance and pending support queries.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--critical)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {error}
        </div>
      )}

      {/* Grid Statistics */}
      <div className="dashboard-grid">
        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="stat-label">Total Books</p>
              <h3 className="stat-val">{totalBooks}</h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Books cataloged under BookLeaf contract
          </div>
        </div>

        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="stat-label">Royalty Accrued</p>
              <h3 className="stat-val">₹{totalRoyaltyEarned.toLocaleString('en-IN')}</h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
              <IndianRupee size={20} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Aggregated gross royalties earned from sales
          </div>
        </div>

        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="stat-label">Royalty Paid</p>
              <h3 className="stat-val" style={{ color: 'var(--success)' }}>
                ₹{royaltyPaid.toLocaleString('en-IN')}
              </h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Successfully disbursed to your verified bank account
          </div>
        </div>

        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="stat-label">Royalty Pending</p>
              <h3 className="stat-val" style={{ color: royaltyPending > 0 ? 'var(--high)' : 'var(--text-primary)' }}>
                ₹{royaltyPending.toLocaleString('en-IN')}
              </h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--high)' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Accrued royalties pending next quarterly disbursal cycle
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="detail-grid" style={{ marginTop: '2rem' }}>
        {/* Support Ticket Quick View */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Active Support Queries</h3>
            <span className="badge badge-open">
              {openTickets.length} Active
            </span>
          </div>

          {openTickets.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>All clear! You have no unresolved support tickets right now.</p>
              <Link to="/author/tickets/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Submit a Support Ticket
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {openTickets.slice(0, 3).map(ticket => (
                <div key={ticket._id} style={{
                  padding: '1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ minWidth: 0, paddingRight: '1rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ticket.subject}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', alignItems: 'center' }}>
                      <span className={`badge badge-${ticket.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                        {ticket.priority}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link to={`/author/tickets/${ticket._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                    View
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <Link to="/author/tickets" style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  View All Support Tickets
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Help Resources */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Author Assistance
          </h3>
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Quarterly Disbursals
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Quarterly disbursals happen within 30 days after the end of each quarter. Next expected payout starts July 31.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              ISBN & Sync Times
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              New ISBN registries can take 3-5 business days to propagate across Amazon and Flipkart networks.
            </p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Link to="/author/tickets/new" className="btn btn-primary" style={{ width: '100%' }}>
              <MessageSquare size={16} />
              Open a Ticket
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
