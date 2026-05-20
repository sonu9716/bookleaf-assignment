import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, 
  Send, 
  User, 
  BookOpen, 
  FileText, 
  Sparkles, 
  UserPlus,
  Lock,
  Plus
} from 'lucide-react';

const TicketDetailPage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { socket, joinTicketRoom, leaveTicketRoom } = useSocket();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interactive inputs
  const [messageBody, setMessageBody] = useState('');
  const [internalNoteBody, setInternalNoteBody] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  const messagesEndRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const data = await api.get(`/admin/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      console.error('Failed to fetch admin ticket details', err);
      setError('Could not fetch ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  // Connect to Socket.IO ticket room
  useEffect(() => {
    if (!id || !socket) return;

    socket.emit('join:ticket', id);

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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.messages]);

  // Handles submitting an admin reply
  const handleSendReply = async (e, customMessage = null) => {
    if (e) e.preventDefault();
    const content = customMessage || messageBody;
    if (!content.trim()) return;

    setError('');
    setSubmittingReply(true);

    try {
      const response = await api.post(`/admin/tickets/${id}/reply`, {
        messageBody: content.trim(),
      });
      setTicket(response);
      if (!customMessage) {
        setMessageBody('');
      } else {
        setAiDraft('');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Handles adding internal notes
  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteBody.trim()) return;

    setError('');
    setSubmittingNote(true);

    try {
      const response = await api.post(`/admin/tickets/${id}/notes`, {
        note: internalNoteBody.trim(),
      });
      setTicket(response);
      setInternalNoteBody('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to record internal note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Updates metadata fields (category, priority, status)
  const handleMetaChange = async (field, value) => {
    setError('');
    try {
      const payload = { [field]: value };
      const response = await api.patch(`/admin/tickets/${id}`, payload);
      setTicket(response);
    } catch (err) {
      console.error(err);
      setError(err.message || `Failed to update ticket ${field}.`);
    }
  };

  // Self Assign
  const handleSelfAssign = async () => {
    setError('');
    try {
      const response = await api.patch(`/admin/tickets/${id}`, {
        assignedToAdminId: currentUser.id,
      });
      setTicket(response);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to assign ticket.');
    }
  };

  // Self Unassign
  const handleSelfUnassign = async () => {
    setError('');
    try {
      const response = await api.patch(`/admin/tickets/${id}`, {
        assignedToAdminId: null,
      });
      setTicket(response);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to unassign ticket.');
    }
  };

  // Call AI Draft endpoint
  const handleGenerateAIDraft = async () => {
    setError('');
    setGeneratingDraft(true);
    setAiDraft('');
    
    try {
      const response = await api.post(`/admin/tickets/${id}/ai-draft`);
      if (response.success) {
        setAiDraft(response.draft);
      } else {
        setError(response.draft || 'AI suggestion failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to reach AI service.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading support thread details...</div>;
  }

  if (!ticket) {
    return (
      <div>
        <h3 style={{ color: 'var(--critical)' }}>Ticket Not Found</h3>
        <Link to="/admin/tickets">Return to active queue</Link>
      </div>
    );
  }

  const isAssignedToMe = ticket.assignedToAdminId?._id === currentUser.id;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/tickets" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} />
          Back to Ticket Queue
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{ticket.subject}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Author: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ticket.authorId?.name}</span> ({ticket.authorId?.email})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ticket.assignedToAdminId ? (
              isAssignedToMe ? (
                <button onClick={handleSelfUnassign} className="btn btn-secondary">
                  Unassign Myself
                </button>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center', background: 'var(--bg-surface-elevated)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  Assigned to: {ticket.assignedToAdminId.name}
                </span>
              )
            ) : (
              <button onClick={handleSelfAssign} className="btn btn-primary" style={{ background: '#8b5cf6', boxShadow: 'none' }}>
                <UserPlus size={16} />
                Assign to Me
              </button>
            )}
          </div>
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

      {/* Two Column Grid */}
      <div className="detail-grid">
        
        {/* Left Side: Conversation & AI Assistant */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                          {isAuthor ? ticket.authorId?.name : (msg.senderId?.name || 'Admin')}
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
            <form onSubmit={(e) => handleSendReply(e)} className="chat-input-area">
              <input
                type="text"
                className="form-control"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type a supportive reply to the author..."
                disabled={submittingReply}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingReply || !messageBody.trim()}
                style={{ background: '#8b5cf6', color: 'white' }}
              >
                <Send size={16} />
                Send Reply
              </button>
            </form>
          </div>

          {/* AI Drafting Tool */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--secondary)' }} />
                <h3 style={{ fontSize: '1.1rem' }}>AI Copilot Assisting</h3>
              </div>
              <button 
                onClick={handleGenerateAIDraft} 
                className="btn btn-secondary" 
                disabled={generatingDraft}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--secondary)' }}
              >
                {generatingDraft ? 'Consulting Knowledge Base...' : 'Generate AI Draft'}
              </button>
            </div>

            {aiDraft ? (
              <div>
                <textarea
                  className="form-control"
                  rows={8}
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                  style={{ background: 'var(--bg-surface-elevated)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    onClick={() => handleSendReply(null, aiDraft)} 
                    className="btn btn-primary"
                    style={{ background: 'var(--secondary)', color: 'white', fontSize: '0.875rem' }}
                  >
                    <Send size={14} />
                    Approve and Send Reply
                  </button>
                  <button onClick={() => setAiDraft('')} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                    Discard
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Click "Generate AI Draft" to consult BookLeaf's knowledge base policies (quarterly payout cycle, ISBN sync windows, trim sizes, paper natural shades, and replacements) to generate an empathetic draft response matching our core tone guidelines.
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Metadata Config & Sidebar Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Metadata Controls */}
          <div className="premium-card">
            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              Triage Controls
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Status */}
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Ticket Status</label>
                <select
                  className="form-control"
                  value={ticket.status}
                  onChange={(e) => handleMetaChange('status', e.target.value)}
                  style={{ padding: '0.5rem' }}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>
                  Priority {ticket.aiPriorityConfidence > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(AI: {(ticket.aiPriorityConfidence * 100).toFixed(0)}%)</span>}
                </label>
                <select
                  className="form-control"
                  value={ticket.priority}
                  onChange={(e) => handleMetaChange('priority', e.target.value)}
                  style={{ padding: '0.5rem' }}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>
                  Category {ticket.aiCategoryConfidence > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(AI: {(ticket.aiCategoryConfidence * 100).toFixed(0)}%)</span>}
                </label>
                <select
                  className="form-control"
                  value={ticket.category}
                  onChange={(e) => handleMetaChange('category', e.target.value)}
                  style={{ padding: '0.5rem' }}
                >
                  <option value="Royalty & Payments">Royalty & Payments</option>
                  <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
                  <option value="Printing & Quality">Printing & Quality</option>
                  <option value="Distribution & Availability">Distribution & Availability</option>
                  <option value="Book Status & Production Updates">Book Status & Production Updates</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>
            </div>
          </div>

          {/* Book Financial Context */}
          {ticket.bookId && (
            <div className="premium-card">
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Linked Publication Details
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

          {/* Internal Operations Notes */}
          <div className="premium-card" style={{ borderLeft: '4px solid #f97316' }}>
            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Lock size={16} style={{ color: '#f97316' }} />
              Internal Notes
            </h3>

            {/* Note Log List */}
            {ticket.internalNotes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxDown: '180px', overflowY: 'auto', marginBottom: '1.25rem', paddingRight: '0.25rem' }}>
                {ticket.internalNotes.map((note, index) => (
                  <div key={note._id || index} style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{note.note}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      <span style={{ fontWeight: 700 }}>{note.adminId?.name || 'Admin'}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                No internal notes recorded. Notes are fully private and completely hidden from author view.
              </p>
            )}

            {/* Note Submission Form */}
            <form onSubmit={handleAddInternalNote}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <textarea
                  className="form-control"
                  rows={3}
                  value={internalNoteBody}
                  onChange={(e) => setInternalNoteBody(e.target.value)}
                  placeholder="Record private operational notes..."
                  style={{ fontSize: '0.825rem' }}
                  disabled={submittingNote}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={submittingNote || !internalNoteBody.trim()}
                style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem' }}
              >
                <Plus size={14} />
                Save Note
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
