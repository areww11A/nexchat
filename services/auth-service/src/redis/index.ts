import { createClient } from 'redis';
import { config } from '../config';

const client = createClient({
  url: config.redis.url,
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

export const setSession = async (token: string, userId: number, device: string, ip: string) => {
  try {
    const sessionData = {
      userId,
      device,
      ip,
      lastActive: new Date().toISOString(),
    };
    await client.set(`session:${token}`, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Error setting session:', error);
    throw error;
  }
};

export const getSession = async (token: string) => {
  try {
    const sessionData = await client.get(`session:${token}`);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

export const deleteSession = async (token: string) => {
  try {
    await client.del(`session:${token}`);
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

export const updateSessionLastActive = async (token: string) => {
  try {
    const sessionData = await getSession(token);
    if (sessionData) {
      sessionData.lastActive = new Date().toISOString();
      await client.set(`session:${token}`, JSON.stringify(sessionData));
    }
  } catch (error) {
    console.error('Error updating session last active:', error);
    throw error;
  }
}; 