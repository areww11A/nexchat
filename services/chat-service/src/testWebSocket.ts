import { Io, Manager } from 'socket.io-client';

const io = Io;
import { logger } from './utils/logger';
import jwt from 'jsonwebtoken';
import { config } from './config';

async function testWebSocket() {
  try {
    // 1. Generate test token
    const token = jwt.sign({ userId: 1 }, config.jwtSecret);
    logger.info('Generated test token');

    // 2. Connect to WebSocket server
    const socket = new Manager(`ws://localhost:${config.ws.port}`, {
      auth: {
        token: `Bearer ${token}`
      }
    });

    socket.on('connect', () => {
      logger.info('✅ Connected to WebSocket server');
    });

    socket.on('connect_error', (err: Error) => {
      logger.error('WebSocket connection error:', err);
    });

    // 3. Test joining/leaving chat
    setTimeout(() => {
      socket.emit('join_chat', 1);
      logger.info('Sent join_chat event for chat 1');

      setTimeout(() => {
        socket.emit('leave_chat', 1);
        logger.info('Sent leave_chat event for chat 1');
      }, 1000);
    }, 500);

    // 4. Test typing indicator
    setTimeout(() => {
      socket.emit('typing', 1);
      logger.info('Sent typing event for chat 1');
    }, 1500);

    // 5. Test receiving messages
    socket.on('message', (data: any) => {
      logger.info('Received message:', data);
    });

    // 6. Close connection after testing
    setTimeout(() => {
      socket.disconnect();
      logger.info('Disconnected from WebSocket server');
      process.exit(0);
    }, 3000);

  } catch (error) {
    logger.error('WebSocket test error:', error);
    process.exit(1);
  }
}

testWebSocket();
