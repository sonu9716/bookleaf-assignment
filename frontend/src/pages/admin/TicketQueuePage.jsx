import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { 
  Inbox, 
  Filter, 
  ArrowRight, 
  AlertTriangle,
  Clock
} from 'lucide-react';

const TicketQueuePage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering states
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  const { socket } = useSocket();

  const fetchTickets = async () => {
    try {
      // Build query string
      const params = [];
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (categoryFilter) params.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (priorityFilter) params.push(`priority=${priorityFilter}`);
      if (fromDateFilter) params.push(`fromDate=${fromDateFilter}`);
      if (toDateFilter) params.push(`toDate=${toDateFilter}`);
      
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const data = await api.get(`/admin/tickets${queryString}`);
      setTickets(data);
    } catch (err) {
      console.error('Failed to query ticket queue', err);
      setError('Could not query the ticket queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter, fromDateFilter, toDateFilter]);

  // Handle Socket.IO live queue updates
  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (newTicket) => {
      // Apply filters client-side to check if the new ticket should be displayed in the current view
      let shouldAdd = true;
      if (statusFilter && newTicket.status !== statusFilter) shouldAdd = false;
      if (categoryFilter && newTicket.category !== categoryFilter) shouldAdd = false;
      if (priorityFilter && newTicket.priority !== priorityFilter) shouldAdd = false;
      if (fromDateFilter && new Date(newTicket.createdAt) < new Date(fromDateFilter)) shouldAdd = false;
      if (toDateFilter && new Date(newTicket.createdAt) > new Date(toDateFilter)) shouldAdd = false;

      if (shouldAdd) {
        setTickets((prev) => [newTicket, ...prev]);
      }
    };

    const handleTicketUpdated = (updatedTicket) => {
      setTickets((prev) => {
        // If ticket is already in queue, update it or remove if it no longer matches status/priority filters
        let matchesFilter = true;
        if (statusFilter && updatedTicket.status !== statusFilter) matchesFilter = false;
        if (categoryFilter && updatedTicket.category !== categoryFilter) matchesFilter = false;
        if (priorityFilter && updatedTicket.priority !== priorityFilter) matchesFilter = false;
        if (fromDateFilter && new Date(updatedTicket.createdAt) < new Date(fromDateFilter)) matchesFilter = false;
        if (toDateFilter && new Date(updatedTicket.createdAt) > new Date(toDateFilter)) matchesFilter = false;

        const exists = prev.some((t) => t._id === updatedTicket._id);

        if (exists) {
          if (!matchesFilter) {
            return prev.filter((t) => t._id !== updatedTicket._id);
          }
          return prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t));
        } else if (matchesFilter) {
          return [updatedTicket, ...prev];
        }
        return prev;
      });
    };

    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket:updated', handleTicketUpdated);

    return () => {
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket:updated', handleTicketUpdated);
    };
  }, [socket, statusFilter, categoryFilter, priorityFilter, fromDateFilter, toDateFilter]);

  // Calculate ticket age in readable form
  const getTicketAge = (createdAt) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading internal support queues...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Global Ticket Queue</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage all incoming author support queries, review automated AI triage categorizations, and assign handlers.
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

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
          <Filter size={16} />
          Filters:
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap' }}>
          {/* Status */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Category */}
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="">All Categories</option>
              <option value="Royalty & Payments">Royalty & Payments</option>
              <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
              <option value="Printing & Quality">Printing & Quality</option>
              <option value="Distribution & Availability">Distribution & Availability</option>
              <option value="Book Status & Production Updates">Book Status & Production Updates</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>

          {/* Priority */}
          <div style={{ minWidth: '140px' }}>
            <select
              className="form-control"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Only</option>
              <option value="Medium">Medium Only</option>
              <option value="Low">Low Only</option>
            </select>
          </div>

          {/* Date range pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '280px' }}>
            <input
              type="date"
              className="form-control"
              value={fromDateFilter}
              onChange={(e) => setFromDateFilter(e.target.value)}
              style={{ padding: '0.45rem', fontSize: '0.85rem' }}
              title="From Created Date"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>to</span>
            <input
              type="date"
              className="form-control"
              value={toDateFilter}
              onChange={(e) => setToDateFilter(e.target.value)}
              style={{ padding: '0.45rem', fontSize: '0.85rem' }}
              title="To Created Date"
            />
          </div>
        </div>
        
        <button onClick={() => { setStatusFilter(''); setCategoryFilter(''); setPriorityFilter(''); setFromDateFilter(''); setToDateFilter(''); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Reset
        </button>
      </div>

      {/* Ticket List Table */}
      {tickets.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
          <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>All Tickets Dispatched</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No tickets match your active filter search queries. Excellent job!
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Author</th>
                <th>Linked Book Context</th>
                <th>Triage Priority</th>
                <th>Category</th>
                <th>Status</th>
                <th>Queue Age</th>
                <th>Assignee</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const isUrgent = ticket.priority === 'Critical' || ticket.priority === 'High';
                
                return (
                  <tr key={ticket._id} style={{
                    background: isUrgent ? 'rgba(239, 68, 68, 0.02)' : 'inherit',
                  }}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isUrgent && (
                          <AlertTriangle size={14} style={{ color: ticket.priority === 'Critical' ? 'var(--critical)' : 'var(--high)', flexShrink: 0 }} />
                        )}
                        <span>{ticket.subject}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ticket.authorId?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ticket.authorId?.email}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {ticket.bookId ? (
                        <span>{ticket.bookId.title}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          General / Account
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ticket.category}</td>
                    <td>
                      <span className={`badge badge-${ticket.status.toLowerCase().replace(' ', '')}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        {getTicketAge(ticket.createdAt)}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {ticket.assignedToAdminId?.name || (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/admin/tickets/${ticket._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderColor: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)' }}>
                        Details
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TicketQueuePage;
