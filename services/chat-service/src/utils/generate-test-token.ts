import * as jwt from 'jsonwebtoken';
import { config } from '../config';

const userId = 1; // Тестовый ID пользователя
const secret = config.jwt.secret;
const token = jwt.sign(
  { userId },
  secret,
  { expiresIn: '24h' }
);

console.log('Generated test token:', token); 