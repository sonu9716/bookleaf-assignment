import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Author Pages
import AuthorLogin from './pages/author/LoginPage';
import AuthorDashboard from './pages/author/DashboardPage';
import AuthorBooks from './pages/author/BooksPage';
import AuthorTickets from './pages/author/TicketsPage';
import AuthorTicketDetail from './pages/author/TicketDetailPage';
import AuthorNewTicket from './pages/author/NewTicketPage';

// Admin Pages
import AdminLogin from './pages/admin/LoginPage';
import AdminTicketQueue from './pages/admin/TicketQueuePage';
import AdminTicketDetail from './pages/admin/TicketDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Redirect root to author login */}
            <Route path="/" element={<Navigate to="/author/login" replace />} />

            {/* Author Auth */}
            <Route path="/author/login" element={<AuthorLogin />} />

            {/* Author Portal Protected Area */}
            <Route
              path="/author/*"
              element={
                <ProtectedRoute allowedRole="author">
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<AuthorDashboard />} />
                      <Route path="books" element={<AuthorBooks />} />
                      <Route path="tickets" element={<AuthorTickets />} />
                      <Route path="tickets/:id" element={<AuthorTicketDetail />} />
                      <Route path="tickets/new" element={<AuthorNewTicket />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admin Auth */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Portal Protected Area */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRole="admin">
                  <Layout>
                    <Routes>
                      <Route path="tickets" element={<AdminTicketQueue />} />
                      <Route path="tickets/:id" element={<AdminTicketDetail />} />
                      <Route path="*" element={<Navigate to="tickets" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/author/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
export { App };
