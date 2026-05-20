require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const authorRoutes = require('./routes/author');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// Initialize Socket.io
initSocket(server);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/authors/me', authorRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// One-click remote database seeding (bypasses local network blocks)
app.get('/api/seed', (req, res) => {
  const { exec } = require('child_process');
  exec('npm run seed', { cwd: __dirname + '/../' }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Seeding failed', details: stderr || error.message });
    }
    res.status(200).json({ success: true, message: 'Database seeded successfully!', output: stdout });
  });
});

// Serve frontend static files (when dist exists, i.e., after build)
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  
  // Handle client-side routing — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
