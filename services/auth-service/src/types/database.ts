export interface User {
  id: number;
  username: string;
  passwordHash: string;
  email: string;
  phone: string | null;
  status: string;
  birthDate: Date | null;
  transcribeVoice: boolean;
  notificationSoundUrl: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
  showTyping: boolean;
  showReadTimestamps: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: number;
  userId: number;
  token: string;
  device: string;
  ip: string;
  createdAt: Date;
  lastActive: Date;
}

export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
} 