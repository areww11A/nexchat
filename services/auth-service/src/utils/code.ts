import crypto from 'crypto';

export const generateRecoveryCode = (): string => {
  // Генерация 6-значного кода
  return crypto.randomInt(100000, 999999).toString();
}; 