const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const authRoutes = require('./routes/auth');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });
const clients = new Map();

wss.on('connection', (ws, userId) => {
  clients.set(userId, ws);
  
  ws.on('close', () => {
    clients.delete(userId);
    updateUserStatus(userId, false);
  });
});

// Database connection
db.connect()
  .then((pool) => {
    const server = app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`);
    });
    
    server.on('upgrade', async (request, socket, head) => {
      const { verifyWsToken } = require('./middleware/auth');
      
      try {
        const authenticated = await verifyWsToken(request);
        if (!authenticated) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          updateUserStatus(request.userId, true);
          wss.emit('connection', ws, request.userId);
        });
      } catch (error) {
        console.error('WebSocket upgrade error:', error);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });
  })
  .catch(err => {
    console.error('Database connection failed', err);
    process.exit(1);
  });

async function updateUserStatus(userId, isOnline) {
  try {
    await db.pool.query(
      'UPDATE users SET is_online = $1, last_seen = NOW() WHERE id = $2',
      [isOnline, userId]
    );
    broadcastStatusUpdate(userId, isOnline);
  } catch (err) {
    console.error('Error updating user status:', err);
  }
}

function broadcastStatusUpdate(userId, isOnline) {
  const message = JSON.stringify({
    event: 'status_update',
    userId,
    isOnline
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = { app, wss };
