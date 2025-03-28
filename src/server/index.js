import express from 'express';
import { WebSocketServer } from 'ws';
import knex from 'knex';
import jwt from 'jsonwebtoken';
import sodium from 'libsodium-wrappers';
import authRouter from '../routes/auth.js';

const app = express();
const PORT = process.env.NODE_ENV === 'test' ? 3001 : (process.env.PORT || 3000);

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);

// Database connection
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: process.env.NODE_ENV === 'test' ? './data/test_db.sqlite' : './data/db.sqlite'
  },
  useNullAsDefault: true
});

console.log('Database file:', db.client.config.connection.filename);

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Initialize libsodium
await sodium.ready;

// Basic route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

let server = null;

const startServer = () => {
  if (server) return server;
  
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  return server;
};

const stopServer = () => {
  if (server) {
    server.close();
    server = null;
  }
};

// WebSocket events
wss.on('connection', (ws, request) => {
  const token = new URLSearchParams(request.url.split('?')[1]).get('token');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`New WebSocket connection from user ${decoded.userId}`);
    
    // Emit connected event
    ws.send(JSON.stringify({
      event: 'connected',
      userId: decoded.userId
    }));

    // Broadcast user online status
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'user_online',
          userId: decoded.userId
        }));
      }
    });

    ws.on('close', () => {
      // Broadcast user offline status
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'user_offline', 
            userId: decoded.userId,
            timestamp: new Date().toISOString()
          }));
        }
      });
    });

    ws.on('message', (message) => {
      console.log('Message from user', decoded.userId, ':', message);
    });

  } catch (err) {
    console.log('Invalid WebSocket token');
    ws.close(1008, 'Invalid token');
  }
});

export { app, db, wss, startServer, stopServer };
