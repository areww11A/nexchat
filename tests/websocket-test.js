const WebSocket = require('ws');

// Получаем токен из аргументов или используем тестовый
const token = process.argv[2] || 'test-token';
const wsUrl = `ws://localhost:3001?token=${token}`;

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Отправляем тестовое сообщение
  ws.send(JSON.stringify({
    action: 'ping',
    data: 'test message'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.event === 'status_update') {
    console.log(`User ${message.userId} is now ${message.isOnline ? 'online' : 'offline'}`);
  }
});

ws.on('close', () => {
  console.log('Disconnected from WebSocket server');
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});
