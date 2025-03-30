import bcrypt from 'bcrypt';
import { ready } from 'libsodium-wrappers';

export const hashPassword = async (password: string): Promise<string> => {
  await ready;
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePasswords = async (password: string, hash: string): Promise<boolean> => {
  await ready;
  return bcrypt.compare(password, hash);
}; 