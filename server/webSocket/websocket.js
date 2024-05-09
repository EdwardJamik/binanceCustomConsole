const WebSocket = require('ws');
const express = require("express");
const http = require("http");

// const binance = require('node-binance-api'); //deleted
const currentPrice = require('../webSocket/binance.socket')
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// wss.on('connection', function connection(ws) {
//     console.log('Client connected');
//
//     ws.on('message', function incoming(message) {
//         console.log('Received:', message);
//
//         // Отримане повідомлення від клієнта
//         // Тут можна обробити повідомлення та відправити відповідь
//         ws.send(`Server received: ${message}`);
//     });
// });
//
// server.listen(8080, function listening() {
//     console.log('Server started on port 8080');
// });