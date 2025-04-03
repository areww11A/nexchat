import { createClient } from 'redis';
import { config } from '../config';

const client = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client Connected'));

export const connectRedis = async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
};

export const disconnectRedis = async () => {
  try {
    await client.disconnect();
  } catch (error) {
    console.error('Redis disconnection error:', error);
    throw error;
  }
};

export const cacheMessage = async (chatId: number, message: any) => {
  try {
    await client.lPush(`chat:${chatId}:messages`, JSON.stringify(message));
    await client.lTrim(`chat:${chatId}:messages`, 0, 99); // Keep last 100 messages
  } catch (error) {
    console.error('Error caching message:', error);
    throw error;
  }
};

export const getCachedMessages = async (chatId: number) => {
  try {
    const messages = await client.lRange(`chat:${chatId}:messages`, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  } catch (error) {
    console.error('Error getting cached messages:', error);
    throw error;
  }
};

export const setUserOnlineStatus = async (userId: number, isOnline: boolean) => {
  try {
    await client.set(`user:${userId}:online`, isOnline ? '1' : '0');
  } catch (error) {
    console.error('Error setting online status:', error);
    throw error;
  }
};

export const getUserOnlineStatus = async (userId: number) => {
  try {
    const status = await client.get(`user:${userId}:online`);
    return status === '1';
  } catch (error) {
    console.error('Error getting online status:', error);
    throw error;
  }
};
