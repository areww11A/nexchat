import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { initDatabase } from './db';
import routes from './routes';
import { WebSocketManager } from './websocket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/chat', routes);

// Health check
app.get('/health', (req, res) => {
  logger.info('Health check request received');
  res.status(200).json({ status: 'ok' });
});

// WebSocket
const wsManager = new WebSocketManager(io);

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