import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { initDatabase } from './db';
import { connectRedis } from './redis';
import { WebSocketManager } from './websocket';
import routes from './routes';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketManager(server);
app.set('wsManager', wss);

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Routes
app.use('/auth', routes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initDatabase();

    // Connect to Redis
    await connectRedis();

    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`Auth service is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
