import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { BookOpen, AlertCircle, ArrowLeft, Send } from 'lucide-react';

const NewTicketPage = () => {
  const [books, setBooks] = useState([]);
  const [bookId, setBookId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await api.get('/authors/me/books');
        setBooks(data);
      } catch (err) {
        console.error('Could not fetch books list for selector', err);
        setError('Failed to load books catalog.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/authors/me/tickets', {
        bookId: bookId || null,
        subject,
        description,
      });

      // Navigate to detailed ticket view
      navigate(`/author/tickets/${response._id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit support ticket.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading catalog...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/author/tickets" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} />
          Back to Support Tickets
        </Link>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Submit Support Query</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Explain your inquiry clearly. Our AI triage system will instantly classify and prioritize your ticket, routing it to the appropriate publisher department.
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

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="book-select">Which book is this about?</label>
            <select
              id="book-select"
              className="form-control"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              style={{ paddingRight: '2.5rem' }}
            >
              <option value="">General / Account Level (No specific book)</option>
              {books.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.title} {b.isbn ? `(ISBN: ${b.isbn})` : '(Manuscript Phase)'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="subject">Subject / Issue Summary</label>
            <input
              id="subject"
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Delay in Royalty Payout or Printing alignment error"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Detailed Description</label>
            <textarea
              id="description"
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain your question or issue in detail. If this is a printing error, please state the number of copies impacted and include photos in the attachment below."
              rows={8}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Attachments (Optional)</label>
            <div style={{
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.5rem',
              textAlign: 'center',
              background: 'var(--bg-surface-elevated)',
              position: 'relative',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
                onChange={handleFileChange}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {fileName ? `Selected file: ${fileName}` : 'Click here or drop files to upload (PDF, PNG, JPG)'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Supported formats: PDF, PNG, JPG. Maximum file size: 10MB.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '160px' }}
            >
              <Send size={16} />
              {submitting ? 'Submitting...' : 'Submit Support Query'}
            </button>
            <Link to="/author/tickets" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicketPage;
