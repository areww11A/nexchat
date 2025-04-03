const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/chat', chatRoutes);

// Database connection
db.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Chat Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed', err);
    process.exit(1);
  });

module.exports = app;
