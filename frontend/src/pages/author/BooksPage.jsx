import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BookOpen, AlertCircle } from 'lucide-react';

const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await api.get('/authors/me/books');
        setBooks(data);
      } catch (err) {
        console.error('Failed to load books catalog', err);
        setError('Could not fetch books list.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading your books catalog...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Publications</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review your published works, royalty ledgers, and check the live progress of books currently in production.
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

      {books.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Books Cataloged Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '400px', marginInline: 'auto' }}>
            There are currently no books cataloged under your author contract. If this is a mistake, please file a support ticket.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>ISBN</th>
                <th>Genre</th>
                <th>Publication Date</th>
                <th>Sales & MRP</th>
                <th>Royalty Ledger</th>
                <th>Production Status</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book._id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {book.title}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: book.isbn ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {book.isbn || 'Pending Allocation'}
                  </td>
                  <td>{book.genre || 'N/A'}</td>
                  <td>
                    {book.publicationDate 
                      ? new Date(book.publicationDate).toLocaleDateString()
                      : 'To Be Scheduled'
                    }
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>MRP: ₹{book.mrp}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Copies Sold: {book.totalCopiesSold.toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Earned:</span>{' '}
                      <span style={{ fontWeight: 600 }}>₹{book.totalRoyaltyEarned.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      <span style={{ color: 'var(--success)' }}>Paid:</span>{' '}
                      <span>₹{book.royaltyPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      <span style={{ color: 'var(--high)' }}>Pending:</span>{' '}
                      <span style={{ fontWeight: 600 }}>₹{book.royaltyPending.toLocaleString('en-IN')}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span className={`badge ${book.status === 'Published' ? 'badge-open' : 'badge-inprogress'}`} style={{ width: 'fit-content' }}>
                        {book.status}
                      </span>
                      {book.status === 'In Production' && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--secondary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          background: 'rgba(6, 182, 212, 0.1)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          width: 'fit-content'
                        }}>
                          <AlertCircle size={12} />
                          Stage: {book.productionStage}
                        </div>
                      )}
                    </div>
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

export default BooksPage;
