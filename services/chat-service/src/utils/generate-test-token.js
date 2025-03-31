"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jwt = require("jsonwebtoken");
var config_1 = require("../config");
var userId = 1; // Тестовый ID пользователя
var secret = config_1.config.jwt.secret;
var token = jwt.sign({ userId: userId }, secret, { expiresIn: '24h' });
console.log('Generated test token:', token);
