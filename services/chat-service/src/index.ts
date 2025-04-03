import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { initDatabase } from './db';
import routes from './routes';
import { WebSocketManager } from './websocket';
import { wsMiddleware } from './middleware/ws.middleware';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// WebSocket
const wsManager = new WebSocketManager(io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/chat', routes);

// Health check 
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'chat'
  });
});

// Start server
const startServer = async () => {
  try {
    await initDatabase();
    logger.info('Database initialized successfully');

    httpServer.listen({
      port: config.port,
      host: '0.0.0.0'
    }, () => {
      logger.info(`Chat service is running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
