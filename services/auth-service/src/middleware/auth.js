const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// HTTP Middleware
module.exports = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    const { userId } = verifyToken(token);
    await verifySession(userId, token);
    
    req.user = { id: userId };
    next();
  } catch (error) {
    handleAuthError(res, error);
  }
};

// WebSocket Middleware
module.exports.verifyWsToken = async (request) => {
  try {
    const token = getTokenFromWsRequest(request);
    const { userId } = verifyToken(token);
    await verifySession(userId, token);
    
    request.userId = userId;
    return true;
  } catch (error) {
    console.error('WebSocket auth failed:', error);
    return false;
  }
};

// Helper functions
function getTokenFromRequest(req) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Authentication required');
  return token;
}

function getTokenFromWsRequest(request) {
  const token = request.url.split('token=')[1];
  if (!token) throw new Error('Token required');
  return token;
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function verifySession(userId, token) {
  const sessionQuery = 'SELECT * FROM sessions WHERE user_id = $1 AND token = $2';
  const sessionResult = await pool.query(sessionQuery, [userId, token]);
  
  if (sessionResult.rows.length === 0) {
    throw new Error('Invalid token');
  }
}

function handleAuthError(res, error) {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (error.message === 'Authentication required') {
    return res.status(401).json({ error: error.message });
  }
  res.status(500).json({ error: 'Authentication failed' });
}
