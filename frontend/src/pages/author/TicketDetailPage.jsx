import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, CheckCircle, Clock } from 'lucide-react';

const TicketDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, joinTicketRoom, leaveTicketRoom } = useSocket();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [messageBody, setMessageBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const messagesEndRef = useRef(null);

  // Fetch ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await api.get(`/authors/me/tickets/${id}`);
        setTicket(data);
      } catch (err) {
        console.error('Failed to load ticket details', err);
        setError('Could not fetch ticket details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Join Socket IO ticket room for live replies
  useEffect(() => {
    if (!id || !socket) return;
    
    // Join room
    socket.emit('join:ticket', id);

    // Register listeners
    const handleTicketUpdated = (updatedTicket) => {
      if (updatedTicket._id === id) {
        setTicket(updatedTicket);
      }
    };

    const handleNewMessage = (data) => {
      if (data.ticketId === id) {
        setTicket((prev) => {
          if (!prev) return prev;
          const msg = data.message;
          const exists = prev.messages.some(m => m._id === msg._id || (m.body === msg.body && Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 2000));
          if (exists) return prev;
          return { ...prev, messages: [...prev.messages, msg] };
        });
      }
    };

    socket.on('ticket:updated', handleTicketUpdated);
    socket.on('ticket:message:new', handleNewMessage);

    return () => {
      socket.emit('leave:ticket', id);
      socket.off('ticket:updated', handleTicketUpdated);
      socket.off('ticket:message:new', handleNewMessage);
    };
  }, [id, socket]);

  // Scroll to bottom when message log length changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageBody.trim()) return;

    setError('');
    setSubmitting(true);

    try {
      const response = await api.patch(`/authors/me/tickets/${id}`, {
        messageBody: messageBody.trim(),
      });
      setTicket(response);
      setMessageBody('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to mark this ticket as resolved/closed?')) return;
    
    setError('');
    try {
      const response = await api.patch(`/authors/me/tickets/${id}`, {
        status: 'Closed',
      });
      setTicket(response);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to close ticket.');
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading support thread...</div>;
  }

  if (!ticket) {
    return (
      <div>
        <h3 style={{ color: 'var(--critical)' }}>Ticket Not Found</h3>
        <Link to="/author/tickets">Back to ticket catalog</Link>
      </div>
    );
  }

  const isClosed = ticket.status === 'Closed';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/author/tickets" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} />
          Back to Support Queries
        </Link>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{ticket.subject}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Ticket Reference ID: <code style={{ color: 'var(--secondary)' }}>{ticket._id}</code>
            </p>
          </div>
          {!isClosed && (
            <button onClick={handleCloseTicket} className="btn btn-secondary" style={{ border: '1px solid var(--border)' }}>
              <CheckCircle size={16} style={{ color: 'var(--success)' }} />
              Mark as Resolved / Close
            </button>
          )}
        </div>
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

      <div className="detail-grid">
        {/* Main Chat Area */}
        <div>
          <div className="chat-container">
            <div className="chat-messages">
              {ticket.messages.map((msg, i) => {
                const isAuthor = msg.senderType === 'author';
                const isSystem = msg.senderType === 'system';
                
                return (
                  <div key={msg._id || i} className={`message-bubble ${msg.senderType}`}>
                    <p style={{ fontSize: '0.925rem', whiteSpace: 'pre-wrap' }}>{msg.body}</p>
                    {!isSystem && (
                      <div className="message-meta">
                        <span style={{ fontWeight: 700 }}>
                          {isAuthor ? user.name : (ticket.assignedToAdminId?.name || 'BookLeaf Support')}
                        </span>
                        <span>
                          {new Date(msg.createdAt).toLocaleString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Message Form */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input
                type="text"
                className="form-control"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={isClosed ? "This ticket is closed. Reply to automatically reopen." : "Type your message..."}
                disabled={submitting}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !messageBody.trim()}
              >
                <Send size={16} />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Metadata Card */}
          <div className="premium-card">
            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              Ticket Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span className={`badge badge-${ticket.status.toLowerCase().replace(' ', '')}`}>
                  {ticket.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Priority:</span>
                <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                  {ticket.priority}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assigned Admin:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ticket.assignedToAdminId?.name || 'Unassigned (Queueing)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Created:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Book Context Card */}
          {ticket.bookId && (
            <div className="premium-card">
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Linked Publication Context
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                    {ticket.bookId.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    ISBN: {ticket.bookId.isbn || 'Manuscript Phase'}
                  </div>
                </div>
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Genre:</span>
                    <span>{ticket.bookId.genre || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Book Status:</span>
                    <span className="badge badge-open" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
                      {ticket.bookId.status}
                    </span>
                  </div>
                  {ticket.bookId.status === 'In Production' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Production Stage:</span>
                      <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{ticket.bookId.productionStage}</span>
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Copies Sold:</span>
                    <span style={{ fontWeight: 600 }}>{ticket.bookId.totalCopiesSold.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Royalties Accrued:</span>
                    <span style={{ fontWeight: 600 }}>₹{ticket.bookId.totalRoyaltyEarned.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--success)' }}>Royalties Paid:</span>
                    <span>₹{ticket.bookId.royaltyPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--high)' }}>Royalties Pending:</span>
                    <span style={{ fontWeight: 600 }}>₹{ticket.bookId.royaltyPending.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
