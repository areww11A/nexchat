"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_client_1 = require("socket.io-client");
var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc0MzM0NzYxNywiZXhwIjoxNzQzNDM0MDE3fQ.Bxgls6SmQAxH2rlwf_4zsKieDmwkhHrUxMzBEJLUE5Y';
var manager = new socket_io_client_1.Manager('http://localhost:3002', {
    auth: {
        token: "Bearer ".concat(token)
    }
});
var socket = manager.socket('/');
socket.on('connect', function () {
    console.log('Connected to WebSocket server');
    // Присоединяемся к чату
    socket.emit('join_chat', 4);
    // Отправляем событие typing
    socket.emit('typing', 4);
});
socket.on('user_typing', function (data) {
    console.log('User typing:', data);
});
socket.on('connect_error', function (error) {
    console.error('Connection error:', error);
});
socket.on('error', function (error) {
    console.error('Socket error:', error);
});
// Держим соединение открытым
process.on('SIGINT', function () {
    socket.close();
    process.exit();
});
