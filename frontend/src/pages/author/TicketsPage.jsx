import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { MessageSquare, Plus, ArrowRight } from 'lucide-react';

const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.get('/authors/me/tickets');
        setTickets(data);
      } catch (err) {
        console.error('Failed to load tickets', err);
        setError('Could not retrieve support tickets list.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Handle real-time updates via WebSockets
  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (newTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
    };

    const handleTicketUpdated = (updatedTicket) => {
      setTickets((prev) => 
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
    };

    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket:updated', handleTicketUpdated);

    return () => {
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket:updated', handleTicketUpdated);
    };
  }, [socket]);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading support tickets...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Support & Communication</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Ask questions about payments, ISBN setup, check-in on print samples, or message your assigned support admins.
          </p>
        </div>
        <Link to="/author/tickets/new" className="btn btn-primary">
          <Plus size={16} />
          Create Support Query
        </Link>
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

      {tickets.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Support Tickets Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '400px', marginInline: 'auto' }}>
            You haven't submitted any support queries yet. Click the button above to submit your first query.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Linked Context</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket._id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.subject}
                  </td>
                  <td>
                    {ticket.bookId?.title ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{ticket.bookId.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          ISBN: {ticket.bookId.isbn || 'TBD'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        General / Account
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-low" style={{ background: 'rgba(31, 54, 48, 0.4)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      {ticket.category}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${ticket.status.toLowerCase().replace(' ', '')}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>
                    {new Date(ticket.updatedAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td>
                    <Link to={`/author/tickets/${ticket._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      Open Thread
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
