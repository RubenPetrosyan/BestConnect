// server.js
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Serve all static assets (including favicon.ico) from public/
app.use(express.static(path.join(__dirname, 'public')));

// 2) API routes
app.use('/api', apiRoutes);

// 3) Fallback for root—serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4) Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
