import { Manager } from 'socket.io-client';

interface TypingEvent {
  userId: number;
  chatId: number;
}

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc0MzM0NzYxNywiZXhwIjoxNzQzNDM0MDE3fQ.Bxgls6SmQAxH2rlwf_4zsKieDmwkhHrUxMzBEJLUE5Y';
const manager = new Manager('http://localhost:3002', {
  auth: { 
    token: `Bearer ${token}`
  }
});

const socket = manager.socket('/');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Присоединяемся к чату
  socket.emit('join_chat', 4);
  
  // Отправляем событие typing
  socket.emit('typing', 4);
});

socket.on('user_typing', (data: TypingEvent) => {
  console.log('User typing:', data);
});

socket.on('connect_error', (error: Error) => {
  console.error('Connection error:', error);
});

socket.on('error', (error: Error) => {
  console.error('Socket error:', error);
});

// Держим соединение открытым
process.on('SIGINT', () => {
  socket.close();
  process.exit();
}); 